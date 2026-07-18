from core.gemma_client import GemmaClient
from agents.analytics.router import get_mock_invoices_payments
import pandas as pd

gemma = GemmaClient()

def draft_invoice_reminder(org_id: int, invoice_id: int, target_language: str = "English") -> str:
    """
    Drafts an invoice reminder message grounding all details in the invoice properties,
    translating to target_language.
    """
    df_inv, _ = get_mock_invoices_payments(org_id)
    match = df_inv[df_inv['id'] == invoice_id]
    
    if match.empty:
        return "Invoice not found."
        
    invoice = match.iloc[0]
    amount = invoice['amount']
    due_date = invoice['due_date']
    customer_id = invoice['customer_id']

    if gemma.mock_mode:
        # standard fallback templates
        if target_language.lower() in ["spanish", "es"]:
            return (
                f"Estimado cliente (ID: {customer_id}),\n\n"
                f"Le recordamos amablemente que la factura #{invoice_id} por un monto de ${amount:.2f} "
                f"venció el {due_date}. Agradecemos su pronta atención para resolver este saldo pendiente.\n\n"
                "Atentamente,\nEl Equipo de Finanzas"
            )
        return (
            f"Dear Customer (ID: {customer_id}),\n\n"
            f"This is a friendly reminder that invoice #{invoice_id} for the amount of ${amount:.2f} "
            f"was due on {due_date}. We would appreciate it if you could settle the balance at your earliest convenience.\n\n"
            "Best regards,\nThe Finance Team"
        )

    prompt = (
        f"Draft a polite but firm invoice payment reminder email to Customer (ID: {customer_id}) for invoice #{invoice_id}.\n"
        f"Amount due: ${amount:.2f}\n"
        f"Due date: {due_date}\n"
        f"Draft the email strictly in {target_language}.\n"
        "Never invent dates or payment links outside these details."
    )
    
    return gemma.complete_text(prompt)
