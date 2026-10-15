/* Funzioni condivise tra app dei clan e area commissione */
const CLAN_DOMAIN = "clan.strade2030.it"; // dominio fittizio: serve solo a trasformare il codice clan in un login
const $ = (s, r = document) => r.querySelector(s);
const esc = v => String(v ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
const safeUrl = u => /^https?:\/\/[^\s<>"]+$/i.test(u) ? u : null;
function toast(msg){ const t=$("#toast"); t.textContent=msg; t.classList.remove("hidden"); clearTimeout(t._h); t._h=setTimeout(()=>t.classList.add("hidden"),3200); }
function isConfigured(){ return !!(window.CONFIG && CONFIG.supabaseUrl && CONFIG.supabaseAnonKey && !/INSERISCI/.test(CONFIG.supabaseUrl + CONFIG.supabaseAnonKey)); }
function makeClient(){ return window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseAnonKey, { auth: { persistSession: true, autoRefreshToken: true } }); }
function linksHtml(links){
  const ok = (links || []).map(safeUrl).filter(Boolean);
  return ok.length ? `<ul class="linklist">${ok.map(u=>`<li><a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(u)}</a></li>`).join("")}</ul>` : "";
}
function fatal(msg){ $("#app").innerHTML = `<div class="reg"><h1>Strade 2030</h1><p class="notice">${esc(msg)}</p></div>`; }
/* Loghi in alto a sinistra: metti i file in assets/img/ con questi nomi esatti.
   Se un file manca, il logo semplicemente non compare. */
const BRAND = `<span class="logos"><img src="assets/img/logo-agesci.png" alt="AGESCI" onerror="this.remove()"><img src="assets/img/logo-rs.png" alt="Branca R/S" onerror="this.remove()"></span>`;
