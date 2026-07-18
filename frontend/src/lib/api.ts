const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export interface JobStatusResponse {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  results?: {
    processed_count: number;
    transactions: any[];
  } | null;
  errors?: string | null;
}

export interface Recommendation {
  priority: string;
  title: string;
  description: string;
  metric_reference?: string;
}

export interface WeeklyPlan {
  org_id: number;
  week_start: string;
  recommendations: Recommendation[];
  highest_risk_invoice_id?: number;
  primary_action_reminder_draft?: string;
}

export interface DocumentCitation {
  source_name: string;
  category?: string | null;
  excerpt: string;
  page_number?: number | null;
  section_label?: string | null;
}

export interface AskDocumentResponse {
  answer: string;
  citations: DocumentCitation[];
}

// ── Onboarding API Wrappers ──────────────────────────────────────────────────
export async function uploadStatementFile(file: File, orgId: number): Promise<{ job_id: string; status: string }> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('org_id', orgId.toString());

  const res = await fetch(`${API_BASE}/onboarding/upload`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to upload statement file');
  }
  return res.json();
}

export async function uploadInvoicePhoto(file: File, orgId: number): Promise<{ job_id: string; status: string }> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('org_id', orgId.toString());

  const res = await fetch(`${API_BASE}/onboarding/photo`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to upload invoice photo');
  }
  return res.json();
}

export async function uploadVoiceClip(file: File, orgId: number): Promise<{ job_id: string; status: string }> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('org_id', orgId.toString());

  const res = await fetch(`${API_BASE}/onboarding/voice`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to upload voice note');
  }
  return res.json();
}

export async function getOnboardingJobStatus(jobId: string): Promise<JobStatusResponse> {
  const res = await fetch(`${API_BASE}/onboarding/status/${jobId}`);
  if (!res.ok) {
    throw new Error('Failed to fetch job status');
  }
  return res.json();
}

export async function resetDemoEnvironment(orgId: number = 1): Promise<{ status: string; message: string }> {
  const res = await fetch(`${API_BASE}/onboarding/reset-demo?org_id=${orgId}`, {
    method: 'POST',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to reset demo database');
  }
  return res.json();
}

export async function syncSourceConnector(sourceId: string, orgId: number = 1) {
  const res = await fetch(`${API_BASE}/onboarding/sync/${sourceId}?org_id=${orgId}`, {
    method: 'POST',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to synchronize source');
  }
  return res.json();
}

// ── Analytics API Wrappers ────────────────────────────────────────────────────
export async function fetchForecast(orgId: number, horizon: number = 30) {
  const res = await fetch(`${API_BASE}/analytics/forecast/${orgId}?horizon=${horizon}`);
  if (!res.ok) {
    throw new Error('Failed to fetch forecast analytics');
  }
  return res.json();
}

export async function fetchSummary(orgId: number) {
  const res = await fetch(`${API_BASE}/analytics/summary/${orgId}`);
  if (!res.ok) {
    throw new Error('Failed to fetch executive summary analytics');
  }
  return res.json();
}

// ── Course of Action API Wrappers ─────────────────────────────────────────────
export async function askCopilot(orgId: number, question: string): Promise<{ answer: string }> {
  const res = await fetch(`${API_BASE}/course_of_action/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ org_id: orgId, question }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to ask copilot');
  }
  return res.json();
}

export async function fetchRecommendations(orgId: number): Promise<Recommendation[]> {
  const res = await fetch(`${API_BASE}/course_of_action/recommendations/${orgId}`);
  if (!res.ok) {
    throw new Error('Failed to fetch recommendations');
  }
  return res.json();
}

export async function fetchReminderDraft(invoiceId: number, orgId: number, language: string = 'English'): Promise<{ draft: string }> {
  const res = await fetch(`${API_BASE}/course_of_action/draft-reminder/${invoiceId}?org_id=${orgId}&language=${encodeURIComponent(language)}`, {
    method: 'POST',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to generate reminder draft');
  }
  return res.json();
}

export async function fetchWeeklyPlan(orgId: number): Promise<WeeklyPlan> {
  const res = await fetch(`${API_BASE}/course_of_action/weekly-plan/${orgId}`);
  if (!res.ok) {
    throw new Error('Failed to fetch weekly plan');
  }
  return res.json();
}

// ── Document Intelligence API Wrappers ───────────────────────────────────────
export async function uploadDocumentFile(
  orgId: number,
  sourceName: string,
  file: File,
  sectionLabel?: string,
  pageNumber?: number
): Promise<{ status: string; chunks_processed: number }> {
  const formData = new FormData();
  formData.append('org_id', orgId.toString());
  formData.append('source_name', sourceName);
  formData.append('file', file);
  if (sectionLabel) formData.append('section_label', sectionLabel);
  if (pageNumber) formData.append('page_number', pageNumber.toString());

  const res = await fetch(`${API_BASE}/document_intelligence/upload`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to upload document');
  }
  return res.json();
}

export async function askDocumentIntelligence(orgId: number, question: string): Promise<AskDocumentResponse> {
  const res = await fetch(`${API_BASE}/document_intelligence/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ org_id: orgId, question }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to query document intelligence');
  }
  return res.json();
}

export async function simulateScenario(orgId: number, scenarioId: number): Promise<{
  scenario_title: string;
  description: string;
  flowchart: {
    nodes: Array<{ id: string; label: string; metric: string; type: string; impact_level: string }>;
    edges: Array<{ from: string; to: string; label: string }>;
  }
}> {
  const res = await fetch(`${API_BASE}/course_of_action/simulate-scenario`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ org_id: orgId, scenario_id: scenarioId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to simulate scenario');
  }
  return res.json();
}

// ── Email Delivery API Wrappers ───────────────────────────────────────────────
export interface EmailDraft {
  subject: string;
  recipient: string;
  body: string;
  email_type: string;
  customer_name?: string;
  invoice_id?: number;
}

export interface EmailPreview {
  subject: string;
  recipient: string;
  body: string;
  html_preview: string;
}

export interface EmailSendResult {
  success: boolean;
  message: string;
  mock?: boolean;
  recipient?: string;
  subject?: string;
}

export async function draftEmail(
  orgId: number,
  request: string,
  language: string = 'English'
): Promise<EmailDraft> {
  const res = await fetch(`${API_BASE}/email/draft`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ org_id: orgId, request, language }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to draft email');
  }
  return res.json();
}

export async function previewEmail(draft: EmailDraft): Promise<EmailPreview> {
  const res = await fetch(`${API_BASE}/email/preview`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      subject: draft.subject,
      recipient: draft.recipient,
      body: draft.body,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to preview email');
  }
  return res.json();
}

export async function sendEmail(draft: EmailDraft): Promise<EmailSendResult> {
  const res = await fetch(`${API_BASE}/email/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      subject: draft.subject,
      recipient: draft.recipient,
      body: draft.body,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(typeof err.detail === 'string' ? err.detail : 'Failed to send email');
  }
  return res.json();
}

export function isEmailRequest(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    (lower.includes('send') && (lower.includes('email') || lower.includes('mail') || lower.includes('reminder'))) ||
    (lower.includes('draft') && lower.includes('email')) ||
    lower.includes('payment reminder') ||
    lower.includes('weekly summary') ||
    lower.includes('escalat')
  );
}

