"""
Bootstrap admin seeding for username-auth mode.

Creates admin/admin on first boot if no users exist.
Must call user_db.create() directly with a pre-hashed password to bypass
validate_password() complexity rules (the default password intentionally
does not meet complexity requirements — force-change is enforced at login).
"""

import logging

from fastapi_users.password import PasswordHelper
from sqlalchemy.exc import IntegrityError

from onyx.auth.schemas import UserRole
from onyx.configs.app_configs import USE_USERNAME_AUTH

BOOTSTRAP_USERNAME = "admin"
BOOTSTRAP_PASSWORD = "admin"  # User is forced to change this on first login
BOOTSTRAP_EMAIL = f"{BOOTSTRAP_USERNAME}@local.invalid"

logger = logging.getLogger(__name__)


async def seed_bootstrap_admin_if_needed() -> None:
    """Idempotent: only seeds if zero users exist and USE_USERNAME_AUTH=true."""
    if not USE_USERNAME_AUTH:
        return

    from fastapi_users_db_sqlalchemy import SQLAlchemyUserDatabase

    from onyx.db.auth import get_user_count
    from onyx.db.engine.async_sql_engine import get_async_session_context_manager
    from onyx.db.models import OAuthAccount
    from onyx.db.models import User

    async with get_async_session_context_manager() as session:
        count = await get_user_count()
        if count > 0:
            logger.info("Bootstrap skip: users already exist.")
            return

        password_helper = PasswordHelper()
        hashed = password_helper.hash(BOOTSTRAP_PASSWORD)

        user_db = SQLAlchemyUserDatabase(session, User, OAuthAccount)
        try:
            await user_db.create(
                {
                    "email": BOOTSTRAP_EMAIL,
                    "username": BOOTSTRAP_USERNAME,
                    "hashed_password": hashed,
                    "is_active": True,
                    "is_superuser": False,
                    "is_verified": True,
                    "role": UserRole.ADMIN,
                    "must_change_password": True,
                }
            )
            await session.commit()
        except IntegrityError:
            await session.rollback()
            logger.info(
                "Bootstrap skip: admin already created by another worker."
            )
            return

        logger.warning(
            "BOOTSTRAP: Created default admin user '%s'. "
            "CHANGE THIS PASSWORD IMMEDIATELY via Settings > Account.",
            BOOTSTRAP_USERNAME,
        )
