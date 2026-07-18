# THESEUS: AI-Powered SME Cash Flow Copilot

THESEUS is an AI-powered copilot designed to manage and optimize cash flow for SMEs.

## Architecture

The system utilizes a four-agent pipeline orchestrated by Google's Gemma 12B model:

1. **Onboarding Agent**: Handles the initial setup and data ingestion.
2. **Analytics Agent**: Analyzes the financial data (revenue, expenses, cash balances).
3. **Course of Action Agent**: Recommends strategic decisions based on analytics.
4. **Document Intelligence Agent**: Extracts data from uploaded financial documents using embeddings.

*Note: All financial math is deterministic (Pandas/NumPy/Prophet) and never LLM-generated.*

## Local Setup

### Prerequisites
- Node.js (for frontend)
- Python 3.11+ (for backend)
- Docker & Docker Compose (for database)

### Environment Variables
Copy `.env.example` to `.env` and fill in your keys:
```bash
cp .env.example .env
```
*(If `GEMMA_MOCK=true`, the backend will use canned responses instead of calling the Google AI Studio API.)*

### Database
Start the PostgreSQL database with the pgvector extension:
```bash
docker-compose up -d
```

### Backend (FastAPI)
```bash
cd backend
python -m venv venv
# Windows
venv\Scripts\activate
# Unix
# source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```
The backend will run at `http://localhost:8000`.

### Frontend (Next.js)
```bash
cd frontend
npm install
npm run dev
```
The frontend will run at `http://localhost:3000`.
