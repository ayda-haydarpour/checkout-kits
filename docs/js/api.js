import { API_BASE, SHARED_KEY } from './config.js';

export async function apiGet(route, params={}){
const qs = new URLSearchParams({ route, ...params }).toString();
const res = await fetch(`${API_BASE}?${qs}`);
return res.json();
}

export async function apiPost(route, data={}){
// Use simple form-encoded body (avoids CORS preflight)
const body = new URLSearchParams({ route, ...data, ...(SHARED_KEY ? { key: SHARED_KEY } : {}) });
const res = await fetch(API_BASE, {
method: 'POST',
headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
body
});
return res.json();
}
