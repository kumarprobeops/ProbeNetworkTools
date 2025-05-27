from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from core.database import get_db
from models.scheduled_probe import ScheduledProbe
from sqlalchemy.exc import IntegrityError
from schemas.scheduled_probe_schema import (
    ScheduledProbeCreate,
    ScheduledProbeUpdate,
    ScheduledProbeRead,
)
from core.dependencies import get_current_user
from models.user import User
from typing import List
from scheduler import schedule_probe, scheduler

router = APIRouter()

# List all scheduled probes for current user
@router.get("/", response_model=List[ScheduledProbeRead])
def list_scheduled_probes(
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    return db.query(ScheduledProbe).options(
        joinedload(ScheduledProbe.probe_results)
    ).filter(ScheduledProbe.user_id == current_user.id).all()

# Create a scheduled probe
@router.post("/", response_model=ScheduledProbeRead)
def create_scheduled_probe(
    probe: ScheduledProbeCreate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    new_probe = ScheduledProbe(
        **probe.dict(),
        user_id=current_user.id
    )
    db.add(new_probe)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A probe with this name already exists.")
    db.refresh(new_probe)
    if new_probe.is_active:
        # Just schedule; scheduler will run the first probe immediately (see scheduler.py)
        schedule_probe(new_probe)
    # Return with eager-loaded results
    return db.query(ScheduledProbe).options(
        joinedload(ScheduledProbe.probe_results)
    ).filter(ScheduledProbe.id == new_probe.id).first()

# Get a single scheduled probe by ID
@router.get("/{probe_id}", response_model=ScheduledProbeRead)
def get_scheduled_probe(
    probe_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    probe = db.query(ScheduledProbe).options(
        joinedload(ScheduledProbe.probe_results)
    ).filter(ScheduledProbe.id == probe_id, ScheduledProbe.user_id == current_user.id).first()
    if not probe:
        raise HTTPException(status_code=404, detail="Scheduled probe not found")
    return probe

# Update a scheduled probe
@router.put("/{probe_id}", response_model=ScheduledProbeRead)
def update_scheduled_probe(
    probe_id: int, 
    probe_update: ScheduledProbeUpdate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    probe = db.query(ScheduledProbe).filter(ScheduledProbe.id == probe_id, ScheduledProbe.user_id == current_user.id).first()
    if not probe:
        raise HTTPException(status_code=404, detail="Scheduled probe not found")
    for field, value in probe_update.dict(exclude_unset=True).items():
        setattr(probe, field, value)
    db.commit()
    db.refresh(probe)
    if probe.is_active:
        schedule_probe(probe)
    else:
        try:
            scheduler.remove_job(f"scheduled_probe_{probe.id}")
        except Exception:
            pass
    return db.query(ScheduledProbe).options(
        joinedload(ScheduledProbe.probe_results)
    ).filter(ScheduledProbe.id == probe.id).first()

# Pause or resume a scheduled probe (toggle is_active)
@router.post("/{probe_id}/toggle", response_model=ScheduledProbeRead)
def toggle_scheduled_probe(
    probe_id: int, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    probe = db.query(ScheduledProbe).filter(ScheduledProbe.id == probe_id, ScheduledProbe.user_id == current_user.id).first()
    if not probe:
        raise HTTPException(status_code=404, detail="Scheduled probe not found")
    probe.is_active = not probe.is_active
    db.commit()
    db.refresh(probe)
    if probe.is_active:
        schedule_probe(probe)
    else:
        try:
            scheduler.remove_job(f"scheduled_probe_{probe.id}")
        except Exception:
            pass
    return db.query(ScheduledProbe).options(
        joinedload(ScheduledProbe.probe_results)
    ).filter(ScheduledProbe.id == probe.id).first()

# Delete a scheduled probe
@router.delete("/{probe_id}", response_model=dict)
def delete_scheduled_probe(
    probe_id: int, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    probe = db.query(ScheduledProbe).filter(ScheduledProbe.id == probe_id, ScheduledProbe.user_id == current_user.id).first()
    if not probe:
        raise HTTPException(status_code=404, detail="Scheduled probe not found")
    db.delete(probe)
    db.commit()
    try:
        scheduler.remove_job(f"scheduled_probe_{probe.id}")
    except Exception:
        pass
    return {"message": "Probe deleted"}
