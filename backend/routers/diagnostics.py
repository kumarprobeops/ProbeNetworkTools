from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from models.job_result import JobResult
from models.user import User
from datetime import datetime
from typing import Dict, Any
import uuid
import asyncio

from core.database import get_db
from core.dependencies import get_current_user

from routers.probe_node_ws import connected_nodes, pending_results, pending_meta

router = APIRouter()

from pydantic import BaseModel
from sqlalchemy.exc import IntegrityError

class DiagnosticRequest(BaseModel):
    tool: str
    params: Dict[str, Any]

class DiagnosticResponse(BaseModel):
    id: int
    tool: str
    target: str
    status: str
    result: str
    port: int | None = None
    execution_time: int | None = None
    created_at: datetime

@router.post("/run", response_model=DiagnosticResponse)
async def run_diagnostic(
    req: DiagnosticRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not connected_nodes:
        raise HTTPException(status_code=503, detail="No probe nodes connected")
    node_id = next(iter(connected_nodes.keys()))

    # Always generate a fresh job_id for each run
    job_id = str(uuid.uuid4())
    print("!!! job_id GENERATED:", job_id)
    print(f"DIAGNOSTIC RUN: New job_id generated: {job_id} for user: {current_user.id} at {datetime.utcnow().isoformat()}")
    print("INCOMING REQUEST PAYLOAD:", req.dict())

    tool = req.tool
    params = req.params

    if tool == "rdns":
        target = params.get("target") or params.get("ip_address") or ""
    elif tool in ("curl", "whois"):
        target = params.get("target") or params.get("url") or ""
    else:
        target = params.get("target") or params.get("url") or params.get("ip_address") or ""
    port = params.get("port")


    job_msg = {
        "action": "job",
        "job_id": job_id,
        "job_type": tool,
        "target": target,
        "params": params
    }

    loop = asyncio.get_running_loop()
    future = loop.create_future()
    pending_results[job_id] = future
    pending_meta[job_id] = {
        "job_type": tool,
        "target": target,
        "params": params,
        "user_id": current_user.id
    }

    await connected_nodes[node_id].send_json(job_msg)
    print(f"JOB SENT to node {node_id} for job_id: {job_id}")

    try:
        output = await asyncio.wait_for(future, timeout=15)
        print(f"DEBUG: output for job_id {job_id} =", output)

        # Defensive handling
        if isinstance(output, dict):
            status_str = "success" if output.get("success") else "failure"
            result_str = output.get("output", "")
            duration = output.get("duration", 0)
        elif isinstance(output, str):
            status_str = "success"
            result_str = output
            duration = 0
        else:
            status_str = "failure"
            result_str = str(output)
            duration = 0

        # --- SANITY CHECK for duplicate job_id before save ---
        existing = db.query(JobResult).filter_by(job_id=job_id).first()
        if existing:
            print(f"WARN: JobResult with job_id={job_id} already exists in DB! Not saving duplicate.")
            raise HTTPException(status_code=400, detail="Duplicate job detected by existence check.")

        # Save as JobResult (ad-hoc/manual run)
        print(f"SAVING TO DB: job_id={job_id}, user={current_user.id}, status={status_str}")
        job_result = JobResult(
            job_id=job_id,
            user_id=current_user.id,
            job_type=tool,
            target=target,
            port=port,
            output=result_str,
            success=(status_str == "success"),
            created_at=datetime.utcnow(),
        )
        try:
            db.add(job_result)
            db.commit()
            db.refresh(job_result)
            print(f"SUCCESS: job_id={job_id} committed to DB.")
        except IntegrityError as e:
            db.rollback()
            print(f"DB Error: {e}")
            raise HTTPException(status_code=400, detail="Duplicate job detected. Please retry.")

        return DiagnosticResponse(
            id=job_result.id,
            tool=tool,
            target=target,
            status=status_str,
            result=result_str,
            port=port,
            execution_time=duration,
            created_at=job_result.created_at,
        )
    except asyncio.TimeoutError:
        pending_results.pop(job_id, None)
        pending_meta.pop(job_id, None)
        print(f"TIMEOUT: No result from probe node for job_id={job_id}")
        raise HTTPException(status_code=504, detail="Probe node did not return result in time.")

@router.get("/history", response_model=list[DiagnosticResponse])
def get_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    limit: int = 50
):
    results = (
        db.query(JobResult)
        .filter_by(user_id=current_user.id)
        .order_by(JobResult.created_at.desc())
        .limit(limit)
        .all()
    )
    return [
        DiagnosticResponse(
            id=r.id,
            tool=r.job_type,
            target=r.target,
            status="success" if r.success else "failure",
            result=r.output,
            port=r.port,
            execution_time=None,  # if you don't store, otherwise: r.execution_time
            created_at=r.created_at,
        )
        for r in results
    ]