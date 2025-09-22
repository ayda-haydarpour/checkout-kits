import { API_BASE } from './config.js';


export async function apiGet(route, params = {}) {
if (!API_BASE) return { ok: false, error: 'API not configured' };
const qs = new URLSearchParams({ route, ...params }).toString();
try {
const res = await fetch(`${API_BASE}?${qs}`);
return res.json();
} catch (e) {
return { ok: false, error: e.message };
}
}
