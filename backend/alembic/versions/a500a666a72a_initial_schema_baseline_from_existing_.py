"""initial schema — baseline from existing tables

Revision ID: a500a666a72a
Revises:
Create Date: 2026-04-12 21:38:19.280143

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a500a666a72a'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create all tables — idempotent (skips if tables exist)."""
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing = set(inspector.get_table_names())

    if "users" not in existing:
        op.create_table("users",
            sa.Column("id", sa.String(), primary_key=True),
            sa.Column("username", sa.String(50), unique=True, nullable=False, index=True),
            sa.Column("password_hash", sa.String(255), nullable=False),
            sa.Column("email", sa.String(255), nullable=True),
            sa.Column("display_name", sa.String(100), nullable=True),
            sa.Column("email_verified", sa.String(5), server_default="false"),
            sa.Column("verification_token", sa.String(100), nullable=True, index=True),
            sa.Column("created_at", sa.DateTime()),
            sa.Column("last_login", sa.DateTime(), nullable=True),
            sa.Column("is_active", sa.String(5), server_default="true"),
            sa.Column("user_type", sa.String(50), server_default=""),
            sa.Column("user_role", sa.String(100), server_default=""),
        )

    if "projects" not in existing:
        op.create_table("projects",
            sa.Column("id", sa.String(), primary_key=True),
            sa.Column("user_id", sa.String(), sa.ForeignKey("users.id"), nullable=False, index=True),
            sa.Column("name", sa.String(200), nullable=False),
            sa.Column("meta", sa.Text(), server_default=""),
            sa.Column("client", sa.String(200), server_default=""),
            sa.Column("industry", sa.String(100), server_default=""),
            sa.Column("size", sa.String(50), server_default=""),
            sa.Column("lead", sa.String(200), server_default=""),
            sa.Column("status", sa.String(50), server_default="Not Started"),
            sa.Column("created_at", sa.DateTime()),
            sa.Column("state_data", sa.JSON(), server_default="{}"),
        )

    if "password_resets" not in existing:
        op.create_table("password_resets",
            sa.Column("id", sa.String(), primary_key=True),
            sa.Column("user_id", sa.String(), sa.ForeignKey("users.id"), nullable=False),
            sa.Column("token", sa.String(100), unique=True, nullable=False, index=True),
            sa.Column("created_at", sa.DateTime()),
            sa.Column("used", sa.String(5), server_default="false"),
        )

    if "agent_sessions" not in existing:
        op.create_table("agent_sessions",
            sa.Column("id", sa.String(), primary_key=True),
            sa.Column("project_id", sa.String(), index=True, nullable=False),
            sa.Column("agent_name", sa.String(50), nullable=False),
            sa.Column("status", sa.String(20), server_default="running"),
            sa.Column("run_data", sa.JSON(), server_default="{}"),
            sa.Column("created_at", sa.DateTime()),
            sa.Column("completed_at", sa.DateTime(), nullable=True),
        )

    if "agent_events" not in existing:
        op.create_table("agent_events",
            sa.Column("id", sa.String(), primary_key=True),
            sa.Column("session_id", sa.String(), index=True, nullable=True),
            sa.Column("project_id", sa.String(), index=True, nullable=False),
            sa.Column("event_type", sa.String(50), nullable=False),
            sa.Column("agent", sa.String(50), nullable=False),
            sa.Column("data", sa.JSON(), server_default="{}"),
            sa.Column("timestamp", sa.DateTime()),
        )

    if "agent_memories" not in existing:
        op.create_table("agent_memories",
            sa.Column("id", sa.String(), primary_key=True),
            sa.Column("project_id", sa.String(), index=True, server_default=""),
            sa.Column("category", sa.String(100), nullable=False),
            sa.Column("content", sa.Text(), nullable=False),
            sa.Column("confidence", sa.String(10), server_default="0.8"),
            sa.Column("source_project", sa.String(), server_default=""),
            sa.Column("created_at", sa.DateTime()),
        )

    if "decision_log" not in existing:
        op.create_table("decision_log",
            sa.Column("id", sa.String(), primary_key=True),
            sa.Column("project_id", sa.String(), index=True, nullable=False),
            sa.Column("module", sa.String(100), server_default=""),
            sa.Column("decision_type", sa.String(100), server_default=""),
            sa.Column("detail", sa.Text(), server_default=""),
            sa.Column("user_id", sa.String(), server_default=""),
            sa.Column("created_at", sa.DateTime()),
        )

    if "annotations" not in existing:
        op.create_table("annotations",
            sa.Column("id", sa.String(), primary_key=True),
            sa.Column("project_id", sa.String(), index=True, nullable=False),
            sa.Column("module_id", sa.String(100), server_default=""),
            sa.Column("x_pct", sa.String(20), server_default="0"),
            sa.Column("y_pct", sa.String(20), server_default="0"),
            sa.Column("text", sa.Text(), server_default=""),
            sa.Column("color", sa.String(20), server_default="amber"),
            sa.Column("tag", sa.String(100), server_default=""),
            sa.Column("priority", sa.String(20), server_default="Medium"),
            sa.Column("resolved", sa.String(5), server_default="false"),
            sa.Column("author", sa.String(100), server_default=""),
            sa.Column("created_at", sa.DateTime()),
        )


def downgrade() -> None:
    """Drop all application tables."""
    for table in ["annotations", "decision_log", "agent_memories", "agent_events",
                  "agent_sessions", "password_resets", "projects", "users"]:
        op.drop_table(table)
