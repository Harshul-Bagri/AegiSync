import uuid
from sqlalchemy import String, Boolean, DateTime, Text, ForeignKey, text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import DECIMAL
from sqlalchemy.sql import func

from database import Base


class Claim(Base):
    __tablename__ = "claims"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()")
    )
    worker_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("workers.id"), nullable=False)
    policy_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("policies.id"), nullable=False)
    disruption_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("disruptions.id"), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="pending", server_default="pending")
    claim_type: Mapped[str] = mapped_column(String(30), nullable=False)
    hours_lost: Mapped[float | None] = mapped_column(DECIMAL(4, 1), nullable=True)
    amount: Mapped[float] = mapped_column(DECIMAL(8, 2), nullable=False)
    fraud_score: Mapped[float | None] = mapped_column(DECIMAL(5, 2), nullable=True)
    bas_score: Mapped[float | None] = mapped_column(DECIMAL(5, 2), nullable=True)
    fraud_flags: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    fraud_method: Mapped[str | None] = mapped_column(String(50), nullable=True)
    review_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    reviewed_by: Mapped[str | None] = mapped_column(String(100), nullable=True)
    reviewed_at: Mapped[DateTime | None] = mapped_column(DateTime, nullable=True)
    auto_approved: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    retroactive: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    created_at: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now())
