import sys
import os

# Ensure the backend directory is in the import path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from agents.course_of_action.compiler import DynamicContextCompiler, CONVERSATION_HISTORY
from agents.document_intelligence.retrieval import IN_MEMORY_DOCS
from agents.document_intelligence.embeddings import get_embedding

def setup_mock_documents():
    """Sets up some mock RAG documents for document queries."""
    IN_MEMORY_DOCS.clear()
    IN_MEMORY_DOCS.append({
        "org_id": 1,
        "source_name": "loan_agreement.txt",
        "section_label": "Section 4.2",
        "page_number": 3,
        "chunk_text": "The loan agreement allows early repayment with a penalty of 1.5% of the outstanding principal balance if repaid within the first 12 months.",
        "embedding": get_embedding("The loan agreement allows early repayment with a penalty of 1.5% of the outstanding principal balance if repaid within the first 12 months.")
    })
    IN_MEMORY_DOCS.append({
        "org_id": 1,
        "source_name": "vendor_contract.txt",
        "section_label": "Section 9",
        "page_number": 1,
        "chunk_text": "Payment terms: Net 30 days from the invoice date. Late payments accrue interest at 1% per month.",
        "embedding": get_embedding("Payment terms: Net 30 days from the invoice date. Late payments accrue interest at 1% per month.")
    })

def main():
    print("======================================================================")
    print("THESEUS Dynamic Context Compiler Integration Test")
    print("======================================================================")
    
    setup_mock_documents()
    compiler = DynamicContextCompiler()
    
    # Enable mock mode for Gemma interaction
    compiler.gemma.mock_mode = True
    
    test_queries = [
        {
            "desc": "1. Current cash balance query (financial_metric intent)",
            "query": "What is our current cash balance and how much revenue did we make this month?",
            "lang": "English"
        },
        {
            "desc": "2. Runway forecast query (forecast intent)",
            "query": "What is our daily burn rate and how long will our runway last?",
            "lang": "English"
        },
        {
            "desc": "3. RAG Document lookup (document intent)",
            "query": "Does my loan allow early repayment?",
            "lang": "English"
        },
        {
            "desc": "4. Invoice drafting in Spanish (invoice_drafting intent, Spanish language preference)",
            "query": "Draft an invoice reminder for invoice #3",
            "lang": "Spanish"
        },
        {
            "desc": "5. Prioritized advice query (recommendation intent)",
            "query": "What recommendations or action plans do you suggest?",
            "lang": "English"
        }
    ]
    
    org_id = 1
    
    for item in test_queries:
        print(f"\n--- Running: {item['desc']} ---")
        print(f"User Query: \"{item['query']}\" (Language: {item['lang']})")
        
        # 1. Intent Classification
        intent = compiler.classify_intent(item['query'])
        print(f"Classified Intent: {intent}")
        
        # 2. Gather Context
        context = compiler.gather_context(org_id, intent, item['query'], db=None)
        print(f"Gathered Context Keys: {list(context.keys())}")
        
        # 3. Compile and execute
        response = compiler.compile_and_run(org_id, item['query'], item['lang'], db=None)
        print(f"Compiler Response:\n{response}")
        print("-" * 70)
        
    print("\nVerifying Conversation History State (Memory):")
    history = CONVERSATION_HISTORY.get(org_id, [])
    print(f"Total turns logged in memory: {len(history) // 2}")
    for idx, msg in enumerate(history):
        role = "User" if msg["role"] == "user" else "Assistant"
        print(f"  Turn {idx//2 + 1} - {role}: {msg['content'][:100]}...")

if __name__ == "__main__":
    main()
