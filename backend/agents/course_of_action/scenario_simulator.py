import json
from core.gemma_client import GemmaClient
from db.session import SessionLocal
from sqlalchemy import text

import pandas as pd
from datetime import datetime, timedelta
from agents.analytics.monte_carlo import compute_monte_carlo

gemma = GemmaClient()

SCENARIOS = {
    1: {
        "title": "Hire 2 new developers immediately",
        "description": "Hiring increases your monthly burn rate by ₹2,00,000, but increases project delivery speed.",
        "math_impact": {"burn_change": 200000, "runway_impact_mult": 0.8}
    },
    2: {
        "title": "Major customer delays invoice payment by 60 days",
        "description": "Acme Corp delays their upcoming ₹5,00,000 payment, choking short-term liquidity.",
        "math_impact": {"cash_change": -500000, "runway_impact_mult": 0.5}
    },
    3: {
        "title": "Increase pricing of core product by 15%",
        "description": "Increasing prices may boost margins but risks a 5% customer churn rate.",
        "math_impact": {"burn_change": -100000, "runway_impact_mult": 1.25}
    }
}

def simulate_decision_scenario(org_id: int, scenario_id: int) -> dict:
    scenario = SCENARIOS.get(scenario_id)
    if not scenario:
        raise ValueError("Invalid scenario ID")
        
    db = SessionLocal()
    try:
        # Fetch current summary metrics from PostgreSQL
        res = db.execute(text(
            "SELECT cash_balance, burn_rate, runway_days FROM daily_balances "
            "WHERE org_id = :org_id ORDER BY date DESC LIMIT 1"
        ), {"org_id": org_id}).fetchone()
        
        if res:
            cash = float(res[0])
            burn = float(res[1])
            runway = int(res[2]) if res[2] else 90
        else:
            cash = 435000.0
            burn = 12000.0
            runway = 75

        # Create a baseline transaction dataframe to feed Monte Carlo
        today = datetime.now()
        data = {
            "date": [today - timedelta(days=30), today],
            "amount": [cash + burn, -burn],
            "category": ["Revenue", "Expense"]
        }
        df = pd.DataFrame(data)

        # Inject the mathematical shock of the scenario
        impact = scenario.get("math_impact", {})
        if "burn_change" in impact:
            df.loc[len(df)] = [today + timedelta(days=1), -impact["burn_change"], "Scenario Impact"]
        if "cash_change" in impact:
            df.loc[len(df)] = [today + timedelta(days=1), impact["cash_change"], "Scenario Impact"]

        # Run rigorous Monte Carlo Simulation (10,000 paths) on the modified baseline
        mc_results = compute_monte_carlo(org_id, horizon_days=90, transactions_df=df, initial_balance=cash)

        # Context Engineering: Zero raw documents. Only passing the scalar Monte Carlo percentiles to Gemma!
        prompt = (
            "You are a financial planning engine analyzing a business scenario.\n"
            f"Current Baseline:\n"
            f"- Liquid Cash Balance: ₹{cash}\n"
            f"- Monthly Burn Rate: ₹{burn}\n\n"
            f"Proposed Scenario:\n"
            f"Decision: {scenario['title']}\n"
            f"Details: {scenario['description']}\n\n"
            f"90-Day Monte Carlo Projections (Post-Decision):\n"
            f"- Worst Case (P10): ₹{mc_results['p10']:.0f}\n"
            f"- Expected Case (P50): ₹{mc_results['p50']:.0f}\n"
            f"- Best Case (P90): ₹{mc_results['p90']:.0f}\n\n"
            "Generate a branching decision tree/flowchart showing these specific probabilistic pathways in JSON format. "
            "Respond ONLY with a valid JSON block containing 'nodes' and 'edges'. Do not output any markdown or conversational filler.\n\n"
            "JSON Schema:\n"
            "{\n"
            "  \"nodes\": [\n"
            "    { \"id\": \"string\", \"label\": \"string (brief outcomes/action)\", \"metric\": \"string (e.g. ₹400K balance)\", \"type\": \"root|success|failure|neutral\", \"impact_level\": \"high|medium|low\" }\n"
            "  ],\n"
            "  \"edges\": [\n"
            "    { \"from\": \"node_id\", \"to\": \"node_id\", \"label\": \"condition\" }\n"
            "  ]\n"
            "}\n"
            "Ensure the flowchart branches into at least a positive outcome path (using the P90 value) and a negative risk path (using the P10 value)."
        )
        
        # Always build a rich flowchart from Monte Carlo numbers - no API key needed!
        p10 = int(mc_results['p10'])
        p50 = int(mc_results['p50'])
        p90 = int(mc_results['p90'])
        
        # Determine runway impact labels from MC
        runway_pessimistic = max(0, int(runway * impact.get("runway_impact_mult", 0.5))) if "runway_impact_mult" in impact else max(0, runway - 20)
        runway_optimistic = int(runway * impact.get("runway_impact_mult", 1.2)) if "runway_impact_mult" in impact else runway + 20

        flowchart_from_mc = {
            "nodes": [
                {
                    "id": "decision",
                    "label": scenario["title"],
                    "metric": f"Current Balance: ₹{int(cash):,}",
                    "type": "root",
                    "impact_level": "medium"
                },
                {
                    "id": "optimistic",
                    "label": "Best Case: Growth & Delivery Speed",
                    "metric": f"P90 Balance: ₹{p90:,}",
                    "type": "success",
                    "impact_level": "low"
                },
                {
                    "id": "expected",
                    "label": "Expected Case: Moderate Impact",
                    "metric": f"P50 Balance: ₹{p50:,}",
                    "type": "neutral",
                    "impact_level": "medium"
                },
                {
                    "id": "pessimistic",
                    "label": "Worst Case: Liquidity Crunch",
                    "metric": f"P10 Balance: ₹{p10:,}",
                    "type": "failure",
                    "impact_level": "high"
                }
            ],
            "edges": [
                {"from": "decision", "to": "optimistic", "label": "If revenue holds (P90)"},
                {"from": "decision", "to": "expected", "label": "Base case (P50)"},
                {"from": "decision", "to": "pessimistic", "label": "If cash tightens (P10)"}
            ]
        }

        # If we have a real API key, enhance with Gemma narrative (optional)
        from core.config import settings as _s
        if _s.GEMMA_API_KEY and not _s.GEMMA_MOCK:
            prompt = (
                "You are a financial planning engine analyzing a business scenario.\n"
                f"Current Baseline:\n"
                f"- Liquid Cash Balance: ₹{cash}\n"
                f"- Monthly Burn Rate: ₹{burn}\n\n"
                f"Proposed Scenario:\n"
                f"Decision: {scenario['title']}\n"
                f"Details: {scenario['description']}\n\n"
                f"90-Day Monte Carlo Projections (Post-Decision):\n"
                f"- Worst Case (P10): ₹{p10}\n"
                f"- Expected Case (P50): ₹{p50}\n"
                f"- Best Case (P90): ₹{p90}\n\n"
                "Generate a branching decision tree/flowchart in JSON with 'nodes' and 'edges'. "
                "Respond ONLY with a valid JSON block, no markdown."
            )
            try:
                raw_res = gemma.complete_text(prompt)
                cleaned = raw_res.strip()
                if cleaned.startswith("```json"):
                    cleaned = cleaned[7:]
                if cleaned.endswith("```"):
                    cleaned = cleaned[:-3]
                flowchart_from_mc = json.loads(cleaned.strip())
            except Exception:
                pass  # Use the MC-generated flowchart as fallback

        return {
            "scenario_title": scenario["title"],
            "description": scenario["description"],
            "mc_summary": {
                "p10": p10,
                "p50": p50,
                "p90": p90,
                "shortfall_risk": round(mc_results.get("shortfall_risk", 0), 2)
            },
            "flowchart": flowchart_from_mc
        }
    except Exception as e:
        runway = 75  # Safe fallback
        return {
            "scenario_title": scenario["title"],
            "description": scenario["description"],
            "mc_summary": {"p10": 0, "p50": 0, "p90": 0, "shortfall_risk": 0},
            "flowchart": {
                "nodes": [
                    {"id": "start", "label": f"Decision: {scenario['title']}", "metric": f"Runway: {runway} Days", "type": "root", "impact_level": "medium"},
                    {"id": "success", "label": "Path A: Positive Growth", "metric": "Runway increases", "type": "success", "impact_level": "low"},
                    {"id": "fail", "label": "Path B: Cash Constraint", "metric": "Runway decreases", "type": "failure", "impact_level": "high"}
                ],
                "edges": [
                    {"from": "start", "to": "success", "label": "Optimistic Case"},
                    {"from": "start", "to": "fail", "label": "Pessimistic Case"}
                ]
            }
        }
    finally:
        db.close()
