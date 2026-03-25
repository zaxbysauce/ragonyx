"""add_username_and_must_change_password_to_user

Revision ID: 954c86a74654
Revises: 25a5501dc766
Create Date: 2026-03-25 07:01:01.045558

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "954c86a74654"
down_revision = "25a5501dc766"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "user",
        sa.Column("username", sa.String(255), nullable=True),
    )
    op.add_column(
        "user",
        sa.Column(
            "must_change_password",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
    )
    op.create_index(
        "ix_user_username",
        "user",
        ["username"],
        unique=True,
        postgresql_where=sa.text("username IS NOT NULL"),
    )


def downgrade() -> None:
    op.drop_index("ix_user_username", table_name="user")
    op.drop_column("user", "must_change_password")
    op.drop_column("user", "username")
