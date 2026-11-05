/* =====================================================================
   STRADE 2030 · App delle Comunità R/S (clan e noviziato)
   ===================================================================== */
$("#brand").innerHTML = BRAND + `<div><b>Strade 2030</b><small>Thinking of Campania · Il domani è oggi</small></div>`;

let sb = null;
const TABS = { "#clan":"gallery", "#futuro":"future", "#classifica":"board", "#regole":"rules" };
const S = {
  session:null, clan:null,
  answers:{}, campane:{}, campEvals:{}, campMC:{}, subs:{}, evals:{}, sblocco:null,
  board:[], boardZona:"", gallery:null, scelte:null,
  tab: TABS[location.hash] || "map",
  authMode:"register", newCode:null, openGoal:null, dirty:false, loaded:false
};
const uid = () => S.session?.user?.id;
const goal = n => GOALS[n-1];

/* ---------- Punti della propria Comunità R/S ---------- */
function tally(){
  let g=0,c=0,l=0,b=0,done=0;
  for(const G of GOALS){
    const a=S.answers[G.n], ok=!!a && a.answer===a.correct; if(ok) g+=PTS_GLOBAL;
    const ce=S.campEvals[G.n]; if(ce) c+=ce.points;
    const e=S.evals[G.n]; if(e){ l+=e.points; done++; }
    if(e && G.parts.every((x,i)=>(e.criteria?.["d"+(i+1)]||0)>0)) b+=PTS_BONUS;   // sfida locale completa: tutte le prove valutate > 0
  }
  return {g,c,l,b,tot:g+c+l+b,done};
}
function progress(){
  const s=S.sblocco || { globali:Object.keys(S.answers).length, campane:Object.keys(S.campane).length, locali:Object.keys(S.subs).length };
  const ok = s.globali>=17 && s.campane>=17 && s.locali>=SBLOCCO_LOCALI;
  return {...s, sbloccato: s.sbloccato ?? ok};
}

/* ---------- Avvio ---------- */
(async function init(){
  if(!isConfigured()) return fatal("L'app non è ancora collegata al database. Segui il passo 3 del file LEGGIMI.");
  if(!window.supabase) return fatal("Impossibile caricare l'app. Controlla la connessione e ricarica la pagina.");
  sb = makeClient();
  const { data:{ session } } = await sb.auth.getSession();
  S.session = session;
  if(session) await loadAll(); else { await loadBoard(false); S.loaded=true; render(); }
  let seen=null; try{ seen=localStorage.getItem("strade2030-spirito"); }catch(e){}
  if(!seen) openSpirit();
})();

async function loadAll(){
  const id = uid();
  const [c,a,ca,ce,s,e,st,cmc] = await Promise.all([
    sb.from("clans").select("*").eq("id",id).maybeSingle(),
    sb.rpc("mie_risposte"),
    sb.from("campana_answers").select("*").eq("clan_id",id),
    sb.from("campana_evals").select("*").eq("clan_id",id),
    sb.from("submissions").select("*").eq("clan_id",id),
    sb.from("evaluations").select("*").eq("clan_id",id),
    sb.rpc("stato_sblocco"),
    sb.rpc("mie_campane")
  ]);
  const bad=[c,a,ca,ce,s,e,st].find(r=>r.error);
  if(bad){ console.error(bad.error); toast("Problema di connessione: ricarica la pagina."); }
  S.clan = c.data || null;
  const byGoal = rows => Object.fromEntries((rows||[]).map(r=>[r.goal,r]));
  S.answers=byGoal(a.data); S.campane=byGoal(ca.data); S.campEvals=byGoal(ce.data);
  S.subs=byGoal(s.data); S.evals=byGoal(e.data);
  S.sblocco = (st.data||[])[0] || null;
  S.campMC = byGoal(cmc.data);
  await loadBoard(false);
  S.loaded = true; render();
}
async function refreshSblocco(){
  const { data } = await sb.rpc("stato_sblocco");
  S.sblocco = (data||[])[0] || S.sblocco;
}
async function loadBoard(rerender=true){
  const { data, error } = await sb.rpc("classifica");
  if(!error) S.board = data || [];
  if(rerender) render();
}
async function loadGallery(rerender=true){
  const { data, error } = await sb.rpc("galleria");
  if(error) console.error(error);
  S.gallery = data || [];
  if(rerender) render();
}
async function loadScelte(rerender=true){
  const { data, error } = await sb.rpc("scelte_pubbliche");
  if(error) console.error(error);
  S.scelte = data || [];
  if(rerender) render();
}
const clanPhotoUrl = p => p ? sb.storage.from("clan").getPublicUrl(p).data.publicUrl : null;

document.addEventListener("click", e=>{
  const t=e.target.closest("[data-tab]"); if(!t) return;
  S.tab=t.dataset.tab;
  if(S.tab==="board") loadBoard();
  if(S.tab==="gallery") S.gallery=null;
  if(S.tab==="future") S.scelte=null;
  const hash=Object.keys(TABS).find(h=>TABS[h]===S.tab);
  try{ history.replaceState(null,"",hash || location.pathname); }catch(err){}
  render(); window.scrollTo({top:0});
});
$("#logout").onclick = async ()=>{
  await sb.auth.signOut();
  Object.assign(S,{session:null,clan:null,answers:{},campane:{},campEvals:{},campMC:{},subs:{},evals:{},sblocco:null,tab:"map",authMode:"login"});
  render();
};

/* ---------- Lo spirito del gioco ---------- */
function openSpirit(){ const d=$("#spiritDlg"); if(!d.open) d.showModal(); }
function spiritLetto(){ const f=$("#spiritFab"); if(f) f.classList.add("seen"); try{ localStorage.setItem("strade2030-spirito-letto","1"); }catch(e){} }
try{ if(localStorage.getItem("strade2030-spirito-letto")) $("#spiritFab")?.classList.add("seen"); }catch(e){}
$("#spiritOk").onclick=()=>{ try{ localStorage.setItem("strade2030-spirito","1"); }catch(e){} $("#spiritDlg").close(); };
$("#spiritDlg").addEventListener("cancel",()=>{ try{ localStorage.setItem("strade2030-spirito","1"); }catch(e){} });
document.addEventListener("click", e=>{ if(e.target.closest("[data-spirit]")){ openSpirit(); spiritLetto(); } });

/* ---------- Icone SDG (con ripiego sul riquadro colorato) ---------- */
// Riquadri colorati con numero e nome (le icone ufficiali sono solo sulla mappa)
function sdg(n, cls=""){
  const G=goal(n);
  return `<span class="sdg ${cls}" style="--c:${G.c}" title="${n}. ${esc(G.t)}"><b>${n}</b><i>${esc(G.t)}</i></span>`;
}

/* ---------- Render ---------- */
function render(){
  if(!S.loaded) return;
  document.querySelectorAll("#tabs [data-tab]").forEach(b=>b.setAttribute("aria-selected", b.dataset.tab===S.tab));
  $("#scorePill").classList.toggle("hidden", !S.clan);
  $("#logout").classList.toggle("hidden", !S.session);
  if(S.clan) $("#myScore").textContent = tally().tot;

  if(S.tab==="board") return renderBoard();
  if(S.tab==="gallery") return renderGallery();
  if(S.tab==="future") return renderFuture();
  if(S.tab==="rules") return renderRules();
  if(S.newCode) return renderCode();
  if(!S.session) return renderAuth();
  if(!S.clan) return renderComplete();
  return renderMap();
}

/* ---------- Registrazione, accesso, recupero ---------- */
const zonaSelect = (id, val="") => `<select id="${id}" required><option value="">Scegliete la zona…</option>${ZONE.map(z=>`<option ${z===val?"selected":""}>${esc(z)}</option>`).join("")}</select>`;
function renderAuth(){
  const m = S.authMode;
  let form;
  if(m==="register") form = `
      <div class="notice one-signup"><b>Una sola iscrizione per Comunità R/S.</b> Registrate la Comunità R/S (clan e noviziato insieme) una sola volta, da un solo membro, a nome di tutti: poi entrate tutti con lo stesso codice e la stessa password. Gli account doppi verranno rimossi.</div>
      <label class="f">Nome del clan <span class="h">Scrivete solo il nome: «Clan» lo aggiunge il sito.</span><span class="prefix-in"><span>Clan</span><input type="text" id="rName" required maxlength="50" placeholder="Croce del Sud"></span></label>
      <label class="f">Nome del noviziato <span class="h">Facoltativo. Solo il nome; se clan e noviziato hanno un nome solo, lasciate vuoto.</span><span class="prefix-in"><span>Noviziato</span><input type="text" id="rNov" maxlength="50" placeholder="Stella Polare"></span></label>
      <label class="f">Gruppo scout<input type="text" id="rGroup" required maxlength="60" placeholder="Es. Santa Maria CV1"></label>
      <label class="f">Zona${zonaSelect("rZona")}</label>
      <label class="f">Email di riferimento della Comunità R/S <span class="h">Serve solo per recuperare codice o password. Non compare sul sito. Va bene quella della Comunità R/S o di un capo.</span><input type="email" id="rEmail" required maxlength="120" autocomplete="email" placeholder="nome@esempio.it"></label>
      <fieldset class="profile-box">
        <legend>Foto e membri della Comunità R/S <span class="h">Facoltativo, potete aggiungerli anche dopo</span></legend>
        ${profileFields(null)}
      </fieldset>
      <label class="f">Password della Comunità R/S <span class="h">Almeno 6 caratteri. Condividetela solo dentro la Comunità R/S.</span><input type="password" id="rPw" required minlength="6" autocomplete="new-password"></label>
      <label class="f">Ripeti la password<input type="password" id="rPw2" required minlength="6" autocomplete="new-password"></label>
      <button class="btn" type="submit">Registra la Comunità R/S e inizia</button>`;
  else if(m==="login") form = `
      <label class="f">Codice Comunità R/S <span class="h">Ve l'abbiamo dato alla registrazione, es. FENICE-4821</span><input type="text" id="lCode" required autocapitalize="characters" placeholder="FENICE-4821"></label>
      <label class="f">Password della Comunità R/S<input type="password" id="lPw" required autocomplete="current-password"></label>
      <button class="btn" type="submit">Entra</button>
      <button class="linkbtn" type="button" data-mode="recover">Codice o password dimenticati?</button>`;
  else form = `
      <p style="margin:0">Scriveteci chi siete: la commissione vi risponderà all'email di riferimento della Comunità R/S con il codice o con una password temporanea. Non vi manderemo mai la vostra password attuale: nessuno la conosce.</p>
      <label class="f">Zona${zonaSelect("qZona")}</label>
      <label class="f">Nome della Comunità R/S e gruppo<input type="text" id="qClan" required maxlength="80" placeholder="Es. Clan Croce del Sud, Santa Maria CV1"></label>
      <label class="f">Email di riferimento della Comunità R/S<input type="email" id="qEmail" required maxlength="120" autocomplete="email"></label>
      <label class="f">Cosa avete dimenticato? <span class="h">Facoltativo</span><textarea id="qMsg" maxlength="500" style="min-height:80px" placeholder="Es. abbiamo perso il codice"></textarea></label>
      <button class="btn" type="submit">Invia la richiesta</button>
      <button class="linkbtn" type="button" data-mode="login">Torna all'accesso</button>`;
  $("#app").innerHTML = `
  <div class="auth-grid">
  <figure class="poster"><img src="assets/img/thinking-of-campania.jpg" alt="Thinking of Campania. Il domani è oggi" width="900" height="900"></figure>
  <div class="reg">
    <p class="kicker">Thinking of Campania · Il domani è oggi</p>
    <h1>Strade 2030</h1>
    <p class="claim">Diciassette strade, un solo territorio.</p>
    <p class="muted">Pensate globale. Scoprite la Campania. Agite in locale. <button class="linkbtn" type="button" data-spirit>Lo spirito del gioco</button></p>
    <div class="seg" role="group">
      <button type="button" data-mode="register" aria-pressed="${m==="register"}">Registra la Comunità R/S</button>
      <button type="button" data-mode="login" aria-pressed="${m!=="register"}">Siamo già registrati</button>
    </div>
    <form id="authForm" class="panel stack" style="margin-top:12px" autocomplete="off">
      ${form}
      <p class="err hidden" id="authErr"></p>
    </form>
  </div>
  </div>`;
  document.querySelectorAll("[data-mode]").forEach(b=>b.onclick=()=>{S.authMode=b.dataset.mode;renderAuth();});
  $("#authForm").addEventListener("submit", e=>{ e.preventDefault(); ({register:doRegister,login:doLogin,recover:doRecover})[m](e.submitter); });
}
function authError(msg){ const p=$("#authErr"); p.textContent=msg; p.classList.remove("hidden"); }

function makeCode(name){
  let base = name.normalize("NFD").replace(/[̀-ͯ]/g,"").toUpperCase()
    .replace(/\bCLAN\b/g,"").replace(/[^A-Z]/g,"").slice(0,8);
  if(base.length<3) base="CLAN";
  return base + "-" + String(Math.floor(1000+Math.random()*9000));
}
const codeToEmail = code => code.trim().toLowerCase().replace(/\s+/g,"") + "@" + CLAN_DOMAIN;
const emailOk = v => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v);

async function doRegister(btn){
  const name=nomeClan($("#rName").value), noviziato=nomeNov($("#rNov").value), grp=$("#rGroup").value.trim(), zona=$("#rZona").value, email=$("#rEmail").value.trim();
  if(!soloNome($("#rName").value,"clan")) return authError("Scrivete il nome del clan.");
  const pw=$("#rPw").value, pw2=$("#rPw2").value;
  if(!ZONE.includes(zona)) return authError("Scegliete la zona dal menu.");
  if(!emailOk(email)) return authError("Controllate l'email di riferimento.");
  if(pw!==pw2) return authError("Le due password non coincidono.");
  if(pw.length<6) return authError("La password deve avere almeno 6 caratteri.");
  const prof = readProfile();
  if(prof.error) return authError(prof.error);
  btn.disabled=true; btn.textContent="Registrazione in corso…";
  try{
    let code=null, session=null, user=null;
    for(let i=0;i<5 && !session;i++){
      code = makeCode(name);
      const { data, error } = await sb.auth.signUp({ email: codeToEmail(code), password: pw });
      if(error){ if(/already|registered|exists/i.test(error.message)) continue; throw error; }
      if(!data.session) throw new Error("conferma-email");
      session=data.session; user=data.user;
    }
    if(!session) throw new Error("Codice non disponibile, riprova.");
    S.session = session;
    const { error:e2 } = await sb.from("clans").insert({ id:user.id, name, noviziato, grp, zona, email, code, members: prof.members });
    if(e2) throw e2;
    if(prof.file){
      btn.textContent="Carico la foto della Comunità R/S…";
      try{ const path=await uploadClanPhoto(prof.file); await sb.from("clans").update({ photo:path }).eq("id",user.id); }
      catch(ph){ console.error(ph); toast("Comunità R/S registrata, ma la foto non è stata caricata: aggiungetela dalla mappa."); }
    }
    S.newCode = code; S.gallery = null;
    await loadAll();
  }catch(err){
    console.error(err);
    btn.disabled=false; btn.textContent="Registra la Comunità R/S e inizia";
    if(err.message==="conferma-email") authError("Registrazione bloccata: l'organizzazione deve disattivare la conferma email in Supabase (vedi LEGGIMI).");
    else if(/rate|many/i.test(err.message||"")) authError("Troppe registrazioni in poco tempo da questa rete. Riprovate tra qualche minuto.");
    else authError("Registrazione non riuscita. Controllate i dati e riprovate.");
  }
}

async function doLogin(btn){
  const code=$("#lCode").value, pw=$("#lPw").value;
  btn.disabled=true;
  const { data, error } = await sb.auth.signInWithPassword({ email: codeToEmail(code), password: pw });
  if(error){ btn.disabled=false; return authError("Codice Comunità R/S o password non corretti."); }
  S.session=data.session; S.tab="map";
  await loadAll();
}

async function doRecover(btn){
  const zona=$("#qZona").value, clan=$("#qClan").value.trim(), email=$("#qEmail").value.trim(), messaggio=$("#qMsg").value.trim();
  if(!ZONE.includes(zona)) return authError("Scegliete la zona dal menu.");
  if(clan.length<2) return authError("Scrivete il nome della Comunità R/S.");
  if(!emailOk(email)) return authError("Controllate l'email.");
  btn.disabled=true;
  const { error } = await sb.from("richieste_accesso").insert({ zona, clan, email, messaggio: messaggio||null });
  if(error){ console.error(error); btn.disabled=false; return authError("Richiesta non inviata. Riprovate tra poco."); }
  $("#authForm").innerHTML = `<p class="ok-msg"><b>Richiesta inviata.</b> La commissione vi scriverà a <b>${esc(email)}</b>. Controllate anche lo spam.</p><button class="linkbtn" type="button" data-mode="login">Torna all'accesso</button>`;
  $("#authForm [data-mode]").onclick=()=>{S.authMode="login";renderAuth();};
}

function renderCode(){
  $("#app").innerHTML = `
  <div class="reg">
    <h1>Benvenuti!</h1>
    <p class="claim">${esc(S.clan?.name||"")}</p>
    <p>Questo è il vostro codice Comunità R/S. Scrivetelo sul quaderno di comunità: con il codice e la password potete entrare da qualsiasi telefono.</p>
    <div class="codebox">${esc(S.newCode)}</div>
    <button class="btn" id="goMap" style="width:100%">Ho segnato il codice, apriamo la mappa</button>
  </div>`;
  $("#goMap").onclick=()=>{ S.newCode=null; render(); };
}

/* Account creato ma registrazione della Comunità R/S interrotta */
function renderComplete(){
  const code = (S.session.user.email||"").split("@")[0].toUpperCase();
  if(!S.session.user.email?.endsWith("@"+CLAN_DOMAIN)){
    return fatal("Questo account non è di una Comunità R/S. Se sei della commissione usa la pagina di valutazione.");
  }
  $("#app").innerHTML = `
  <div class="reg"><h1>Completate la registrazione</h1>
   <form id="compForm" class="panel stack" style="margin-top:20px">
    <p style="margin:0">Codice Comunità R/S: <b>${esc(code)}</b></p>
    <label class="f">Nome del clan <span class="h">Solo il nome</span><span class="prefix-in"><span>Clan</span><input type="text" id="cName" required maxlength="50" placeholder="Croce del Sud"></span></label>
    <label class="f">Nome del noviziato <span class="h">Facoltativo, solo il nome</span><span class="prefix-in"><span>Noviziato</span><input type="text" id="cNov" maxlength="50" placeholder="Stella Polare"></span></label>
    <label class="f">Gruppo scout<input type="text" id="cGroup" required maxlength="60"></label>
    <label class="f">Zona${zonaSelect("cZona")}</label>
    <label class="f">Email di riferimento della Comunità R/S<input type="email" id="cEmail" required maxlength="120"></label>
    <button class="btn" type="submit">Salva e apri la mappa</button><p class="err hidden" id="authErr"></p>
   </form></div>`;
  $("#compForm").addEventListener("submit", async e=>{
    e.preventDefault();
    const zona=$("#cZona").value, email=$("#cEmail").value.trim();
    if(!ZONE.includes(zona)) return authError("Scegliete la zona dal menu.");
    if(!emailOk(email)) return authError("Controllate l'email.");
    const { error } = await sb.from("clans").insert({ id:uid(), name:nomeClan($("#cName").value), noviziato:nomeNov($("#cNov").value), grp:$("#cGroup").value.trim(), zona, email, code });
    if(error) return authError("Salvataggio non riuscito, riprovate.");
    await loadAll();
  });
}

/* ---------- Mappa ---------- */
function tileMarks(n){
  const a=S.answers[n];
  const g = !a ? `<span class="mark">Globale</span>` : (a.answer===a.correct ? `<span class="mark done">Globale ✓</span>` : `<span class="mark miss">Globale ✗</span>`);
  const ce=S.campEvals[n], ca=S.campane[n], cm=S.campMC[n];
  const c = cm ? (cm.choice===cm.correct ? `<span class="mark done">Campana ✓</span>` : `<span class="mark miss">Campana ✗</span>`)
    : ce ? `<span class="mark done">Campana ${ce.points}</span>` : ca ? `<span class="mark sent">Campana ✓</span>` : `<span class="mark">Campana</span>`;
  const e=S.evals[n], s=S.subs[n];
  const l = e ? `<span class="mark done">Locale ${e.points}</span>` : s ? `<span class="mark sent">Locale inviata</span>` : `<span class="mark">Locale</span>`;
  return g+c+l;
}
function progressCard(){
  const p=progress();
  const bar=(v,max,label)=>`<div class="pbar"><span>${label}</span><b>${Math.min(v,max)}/${max}</b><i style="--w:${Math.min(100,v/max*100)}%"></i></div>`;
  return `<section class="unlock ${p.sbloccato?"is-open":""}">
    <div><h2>${p.sbloccato?"Obiettivi di futuro sbloccati":"Sbloccate gli obiettivi di futuro"}</h2>
    <p>${p.sbloccato?"Avete guardato tutti i 17 obiettivi. Ora scegliete i 3 che, secondo voi, sono i più importanti per il vostro territorio.":`Per sbloccarli: <strong class="hl">tutte le domande globali</strong>, <strong class="hl">tutte le domande campane</strong> e <strong class="hl">almeno 1 sfida locale</strong> consegnata. Così avrete guardato da vicino tutta l'Agenda 2030.`}</p></div>
    ${p.sbloccato?`<button class="btn" data-tab="future">Scegliete i vostri 3 obiettivi</button>`:
      `<div class="pbars">${bar(p.globali,17,"Domande globali")}${bar(p.campane,17,"Domande campane")}${bar(p.locali,SBLOCCO_LOCALI,"Sfide locali consegnate")}</div>`}
  </section>`;
}
function renderMap(){
  const c=S.clan, t=tally();
  $("#app").innerHTML = `<section class="hero">
    <p class="kicker">Strade 2030 · Thinking of Campania</p>
    <h1>Scegliete la vostra prossima tappa.</h1>
    <div class="clan-line"><span class="chip">${esc(nomeCom(c))}</span><span class="chip soft">Zona ${esc(c.zona)}${c.grp?" · "+esc(c.grp):""}</span><span class="chip soft">Codice ${esc(c.code)}</span><span class="chip soft">${t.done} sfide locali valutate</span><button class="chip linkchip" id="editProfile">Profilo della Comunità R/S</button><button class="chip linkchip" data-spirit>Lo spirito del gioco</button></div>
  </section>
  ${progressCard()}
  <section class="trail" aria-label="Obiettivi dell'Agenda 2030">
    ${GOALS.map(G=>`<button class="tile ${G.dark?"dark-text":""} ${SDG_ICONE?"has-ico":""}" style="--c:${G.c}" data-goal="${G.n}" aria-label="Obiettivo ${G.n}: ${esc(G.t)}">
      ${SDG_ICONE?`<img class="ico" src="${esc(SDG_ICON(G.n))}" alt="" onerror="this.closest('.tile').classList.remove('has-ico');this.remove()">`:""}<span class="num">${G.n}</span><span class="ttl">${esc(G.t)}</span><span class="marks">${tileMarks(G.n)}</span></button>`).join("")}
  </section>`;
  document.querySelectorAll("[data-goal]").forEach(b=>b.addEventListener("click",()=>openGoal(+b.dataset.goal)));
  $("#editProfile").onclick=openProfile;
}

/* ---------- Scheda obiettivo ---------- */
let pendingChoice=null, pendingCamp=null;
const dots = i => `<span class="lvl-dots" aria-hidden="true">${[0,1,2].map(j=>`<i class="${j<=i?"on":""}"></i>`).join("")}</span>`;
const partsHtml = (parts, prefix, scores) => `<ol class="parts prove">${parts.map((p,i)=>{
  const k=prefix+(i+1), sc=scores?.[k];
  return `<li><div class="part-top"><span class="lvl">${dots(i)} Prova ${i+1} · ${esc(LIVELLI[i]||"")}</span><span class="pmax">${sc!=null?`<b>${sc}</b>/${p.p}`:`${p.p} punti`}</span></div>
    <p class="prova-t">${rich(p.t)}</p>
    ${p.r?`<div class="rules-box"><b>Regole obbligatorie</b><ul>${p.r.map(r=>`<li>${esc(r)}</li>`).join("")}</ul></div>`:""}
    <div class="crit-chips">${p.k.map(x=>`<span>${esc(x)}</span>`).join("")}</div></li>`; }).join("")}</ol>`;
function srcHtml(src){
  return src.map(([n,u])=>u&&safeUrl(u) ? `<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(n)}</a>` : esc(n)).join(" · ");
}
function mailSubject(G){ const c=S.clan; return `${c.zona} - ${nomeCom(c)} - Obiettivo ${G.n} - Sfida locale`; }
function consegnaHtml(G){
  const c=S.clan, subject=mailSubject(G);
  const regole=`<ul class="deliver small">
      <li>Usate sempre l'oggetto qui sopra.</li>
      <li>Nel testo della mail scrivete il nome della Comunità R/S, il codice (${esc(c.code)}), quali prove avete fatto (1, 2, 3) e cosa contiene ogni file.</li>
      <li>Potete mandare le prove tutte insieme o una alla volta, sempre con lo stesso oggetto.</li>
      <li><b>File e video pesanti</b> (oltre ${CONSEGNA.limiteMB} MB): non allegateli. Caricateli su <a href="https://wetransfer.com/" target="_blank" rel="noopener noreferrer">WeTransfer</a>, scegliete "Ottieni un link" e incollate il link nella mail.</li>
      <li>Il link di WeTransfer scade dopo pochi giorni: mandate la mail subito dopo averlo creato.</li></ul>`;
  if(!(CONSEGNA.modo==="email" && emailOk(CONSEGNA.email||""))){
    return `<div class="howto"><h4>Come consegnare</h4><p>Le istruzioni per inviare il materiale arriveranno a breve dagli organizzatori.</p></div>`;
  }
  return `<div class="howto"><h4>Come consegnare</h4>
    <p><b>1. Raccogliete il materiale</b> delle prove che avete fatto.</p>
    <p><b>2. Inviatelo per email</b> a <b>${esc(CONSEGNA.email)}</b> con questo oggetto:</p>
    <p class="subject">${esc(subject)}</p>
    ${regole}
    <p><b>3. Avvisateci qui</b> premendo il pulsante qui sotto: così la commissione sa che c'è materiale da valutare.</p></div>`;
}

function openGoal(n){
  const G=goal(n), dlg=$("#goalDlg");
  const nuova = S.openGoal!==n;
  if(nuova){ pendingChoice=null; pendingCamp=null; }
  S.openGoal=n; S.dirty=false;
  const a=S.answers[n], answered=!!a;

  // Globale
  const opts = G.o.map((o,i)=>{
    let cls="opt";
    if(answered){ if(i===a.correct) cls+=" right"; else if(i===a.answer) cls+=" wrong"; }
    return `<button class="${cls}" data-opt="${i}" aria-pressed="${pendingChoice===i}" ${answered?"disabled":""}>${rich(o)}</button>`;
  }).join("");
  const globalRes = answered
    ? `<div class="result">${a.answer===a.correct?`<b>Esatto, +${PTS_GLOBAL} punti.</b>`:`<b>Risposta sbagliata.</b> Quella giusta era: ${rich(G.o[a.correct])}.`} ${rich(a.feedback||"")}</div>`
    : `<div class="row-actions"><button class="btn" id="confirmAns" ${pendingChoice==null?"disabled":""}>Conferma risposta</button><span class="muted small">Avete un solo tentativo: consultatevi prima.</span></div>`;

  // Campana: a risposta multipla (se ha le opzioni) o aperta
  const C=G.campana, ca=S.campane[n], ce=S.campEvals[n], cm=S.campMC[n];
  let campBlock;
  if(C.o){
    const done=!!cm;
    const copts=C.o.map((o,i)=>{ let cls="opt";
      if(done){ if(i===cm.correct) cls+=" right"; else if(i===cm.choice) cls+=" wrong"; }
      return `<button class="${cls}" data-copt="${i}" aria-pressed="${pendingCamp===i}" ${done?"disabled":""}>${rich(o)}</button>`; }).join("");
    campBlock = `<div class="opts">${copts}</div>` + (done
      ? `<div class="result">${cm.choice===cm.correct?`<b>Esatto, +${PTS_CAMPANA} punti.</b>`:`<b>Risposta sbagliata.</b> Quella giusta era: ${rich(C.o[cm.correct])}.`} ${rich(cm.feedback||"")}</div>`
      : `<div class="row-actions"><button class="btn" id="confirmCamp" ${pendingCamp==null?"disabled":""}>Conferma risposta</button><span class="muted small">Un solo tentativo: cercate prima nella fonte.</span></div>`);
  } else campBlock = ce
    ? `<p><span class="status ok">Valutata: ${ce.points}/${PTS_CAMPANA} punti</span></p>
       <div class="result"><b>La vostra risposta:</b><br><span class="pre">${esc(ca?.answer)}</span>${ce.comment?`<br><br><b>Commento della commissione:</b> ${esc(ce.comment)}`:""}</div>`
    : `<form id="campForm" class="stack" style="margin-top:10px">
        <label class="f">La vostra risposta <span class="h">Guardate le fonti e scrivete i dati che avete trovato, con l'anno e dove li avete letti. Potete correggerla finché la commissione non la valuta.</span>
          <textarea id="cAns" required maxlength="3000" style="min-height:110px">${esc(ca?.answer||"")}</textarea></label>
        <div class="row-actions"><button class="btn" type="submit">${ca?"Aggiorna la risposta":"Invia la risposta"}</button>${ca?`<span class="status wait">Inviata, in attesa di valutazione</span>`:""}</div>
      </form>`;

  // Locale
  const sub=S.subs[n], ev=S.evals[n], scores=ev?.criteria||null;
  const localBody = partsHtml(G.parts, "d", scores);
  const provate = ev ? G.parts.filter((p,i)=>(scores?.["d"+(i+1)]||0)>0).length : 0;
  const nuove = sub && ev && new Date(sub.updated_at) > new Date(ev.evaluated_at);
  let localForm;
  if(ev && provate>=G.parts.length){
    localForm = `<p><span class="status ok">Valutata: ${ev.points}/${LOCAL_MAX} punti · sfida completa</span></p>
      ${ev.comment?`<div class="result"><b>Commento della commissione:</b> ${esc(ev.comment)}</div>`:""}`;
  } else if(ev){
    localForm = `<p><span class="status ok">Valutata: ${ev.points}/${LOCAL_MAX} punti</span></p>
      ${ev.comment?`<div class="result"><b>Commento della commissione:</b> ${esc(ev.comment)}</div>`:""}
      <div class="keepgoing"><b>Non fermatevi qui.</b> Mancano ${G.parts.length-provate} ${G.parts.length-provate===1?"prova":"prove"}: ognuna vale altri ${G.parts[0].p} punti.</div>
      ${consegnaHtml(G)}
      ${nuove?`<p><span class="status wait">Nuove prove segnalate il ${new Date(sub.updated_at).toLocaleDateString("it-IT")}: in attesa di valutazione</span></p>`
             :`<div class="row-actions"><button class="btn" id="markSent">Abbiamo inviato altre prove</button></div>`}`;
  } else {
    localForm = `${consegnaHtml(G)}
      ${sub?`<p><span class="status wait">Mail segnata come inviata il ${new Date(sub.updated_at).toLocaleDateString("it-IT")}: in attesa di valutazione</span></p>
             <p class="muted small">Avete fatto altre prove? Inviate un'altra mail con lo stesso oggetto.</p>`
          :`<div class="row-actions"><button class="btn" id="markSent">Abbiamo inviato la mail</button></div>`}`;
  }

  dlg.innerHTML = `
    <div class="m-head ${G.dark?"dark-text":""}" style="--c:${G.c}">
      <span class="num">${G.n}</span>
      <div><h2>${esc(G.t)}</h2><p>${esc(G.s)}</p></div>
      <button class="m-close" aria-label="Chiudi" id="mClose">×</button>
    </div>
    <div class="m-body">
      <section class="m-sec">
        <h3>Sfida globale <span class="pts">${PTS_GLOBAL} punti</span></h3>
        <p class="q">${rich(G.q)}</p><div class="opts">${opts}</div>${globalRes}
      </section>
      <section class="m-sec">
        <h3>Sfida campana <span class="pts">${PTS_CAMPANA} punti</span></h3>
        <p class="q">${rich(C.q)}</p>
        ${C.nota?`<p class="muted small"><i>${esc(C.nota)}</i></p>`:""}
        <p class="source"><b>Fonti da consultare:</b> ${srcHtml(C.src)}</p>
        ${campBlock}
      </section>
      <section class="m-sec">
        <h3>Sfida locale <span class="pts">fino a ${LOCAL_MAX} punti</span></h3>
        <p>${esc(G.ld)}</p>
        <p class="muted small">3 prove sul vostro territorio, dalla più semplice alla più impegnativa. Ognuna vale ${G.parts[0].p} punti: potete farle tutte o solo alcune.</p>
        ${localBody}
        ${localForm}
      </section>
    </div>`;
  if(!dlg.open) dlg.showModal();
  if(nuova){ dlg.scrollTop=0; const mb=dlg.querySelector(".m-body"); if(mb) mb.scrollTop=0; }
  $("#mClose").onclick=()=>dlg.close();
  dlg.querySelectorAll("[data-opt]").forEach(b=>b.addEventListener("click",()=>{ pendingChoice=+b.dataset.opt; openGoal(n); }));
  const ca2=$("#confirmAns"); if(ca2) ca2.onclick=()=>answerQuiz(n);
  const cf=$("#campForm"); if(cf){ cf.addEventListener("input",()=>S.dirty=true); cf.addEventListener("submit",e=>{ e.preventDefault(); submitCampana(n,e.submitter); }); }
  dlg.querySelectorAll("[data-copt]").forEach(b=>b.addEventListener("click",()=>{ pendingCamp=+b.dataset.copt; openGoal(n); }));
  const cc=$("#confirmCamp"); if(cc) cc.onclick=()=>answerCampana(n);
  const ms=$("#markSent"); if(ms) ms.onclick=()=>markSent(n,ms);
}
$("#goalDlg").addEventListener("close",()=>{ S.openGoal=null; S.dirty=false; pendingChoice=null; pendingCamp=null; render(); });
$("#goalDlg").addEventListener("click",e=>{ if(e.target.id==="goalDlg") e.target.close(); });

async function answerQuiz(n){
  if(pendingChoice==null || S.answers[n]) return;
  const btn=$("#confirmAns"); btn.disabled=true;
  const choice=pendingChoice;
  const { data, error } = await sb.rpc("rispondi",{ p_goal:n, p_answer:choice });
  if(error && error.code!=="23505"){ btn.disabled=false; console.error(error); return toast("Risposta non salvata. Controllate la connessione e riprovate."); }
  if(error){ await loadAll(); openGoal(n); return toast("Avevate già risposto a questa domanda."); }
  const r=(data||[])[0]||{};
  S.answers[n]={goal:n,answer:choice,correct:r.correct,feedback:r.feedback}; pendingChoice=null;
  toast(choice===r.correct ? `Esatto! +${PTS_GLOBAL} punti` : "Risposta registrata");
  await refreshSblocco(); openGoal(n); loadBoard(false);
}

async function submitCampana(n,btn){
  const answer=$("#cAns").value.trim();
  if(!answer) return toast("Scrivete la risposta.");
  btn.disabled=true;
  const { data, error } = await sb.from("campana_answers")
    .upsert({ clan_id:uid(), goal:n, answer, updated_at:new Date().toISOString() }, { onConflict:"clan_id,goal" })
    .select().single();
  if(error){ btn.disabled=false; console.error(error); return toast("Risposta non salvata. Se la commissione l'ha già valutata non si può più cambiare."); }
  S.campane[n]=data; S.dirty=false;
  toast("Risposta inviata alla commissione");
  await refreshSblocco(); openGoal(n);
}

async function answerCampana(n){
  if(pendingCamp==null || S.campMC[n]) return;
  const btn=$("#confirmCamp"); btn.disabled=true;
  const choice=pendingCamp;
  const { data, error } = await sb.rpc("rispondi_campana",{ p_goal:n, p_answer:choice });
  if(error && error.code!=="23505"){ btn.disabled=false; console.error(error); return toast("Risposta non salvata. Controllate la connessione e riprovate."); }
  if(error){ await loadAll(); openGoal(n); return toast("Avevate già risposto a questa domanda."); }
  const r=(data||[])[0]||{};
  S.campMC[n]={goal:n,choice,correct:r.correct,feedback:r.feedback};
  S.campane[n]={goal:n,choice}; S.campEvals[n]={goal:n,points:choice===r.correct?PTS_CAMPANA:0};
  pendingCamp=null;
  toast(choice===r.correct ? `Esatto! +${PTS_CAMPANA} punti` : "Risposta registrata");
  await refreshSblocco(); openGoal(n); loadBoard(false);
}

async function markSent(n,btn){
  if(!confirm("Confermate di aver inviato la mail con il materiale delle prove?")) return;
  btn.disabled=true;
  const { data, error } = await sb.from("submissions")
    .upsert({ clan_id:uid(), goal:n, text:"Materiale inviato via email", links:[], updated_at:new Date().toISOString() }, { onConflict:"clan_id,goal" })
    .select().single();
  if(error){ console.error(error); btn.disabled=false; return toast("Non salvato. Controllate la connessione e riprovate."); }
  S.subs[n]=data;
  toast("Segnato: la commissione valuterà il vostro materiale");
  await refreshSblocco(); openGoal(n);
}

/* ---------- Profilo della Comunità R/S: nomi, foto, membri, email, password ---------- */
function profileFields(c){
  const members=(c?.members||[]).join("\n");
  return `
    <label class="f">Membri della Comunità R/S <span class="h">Un nome per riga (massimo 40). Compariranno nella pagina "Comunità R/S".</span>
      <textarea id="pMembers" maxlength="2400" style="min-height:120px" placeholder="Anna Esposito&#10;Luca Russo&#10;…">${esc(members)}</textarea></label>
    <label class="f">${c?.photo ? "Cambia la foto della Comunità R/S" : "Foto della Comunità R/S"} <span class="h">Una foto di gruppo, in orizzontale se possibile. JPG o PNG.</span>
      <input type="file" id="pPhoto" accept="image/*"></label>
    <label class="check"><input type="checkbox" id="pConsent"> <span>Confermiamo che tutti i membri della Comunità R/S, e i genitori di chi è minorenne, sono d'accordo a pubblicare foto e nomi su questo sito.</span></label>`;
}
function readProfile(){
  const members=($("#pMembers")?.value||"").split(/\n|,/).map(s=>s.trim().replace(/\s+/g," ").slice(0,60)).filter(Boolean);
  const file=$("#pPhoto")?.files?.[0]||null;
  if(members.length>40) return { error:"Massimo 40 nomi nella lista dei membri." };
  if((members.length||file) && !$("#pConsent")?.checked) return { error:"Per pubblicare foto e nomi serve la conferma del consenso (la casella in fondo)." };
  return { members, file };
}
async function shrink(file){
  try{
    const bmp = await createImageBitmap(file);
    const k = Math.min(1, 1600/Math.max(bmp.width,bmp.height));
    const cv = document.createElement("canvas");
    cv.width=Math.round(bmp.width*k); cv.height=Math.round(bmp.height*k);
    cv.getContext("2d").drawImage(bmp,0,0,cv.width,cv.height);
    return await new Promise(r=>cv.toBlob(r,"image/jpeg",0.82));
  }catch(e){
    if(/^image\/(jpeg|png|webp)$/.test(file.type) && file.size<5e6) return file;
    throw new Error("foto-non-valida");
  }
}
async function uploadClanPhoto(file){
  const blob=await shrink(file);
  const path=`${uid()}/clan-${Date.now()}.jpg`;
  const { error } = await sb.storage.from("clan").upload(path, blob, { contentType: blob.type || "image/jpeg" });
  if(error) throw error;
  return path;
}
function openProfile(){
  const c=S.clan, dlg=$("#goalDlg");
  S.openGoal=null;
  dlg.innerHTML = `
    <div class="m-head" style="--c:var(--kerchief)">
      <div><h2>${esc(nomeCom(c))}</h2><p>Zona ${esc(c.zona)}${c.grp?" · "+esc(c.grp):""} · Codice ${esc(c.code)}</p></div>
      <button class="m-close" aria-label="Chiudi" id="mClose">×</button>
    </div>
    <div class="m-body">
      <form id="profForm" class="stack" style="padding-top:18px">
        <h3>Nome della Comunità R/S</h3>
        <label class="f">Nome del noviziato <span class="h">Facoltativo, solo il nome. Compare accanto al clan: «${esc(c.name)} e Noviziato …».</span><span class="prefix-in"><span>Noviziato</span><input type="text" id="pNov" maxlength="50" value="${esc(soloNome(c.noviziato||"","noviziato"))}" placeholder="Stella Polare"></span></label>
        <h3>Foto e membri <span class="pts">pagina "Comunità R/S"</span></h3>
        ${c.photo?`<img class="prof-photo" src="${esc(clanPhotoUrl(c.photo))}" alt="Foto di ${esc(nomeCom(c))}">`:""}
        ${profileFields(c)}
        <label class="f">Email di riferimento <span class="h">Per recuperare codice o password. Non compare sul sito.</span><input type="email" id="pEmail" required maxlength="120" value="${esc(c.email||"")}"></label>
        <p class="err hidden" id="profErr"></p>
        <button class="btn" type="submit">Salva</button>
      </form>
      <form id="pwForm" class="stack m-sec" style="margin-top:12px">
        <h3>Cambia password</h3>
        <label class="f">Nuova password <span class="h">Almeno 6 caratteri. Se la commissione vi ha dato una password temporanea, cambiatela qui.</span><input type="password" id="pw1" required minlength="6" autocomplete="new-password"></label>
        <label class="f">Ripeti la nuova password<input type="password" id="pw2" required minlength="6" autocomplete="new-password"></label>
        <p class="err hidden" id="pwErr"></p>
        <button class="btn ghost" type="submit">Cambia password</button>
      </form>
    </div>`;
  if(!dlg.open) dlg.showModal();
  $("#mClose").onclick=()=>dlg.close();
  $("#profForm").addEventListener("submit", async e=>{
    e.preventDefault();
    const btn=e.submitter, err=$("#profErr");
    const prof=readProfile(), email=$("#pEmail").value.trim();
    const fail=m=>{ err.textContent=m; err.classList.remove("hidden"); };
    if(prof.error) return fail(prof.error);
    if(!emailOk(email)) return fail("Controllate l'email di riferimento.");
    btn.disabled=true; btn.textContent="Salvataggio…";
    try{
      const upd={ members: prof.members, email, noviziato: nomeNov($("#pNov").value) };
      if(prof.file){ btn.textContent="Carico la foto…"; upd.photo=await uploadClanPhoto(prof.file); }
      const { error } = await sb.from("clans").update(upd).eq("id",uid());
      if(error) throw error;
      if(upd.photo && c.photo) sb.storage.from("clan").remove([c.photo]).catch(()=>{});
      Object.assign(S.clan, upd); S.gallery=null;
      toast("Profilo della Comunità R/S aggiornato"); dlg.close();
    }catch(ex){
      console.error(ex); btn.disabled=false; btn.textContent="Salva";
      fail(ex.message==="foto-non-valida" ? "La foto non è in un formato valido: usate JPG o PNG." : "Salvataggio non riuscito. Riprovate.");
    }
  });
  $("#pwForm").addEventListener("submit", async e=>{
    e.preventDefault();
    const p1=$("#pw1").value, p2=$("#pw2").value, err=$("#pwErr");
    const fail=m=>{ err.textContent=m; err.classList.remove("hidden"); };
    if(p1.length<6) return fail("La password deve avere almeno 6 caratteri.");
    if(p1!==p2) return fail("Le due password non coincidono.");
    e.submitter.disabled=true;
    const { error } = await sb.auth.updateUser({ password:p1 });
    e.submitter.disabled=false;
    if(error){ console.error(error); return fail("Password non cambiata. Riprovate."); }
    $("#pw1").value=$("#pw2").value=""; toast("Password cambiata. Ricordatela!");
  });
}

/* ---------- Classifica ---------- */
function renderBoard(){
  const all=S.board, rows=S.boardZona ? all.filter(r=>r.zona===S.boardZona) : all;
  const max=Math.max(1,...rows.map(r=>r.totale));
  let pos=0, prev=null;
  $("#app").innerHTML = `<section class="hero"><p class="kicker">Strade 2030 · Il domani è oggi</p><h1>Classifica delle Comunità&nbsp;R/S</h1><p>${all.length} Comunità R/S in cammino. Domande globali e campane contano subito; i punti delle sfide locali compaiono appena la commissione le valuta.</p></section>
   <div class="filters"><select id="zf" aria-label="Filtra per zona" class="pill-select"><option value="">Tutte le zone</option>${ZONE.map(z=>`<option ${z===S.boardZona?"selected":""}>${esc(z)}</option>`).join("")}</select></div>
   <div class="panel board-panel" style="margin-bottom:60px">
    ${rows.length?`<ol class="lb">${rows.map((r,i)=>{ if(r.totale!==prev){pos=i+1;prev=r.totale;}
      const me=r.clan_id===uid();
      return `<li class="${me?"me":""} ${pos<=3?"top":""}"><span class="pos">${pos}</span>
        <div class="who"><b>${esc(r.name)}${me?" <em>voi</em>":""}</b><small>Zona ${esc(r.zona)}${r.grp?" · "+esc(r.grp):""}</small></div>
        <span class="tot">${r.totale}<small>punti</small></span>
        <div class="split">
          <div class="bar" aria-hidden="true"><i style="width:${r.globale/max*100}%;background:var(--ink-soft)"></i><i style="width:${r.campana/max*100}%;background:var(--warn)"></i><i style="width:${r.locale/max*100}%;background:var(--ok)"></i><i style="width:${r.bonus/max*100}%;background:var(--kerchief)"></i></div>
          <ul class="legend"><li><i style="background:var(--ink-soft)"></i>Globali <b>${r.globale}</b></li><li><i style="background:var(--warn)"></i>Campane <b>${r.campana}</b></li><li><i style="background:var(--ok)"></i>Locali <b>${r.locale}</b></li>${r.bonus?`<li><i style="background:var(--kerchief)"></i>Bonus <b>${r.bonus}</b></li>`:""}</ul>
        </div></li>`; }).join("")}</ol>`
    :`<p class="muted">${S.boardZona?"Nessuna Comunità R/S di questa zona in classifica.":"Nessuna Comunità R/S ancora in gara. La prima a registrarsi apre la strada."}</p>`}
   </div>`;
  $("#zf").onchange=e=>{ S.boardZona=e.target.value; renderBoard(); };
}

/* ---------- Galleria delle Comunità R/S, per zona ---------- */
function renderGallery(){
  const head = `<section class="hero"><p class="kicker">Strade 2030 · Thinking of Campania</p><h1>Le Comunità&nbsp;R/S in cammino</h1>`;
  if(S.gallery===null){ $("#app").innerHTML = head+`<p>Caricamento…</p></section>`; loadGallery(); return; }
  const rows=S.gallery;
  const zone=ZONE.filter(z=>rows.some(r=>r.zona===z));
  $("#app").innerHTML = head+`<p>${rows.length} Comunità R/S della Campania sulle strade dell'Agenda 2030.</p>
    ${zone.length>1?`<nav class="zone-nav">${zone.map(z=>`<a href="#zona-${esc(z)}">${esc(z)}</a>`).join("")}</nav>`:""}</section>
    ${rows.length? zone.map(z=>`<section class="zone-block" id="zona-${esc(z)}"><h2 class="zone-title">Zona ${esc(z)} <span>${rows.filter(r=>r.zona===z).length}</span></h2>
      <div class="gallery">${rows.filter(r=>r.zona===z).map(r=>{ const url=clanPhotoUrl(r.photo); const me=r.clan_id===uid();
      return `<article class="gcard${me?" me":""}">
        <header><h3>${esc(r.name)}${r.grp?` <span>- ${esc(r.grp)}</span>`:""}</h3>${me?`<small>la vostra Comunità R/S</small>`:""}</header>
        ${url?`<img src="${esc(url)}" alt="Foto di ${esc(r.name)}" loading="lazy">`:`<div class="gph" aria-hidden="true">${esc(r.name.replace(/^(clan|noviziato)\s+/i,"").slice(0,1).toUpperCase())}</div>`}
        ${r.members?.length?`<p class="gmembers">${r.members.map(esc).join(" · ")}</p>`:""}
      </article>`; }).join("")}</div></section>`).join("")
    :`<p class="muted" style="padding-bottom:60px">Ancora nessuna Comunità R/S iscritta.</p>`}`;
  document.querySelectorAll(".zone-nav a").forEach(a=>a.onclick=e=>{ e.preventDefault(); document.getElementById(a.getAttribute("href").slice(1))?.scrollIntoView({behavior:"smooth"}); });
}

/* ---------- Obiettivi di futuro ---------- */
let futurePick=null;
function renderFuture(){
  const head = `<section class="hero"><p class="kicker">Thinking of Campania · Il domani è oggi</p><h1>I vostri obiettivi di futuro</h1>
    <p>Dopo aver percorso le strade dell'Agenda 2030, ogni Comunità R/S sceglie <b>3 obiettivi</b> su cui vorrebbe impegnarsi in futuro. La scelta nasce da ciò che avete scoperto con le sfide: non dovete lavorare su tutti e 3, ma indicare dove volete mettere le vostre energie. Potete cambiarli quando volete.</p></section>`;
  if(S.scelte===null){ $("#app").innerHTML = head+`<p>Caricamento…</p>`; loadScelte(); return; }
  const clanRows=S.scelte.filter(r=>r.livello==="clan");
  const mine=clanRows.filter(r=>r.soggetto===uid());   // dal database arrivano solo le proprie

  // Parte della Comunità R/S
  let mineHtml="";
  if(S.clan){
    const p=progress();
    if(!p.sbloccato){
      mineHtml = progressCard();
    } else {
      if(futurePick===null) futurePick = Object.fromEntries(mine.map(r=>[r.goal, r.perche||""]));
      const picked=Object.keys(futurePick).map(Number);
      mineHtml = `<section class="panel chooser">
        <h2>${mine.length?"Le vostre scelte":"Scegliete i vostri 3 obiettivi"} <span class="pts">${picked.length}/3</span></h2>
        <p class="muted">Toccate un'icona per sceglierla o toglierla. Potete cambiare idea quando volete.</p>
        <div class="sdg-grid">${GOALS.map(G=>`<button type="button" class="sdg-pick ${futurePick[G.n]!==undefined?"on":""}" data-pick="${G.n}" aria-pressed="${futurePick[G.n]!==undefined}">${sdg(G.n)}</button>`).join("")}</div>
        ${picked.length?`<div class="why stack">${picked.sort((x,y)=>x-y).map(n=>`<label class="f">${sdg(n,"mini")} Perché l'obiettivo ${n}? <span class="h">Facoltativo, massimo 300 caratteri</span><textarea data-why="${n}" maxlength="300" style="min-height:70px">${esc(futurePick[n])}</textarea></label>`).join("")}</div>`:""}
        <div class="row-actions"><button class="btn" id="saveFuture" ${picked.length!==3?"disabled":""}>Salva le 3 scelte</button>${picked.length!==3?`<span class="muted small">Servono esattamente 3 obiettivi.</span>`:""}</div>
      </section>`;
    }
  }

  const riservato = `<p class="muted small">Le scelte delle altre Comunità R/S restano riservate: le scoprirete tutte insieme alla fine della sfida.</p>`;
  $("#app").innerHTML = head + `<div class="stack" style="padding-bottom:60px">${levelsHtml()}${mineHtml}${riservato}${nextLevels()}</div>`;

  document.querySelectorAll("[data-pick]").forEach(b=>b.onclick=()=>{
    document.querySelectorAll("[data-why]").forEach(t=>futurePick[t.dataset.why]=t.value);
    const n=+b.dataset.pick;
    if(futurePick[n]!==undefined) delete futurePick[n];
    else if(Object.keys(futurePick).length>=3) return toast("Avete già 3 obiettivi: toglietene uno per sceglierne un altro.");
    else futurePick[n]="";
    renderFuture();
  });
  const sv=$("#saveFuture"); if(sv) sv.onclick=async()=>{
    document.querySelectorAll("[data-why]").forEach(t=>futurePick[t.dataset.why]=t.value);
    const goals=Object.keys(futurePick).map(Number).sort((a,b)=>a-b);
    if(goals.length!==3) return;
    sv.disabled=true;
    const { error } = await sb.rpc("salva_scelte",{ p_goals:goals, p_perche:goals.map(g=>(futurePick[g]||"").slice(0,300)) });
    if(error){ sv.disabled=false; console.error(error); return toast(/sbloccata/.test(error.message)?"La sezione non è ancora sbloccata.":"Scelte non salvate. Riprovate."); }
    toast("Obiettivi di futuro salvati"); futurePick=null; await loadScelte();
  };
}

/* Livelli: Comunità R/S (ora), zona e Agorà regionale (dopo la sfida) */
const LEVELS=[
  {k:"clan", n:"1", t:"Thinking of Comunità", s:"Le Comunità R/S", d:"Ogni Comunità R/S sceglie i 3 obiettivi di futuro per il suo territorio."},
  {k:"zona", n:"2", t:"Thinking of Zona", s:"Agorà di Zona", d:"Ogni zona, partendo dalle scelte delle sue Comunità R/S, sceglierà i suoi 3 obiettivi."},
  {k:"regionale", n:"3", t:"Thinking of Campania", s:"Agorà regionale", d:"L'ultima tappa: all'Agorà la Campania sceglierà insieme i suoi 3 obiettivi."}];
const levelOpen = k => k==="clan" || (S.scelte||[]).some(r=>r.livello===k);
function levelsHtml(){
  return `<ol class="levels">${LEVELS.map(L=>`<li class="${levelOpen(L.k)?"on":""}"><span class="lv-n">${L.n}</span><div><b>${L.t}</b><small>${L.s} · ${levelOpen(L.k)?(L.k==="clan"?"in corso":"aperto"):"in attesa"}</small></div></li>`).join("")}</ol>`;
}
function nextLevels(){
  return LEVELS.slice(1).map(L=>{
    const rows=(S.scelte||[]).filter(r=>r.livello===L.k);
    if(!rows.length) return `<section class="waiting"><span class="lv-n">${L.n}</span><div>
        <p class="kicker">Waiting for… ${L.s}</p>
        <h2>${L.t}</h2>
        <p>${esc(L.d)} Questa tappa si apre alla fine della sfida: intanto continuate a camminare, le vostre scelte di oggi saranno il punto di partenza.</p>
      </div></section>`;
    const by={}; rows.forEach(r=>{ (by[r.soggetto] ||= []).push(r); });
    return `<section class="panel"><h2>${L.t}</h2><p class="muted">${esc(L.s)}</p>
      <div class="choices">${Object.entries(by).map(([sog,gs])=>`<article class="choice"><h3>Thinking of ${esc(sog)}</h3>
        <div class="choice-icons">${gs.sort((a,b)=>a.goal-b.goal).map(r=>`<div>${sdg(r.goal)}${r.perche?`<p>${esc(r.perche)}</p>`:""}</div>`).join("")}</div></article>`).join("")}</div></section>`;
  }).join("");
}

/* ---------- Regole ---------- */
function renderRules(){
  const li = arr => `<ul class="rl">${arr.map(x=>`<li>${x}</li>`).join("")}</ul>`;
  $("#app").innerHTML = `<section class="hero"><p class="kicker">Strade 2030 · Thinking of Campania</p><h1>Come funziona</h1>
    ${li(["Ogni obiettivo dell'Agenda 2030 contiene tre sfide.","Potete affrontarle nell'ordine che volete e in quanto tempo volete."])}
    <p><button class="linkbtn" type="button" data-spirit>Lo spirito del gioco</button></p></section>
  <div class="rules rules4">
    <div class="panel"><span class="big">${PTS_GLOBAL}</span><h3>Sfida globale</h3>${li(["Una domanda sul mondo.","<b>Un solo tentativo.</b>",`Giusta: <b>${PTS_GLOBAL} punti</b>. Sbagliata: 0.`,"Confrontatevi prima di confermare."])}</div>
    <div class="panel"><span class="big">${PTS_CAMPANA}</span><h3>Sfida campana</h3>${li(["Una domanda sulla Campania.","Sotto trovate le fonti: <b>leggetele prima</b>.","<b>Un solo tentativo.</b>",`Giusta: <b>${PTS_CAMPANA} punti</b>.`])}</div>
    <div class="panel"><span class="big">${LOCAL_MAX}</span><h3>Sfida locale</h3>${li(["<b>3 prove</b> sul vostro territorio, dalla più facile alla più impegnativa.",`<b>${LOCAL_MAX/3} punti</b> per ogni prova.`,"Tutte o solo alcune, anche in momenti diversi.",`Materiale via email a <b>${esc(CONSEGNA.email||"gli organizzatori")}</b>.`,`File e video pesanti con un link <a href="https://wetransfer.com/" target="_blank" rel="noopener noreferrer">WeTransfer</a>.`])}</div>
    <div class="panel"><span class="big">+${PTS_BONUS}</span><h3>Sfida completa</h3>${li(["Fate <b>tutte e 3 le prove</b> di una sfida locale.",`Ricevete <b>${PTS_BONUS} punti</b> in più.`,"3 prove sullo stesso obiettivo valgono più di 3 prove sparse."])}</div>
  </div>
  <section class="panel rules-futuro">
    <h3>Obiettivi di futuro</h3>
    <div class="rf-cols">
      <div><h4>Si sbloccano quando avete</h4>${li(["risposto a <b>tutte le 17 domande globali</b>;","risposto a <b>tutte le 17 domande campane</b>;",`consegnato <b>almeno ${SBLOCCO_LOCALI} ${SBLOCCO_LOCALI===1?"sfida locale":"sfide locali"}</b>.`])}</div>
      <div><h4>Poi</h4>${li(["scegliete i <b>3 obiettivi</b> più importanti per il vostro territorio;","potete cambiarli quando volete;","le scelte restano riservate fino alla fine della sfida."])}</div>
    </div>
  </section>`;
}
