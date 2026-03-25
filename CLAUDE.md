# CLAUDE.md — onyx-username-auth fork

## Project Goal
Fork of onyx-dot-app/onyx. Replace email-centric auth with username/password auth.
Email field is RETAINED in DB for fastapi-users framework compatibility but treated
as an internal synthetic value (`<username>@local.invalid`). Username is the
canonical human-facing identifier everywhere.

## Architecture Notes
- Backend: FastAPI + fastapi-users library + SQLAlchemy async + Alembic migrations
- Frontend: Next.js (web/ directory)
- Auth layer: backend/onyx/auth/ — users.py is the main file (~85KB, read carefully)
- User model: backend/onyx/db/models.py — class User(SQLAlchemyBaseUserTableUUID)
- Password validation: UserManager.validate_password() — uses env vars for policy
- Admin seeding hook: get_default_admin_user_emails_() in users.py — returns [] for MIT build
- Bootstrap admin MUST call user_db.create() directly with pre-hashed password to
  bypass validate_password() (default "admin" would fail complexity rules otherwise)
- must_change_password flag: hook into on_after_login() in UserManager

## Key Constraints
- DO NOT delete email column from User model — fastapi-users ORM requires it
- DO NOT break existing Alembic migration chain — always add new migrations, never edit old ones
- DO NOT modify EE-only code paths (anything behind fetch_ee_implementation_or_noop)
- Multi-tenant (MULTI_TENANT=true) paths are out of scope — single-tenant only
- Password policy env vars (PASSWORD_MIN_LENGTH etc.) must be respected everywhere EXCEPT
  bootstrap admin creation (use direct DB insert with pre-hashed password)

## File Change Scope (Phase-Ordered)
Phase 1: DB + Migration
  - backend/onyx/db/models.py
  - backend/alembic/versions/ (new file)

Phase 2: Backend Auth
  - backend/onyx/auth/users.py
  - backend/onyx/auth/schemas.py
  - backend/onyx/db/users.py
  - backend/onyx/db/auth.py
  - backend/onyx/configs/app_configs.py

Phase 3: Bootstrap Seeding
  - backend/onyx/main.py (or app startup hook)

Phase 4: Frontend
  - web/src/app/auth/login/page.tsx (or equivalent)
  - web/src/app/auth/signup/page.tsx
  - web/src/components/admin/users/ (management UI)

Phase 5: Config/Deploy
  - docker-compose.dev.yml
  - .env.example
  - deployment/docker_compose/docker-compose.yml

## Commands
- Run migrations: cd backend && alembic upgrade head
- Run backend: cd backend && uvicorn onyx.main:app --reload
- Run frontend: cd web && npm run dev
- Lint Python: cd backend && ruff check .
- Type check: cd backend && mypy onyx/

## Do Not Touch
- backend/onyx/auth/oauth_refresher.py (OAuth token refresh, unrelated)
- backend/onyx/auth/oauth_token_manager.py
- backend/ee/ directory (Enterprise Edition)
- Any file under onyx/server/tenants/ (multi-tenant)