
const listEl = document.querySelector('#kit-list');
const searchEl = document.querySelector('#search');
const categoryEl = document.querySelector('#category');
const countEl = document.querySelector('#count');

const modal = document.querySelector('#modal');
const modalClose = document.querySelector('#modal-close');
const mThumb = document.querySelector('#m-thumb');
const mTitle = document.querySelector('#modal-title');
const mMeta = document.querySelector('#m-meta');
const mBadges = document.querySelector('#m-badges');
const mDesc = document.querySelector('#m-desc');
const form = document.querySelector('#checkout-form');
const btnCheckout = document.querySelector('#checkout-btn');
const msg = document.querySelector('#checkout-msg');

let KITS = [];
let CURRENT = null;

// --- localStorage “DB” for demo ---
const LS_LOANS = 'kiosk_loans_v1';
function getLoans(){ try { return JSON.parse(localStorage.getItem(LS_LOANS)||'[]'); } catch{ return []; } }
function setLoans(loans){ localStorage.setItem(LS_LOANS, JSON.stringify(loans)); }

// compute derived availability: base - open loans
function availabilityFor(k){
  const open = getLoans().filter(l => l.kit_id===k.kit_id && l.status==='OPEN').length;
  return Math.max(0, Number(k.available_qty||0) - open);
}

function availabilityBadge(k){
  const a = availabilityFor(k);
  if (a <= 0) return '<span class="badge out">Out</span>';
  if (a <= 1) return '<span class="badge warn">Low</span>';
  return '<span class="badge ok">In stock</span>';
}

function placeholderFor(name='?'){
  const letter = (name||'?').trim().charAt(0).toUpperCase();
  return `<div class="thumb"><div style="font-size:2.5rem">${letter}</div></div>`;
}

function cardThumb(k){
  if (k.image_url) return `<div class="thumb"><img src="${k.image_url}" alt="${k.name}" onerror="this.parentElement.outerHTML='${placeholderFor(k.name).replace(/'/g,'&#39;')}'" /></div>`;
  return placeholderFor(k.name);
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
        <p class="muted">${k.category||''} • ${k.location||''}</p>
        <p class="muted">Available: <b>${availabilityFor(k)}</b> / ${k.total_qty}</p>
        <div class="tags">${tags}</div>
      </div>
    </article>`;
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

function openModalById(id){
  const k = KITS.find(x=>x.kit_id===id); if (!k) return;
  CURRENT = k;
  mThumb.innerHTML = k.image_url ? `<img src="${k.image_url}" alt="${k.name}">` : placeholderFor(k.name);
  mTitle.textContent = k.name;
  mMeta.textContent = `${k.category||''} • ${k.location||''} • Available: ${availabilityFor(k)}/${k.total_qty}`;
  mBadges.innerHTML = (k.tags||'').split(',').filter(Boolean).map(t=>`<span>${t.trim()}</span>`).join('');
  mDesc.textContent = k.description || '';
  btnCheckout.disabled = availabilityFor(k) <= 0;
  form.reset();
  msg.textContent = '';
  modal.classList.remove('hidden');
  setTimeout(()=>modalClose.focus(),0);
}

function closeModal(){ modal.classList.add('hidden'); }

function wireUI(){
  // open/close
  modalClose.addEventListener('click', closeModal);
  modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', e => { if (e.key==='Escape' && !modal.classList.contains('hidden')) closeModal(); });

  // open modal from card
  listEl.addEventListener('click', e => {
    const card = e.target.closest('.card'); if (card) openModalById(card.getAttribute('data-id'));
  });
  listEl.addEventListener('keydown', e => {
    if ((e.key==='Enter'||e.key===' ') && e.target.classList.contains('card')) { e.preventDefault(); openModalById(e.target.getAttribute('data-id')); }
  });

  // filters
  searchEl.addEventListener('input', renderList);
  categoryEl.addEventListener('change', renderList);

  // checkout (local demo)
  form.addEventListener('submit', e => {
    e.preventDefault();
    if (!CURRENT) return;
    if (availabilityFor(CURRENT) <= 0) { msg.textContent = 'Out of stock.'; return; }

    const fd = new FormData(form);
    const name = String(fd.get('name')||'').trim();
    const email = String(fd.get('email')||'').trim();
    const days = Math.max(1, Number(fd.get('days')||7));

    const now = Date.now();
    const due = new Date(now + days*24*3600*1000);

    const loans = getLoans();
    loans.push({
      id: `LOAN-${String(loans.length+1).padStart(5,'0')}`,
      kit_id: CURRENT.kit_id,
      borrower_name: name,
      borrower_email: email,
      start_ts: now,
      due_ts: due.toISOString(),
      status: 'OPEN'
    });
    setLoans(loans);

    msg.textContent = `Checked out! Due ${due.toLocaleString()}`;
    renderList(); // update availability badges/count
    btnCheckout.disabled = availabilityFor(CURRENT) <= 0;
  });
}

async function load(){
  try {
    const res = await fetch('./data/kits.json', { cache: 'no-store' });
    const data = await res.json();
    KITS = data.map(k => ({
      ...k,
      total_qty: Number(k.total_qty||0),
      available_qty: Number(k.available_qty||0)
    }));
  } catch {
    KITS = [];
  }
  populateCategory();
  renderList();
}

wireUI();
load();
