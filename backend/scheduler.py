import asyncio
from routers.probe_node_ws import connected_nodes, pending_results, pending_meta
from models.probe_result import ProbeResult
from sqlalchemy.orm import Session
from datetime import datetime
from apscheduler.schedulers.background import BackgroundScheduler
from models.scheduled_probe import ScheduledProbe
from core.database import SessionLocal
from threading import Thread

scheduler = BackgroundScheduler()

def run_scheduled_probe(probe_id: int):
    db = SessionLocal()
    try:
        probe = db.query(ScheduledProbe).filter(ScheduledProbe.id == probe_id, ScheduledProbe.is_active == True).first()
        if not probe:
            print(f"[Scheduler] Scheduled probe {probe_id} not found or not active.")
            return

        if not connected_nodes:
            print("[Scheduler] No probe nodes connected!")
            return
        node_id = next(iter(connected_nodes.keys()))

        job_id = f"scheduled_{probe.id}_{int(datetime.utcnow().timestamp())}"
        job_msg = {
            "action": "job",
            "job_id": job_id,
            "job_type": probe.tool,
            "target": probe.target,
            "params": {
                "target": probe.target
            }
        }

        async def async_job():
            loop = asyncio.get_event_loop()
            future = loop.create_future()
            pending_results[job_id] = future
            pending_meta[job_id] = {
                "job_type": probe.tool,
                "target": probe.target,
                "scheduled_probe_id": probe.id,
                "user_id": probe.user_id,
            }
            await connected_nodes[node_id].send_json(job_msg)
            try:
                output = await asyncio.wait_for(future, timeout=30)
                result_row = ProbeResult(
                    scheduled_probe_id=probe.id,
                    result=output.get("output") if isinstance(output, dict) else str(output),
                    status="success" if (isinstance(output, dict) and output.get("success", True)) else "failure",
                    execution_time=0,
                    created_at=datetime.utcnow(),
                )
                db.add(result_row)
                db.commit()
                print(f"[Scheduler] Saved ProbeResult for scheduled_probe_id={probe.id}")
            except Exception as e:
                print(f"[Scheduler] Error running scheduled probe: {e}")
            finally:
                pending_results.pop(job_id, None)
                pending_meta.pop(job_id, None)

        asyncio.run(async_job())

    except Exception as e:
        print(f"[Scheduler] Exception in run_scheduled_probe: {e}")
    finally:
        db.close()

def schedule_probe(probe: ScheduledProbe):
    job_id = f"scheduled_probe_{probe.id}"
    try:
        scheduler.remove_job(job_id)
    except Exception:
        pass
    scheduler.add_job(
        run_scheduled_probe,
        'interval',
        minutes=probe.interval_minutes,
        id=job_id,
        args=[probe.id],
        replace_existing=True,
        misfire_grace_time=60,
        next_run_time=datetime.utcnow(),   # schedule to run immediately and then on interval
    )
    # Run the first probe immediately (in a background thread, non-blocking!)
    Thread(target=run_scheduled_probe, args=(probe.id,)).start()

def load_and_schedule_all_probes():
    db = SessionLocal()
    try:
        active_probes = db.query(ScheduledProbe).filter(ScheduledProbe.is_active == True).all()
        for probe in active_probes:
            schedule_probe(probe)
    finally:
        db.close()
