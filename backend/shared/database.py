import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "sqlite:///E:/dexter/backend/orbital_sentinel.db"
)

# SQLite-specific thread safety argument
connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    """
    FastAPI Dependency helper that yields a new SQLAlchemy session
    and guarantees it will be closed after the request is finished.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
