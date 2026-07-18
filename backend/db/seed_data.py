import datetime
import random
from typing import Dict, Any, List

def generate_seed_data() -> Dict[str, List[Dict[str, Any]]]:
    """
    Generates 90 days of plausible synthetic transaction history, invoices, 
    customers, and vendors for a fictional business.
    """
    today = datetime.date.today()
    start_date = today - datetime.timedelta(days=90)
    
    # 1. Customers and Vendors seed lists
    customers = [
        {"name": "Acme Corp"},
        {"name": "Beta LLC"},
        {"name": "Charlie Co"}
    ]
    vendors = [
        {"name": "Delta Suppliers"},
        {"name": "Eco Power"},
        {"name": "RentCo"},
        {"name": "Tech Solutions"}
    ]

    transactions = []
    
    # Generate daily transaction log
    for i in range(91):
        current_date = start_date + datetime.timedelta(days=i)
        
        # Monthly Rent (RentCo)
        if current_date.day == 1:
            transactions.append({
                "date": current_date.isoformat(),
                "amount": 2000.00,
                "direction": "outflow",
                "category": "rent",
                "counterparty_name": "RentCo",
                "counterparty_type": "vendor",
                "raw_description": f"Monthly Office Rent - {current_date.strftime('%B %Y')}"
            })
            
        # Monthly Payroll
        if current_date.day == 28:
            transactions.append({
                "date": current_date.isoformat(),
                "amount": 4500.00,
                "direction": "outflow",
                "category": "payroll",
                "counterparty_name": "Employees Payroll",
                "counterparty_type": "other",
                "raw_description": f"Staff Payroll - {current_date.strftime('%B %Y')}"
            })
            
        # Regular Revenue (Acme Corp & Beta LLC) - Inflow every 4-5 days
        if i % 5 == 0:
            cust = customers[i % len(customers)]
            amt = round(random.uniform(2000.00, 4500.00), 2)
            transactions.append({
                "date": current_date.isoformat(),
                "amount": amt,
                "direction": "inflow",
                "category": "revenue",
                "counterparty_name": cust["name"],
                "counterparty_type": "customer",
                "raw_description": f"Payment received for Inv #{1000 + i}"
            })
            
        # Regular COGS (Delta Suppliers) - Outflow every 7 days
        if i % 7 == 0:
            amt = round(random.uniform(800.00, 1800.00), 2)
            transactions.append({
                "date": current_date.isoformat(),
                "amount": amt,
                "direction": "outflow",
                "category": "cogs",
                "counterparty_name": "Delta Suppliers",
                "counterparty_type": "vendor",
                "raw_description": f"Material purchase Ref-{9000 + i}"
            })
            
        # Monthly Utilities (Eco Power)
        if current_date.day == 10:
            amt = round(random.uniform(180.00, 290.00), 2)
            transactions.append({
                "date": current_date.isoformat(),
                "amount": amt,
                "direction": "outflow",
                "category": "utilities",
                "counterparty_name": "Eco Power",
                "counterparty_type": "vendor",
                "raw_description": f"Utility Bill In-{7800 + i}"
            })

        # --- ANOMALIES INJECTED ---
        # Spending Spike at Day 45 (Equipment Purchase)
        if i == 45:
            transactions.append({
                "date": current_date.isoformat(),
                "amount": 8500.00,
                "direction": "outflow",
                "category": "utilities",
                "counterparty_name": "Tech Solutions",
                "counterparty_type": "vendor",
                "raw_description": "EMERGENCY SERVER HARDWARE REPLACEMENT"
            })
            
        # Duplicate Payments at Day 75 & 76 (to Delta Suppliers)
        if i in (75, 76):
            transactions.append({
                "date": current_date.isoformat(),
                "amount": 1250.00,
                "direction": "outflow",
                "category": "cogs",
                "counterparty_name": "Delta Suppliers",
                "counterparty_type": "vendor",
                "raw_description": "INV-5564 Material purchase duplicate test"
            })

    # Invoices seed lists (mix of paid and overdue invoices)
    invoices = [
        {
            "customer_name": "Charlie Co",
            "amount": 3200.00,
            "issue_date": (today - datetime.timedelta(days=40)).isoformat(),
            "due_date": (today - datetime.timedelta(days=25)).isoformat(),
            "status": "pending"  # Overdue
        },
        {
            "customer_name": "Acme Corp",
            "amount": 4200.00,
            "issue_date": (today - datetime.timedelta(days=15)).isoformat(),
            "due_date": (today + datetime.timedelta(days=15)).isoformat(),
            "status": "pending"  # Pending
        },
        {
            "customer_name": "Beta LLC",
            "amount": 1500.00,
            "issue_date": (today - datetime.timedelta(days=60)).isoformat(),
            "due_date": (today - datetime.timedelta(days=45)).isoformat(),
            "status": "pending"  # Overdue
        }
    ]

    return {
        "customers": customers,
        "vendors": vendors,
        "transactions": transactions,
        "invoices": invoices
    }
