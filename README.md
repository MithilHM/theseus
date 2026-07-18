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

## Vercel Deployment & Demo Day Setup

### Deploying the Frontend to Vercel
1. Install the Vercel CLI: `npm install -g vercel` (or link your repository to Vercel's dashboard).
2. Run `vercel` from the `theseus/frontend` directory.
3. Configure the environment variable:
   - **`NEXT_PUBLIC_API_URL`**: Point this to your deployed FastAPI backend URL (e.g., `https://theseus-backend.herokuapp.com/api` or your active ngrok/tunnel address `https://<subdomain>.ngrok-free.app/api`).
4. Complete the deployment.

### Deployed Frontend URL
*   **Vercel Live URL**: [theseus-frontend.vercel.app](https://theseus-frontend.vercel.app) *(Update with your production URL once live)*
*   **Demo Mode (Speed Sync)**: Toggle the **⚡ Speed Demo** button in the global navigation bar to double the simulation refresh speed and trigger transaction toasts.

