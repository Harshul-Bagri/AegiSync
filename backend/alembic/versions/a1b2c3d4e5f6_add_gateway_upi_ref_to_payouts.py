"""add_gateway_upi_ref_to_payouts

Revision ID: a1b2c3d4e5f6
Revises: 90246d1a8995
Create Date: 2026-04-17 22:14:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '90246d1a8995'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('payouts', sa.Column('upi_ref', sa.String(length=50), nullable=True))
    op.add_column('payouts', sa.Column(
        'gateway', sa.String(length=20), nullable=False,
        server_default='razorpay',
    ))


def downgrade() -> None:
    op.drop_column('payouts', 'gateway')
    op.drop_column('payouts', 'upi_ref')
