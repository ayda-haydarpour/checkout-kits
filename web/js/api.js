// Set this to your deployed Edge Function URL:
export const API_BASE = 'https://<YOUR-PROJECT-REF>.functions.supabase.co/kiosk';

export async function apiGet(path){
  const res = await fetch(`${API_BASE}${path}`, { method: 'GET' });
  return res.json();
}

export async function apiPost(path, body){
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body || {})
  });
  return res.json();
}

