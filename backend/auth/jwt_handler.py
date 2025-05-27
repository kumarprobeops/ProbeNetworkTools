from jose import jwt, JWTError
from datetime import datetime, timedelta
from utils.settings import SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    # Debug Code Starts 
    print(f"Token payload to encode: {to_encode}")
    print(f"SECRET_KEY used for JWT: {SECRET_KEY}") # Debug Code
    token = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    print(f"Encoded token: {token}")
    # Debug Code Ends
    return token

def decode_access_token(token: str):
    try:
        print(f"SECRET_KEY used for JWT: {SECRET_KEY}")
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        print(f"Decoded JWT payload: {payload}") # Debug Code
        return payload
    except JWTError as e:
        print(f"JWT decode error: {e}") # Debug Code
    return None
