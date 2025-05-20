from fastapi import FastAPI, Depends, APIRouter
from routers.auth import router as auth_router
from schemas.user_schema import UserRead, UserLogin
from utils.auth import get_current_user

app = FastAPI()

@app.get("/")
def read_root():
    return {"message": "ProbeOps backend is live!"}

# Register your /auth endpoints
app.include_router(auth_router, prefix="/auth")

# Protected route example
@app.get("/protected")
def read_protected(current_user: UserRead = Depends(get_current_user)):
    return {"message": f"Welcome {current_user.username}!"}
