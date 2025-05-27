from pydantic import BaseModel

class UserLogin(BaseModel):
    username: str
    password: str

class UserRead(BaseModel):
    id: int
    username: str
    role: str

    class Config:
        from_attributes = True

