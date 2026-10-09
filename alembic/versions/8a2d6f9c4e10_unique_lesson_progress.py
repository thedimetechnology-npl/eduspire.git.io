"""enforce one progress record per student and lesson

Revision ID: 8a2d6f9c4e10
Revises: 7f4c1a8d2b6e
"""

from typing import Sequence, Union

from alembic import op


revision: str = "8a2d6f9c4e10"
down_revision: Union[str, None] = "7f4c1a8d2b6e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        DELETE FROM lesson_progress
        WHERE id NOT IN (
            SELECT MIN(id)
            FROM lesson_progress
            GROUP BY student_id, lesson_id
        )
        """
    )
    op.create_index(
        "uq_lesson_progress_student_lesson",
        "lesson_progress",
        ["student_id", "lesson_id"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index("uq_lesson_progress_student_lesson", table_name="lesson_progress")