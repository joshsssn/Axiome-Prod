from sqlalchemy.orm import Session
from sqlalchemy import text, inspect
from app.core import security
from app.core.config import settings
from app.models.user import User

from app.db.base import Base
from app.db.session import engine

def init_db(db: Session) -> None:
    # Create tables if they don't exist (handles NEW tables like transactions, collaborators)
    Base.metadata.create_all(bind=engine)

    # Add missing columns to existing tables (create_all won't do this)
    _add_column_if_not_exists(db, "positions", "current_price", "FLOAT")

    user = db.query(User).filter(User.email == "admin@portfolio.io").first()
    

    if not user:
        user_in = User(
            email="admin@portfolio.io",
            username="admin",
            hashed_password=security.get_password_hash("admin"),
            role="admin",
            is_active=True,
        )
        db.add(user_in)
        db.commit()
        db.refresh(user_in)
        print("Admin user created")
    else:
        print("Admin user already exists")


def _add_column_if_not_exists(db: Session, table: str, column: str, col_type: str) -> None:
    """Safely add a column to an existing table if it doesn't exist yet."""
    try:
        insp = inspect(engine)
        columns = [c["name"] for c in insp.get_columns(table)]
        if column not in columns:
            db.execute(text(f'ALTER TABLE {table} ADD COLUMN {column} {col_type}'))
            db.commit()
            print(f"Added column {column} to {table}")
    except Exception as e:
        db.rollback()
        print(f"Column migration skipped ({table}.{column}): {e}")
