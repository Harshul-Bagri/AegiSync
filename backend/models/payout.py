import uuid
from sqlalchemy import String, DateTime, Text, ForeignKey, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import DECIMAL
from sqlalchemy.sql import func

from database import Base


class Payout(Base):
    __tablename__ = "payouts"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=text("gen_random_uuid()")
    )
    claim_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("claims.id"), nullable=False)
    worker_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("workers.id"), nullable=False)
    amount: Mapped[float] = mapped_column(DECIMAL(8, 2), nullable=False)
    upi_id: Mapped[str] = mapped_column(String(100), nullable=False)
    razorpay_ref: Mapped[str | None] = mapped_column(String(100), nullable=True)
    upi_ref: Mapped[str | None] = mapped_column(String(50), nullable=True)
    gateway: Mapped[str] = mapped_column(String(20), default="razorpay", server_default="razorpay")
    status: Mapped[str] = mapped_column(String(20), default="pending", server_default="pending")
    initiated_at: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now())
    completed_at: Mapped[DateTime | None] = mapped_column(DateTime, nullable=True)
    failure_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
