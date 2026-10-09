"""add lesson video progress

Revision ID: 7f4c1a8d2b6e
Revises: 2c20bd38e9eb
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "7f4c1a8d2b6e"
down_revision: Union[str, None] = "2c20bd38e9eb"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "lesson_progress",
        sa.Column("position_seconds", sa.Float(), nullable=True, server_default="0"),
    )


def downgrade() -> None:
    op.drop_column("lesson_progress", "position_seconds")