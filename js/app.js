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

let KITS = [];
let CURRENT = null;

// --- localStorage “DB” for demo ---
const LS_LOANS = 'kiosk_loans_v1';
function getLoans(){ try { return JSON.parse(localStorage.getItem(LS_LOANS)||'[]'); } catch{ return []; } }
function setLoans(loans){ localStorage.setItem(LS_LOANS, JSON.stringify(loans)); }

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

// === CARD MARKUP (with explicit labels) ===
function card(k){
  const tags = (k.tags||'')
    .split(',')
    .filter(Boolean)
    .map(t=>`<span>${t.trim()}</span>`)
    .join('');

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
        <p class="muted"><strong>Available:</strong> <b>${availabilityFor(k)}</b> / ${k.total_qty}</p>

        <div class="tags">${tags}</div>
      </div>
    </article>
  `;
}

// ---------- render list ----------
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

// ---------- categories ----------
function populateCategory(){
  const cats = Array.from(new Set(KITS.map(k=>String(k.category||'').toLowerCase()).filter(Boolean)));
  categoryEl.innerHTML = '<option value="">All categories</option>' + cats.map(c=>`<option value="${c}">${c}</option>`).join('');
}

// ---------- modal ----------
function openModalById(id){
  const k = KITS.find(x=>x.kit_id===id); if (!k) return;
  CURRENT = k;
  mThumb.innerHTML = k.image_url ? `<img src="${k.image_url}" alt="${k.name}">` : placeholderFor(k.name);
  mTitle.textContent = k.name;
  mCat.textContent = k.category || '—';
  mLoc.textContent = k.location || '—';
  mAvail.textContent = `${availabilityFor(k)} / ${k.total_qty}`;
  mBadges.innerHTML = (k.tags||'').split(',').filter(Boolean).map(t=>`<span>${t.trim()}</span>`).join('');
  mDesc.textContent = k.description || '';
  btnCheckout.disabled = availabilityFor(k) <= 0;
  form.reset();
  msg.textContent = '';
  modal.classList.remove('hidden');
  setTimeout(()=>modalClose.focus(),0);
}
function closeModal(){ modal.classList.add('hidden'); }

// ---------- suggestions ----------
let activeIndex = -1;
function buildSuggestions(query){
  const q = query.toLowerCase().trim();
  if (!q) { suggestionsEl.classList.remove('show'); suggestionsEl.innerHTML=''; activeIndex=-1; return; }

  const catSet = new Set(KITS.map(k => (k.category||'').toLowerCase()).filter(Boolean));
  const catHits = Array.from(catSet).filter(c => c.startsWith(q)).slice(0,3);

  const kitHits = KITS
    .filter(k => {
      const nameHit = (k.name||'').toLowerCase().includes(q);
      const tagHit = (k.tags||'').toLowerCase().includes(q);
      return nameHit || tagHit;
    })
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

// ---------- wiring ----------
function wireUI(){
  // modal
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

  // filters + suggestions
  searchEl.addEventListener('input', () => { renderList(); buildSuggestions(searchEl.value); });
  searchEl.addEventListener('focus',   () => buildSuggestions(searchEl.value));
  searchEl.addEventListener('blur',    () => setTimeout(hideSuggestions, 120)); // allow click
  categoryEl.addEventListener('change', renderList);

  // suggestions click + keyboard
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

// ---------- load data (with fallback) ----------
async function load(){
  const SAMPLE = [
    { kit_id:'KIT-00001', name:'Woodburning Kit', category:'woodworking', total_qty:2, available_qty:2, image_url:'', location:'Take and Create Stand', description:'Learn burning techniques and finish with an art piece.', tags:'wood,art,crafts', active:true },
    { kit_id:'KIT-00002', name:'Vacuum Forming Pot', category:'fabrication', total_qty:3, available_qty:3, image_url:'', location:'Take and Create Stand', description:'Form a plastic plant pot with a custom buck.', tags:'plastic,forming,pot', active:true },
    { kit_id:'KIT-00003', name:'Mancala Board', category:'dremel', total_qty:2, available_qty:2, image_url:'', location:'Take and Create Stand', description:'Use the Dremel to finish a wooden mancala board.', tags:'dremel,game,wood', active:true },
    { kit_id:'KIT-00004', name:'Pencil Pouch', category:'sewing', total_qty:4, available_qty:4, image_url:'', location:'Take and Create Stand', description:'Learn sewing basics by making a pencil pouch.', tags:'sewing,fabric,crafts', active:true },
    { kit_id:'KIT-00005', name:'Leather Keychain', category:'leatherwork', total_qty:3, available_qty:3, image_url:'', location:'Take and Create Stand', description:'Punch, rivet, and craft a leather keychain.', tags:'leather,keychain,crafts', active:true }
  ];
  try {
    const res = await fetch('./data/kits.json', { cache:'no-store' });
    if (!res.ok) throw new Error('kits.json not found');
    const data = await res.json();
    KITS = data.map(k => ({ ...k, total_qty:+k.total_qty||0, available_qty:+k.available_qty||0 }));
  } catch {
    KITS = SAMPLE;
  }
  populateCategory();
  renderList();
}

wireUI();
load();
