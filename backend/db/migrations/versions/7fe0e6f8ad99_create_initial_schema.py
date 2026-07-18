"""create_initial_schema

Revision ID: 7fe0e6f8ad99
Revises: 
Create Date: 2026-07-18 11:06:24.922514

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from pgvector.sqlalchemy import Vector

# revision identifiers, used by Alembic.
revision: str = '7fe0e6f8ad99'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Enable pgvector extension
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    # 2. Documents table
    op.create_table(
        'documents',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('org_id', sa.Integer(), nullable=False),
        sa.Column('source_type', sa.String(length=255), nullable=True),
        sa.Column('source_name', sa.String(length=255), nullable=True),
        sa.Column('chunk_text', sa.Text(), nullable=False),
        sa.Column('embedding', Vector(dim=768), nullable=True),
        sa.Column('metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=True)
    )
    op.create_index('idx_documents_org_id_created_at', 'documents', ['org_id', 'created_at'])

    # 3. Customers table
    op.create_table(
        'customers',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('org_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=True)
    )
    op.create_index('idx_customers_org_id_created_at', 'customers', ['org_id', 'created_at'])

    # 4. Vendors table
    op.create_table(
        'vendors',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('org_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=True)
    )
    op.create_index('idx_vendors_org_id_created_at', 'vendors', ['org_id', 'created_at'])

    # 5. Transactions table
    op.create_table(
        'transactions',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('org_id', sa.Integer(), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('amount', sa.Numeric(precision=15, scale=2), nullable=False),
        sa.Column('direction', sa.String(length=50), nullable=False),
        sa.Column('category', sa.String(length=255), nullable=True),
        sa.Column('counterparty_name', sa.String(length=255), nullable=True),
        sa.Column('counterparty_type', sa.String(length=50), nullable=True),
        sa.Column('source_document_id', sa.Integer(), sa.ForeignKey('documents.id', ondelete='SET NULL'), nullable=True),
        sa.Column('raw_description', sa.Text(), nullable=True),
        sa.Column('is_duplicate_flag', sa.Boolean(), server_default=sa.text('false'), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=True),
        sa.CheckConstraint("direction IN ('inflow', 'outflow')", name='chk_transactions_direction'),
        sa.CheckConstraint("counterparty_type IN ('customer', 'vendor', 'other')", name='chk_transactions_counterparty_type')
    )
    op.create_index('idx_transactions_org_id_date', 'transactions', ['org_id', 'date'])

    # 6. Revenue table
    op.create_table(
        'revenue',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('org_id', sa.Integer(), nullable=False),
        sa.Column('amount', sa.Numeric(precision=15, scale=2), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('source', sa.String(length=255), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=True)
    )
    op.create_index('idx_revenue_org_id_date', 'revenue', ['org_id', 'date'])

    # 7. Expenses table
    op.create_table(
        'expenses',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('org_id', sa.Integer(), nullable=False),
        sa.Column('amount', sa.Numeric(precision=15, scale=2), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('category', sa.String(length=255), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=True)
    )
    op.create_index('idx_expenses_org_id_date', 'expenses', ['org_id', 'date'])

    # 8. Invoices table (initially without circular FK constraint)
    op.create_table(
        'invoices',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('org_id', sa.Integer(), nullable=False),
        sa.Column('customer_id', sa.Integer(), sa.ForeignKey('customers.id', ondelete='SET NULL'), nullable=True),
        sa.Column('amount', sa.Numeric(precision=15, scale=2), nullable=False),
        sa.Column('issue_date', sa.Date(), nullable=False),
        sa.Column('due_date', sa.Date(), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False),
        sa.Column('paid_date', sa.Date(), nullable=True),
        sa.Column('linked_payment_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=True),
        sa.CheckConstraint("status IN ('pending', 'paid', 'overdue')", name='chk_invoices_status')
    )
    op.create_index('idx_invoices_org_id_issue_date', 'invoices', ['org_id', 'issue_date'])
    op.create_index('idx_invoices_org_id_due_date', 'invoices', ['org_id', 'due_date'])

    # 9. Payments table
    op.create_table(
        'payments',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('org_id', sa.Integer(), nullable=False),
        sa.Column('invoice_id', sa.Integer(), sa.ForeignKey('invoices.id', ondelete='SET NULL'), nullable=True),
        sa.Column('amount', sa.Numeric(precision=15, scale=2), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('method', sa.String(length=100), nullable=False),
        sa.Column('matched_transaction_id', sa.Integer(), sa.ForeignKey('transactions.id', ondelete='SET NULL'), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=True)
    )
    op.create_index('idx_payments_org_id_date', 'payments', ['org_id', 'date'])

    # 10. Add circular foreign key to invoices now that payments exists
    op.create_foreign_key(
        'fk_invoices_linked_payment',
        'invoices', 'payments',
        ['linked_payment_id'], ['id'],
        ondelete='SET NULL'
    )

    # 11. Cash Balances table
    op.create_table(
        'cash_balances',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('org_id', sa.Integer(), nullable=False),
        sa.Column('balance', sa.Numeric(precision=15, scale=2), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=True)
    )
    op.create_index('idx_cash_balances_org_id_date', 'cash_balances', ['org_id', 'date'])

    # 12. GST Data table
    op.create_table(
        'gst_data',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('org_id', sa.Integer(), nullable=False),
        sa.Column('period', sa.String(length=50), nullable=False),
        sa.Column('amount_collected', sa.Numeric(precision=15, scale=2), nullable=False),
        sa.Column('amount_paid', sa.Numeric(precision=15, scale=2), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=True)
    )
    op.create_index('idx_gst_data_org_id_created_at', 'gst_data', ['org_id', 'created_at'])

    # 13. Forecast Data table
    op.create_table(
        'forecast_data',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('org_id', sa.Integer(), nullable=False),
        sa.Column('horizon_days', sa.Integer(), nullable=False),
        sa.Column('p10', sa.Numeric(precision=15, scale=2), nullable=False),
        sa.Column('p50', sa.Numeric(precision=15, scale=2), nullable=False),
        sa.Column('p90', sa.Numeric(precision=15, scale=2), nullable=False),
        sa.Column('generated_at', sa.DateTime(), server_default=sa.func.now(), nullable=True),
        sa.Column('model_version', sa.String(length=50), nullable=False),
        sa.Column('needs_recompute', sa.Boolean(), server_default=sa.text('true'), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=True),
        sa.CheckConstraint('horizon_days IN (30, 60, 90)', name='chk_forecast_data_horizon_days')
    )
    op.create_index('idx_forecast_data_org_id_generated_at', 'forecast_data', ['org_id', 'generated_at'])

    # 14. Reliability Scores table
    op.create_table(
        'reliability_scores',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('org_id', sa.Integer(), nullable=False),
        sa.Column('entity_id', sa.Integer(), nullable=False),
        sa.Column('entity_type', sa.String(length=50), nullable=False),
        sa.Column('score', sa.Numeric(precision=5, scale=2), nullable=False),
        sa.Column('avg_delay_days', sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column('consistency_rating', sa.String(length=50), nullable=True),
        sa.Column('last_computed_at', sa.DateTime(), server_default=sa.func.now(), nullable=True),
        sa.Column('needs_recompute', sa.Boolean(), server_default=sa.text('true'), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=True),
        sa.CheckConstraint("entity_type IN ('customer', 'vendor')", name='chk_reliability_scores_entity_type'),
        sa.CheckConstraint('score >= 0.0 AND score <= 100.0', name='chk_reliability_scores_score')
    )
    op.create_index('idx_reliability_scores_org_id_last_computed', 'reliability_scores', ['org_id', 'last_computed_at'])

    # 15. Anomalies table
    op.create_table(
        'anomalies',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('org_id', sa.Integer(), nullable=False),
        sa.Column('type', sa.String(length=100), nullable=False),
        sa.Column('severity', sa.String(length=50), nullable=False),
        sa.Column('related_transaction_id', sa.Integer(), sa.ForeignKey('transactions.id', ondelete='SET NULL'), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('detected_at', sa.DateTime(), server_default=sa.func.now(), nullable=True),
        sa.Column('resolved', sa.Boolean(), server_default=sa.text('false'), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=True),
        sa.CheckConstraint("type IN ('duplicate_payment', 'spending_spike', 'missing_payment', 'revenue_drop')", name='chk_anomalies_type')
    )
    op.create_index('idx_anomalies_org_id_detected_at', 'anomalies', ['org_id', 'detected_at'])


def downgrade() -> None:
    # Drop in reverse order to respect foreign keys
    op.drop_table('anomalies')
    op.drop_table('reliability_scores')
    op.drop_table('forecast_data')
    op.drop_table('gst_data')
    op.drop_table('cash_balances')
    
    # Remove circular reference
    op.drop_constraint('fk_invoices_linked_payment', 'invoices', type_='foreignkey')
    
    op.drop_table('payments')
    op.drop_table('invoices')
    op.drop_table('expenses')
    op.drop_table('revenue')
    op.drop_table('transactions')
    op.drop_table('vendors')
    op.drop_table('customers')
    op.drop_table('documents')
    
    # Disable vector extension (if desired, though usually kept)
    op.execute("DROP EXTENSION IF EXISTS vector")
