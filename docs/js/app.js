import { apiGet } from './api.js';
function renderItem(k){
const a = document.createElement('a');
a.className = 'card';
a.href = `./kit.html?id=${encodeURIComponent(k.kit_id)}`;
a.innerHTML = `
<img src="${k.image_url || ''}" alt="${k.name}" onerror="this.style.display='none'"/>
<div class="meta">
<h3>${k.name}</h3>
<p>${k.category || ''} • Available: <b>${k.available_qty}</b> / ${k.total_qty}</p>
<p class="tags">${(k.tags||'').split(',').map(t=>`<span>${t.trim()}</span>`).join('')}</p>
</div>`;
return a;
}

function filterKits(kits){
const q = (searchEl.value||'').toLowerCase().trim();
const cat = (categoryEl.value||'').toLowerCase().trim();
return kits.filter(k => {
const hay = [k.name,k.category,k.description,k.tags].join(' ').toLowerCase();
const catOk = !cat || (String(k.category||'').toLowerCase()===cat);
return (!q || hay.includes(q)) && catOk;
});
}

function populateCategory(kits){
const cats = Array.from(new Set(kits.map(k=>String(k.category||'').toLowerCase()).filter(Boolean)));
categoryEl.innerHTML = `<option value="">All</option>` + cats.map(c=>`<option value="${c}">${c}</option>`).join('');
}

async function init(){
const { ok, data } = await apiGet('kits');
if (!ok) { listEl.textContent = 'Failed to load.'; return; }
localStorage.setItem('kits_cache', JSON.stringify(data));
populateCategory(data);
const render = () => {
listEl.innerHTML = '';
filterKits(data).forEach(k => listEl.appendChild(renderItem(k)));
};
searchEl.addEventListener('input', render);
categoryEl.addEventListener('change', render);
render();
}

// offline fallback using cache
window.addEventListener('load', () => {
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./service-worker.js');
init().catch(() => {
const cache = JSON.parse(localStorage.getItem('kits_cache')||'[]');
if (cache.length){
populateCategory(cache);
listEl.innerHTML='';
filterKits(cache).forEach(k => listEl.appendChild(renderItem(k)));
} else {
listEl.textContent = 'Offline and no cached data.';
}
});
});
