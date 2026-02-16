from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.user import User
from app.core import security
import logging

logger = logging.getLogger(__name__)

def force_reset_admin_password():
    """
    Force reset the admin password to 'newpass123' on startup.
    This is a temporary fix for deployment troubleshooting.
    """
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.username == "admin").first()
        if user:
            new_password = "newpass123"
            user.hashed_password = security.get_password_hash(new_password)
            db.commit()
            logger.warning(f"SECURITY WARNING: Admin password force-reset to '{new_password}'")
        else:
            logger.warning("Admin user not found for password reset.")
    except Exception as e:
        logger.error(f"Failed to reset admin password: {e}")
    finally:
        db.close()
