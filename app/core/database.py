from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, declarative_base

from app.core.config import settings


is_sqlite = settings.DATABASE_URL.startswith("sqlite")

engine_options = {
    "pool_pre_ping": True,
    "echo": False,
}

if is_sqlite:
    engine_options["connect_args"] = {
        "check_same_thread": False,
        "timeout": 30,
    }
else:
    engine_options.update(
        pool_recycle=280,
        pool_size=10,
        max_overflow=20,
    )

engine = create_engine(settings.DATABASE_URL, **engine_options)


if is_sqlite:
    @event.listens_for(engine, "connect")
    def configure_sqlite_connection(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA busy_timeout=30000")
        cursor.close()

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()