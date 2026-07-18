from sqlalchemy import Column, Integer, String, Numeric, Date, DateTime, Boolean, Text, ForeignKey, Index, CheckConstraint, text as sa_text
from sqlalchemy.orm import declarative_base, relationship
from sqlalchemy.dialects.postgresql import JSONB
from pgvector.sqlalchemy import Vector
import datetime

Base = declarative_base()

class Document(Base):
    __tablename__ = 'documents'

    id = Column(Integer, primary_key=True, autoincrement=True)
    org_id = Column(Integer, nullable=False)
    source_type = Column(String(255))
    source_name = Column(String(255))
    chunk_text = Column(Text, nullable=False)
    embedding = Column(Vector(768))
    metadata_ = Column('metadata', JSONB) # mapped to 'metadata' column to avoid conflict with Base.metadata
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    __table_args__ = (
        Index('idx_documents_org_id_created_at', 'org_id', 'created_at'),
    )


class Customer(Base):
    __tablename__ = 'customers'

    id = Column(Integer, primary_key=True, autoincrement=True)
    org_id = Column(Integer, nullable=False)
    name = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    invoices = relationship("Invoice", back_populates="customer")

    __table_args__ = (
        Index('idx_customers_org_id_created_at', 'org_id', 'created_at'),
    )


class Vendor(Base):
    __tablename__ = 'vendors'

    id = Column(Integer, primary_key=True, autoincrement=True)
    org_id = Column(Integer, nullable=False)
    name = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    __table_args__ = (
        Index('idx_vendors_org_id_created_at', 'org_id', 'created_at'),
    )


class Transaction(Base):
    __tablename__ = 'transactions'

    id = Column(Integer, primary_key=True, autoincrement=True)
    org_id = Column(Integer, nullable=False)
    date = Column(Date, nullable=False)
    amount = Column(Numeric(15, 2), nullable=False)
    direction = Column(String(50), nullable=False)
    category = Column(String(255))
    counterparty_name = Column(String(255))
    counterparty_type = Column(String(50))
    source_document_id = Column(Integer, ForeignKey('documents.id', ondelete='SET NULL'), nullable=True)
    raw_description = Column(Text)
    is_duplicate_flag = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    source_document = relationship("Document")

    __table_args__ = (
        CheckConstraint(direction.in_(['inflow', 'outflow']), name='chk_transactions_direction'),
        CheckConstraint(counterparty_type.in_(['customer', 'vendor', 'other']), name='chk_transactions_counterparty_type'),
        Index('idx_transactions_org_id_date', 'org_id', 'date'),
    )


class Revenue(Base):
    __tablename__ = 'revenue'

    id = Column(Integer, primary_key=True, autoincrement=True)
    org_id = Column(Integer, nullable=False)
    amount = Column(Numeric(15, 2), nullable=False)
    date = Column(Date, nullable=False)
    source = Column(String(255))
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    __table_args__ = (
        Index('idx_revenue_org_id_date', 'org_id', 'date'),
    )


class Expense(Base):
    __tablename__ = 'expenses'

    id = Column(Integer, primary_key=True, autoincrement=True)
    org_id = Column(Integer, nullable=False)
    amount = Column(Numeric(15, 2), nullable=False)
    date = Column(Date, nullable=False)
    category = Column(String(255))
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    __table_args__ = (
        Index('idx_expenses_org_id_date', 'org_id', 'date'),
    )


class Invoice(Base):
    __tablename__ = 'invoices'

    id = Column(Integer, primary_key=True, autoincrement=True)
    org_id = Column(Integer, nullable=False)
    customer_id = Column(Integer, ForeignKey('customers.id', ondelete='SET NULL'), nullable=True)
    amount = Column(Numeric(15, 2), nullable=False)
    issue_date = Column(Date, nullable=False)
    due_date = Column(Date, nullable=False)
    status = Column(String(50), nullable=False)
    paid_date = Column(Date, nullable=True)
    linked_payment_id = Column(Integer, ForeignKey('payments.id', ondelete='SET NULL'), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    customer = relationship("Customer", back_populates="invoices")
    payments = relationship("Payment", foreign_keys="[Payment.invoice_id]", back_populates="invoice")
    linked_payment = relationship("Payment", foreign_keys="[Invoice.linked_payment_id]")

    __table_args__ = (
        CheckConstraint(status.in_(['pending', 'paid', 'overdue']), name='chk_invoices_status'),
        Index('idx_invoices_org_id_issue_date', 'org_id', 'issue_date'),
        Index('idx_invoices_org_id_due_date', 'org_id', 'due_date'),
    )


class Payment(Base):
    __tablename__ = 'payments'

    id = Column(Integer, primary_key=True, autoincrement=True)
    org_id = Column(Integer, nullable=False)
    invoice_id = Column(Integer, ForeignKey('invoices.id', ondelete='SET NULL'), nullable=True)
    amount = Column(Numeric(15, 2), nullable=False)
    date = Column(Date, nullable=False)
    method = Column(String(100), nullable=False)
    matched_transaction_id = Column(Integer, ForeignKey('transactions.id', ondelete='SET NULL'), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    invoice = relationship("Invoice", foreign_keys="[Payment.invoice_id]", back_populates="payments")
    matched_transaction = relationship("Transaction")

    __table_args__ = (
        Index('idx_payments_org_id_date', 'org_id', 'date'),
    )


class CashBalance(Base):
    __tablename__ = 'cash_balances'

    id = Column(Integer, primary_key=True, autoincrement=True)
    org_id = Column(Integer, nullable=False)
    balance = Column(Numeric(15, 2), nullable=False)
    date = Column(Date, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    __table_args__ = (
        Index('idx_cash_balances_org_id_date', 'org_id', 'date'),
    )


class GSTData(Base):
    __tablename__ = 'gst_data'

    id = Column(Integer, primary_key=True, autoincrement=True)
    org_id = Column(Integer, nullable=False)
    period = Column(String(50), nullable=False)
    amount_collected = Column(Numeric(15, 2), nullable=False)
    amount_paid = Column(Numeric(15, 2), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    __table_args__ = (
        Index('idx_gst_data_org_id_created_at', 'org_id', 'created_at'),
    )


class ForecastData(Base):
    __tablename__ = 'forecast_data'

    id = Column(Integer, primary_key=True, autoincrement=True)
    org_id = Column(Integer, nullable=False)
    horizon_days = Column(Integer, nullable=False)
    p10 = Column(Numeric(15, 2), nullable=False)
    p50 = Column(Numeric(15, 2), nullable=False)
    p90 = Column(Numeric(15, 2), nullable=False)
    generated_at = Column(DateTime, default=datetime.datetime.utcnow)
    model_version = Column(String(50), nullable=False)
    needs_recompute = Column(Boolean, default=True, server_default=sa_text('true'))
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    __table_args__ = (
        CheckConstraint(horizon_days.in_([30, 60, 90]), name='chk_forecast_data_horizon_days'),
        Index('idx_forecast_data_org_id_generated_at', 'org_id', 'generated_at'),
    )


class ReliabilityScore(Base):
    __tablename__ = 'reliability_scores'

    id = Column(Integer, primary_key=True, autoincrement=True)
    org_id = Column(Integer, nullable=False)
    entity_id = Column(Integer, nullable=False)
    entity_type = Column(String(50), nullable=False)
    score = Column(Numeric(5, 2), nullable=False)
    avg_delay_days = Column(Numeric(10, 2))
    consistency_rating = Column(String(50))
    last_computed_at = Column(DateTime, default=datetime.datetime.utcnow)
    needs_recompute = Column(Boolean, default=True, server_default=sa_text('true'))
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    __table_args__ = (
        CheckConstraint(entity_type.in_(['customer', 'vendor']), name='chk_reliability_scores_entity_type'),
        CheckConstraint((score >= 0.0) & (score <= 100.0), name='chk_reliability_scores_score'),
        Index('idx_reliability_scores_org_id_last_computed', 'org_id', 'last_computed_at'),
    )


class Anomaly(Base):
    __tablename__ = 'anomalies'

    id = Column(Integer, primary_key=True, autoincrement=True)
    org_id = Column(Integer, nullable=False)
    type = Column(String(100), nullable=False)
    severity = Column(String(50), nullable=False)
    related_transaction_id = Column(Integer, ForeignKey('transactions.id', ondelete='SET NULL'), nullable=True)
    description = Column(Text)
    detected_at = Column(DateTime, default=datetime.datetime.utcnow)
    resolved = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    related_transaction = relationship("Transaction")

    __table_args__ = (
        CheckConstraint(type.in_(['duplicate_payment', 'spending_spike', 'missing_payment', 'revenue_drop']), name='chk_anomalies_type'),
        Index('idx_anomalies_org_id_detected_at', 'org_id', 'detected_at'),
    )
