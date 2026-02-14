from sqlalchemy import text
from app.db.session import SessionLocal
import time

def check():
    try:
        db = SessionLocal()
        result = db.execute(text("SELECT * FROM users LIMIT 1"))
        print("Users table exists!")
        print(result.fetchall())
    except Exception as e:
        print(f"Error querying users table: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    check()
