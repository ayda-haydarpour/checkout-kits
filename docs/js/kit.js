import { apiGet, apiPost } from './api.js';

const nameEl = document.querySelector('#name');
const imgEl = document.querySelector('#img');
const metaEl = document.querySelector('#meta');
const descEl = document.querySelector('#desc');
const qrEl = document.querySelector('#qrcode');

const checkoutForm = document.querySelector('#checkout-form');
const returnForm = document.querySelector('#return-form');
const msgEl = document.querySelector('#msg');

function getId(){
const u = new URL(location.href);
return u.searchParams.get('id');
}

async function load(){
const id = getId();
const { ok, data, error } = await apiGet('kit', { id });
if (!ok){ msgEl.textContent = error || 'Failed to load'; return; }
nameEl.textContent = data.name;
metaEl.textContent = `${data.category||''} • Available: ${data.available_qty}/${data.total_qty} • Location: ${data.location||''}`;
descEl.textContent = data.description || '';
if (data.image_url){ imgEl.src = data.image_url; imgEl.alt = data.name; } else { imgEl.style.display='none'; }
// QR of this page for labeling
// eslint-disable-next-line no-undef
new QRCode(qrEl, {
text: location.href,
width: 128,
height: 128,
correctLevel: QRCode.CorrectLevel.M
});
}

checkoutForm.addEventListener('submit', async (e) => {
e.preventDefault();
msgEl.textContent = 'Processing checkout…';
const form = new FormData(checkoutForm);
const res = await apiPost('checkout', {
kit_id: getId(),
borrower_name: form.get('borrower_name'),
borrower_email: form.get('borrower_email'),
days: form.get('days')
});
msgEl.textContent = res.ok ? `Checked out! Due ${res.data.due}` : (res.error || 'Error');
});

returnForm.addEventListener('submit', async (e) => {
e.preventDefault();
msgEl.textContent = 'Processing return…';
const form = new FormData(returnForm);
const res = await apiPost('return', {
kit_id: getId(),
borrower_email: form.get('borrower_email')
});
msgEl.textContent = res.ok ? 'Returned! Thank you.' : (res.error || 'Error');
});

window.addEventListener('load', async () => {
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./service-worker.js');
await load();
});
