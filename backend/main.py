# This is Backend main.py

from fastapi import FastAPI, Depends, APIRouter
from routers.auth import router as auth_router
from schemas.user_schema import UserRead, UserLogin
from core.dependencies import get_current_user
from routers import users, probe_node_ws, api_keys, diagnostics, scheduled_probes
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from scheduler import scheduler, load_and_schedule_all_probes



app = FastAPI()

app.add_middleware(GZipMiddleware, minimum_size=1)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # <-- Frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(diagnostics.router, prefix="/diagnostics", tags=["Diagnostics"])
app.include_router(scheduled_probes.router, prefix="/scheduled_probes", tags=["Scheduled Probes"])

@app.get("/")
def read_root():
    return {"message": "ProbeOps backend is live!"}

# Register your /auth endpoints
app.include_router(auth_router, prefix="/auth")
app.include_router(probe_node_ws.router)
app.include_router(api_keys.router)

# Protected route example
@app.get("/protected")
def read_protected(current_user: UserRead = Depends(get_current_user)):
    return {"message": f"Welcome {current_user.username}!"}

app.include_router(users.router)

@app.on_event("startup")
def startup_event():
    load_and_schedule_all_probes()
    scheduler.start()
