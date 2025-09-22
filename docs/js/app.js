import { apiGet } from './api.js';
mTitle.textContent = k.name;
mMeta.textContent = `${k.category||''} • ${k.location||''} • Available: ${k.available_qty}/${k.total_qty}`;
mBadges.innerHTML = (k.tags||'').split(',').filter(Boolean).map(t=>`<span>${t.trim()}</span>`).join('');
mDesc.textContent = k.description || '';
// Actions
btnCheckout.disabled = Number(k.available_qty||0) <= 0;
btnCheckout.onclick = () => {
// For Step 1, navigate to full page (we'll wire inline checkout in Step 2)
window.location.href = `./kit.html?id=${encodeURIComponent(k.kit_id)}`;
};
linkOpen.href = `./kit.html?id=${encodeURIComponent(k.kit_id)}`;


modal.classList.remove('hidden');
// focus management
setTimeout(()=>modalClose.focus(), 0);
}


function closeModal(){ modal.classList.add('hidden'); }


function wireModal(){
modalClose.addEventListener('click', closeModal);
modal.addEventListener('click', (e)=>{ if (e.target === modal) closeModal(); });
document.addEventListener('keydown', (e)=>{ if (e.key === 'Escape' && !modal.classList.contains('hidden')) closeModal(); });
listEl.addEventListener('click', (e)=>{
const card = e.target.closest('.card');
if (card) openModalById(card.getAttribute('data-id'));
});
listEl.addEventListener('keydown', (e)=>{
if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('card')){
e.preventDefault();
openModalById(e.target.getAttribute('data-id'));
}
});
}


async function load(){
// Try API first
let data = null;
try {
const resp = await apiGet('kits');
if (resp && resp.ok && Array.isArray(resp.data)) data = resp.data;
} catch(_){}
if (!data) data = SAMPLE_KITS;


// Normalize booleans and numbers
KITS = data.filter(k => String(k.active).toLowerCase() === 'true' || k.active===true)
.map(k => ({
...k,
total_qty: Number(k.total_qty||0),
available_qty: Number(k.available_qty||0)
}));


populateCategory();
renderList();
}


function wireFilters(){
searchEl.addEventListener('input', renderList);
categoryEl.addEventListener('change', renderList);
}


// boot
wireFilters();
wireModal();
load();
