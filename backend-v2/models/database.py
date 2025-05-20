from sqlalchemy import create_engine, event, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import DBAPIError, OperationalError
import time

# ✅ Use hardcoded DB string here
SQLALCHEMY_DATABASE_URL = "postgresql+psycopg2://postgres:postgres@db:5432/probeops"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=300,
    pool_timeout=30,
    pool_size=5,
    max_overflow=10
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    max_retries = 3
    retry_delay = 1
    db = None

    for retry in range(max_retries):
        db = SessionLocal()
        try:
            db.execute(text("SELECT 1"))
            break
        except (DBAPIError, OperationalError) as e:
            db.close()
            if retry < max_retries - 1:
                print(f"Database connection error, retrying ({retry+1}/{max_retries}): {str(e)}")
                time.sleep(retry_delay)
                retry_delay *= 2
            else:
                print(f"Failed to connect to database after {max_retries} attempts: {str(e)}")
                raise

    if db is None:
        raise RuntimeError("Failed to establish database connection")

    try:
        yield db
    finally:
        db.close()
