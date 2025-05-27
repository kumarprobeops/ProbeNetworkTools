from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from utils.apikey import get_api_key
from core.database import get_db
from models.job_result import JobResult
import json
import time
import uuid
import asyncio
from datetime import datetime
import logging

logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] %(levelname)s: %(message)s',
)
logger = logging.getLogger("probe_node_ws")

connected_nodes = {}  # node_id: websocket
node_status = {}      # node_id: last_seen_timestamp
pending_results = {}  # job_id: asyncio.Future
pending_meta = {}     # job_id: dict

router = APIRouter()

@router.websocket("/ws/node")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    node_id = None
    try:
        while True:
            data = await websocket.receive_text()
            logger.info(f"Data received from probe node: {data}")
            try:
                msg = json.loads(data)
                if msg.get("action") == "register":
                    node_id = msg.get("node_name", "unknown")
                    connected_nodes[node_id] = websocket
                    await websocket.send_text(json.dumps({
                        "message": f"Node {node_id} registered successfully!"
                    }))
                    logger.info(f"Probe node registered: {node_id}")
                elif msg.get("action") == "heartbeat":
                    node_id = msg.get("node_name", "unknown")
                    logger.info(f"Heartbeat received from {node_id}")
                    node_status[node_id] = time.time()
                    for nid, last_seen in node_status.items():
                        logger.info(f"Node: {nid}, last seen at: {time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(last_seen))}")
                elif msg.get("action") == "result":
                    job_id = msg.get("job_id")
                    output = msg.get("output")
                    success = msg.get("success", True)
                    logger.info(f"Job {job_id} result:\n{output}")

                    # ----- Only save to DB if not a UI/manual job -----
                    if job_id in pending_results:
                        # UI/manual job: set future, API endpoint will handle DB save!
                        future = pending_results.pop(job_id)
                        if not future.done():
                            future.set_result({
                                "output": output,
                                "success": success,
                                # Pass more fields if needed
                            })
                        pending_meta.pop(job_id, None)
                    else:
                        # API token/background job: save to DB here
                        meta = pending_meta.pop(job_id, {})
                        try:
                            db: Session = next(get_db())
                            job_row = JobResult(
                                job_id=job_id,
                                job_type=meta.get("job_type"),
                                target=meta.get("target"),
                                port=meta.get("port"),
                                output=output,
                                success=success,
                                created_at=datetime.utcnow(),
                                api_key_id=meta.get("api_key_id"),
                                user_id=meta.get("user_id")
                            )
                            db.add(job_row)
                            db.commit()
                            logger.info(f"Saved job result {job_id} to DB (API/background job)")
                        except Exception as e:
                            logger.error(f"Error saving job result: {e}")
                        finally:
                            try:
                                db.close()
                            except Exception:
                                pass
            except Exception as e:
                logger.error(f"Exception in probe node WebSocket: {e}")
                await websocket.send_text(json.dumps({
                    "error": str(e)
                }))
    except WebSocketDisconnect:
        logger.warning(f"Node disconnected: {node_id}")
        if node_id and node_id in connected_nodes:
            del connected_nodes[node_id]
        if node_id and node_id in node_status:
            del node_status[node_id]

# API: List all connected nodes
@router.get("/nodes")
def list_nodes():
    result = []
    for node_id, last_seen in node_status.items():
        result.append({
            "node_id": node_id,
            "last_seen": time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(last_seen)),
            "seconds_since_last_seen": int(time.time() - last_seen)
        })
    return JSONResponse(result)

# Send a job to a probe node (for testing)
@router.post("/send-job")
async def send_job(data: dict):
    node_id = data.get("node_id")
    job_type = data.get("job_type")
    target = data.get("target")
    port = data.get("port")

    if node_id not in connected_nodes:
        return {"error": "Node not connected"}

    job_id = str(uuid.uuid4())
    job_msg = {
        "action": "job",
        "job_id": job_id,
        "job_type": job_type,
        "target": target
    }
    if job_type == "port_check" and port:
        job_msg["port"] = port

    print(f"SENDING JOB: {job_id} to node {node_id} from /send-job endpoint")
    await connected_nodes[node_id].send_json(job_msg)
    return {"status": "job sent", "job_id": job_id}

# The main /probe endpoint (API key auth, result logging)
@router.post("/probe")
async def run_probe(
    data: dict,
    api_key=Depends(get_api_key),
    db: Session = Depends(get_db)
):
    if not connected_nodes:
        return JSONResponse({"error": "No probe nodes connected"}, status_code=503)
    node_id = next(iter(connected_nodes.keys()))
    job_type = data.get("type")
    target = data.get("target")
    port = data.get("port")

    if not job_type or not target:
        return JSONResponse({"error": "Missing 'type' or 'target'"}, status_code=400)

    job_id = str(uuid.uuid4())
    job_msg = {
        "action": "job",
        "job_id": job_id,
        "job_type": job_type,
        "target": target
    }
    if job_type == "port_check":
        if not port:
            return JSONResponse({"error": "Missing 'port' for port_check"}, status_code=400)
        job_msg["port"] = port

    # Register a future for the result, plus meta for saving to DB
    loop = asyncio.get_running_loop()
    future = loop.create_future()
    pending_results[job_id] = future
    pending_meta[job_id] = {
        "job_type": job_type,
        "target": target,
        "port": port,
        "api_key_id": getattr(api_key, "id", None),
        "user_id": getattr(api_key, "user_id", None),
    }

    print(f"SENDING JOB: {job_id} to node {node_id} from /probe endpoint")
    await connected_nodes[node_id].send_json(job_msg)

    try:
        output = await asyncio.wait_for(future, timeout=15)
        return {
            "job_id": job_id,
            "node_id": node_id,
            "type": job_type,
            "target": target,
            "output": output
        }
    except asyncio.TimeoutError:
        pending_results.pop(job_id, None)
        pending_meta.pop(job_id, None)
        return JSONResponse({"error": "Probe timeout, node did not respond in time"}, status_code=504)

# Endpoint to fetch job result by job_id
@router.get("/job-result/{job_id}")
def get_job_result(job_id: str, db: Session = Depends(get_db)):
    result = db.query(JobResult).filter(JobResult.job_id == job_id).first()
    if not result:
        return JSONResponse({"error": "Not found"}, status_code=404)
    return {
        "job_id": result.job_id,
        "job_type": result.job_type,
        "target": result.target,
        "port": result.port,
        "output": result.output,
        "success": result.success,
        "created_at": result.created_at
    }
