import { apiGet, apiPost } from './api.js';

const listEl = document.querySelector('#kit-list');
const searchEl = document.querySelector('#search');
const suggestionsEl = document.querySelector('#suggestions');
const categoryEl = document.querySelector('#category');
const countEl = document.querySelector('#count');

const modal = document.querySelector('#modal');
const modalClose = document.querySelector('#modal-close');
const mThumb = document.querySelector('#m-thumb');
const mTitle = document.querySelector('#modal-title');
const mCat = document.querySelector('#m-cat');
const mLoc = document.querySelector('#m-loc');
const mAvail = document.querySelector('#m-availability');
const mBadges = document.querySelector('#m-badges');
const mDesc = document.querySelector('#m-desc');
const form = document.querySelector('#checkout-form');
const btnCheckout = document.querySelector('#checkout-btn');
const msg = document.querySelector('#checkout-msg');

const tyModal = document.querySelector('#thankyou');
const tyMsg   = document.querySelector('#ty-msg');
const tyOk    = document.querySelector('#ty-ok');

let KITS = [];
let CURRENT = null;

function cardThumb(k) {
  if (k.image_url && k.image_url.trim()) {
    return `
      <div class="thumb">
        <img src="${k.image_url}" alt="${k.name}" />
      </div>
    `;
  }
  const letter = (k.name||'?')[0].toUpperCase();
  return `<div class="thumb"><div style="font-size:2.5rem">${letter}</div></div>`;
}
function availabilityBadge(k){
  const a = Number(k.available_qty||0);
  if (a <= 0) return '<span class="badge out">Out</span>';
  if (a <= 1) return '<span class="badge warn">Low</span>';
  return '<span class="badge ok">In stock</span>';
}
function card(k){
  const tags = (k.tags||'').split(',').filter(Boolean).map(t=>`<span>${t.trim()}</span>`).join('');
  return `
    <article class="card" data-id="${k.kit_id}" tabindex="0" role="button" aria-label="Open details for ${k.name}">
      ${cardThumb(k)}
      <div class="meta">
        <div class="row">
          <h3 class="title">${k.name}</h3>
          ${availabilityBadge(k)}
        </div>
        <p class="muted"><strong>Category:</strong> ${k.category || '—'}</p>
        <p class="muted"><strong>Location:</strong> ${k.location || '—'}</p>
        <p class="muted"><strong>Available:</strong> <b>${k.available_qty}</b> / ${k.total_qty}</p>
        <div class="tags">${tags}</div>
      </div>
    </article>
  `;
}

function renderList(){
  const q = (searchEl.value||'').toLowerCase().trim();
  const cat = (categoryEl.value||'').toLowerCase().trim();
  const filtered = KITS.filter(k => {
    const hay = [k.name,k.category,k.description,k.tags,k.location].join(' ').toLowerCase();
    const catOk = !cat || String(k.category||'').toLowerCase()===cat;
    const active = String(k.active).toLowerCase()==='true' || k.active===true;
    return active && (!q || hay.includes(q)) && catOk;
  });
  countEl.textContent = `${filtered.length} kit${filtered.length===1?'':'s'}`;
  listEl.innerHTML = filtered.map(card).join('');
}
function populateCategory(){
  const cats = Array.from(new Set(KITS.map(k=>String(k.category||'').toLowerCase()).filter(Boolean)));
  categoryEl.innerHTML = '<option value="">All categories</option>' + cats.map(c=>`<option value="${c}">${c}</option>`).join('');
}

function updateCheckoutState(){
  if (!CURRENT) return;
  const avail = Number(CURRENT.available_qty||0);
  mAvail.textContent = `${avail} / ${CURRENT.total_qty}`;
  const disabled = avail <= 0;
  btnCheckout.disabled = disabled;
  form.querySelectorAll('input').forEach(i => i.disabled = disabled);
  msg.textContent = disabled ? 'Out of stock.' : '';
}

function openModalById(id){
  const k = KITS.find(x=>x.kit_id===id); if (!k) return;
  CURRENT = k;

  mThumb.innerHTML = k.image_url && k.image_url.trim()
    ? `<img src="${k.image_url}" alt="${k.name}">`
    : `<div class="thumb"><div style="font-size:2.5rem">${(k.name||'?')[0].toUpperCase()}</div></div>`;

  mTitle.textContent = k.name;
  mCat.textContent = k.category || '—';
  mLoc.textContent = k.location || '—';
  mBadges.innerHTML = (k.tags||'').split(',').filter(Boolean).map(t=>`<span>${t.trim()}</span>`).join('');
  mDesc.textContent = k.description || '';
  form.reset();
  msg.textContent = '';
  modal.classList.remove('hidden');

  updateCheckoutState();
  setTimeout(()=>modalClose.focus(),0);
}
function closeModal(){ modal.classList.add('hidden'); }

let activeIndex = -1;
function buildSuggestions(query){
  const q = query.toLowerCase().trim();
  if (!q) { suggestionsEl.classList.remove('show'); suggestionsEl.innerHTML=''; activeIndex=-1; return; }

  const catSet = new Set(KITS.map(k => (k.category||'').toLowerCase()).filter(Boolean));
  const catHits = Array.from(catSet).filter(c => c.startsWith(q)).slice(0,3);

  const kitHits = KITS
    .filter(k => (k.name||'').toLowerCase().includes(q) || (k.tags||'').toLowerCase().includes(q))
    .slice(0,7);

  const items = [
    ...catHits.map(c => ({ type:'category', value:c, label:`Category: ${c}` })),
    ...kitHits.map(k => ({ type:'kit', value:k.kit_id, label:k.name }))
  ];

  if (!items.length){ suggestionsEl.classList.remove('show'); suggestionsEl.innerHTML=''; activeIndex=-1; return; }

  suggestionsEl.innerHTML = items.map((it,i) => `
    <div class="suggestion" data-type="${it.type}" data-value="${it.value}" role="option" aria-selected="${i===activeIndex}">
      <div>${it.label} ${it.type==='category' ? '<span class="chip">category</span>' : ''}</div>
      ${it.type==='kit' ? '<span class="hint">open</span>' : '<span class="hint">filter</span>'}
    </div>`).join('');
  suggestionsEl.classList.add('show');
  activeIndex = -1;
}
function hideSuggestions(){
  suggestionsEl.classList.remove('show');
  suggestionsEl.innerHTML = '';
  activeIndex = -1;
}
function pickSuggestion(el){
  const type = el.getAttribute('data-type');
  const val = el.getAttribute('data-value');
  if (type === 'category'){
    categoryEl.value = val;
    renderList();
    hideSuggestions();
    searchEl.value = '';
    searchEl.blur();
  } else if (type === 'kit'){
    hideSuggestions();
    openModalById(val);
  }
}

function wireUI(){
  modalClose.addEventListener('click', closeModal);
  modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', e => { if (e.key==='Escape' && !modal.classList.contains('hidden')) closeModal(); });

  listEl.addEventListener('click', e => {
    const card = e.target.closest('.card'); if (card) openModalById(card.getAttribute('data-id'));
  });
  listEl.addEventListener('keydown', e => {
    if ((e.key==='Enter'||e.key===' ') && e.target.classList.contains('card')) { e.preventDefault(); openModalById(e.target.getAttribute('data-id')); }
  });

  searchEl.addEventListener('input', () => { renderList(); buildSuggestions(searchEl.value); });
  searchEl.addEventListener('focus',   () => buildSuggestions(searchEl.value));
  searchEl.addEventListener('blur',    () => setTimeout(hideSuggestions, 120));
  categoryEl.addEventListener('change', renderList);

  suggestionsEl.addEventListener('click', (e) => {
    const item = e.target.closest('.suggestion');
    if (item) pickSuggestion(item);
  });
  searchEl.addEventListener('keydown', (e) => {
    const items = Array.from(suggestionsEl.querySelectorAll('.suggestion'));
    if (!items.length) return;
    if (e.key === 'ArrowDown'){ e.preventDefault(); activeIndex = (activeIndex + 1) % items.length; }
    else if (e.key === 'ArrowUp'){ e.preventDefault(); activeIndex = (activeIndex - 1 + items.length) % items.length; }
    else if (e.key === 'Enter'){ e.preventDefault(); if (activeIndex >= 0) pickSuggestion(items[activeIndex]); return; }
    else { return; }
    items.forEach((el,i)=>el.classList.toggle('active', i===activeIndex));
  });

  if (tyOk) tyOk.addEventListener('click', () => tyModal.classList.add('hidden'));

  // Checkout with server
  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (!CURRENT) return;
    if (Number(CURRENT.available_qty||0) <= 0) { updateCheckoutState(); return; }

    const fd = new FormData(form);
    const payload = {
      kit_id: CURRENT.kit_id,
      borrower_name: String(fd.get('name')||'').trim(),
      borrower_email: String(fd.get('email')||'').trim(),
      days: 7
    };

    const res = await apiPost('/checkout', payload);
    if (!res.ok) { msg.textContent = res.error || 'Error'; return; }

    await loadKits(); // refresh availabilities
    if (tyModal){
      tyMsg.innerHTML = `You checked out <b>${CURRENT.name}</b>. Please return the <b>box itself</b> after you’re done.`;
      tyModal.classList.remove('hidden');
    } else {
      alert(`Thanks for checking out ${CURRENT.name}! Please return the box itself after you're done.`);
    }
    closeModal();
  });
}

async function loadKits(){
  const res = await apiGet('/kits');
  if (!res.ok) { countEl.textContent = 'Failed to load'; return; }
  KITS = res.data || [];
  populateCategory();
  renderList();
}

wireUI();
loadKits();

