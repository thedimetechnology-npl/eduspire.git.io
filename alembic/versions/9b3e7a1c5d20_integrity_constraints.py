"""add enrollment and attendance uniqueness constraints

Revision ID: 9b3e7a1c5d20
Revises: 8a2d6f9c4e10
"""

from typing import Sequence, Union

from alembic import op


revision: str = "9b3e7a1c5d20"
down_revision: Union[str, None] = "8a2d6f9c4e10"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        DELETE FROM enrollments
        WHERE id NOT IN (
            SELECT MIN(id) FROM enrollments GROUP BY student_id, course_id
        )
        """
    )
    op.execute(
        """
        DELETE FROM attendance
        WHERE live_class_id IS NOT NULL AND id NOT IN (
            SELECT MIN(id) FROM attendance GROUP BY student_id, live_class_id
        )
        """
    )
    op.create_index("uq_enrollment_student_course", "enrollments", ["student_id", "course_id"], unique=True)
    op.create_index("uq_attendance_student_live_class", "attendance", ["student_id", "live_class_id"], unique=True)


def downgrade() -> None:
    op.drop_index("uq_attendance_student_live_class", table_name="attendance")
    op.drop_index("uq_enrollment_student_course", table_name="enrollments")