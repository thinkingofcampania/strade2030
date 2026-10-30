/* =====================================================================
   STRADE 2030 · App dei clan
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

/* ---------- Punti del proprio clan ---------- */
function tally(){
  let g=0,c=0,l=0,b=0,done=0;
  for(const G of GOALS){
    const a=S.answers[G.n], ok=!!a && a.answer===a.correct; if(ok) g+=PTS_GLOBAL;
    const ce=S.campEvals[G.n]; if(ce) c+=ce.points;
    const e=S.evals[G.n]; if(e){ l+=e.points; done++; }
    if(ok && e && e.points>0) b+=PTS_BONUS;
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
$("#spiritOk").onclick=()=>{ try{ localStorage.setItem("strade2030-spirito","1"); }catch(e){} $("#spiritDlg").close(); };
$("#spiritDlg").addEventListener("cancel",()=>{ try{ localStorage.setItem("strade2030-spirito","1"); }catch(e){} });
document.addEventListener("click", e=>{ if(e.target.closest("[data-spirit]")) openSpirit(); });

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
      <label class="f">Nome del clan<input type="text" id="rName" required maxlength="60" placeholder="Es. Clan Croce del Sud"></label>
      <label class="f">Gruppo scout<input type="text" id="rGroup" required maxlength="60" placeholder="Es. Santa Maria CV1"></label>
      <label class="f">Zona${zonaSelect("rZona")}</label>
      <label class="f">Email di riferimento del clan <span class="h">Serve solo per recuperare codice o password. Non compare sul sito. Va bene quella del clan o di un capo.</span><input type="email" id="rEmail" required maxlength="120" autocomplete="email" placeholder="nome@esempio.it"></label>
      <fieldset class="profile-box">
        <legend>Foto e membri del clan <span class="h">Facoltativo, potete aggiungerli anche dopo</span></legend>
        ${profileFields(null)}
      </fieldset>
      <label class="f">Password del clan <span class="h">Almeno 6 caratteri. Condividetela solo dentro il clan.</span><input type="password" id="rPw" required minlength="6" autocomplete="new-password"></label>
      <label class="f">Ripeti la password<input type="password" id="rPw2" required minlength="6" autocomplete="new-password"></label>
      <button class="btn" type="submit">Registra il clan e inizia</button>`;
  else if(m==="login") form = `
      <label class="f">Codice clan <span class="h">Ve l'abbiamo dato alla registrazione, es. FENICE-4821</span><input type="text" id="lCode" required autocapitalize="characters" placeholder="FENICE-4821"></label>
      <label class="f">Password del clan<input type="password" id="lPw" required autocomplete="current-password"></label>
      <button class="btn" type="submit">Entra</button>
      <button class="linkbtn" type="button" data-mode="recover">Codice o password dimenticati?</button>`;
  else form = `
      <p style="margin:0">Scriveteci chi siete: la commissione vi risponderà all'email di riferimento del clan con il codice o con una password temporanea. Non vi manderemo mai la vostra password attuale: nessuno la conosce.</p>
      <label class="f">Zona${zonaSelect("qZona")}</label>
      <label class="f">Nome del clan e gruppo<input type="text" id="qClan" required maxlength="80" placeholder="Es. Clan Croce del Sud, Santa Maria CV1"></label>
      <label class="f">Email di riferimento del clan<input type="email" id="qEmail" required maxlength="120" autocomplete="email"></label>
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
    <p class="muted">Ogni obiettivo dell'Agenda 2030 vi aspetta con tre sfide: una domanda sul mondo, una sulla Campania e una missione da compiere nel vostro territorio. <button class="linkbtn" type="button" data-spirit>Lo spirito del gioco</button></p>
    <div class="seg" role="group">
      <button type="button" data-mode="register" aria-pressed="${m==="register"}">Registra il clan</button>
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
  const name=$("#rName").value.trim(), grp=$("#rGroup").value.trim(), zona=$("#rZona").value, email=$("#rEmail").value.trim();
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
    const { error:e2 } = await sb.from("clans").insert({ id:user.id, name, grp, zona, email, code, members: prof.members });
    if(e2) throw e2;
    if(prof.file){
      btn.textContent="Carico la foto del clan…";
      try{ const path=await uploadClanPhoto(prof.file); await sb.from("clans").update({ photo:path }).eq("id",user.id); }
      catch(ph){ console.error(ph); toast("Clan registrato, ma la foto non è stata caricata: aggiungetela dalla mappa."); }
    }
    S.newCode = code; S.gallery = null;
    await loadAll();
  }catch(err){
    console.error(err);
    btn.disabled=false; btn.textContent="Registra il clan e inizia";
    if(err.message==="conferma-email") authError("Registrazione bloccata: l'organizzazione deve disattivare la conferma email in Supabase (vedi LEGGIMI).");
    else if(/rate|many/i.test(err.message||"")) authError("Troppe registrazioni in poco tempo da questa rete. Riprovate tra qualche minuto.");
    else authError("Registrazione non riuscita. Controllate i dati e riprovate.");
  }
}

async function doLogin(btn){
  const code=$("#lCode").value, pw=$("#lPw").value;
  btn.disabled=true;
  const { data, error } = await sb.auth.signInWithPassword({ email: codeToEmail(code), password: pw });
  if(error){ btn.disabled=false; return authError("Codice clan o password non corretti."); }
  S.session=data.session; S.tab="map";
  await loadAll();
}

async function doRecover(btn){
  const zona=$("#qZona").value, clan=$("#qClan").value.trim(), email=$("#qEmail").value.trim(), messaggio=$("#qMsg").value.trim();
  if(!ZONE.includes(zona)) return authError("Scegliete la zona dal menu.");
  if(clan.length<2) return authError("Scrivete il nome del clan.");
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
    <p>Questo è il vostro codice clan. Scrivetelo sul quaderno di clan: con il codice e la password potete entrare da qualsiasi telefono.</p>
    <div class="codebox">${esc(S.newCode)}</div>
    <button class="btn" id="goMap" style="width:100%">Ho segnato il codice, apriamo la mappa</button>
  </div>`;
  $("#goMap").onclick=()=>{ S.newCode=null; render(); };
}

/* Account creato ma registrazione del clan interrotta */
function renderComplete(){
  const code = (S.session.user.email||"").split("@")[0].toUpperCase();
  if(!S.session.user.email?.endsWith("@"+CLAN_DOMAIN)){
    return fatal("Questo account non è un clan. Se sei della commissione usa la pagina di valutazione.");
  }
  $("#app").innerHTML = `
  <div class="reg"><h1>Completate la registrazione</h1>
   <form id="compForm" class="panel stack" style="margin-top:20px">
    <p style="margin:0">Codice clan: <b>${esc(code)}</b></p>
    <label class="f">Nome del clan<input type="text" id="cName" required maxlength="60"></label>
    <label class="f">Gruppo scout<input type="text" id="cGroup" required maxlength="60"></label>
    <label class="f">Zona${zonaSelect("cZona")}</label>
    <label class="f">Email di riferimento del clan<input type="email" id="cEmail" required maxlength="120"></label>
    <button class="btn" type="submit">Salva e apri la mappa</button><p class="err hidden" id="authErr"></p>
   </form></div>`;
  $("#compForm").addEventListener("submit", async e=>{
    e.preventDefault();
    const zona=$("#cZona").value, email=$("#cEmail").value.trim();
    if(!ZONE.includes(zona)) return authError("Scegliete la zona dal menu.");
    if(!emailOk(email)) return authError("Controllate l'email.");
    const { error } = await sb.from("clans").insert({ id:uid(), name:$("#cName").value.trim(), grp:$("#cGroup").value.trim(), zona, email, code });
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
    <p>${p.sbloccato?"Avete guardato tutti i 17 obiettivi. Ora scegliete i 3 su cui il vostro clan vuole impegnarsi.":"Rispondete a tutte le domande globali e campane e consegnate almeno una sfida locale: così avrete guardato da vicino tutta l'Agenda 2030."}</p></div>
    ${p.sbloccato?`<button class="btn" data-tab="future">Scegliete i vostri 3 obiettivi</button>`:
      `<div class="pbars">${bar(p.globali,17,"Domande globali")}${bar(p.campane,17,"Domande campane")}${bar(p.locali,SBLOCCO_LOCALI,"Sfide locali consegnate")}</div>`}
  </section>`;
}
function renderMap(){
  const c=S.clan, t=tally();
  $("#app").innerHTML = `<section class="hero">
    <p class="kicker">Strade 2030 · Thinking of Campania</p>
    <h1>Scegliete la vostra prossima tappa.</h1>
    <div class="clan-line"><span class="chip">${esc(c.name)}</span><span class="chip soft">Zona ${esc(c.zona)}${c.grp?" · "+esc(c.grp):""}</span><span class="chip soft">Codice ${esc(c.code)}</span><span class="chip soft">${t.done} sfide locali valutate</span><button class="chip linkchip" id="editProfile">Profilo del clan</button><button class="chip linkchip" data-spirit>Lo spirito del gioco</button></div>
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
const partsHtml = (parts, prefix, scores) => `<ol class="parts">${parts.map((p,i)=>{
  const k=prefix+(i+1), sc=scores?.[k];
  return `<li><div class="part-top"><span>${esc(p.t)}</span><span class="pmax">${sc!=null?`<b>${sc}</b>/`:"max "}${p.p}</span></div>
    <div class="crit-chips">${p.k.map(x=>`<span>${esc(x)}</span>`).join("")}</div></li>`; }).join("")}</ol>`;
function srcHtml(src){
  return src.map(([n,u])=>u&&safeUrl(u) ? `<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(n)}</a>` : esc(n)).join(" · ");
}
function mailSubject(G){ const c=S.clan; return `${c.zona} - ${c.name} - Obiettivo ${G.n} - Sfida locale`; }
function consegnaHtml(G){
  const c=S.clan, subject=mailSubject(G);
  const regole=`<ul class="deliver small">
      <li>Una mail per sfida, con l'oggetto qui sopra.</li>
      <li>Nel testo della mail scrivete cosa contiene ogni file e a quale consegna si riferisce (1, 2, 3${G.acts?", e quali attività avete svolto":""}).</li>
      <li>File oltre ${CONSEGNA.limiteMB} MB: non allegateli. Caricateli su Google Drive, WeTransfer o Dropbox e incollate il link nella mail, con accesso "chiunque abbia il link".</li>
      <li>Video: meglio compressi, oppure su YouTube come "non in elenco".</li></ul>`;
  if(!(CONSEGNA.modo==="email" && emailOk(CONSEGNA.email||""))){
    return `<div class="howto"><h4>Come consegnare</h4><p>Le istruzioni per inviare il materiale arriveranno a breve dagli organizzatori.</p></div>`;
  }
  const body=`Clan: ${c.name}\nGruppo: ${c.grp||""}\nZona: ${c.zona}\nCodice: ${c.code}\nObiettivo ${G.n} - ${G.t} - Sfida locale\n${G.acts?"\nAttività svolte (A, B, C, D): \n":""}\nContenuto dei file:\n1. \n2. \n3. \n`;
  const mail=`mailto:${CONSEGNA.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  return `<div class="howto"><h4>Come consegnare</h4>
    <p><b>1. Raccogliete il materiale</b> di tutte le consegne qui sopra.</p>
    <p><b>2. Inviatelo per email</b> a <b>${esc(CONSEGNA.email)}</b> con questo oggetto:</p>
    <p class="subject">${esc(subject)}</p>
    <a class="btn small" href="${esc(mail)}">Scrivi la mail</a>${regole}
    <p><b>3. Avvisateci qui</b> premendo "Abbiamo inviato la mail": così la commissione sa che c'è materiale da valutare.</p></div>`;
}

function openGoal(n){
  const G=goal(n), dlg=$("#goalDlg");
  if(S.openGoal!==n){ pendingChoice=null; pendingCamp=null; }
  S.openGoal=n; S.dirty=false;
  const a=S.answers[n], answered=!!a;

  // Globale
  const opts = G.o.map((o,i)=>{
    let cls="opt";
    if(answered){ if(i===a.correct) cls+=" right"; else if(i===a.answer) cls+=" wrong"; }
    return `<button class="${cls}" data-opt="${i}" aria-pressed="${pendingChoice===i}" ${answered?"disabled":""}>${esc(o)}</button>`;
  }).join("");
  const globalRes = answered
    ? `<div class="result">${a.answer===a.correct?`<b>Esatto, +${PTS_GLOBAL} punti.</b>`:`<b>Risposta sbagliata.</b> Quella giusta era: ${esc(G.o[a.correct])}.`} ${esc(a.feedback||"")}</div>`
    : `<div class="row-actions"><button class="btn" id="confirmAns" ${pendingChoice==null?"disabled":""}>Conferma risposta</button><span class="muted small">Avete un solo tentativo: consultatevi prima.</span></div>`;

  // Campana: a risposta multipla (se ha le opzioni) o aperta
  const C=G.campana, ca=S.campane[n], ce=S.campEvals[n], cm=S.campMC[n];
  let campBlock;
  if(C.o){
    const done=!!cm;
    const copts=C.o.map((o,i)=>{ let cls="opt";
      if(done){ if(i===cm.correct) cls+=" right"; else if(i===cm.choice) cls+=" wrong"; }
      return `<button class="${cls}" data-copt="${i}" aria-pressed="${pendingCamp===i}" ${done?"disabled":""}>${esc(o)}</button>`; }).join("");
    campBlock = `<div class="opts">${copts}</div>` + (done
      ? `<div class="result">${cm.choice===cm.correct?`<b>Esatto, +${PTS_CAMPANA} punti.</b>`:`<b>Risposta sbagliata.</b> Quella giusta era: ${esc(C.o[cm.correct])}.`} ${esc(cm.feedback||"")}</div>`
      : `<div class="row-actions"><button class="btn" id="confirmCamp" ${pendingCamp==null?"disabled":""}>Conferma risposta</button><span class="muted small">Un solo tentativo: cercate prima nella fonte.</span></div>`);
  } else campBlock = ce
    ? `<p><span class="status ok">Valutata: ${ce.points}/${PTS_CAMPANA} punti</span></p>
       <div class="result"><b>La vostra risposta:</b><br><span class="pre">${esc(ca?.answer)}</span>${ce.comment?`<br><br><b>Commento della commissione:</b> ${esc(ce.comment)}`:""}</div>`
    : `<form id="campForm" class="stack" style="margin-top:10px">
        <label class="f">La vostra risposta <span class="h">Scrivete anche dove avete trovato i dati. Potete correggerla finché la commissione non la valuta.</span>
          <textarea id="cAns" required maxlength="3000" style="min-height:110px">${esc(ca?.answer||"")}</textarea></label>
        <div class="row-actions"><button class="btn" type="submit">${ca?"Aggiorna la risposta":"Invia la risposta"}</button>${ca?`<span class="status wait">Inviata, in attesa di valutazione</span>`:""}</div>
      </form>`;

  // Locale
  const sub=S.subs[n], ev=S.evals[n], scores=ev?.criteria||null;
  let localBody = "";
  if(G.variants) localBody += `<div class="variants">${G.variants.map(([t,d])=>`<div><b>${esc(t)}</b><p>${esc(d)}</p></div>`).join("")}</div>`;
  if(G.acts){
    localBody += `<p class="choose">Sceglietene ${G.choose}</p>` + G.acts.map(A=>{
      const tot=A.parts.reduce((s,p)=>s+p.p,0);
      return `<div class="act"><h4><span class="act-id">${A.id}</span> ${esc(A.t)} <span class="pts">max ${tot}</span></h4><p>${esc(A.d)}</p>
        ${A.rules?`<div class="rules-box"><b>Regole obbligatorie</b><ul>${A.rules.map(r=>`<li>${esc(r)}</li>`).join("")}</ul></div>`:""}
        ${A.fonti?`<p class="muted small">${esc(A.fonti)}</p>`:""}
        ${partsHtml(A.parts, A.id, scores)}</div>`; }).join("");
  } else {
    localBody += `<b>Cosa consegnare</b>${partsHtml(G.parts, "d", scores)}`;
  }
  let localForm;
  if(ev){
    localForm = `<p><span class="status ok">Valutata: ${ev.points}/${LOCAL_MAX} punti</span></p>
      ${ev.comment?`<div class="result"><b>Commento della commissione:</b> ${esc(ev.comment)}</div>`:""}`;
  } else {
    localForm = `${consegnaHtml(G)}
      ${sub?`<p><span class="status wait">Mail segnata come inviata il ${new Date(sub.updated_at).toLocaleDateString("it-IT")}: in attesa di valutazione</span></p>
             <p class="muted small">Avete mandato altro materiale? Inviate un'altra mail con lo stesso oggetto.</p>`
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
        <p class="q">${esc(G.q)}</p><div class="opts">${opts}</div>${globalRes}
      </section>
      <section class="m-sec">
        <h3>Sfida campana <span class="pts">fino a ${PTS_CAMPANA} punti</span></h3>
        <p class="q">${esc(C.q)}</p>
        ${C.nota?`<p class="muted small"><i>${esc(C.nota)}</i></p>`:""}
        <p class="source"><b>Fonte:</b> ${srcHtml(C.src)}</p>
        ${campBlock}
      </section>
      <section class="m-sec">
        <h3>Sfida locale: ${esc(G.lt)} <span class="pts">fino a ${LOCAL_MAX} punti</span></h3>
        <p>${esc(G.ld)}</p>
        ${localBody}
        ${localForm}
      </section>
    </div>`;
  if(!dlg.open) dlg.showModal();
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
  if(!confirm("Confermate di aver inviato la mail con il materiale di questa sfida?")) return;
  btn.disabled=true;
  const { data, error } = await sb.from("submissions")
    .upsert({ clan_id:uid(), goal:n, text:"Materiale inviato via email", links:[], updated_at:new Date().toISOString() }, { onConflict:"clan_id,goal" })
    .select().single();
  if(error){ console.error(error); btn.disabled=false; return toast("Non salvato. Controllate la connessione e riprovate."); }
  S.subs[n]=data;
  toast("Segnato: la commissione valuterà il vostro materiale");
  await refreshSblocco(); openGoal(n);
}

/* ---------- Profilo del clan: foto, membri, email, password ---------- */
function profileFields(c){
  const members=(c?.members||[]).join("\n");
  return `
    <label class="f">Membri del clan <span class="h">Un nome per riga (massimo 40). Compariranno nella pagina "I clan".</span>
      <textarea id="pMembers" maxlength="2400" style="min-height:120px" placeholder="Anna Esposito&#10;Luca Russo&#10;…">${esc(members)}</textarea></label>
    <label class="f">${c?.photo ? "Cambia la foto del clan" : "Foto del clan"} <span class="h">Una foto di gruppo, in orizzontale se possibile. JPG o PNG.</span>
      <input type="file" id="pPhoto" accept="image/*"></label>
    <label class="check"><input type="checkbox" id="pConsent"> <span>Confermiamo che tutti i membri del clan, e i genitori di chi è minorenne, sono d'accordo a pubblicare foto e nomi su questo sito.</span></label>`;
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
      <div><h2>${esc(c.name)}</h2><p>Zona ${esc(c.zona)}${c.grp?" · "+esc(c.grp):""} · Codice ${esc(c.code)}</p></div>
      <button class="m-close" aria-label="Chiudi" id="mClose">×</button>
    </div>
    <div class="m-body">
      <form id="profForm" class="stack" style="padding-top:18px">
        <h3>Foto e membri <span class="pts">pagina "I clan"</span></h3>
        ${c.photo?`<img class="prof-photo" src="${esc(clanPhotoUrl(c.photo))}" alt="Foto del ${esc(c.name)}">`:""}
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
      const upd={ members: prof.members, email };
      if(prof.file){ btn.textContent="Carico la foto…"; upd.photo=await uploadClanPhoto(prof.file); }
      const { error } = await sb.from("clans").update(upd).eq("id",uid());
      if(error) throw error;
      if(upd.photo && c.photo) sb.storage.from("clan").remove([c.photo]).catch(()=>{});
      Object.assign(S.clan, upd); S.gallery=null;
      toast("Profilo del clan aggiornato"); dlg.close();
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
  $("#app").innerHTML = `<section class="hero"><p class="kicker">Strade 2030 · Il domani è oggi</p><h1>Classifica dei clan</h1><p>${all.length} clan in cammino. Domande globali e campane contano subito; i punti delle sfide locali compaiono appena la commissione le valuta.</p></section>
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
    :`<p class="muted">${S.boardZona?"Nessun clan di questa zona in classifica.":"Nessun clan ancora in gara. Il primo a registrarsi apre la strada."}</p>`}
   </div>`;
  $("#zf").onchange=e=>{ S.boardZona=e.target.value; renderBoard(); };
}

/* ---------- Galleria dei clan, per zona ---------- */
function renderGallery(){
  const head = `<section class="hero"><p class="kicker">Strade 2030 · Thinking of Campania</p><h1>I clan in cammino</h1>`;
  if(S.gallery===null){ $("#app").innerHTML = head+`<p>Caricamento…</p></section>`; loadGallery(); return; }
  const rows=S.gallery;
  const zone=ZONE.filter(z=>rows.some(r=>r.zona===z));
  $("#app").innerHTML = head+`<p>${rows.length} clan della Campania sulle strade dell'Agenda 2030.</p>
    ${zone.length>1?`<nav class="zone-nav">${zone.map(z=>`<a href="#zona-${esc(z)}">${esc(z)}</a>`).join("")}</nav>`:""}</section>
    ${rows.length? zone.map(z=>`<section class="zone-block" id="zona-${esc(z)}"><h2 class="zone-title">Zona ${esc(z)} <span>${rows.filter(r=>r.zona===z).length}</span></h2>
      <div class="gallery">${rows.filter(r=>r.zona===z).map(r=>{ const url=clanPhotoUrl(r.photo); const me=r.clan_id===uid();
      return `<article class="gcard${me?" me":""}">
        <header><h3>${esc(r.name)}${r.grp?` <span>- ${esc(r.grp)}</span>`:""}</h3>${me?`<small>il vostro clan</small>`:""}</header>
        ${url?`<img src="${esc(url)}" alt="Foto del ${esc(r.name)}" loading="lazy">`:`<div class="gph" aria-hidden="true">${esc(r.name.replace(/^clan\s+/i,"").slice(0,1).toUpperCase())}</div>`}
        ${r.members?.length?`<p class="gmembers">${r.members.map(esc).join(" · ")}</p>`:""}
      </article>`; }).join("")}</div></section>`).join("")
    :`<p class="muted" style="padding-bottom:60px">Ancora nessun clan iscritto.</p>`}`;
  document.querySelectorAll(".zone-nav a").forEach(a=>a.onclick=e=>{ e.preventDefault(); document.getElementById(a.getAttribute("href").slice(1))?.scrollIntoView({behavior:"smooth"}); });
}

/* ---------- Obiettivi di futuro ---------- */
let futurePick=null;
function renderFuture(){
  const head = `<section class="hero"><p class="kicker">Thinking of Campania · Il domani è oggi</p><h1>I vostri obiettivi di futuro</h1>
    <p>Dopo aver percorso le strade dell'Agenda 2030, ogni clan sceglie <b>3 obiettivi</b> su cui vorrebbe impegnarsi in futuro. La scelta nasce da ciò che avete scoperto con le sfide: non dovete lavorare su tutti e 3, ma indicare dove volete mettere le vostre energie.</p></section>`;
  if(S.scelte===null){ $("#app").innerHTML = head+`<p>Caricamento…</p>`; loadScelte(); return; }
  const clanRows=S.scelte.filter(r=>r.livello==="clan");
  const mine=clanRows.filter(r=>r.soggetto===uid());

  // Parte del clan
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

  // Grafico pubblico
  const counts=GOALS.map(G=>({G, n:clanRows.filter(r=>r.goal===G.n).length})).sort((a,b)=>b.n-a.n || a.G.n-b.G.n);
  const maxC=Math.max(1,...counts.map(c=>c.n));
  const nClan=new Set(clanRows.map(r=>r.soggetto)).size;
  const chart = `<section class="panel">
    <p class="kicker" style="margin:0 0 4px">Thinking of Comunità</p>
    <h2>Quante volte è stato scelto ogni obiettivo</h2>
    <p class="muted">${nClan} clan hanno scelto i loro 3 obiettivi.</p>
    <ol class="hbars">${counts.map(({G,n})=>`<li>${sdg(G.n,"mini")}<span class="hb-label">${G.n}. ${esc(G.t)}</span><span class="hb-track"><i style="width:${n/maxC*100}%;background:${G.c}"></i></span><b>${n}</b></li>`).join("")}</ol>
  </section>`;

  // Elenco per zona
  const byClan={};
  clanRows.forEach(r=>{ (byClan[r.soggetto] ||= {nome:r.nome, zona:r.zona, grp:r.grp, goals:[]}).goals.push(r); });
  const list=Object.values(byClan);
  const zone=ZONE.filter(z=>list.some(c=>c.zona===z));
  const listHtml = list.length ? zone.map(z=>`<section class="zone-block"><h2 class="zone-title">Zona ${esc(z)} <span>${list.filter(c=>c.zona===z).length}</span></h2>
    <div class="choices">${list.filter(c=>c.zona===z).sort((a,b)=>a.nome.localeCompare(b.nome)).map(c=>`<article class="choice">
      <h3>${esc(c.nome)}${c.grp?` <span>- ${esc(c.grp)}</span>`:""}</h3>
      <div class="choice-icons">${c.goals.sort((a,b)=>a.goal-b.goal).map(r=>`<div>${sdg(r.goal)}${r.perche?`<p>${esc(r.perche)}</p>`:""}</div>`).join("")}</div>
    </article>`).join("")}</div></section>`).join("")
    : `<p class="muted">Ancora nessun clan ha scelto i suoi obiettivi.</p>`;

  $("#app").innerHTML = head + `<div class="stack" style="padding-bottom:60px">${levelsHtml()}${mineHtml}${chart}${listHtml}${nextLevels()}</div>`;

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

/* Livelli: clan (ora), zona e Agorà regionale (dopo la sfida) */
const LEVELS=[
  {k:"clan", n:"1", t:"Thinking of Comunità", s:"I clan", d:"Ogni clan sceglie i 3 obiettivi di futuro per il suo territorio."},
  {k:"zona", n:"2", t:"Thinking of Zona", s:"Agorà di Zona", d:"Ogni zona, partendo dalle scelte dei suoi clan, sceglierà i suoi 3 obiettivi."},
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
  $("#app").innerHTML = `<section class="hero"><p class="kicker">Strade 2030 · Thinking of Campania</p><h1>Come funziona</h1><p>Ogni obiettivo è una tappa con tre sfide. Potete affrontarle nell'ordine che volete e in quanto tempo volete. <button class="linkbtn" type="button" data-spirit>Lo spirito del gioco</button></p></section>
  <div class="rules" style="padding-bottom:24px">
    <div class="panel"><span class="big">${PTS_GLOBAL}</span><h3>Sfida globale</h3><p>Una domanda sul mondo. Un solo tentativo: risposta giusta, ${PTS_GLOBAL} punti; sbagliata, zero. Studiate e confrontatevi prima di confermare.</p></div>
    <div class="panel"><span class="big">${PTS_CAMPANA}</span><h3>Sfida campana</h3><p>Una domanda sulla Campania, con la fonte dove cercare la risposta. Un solo tentativo: risposta giusta, ${PTS_CAMPANA} punti.</p></div>
    <div class="panel"><span class="big">${LOCAL_MAX}</span><h3>Sfida locale</h3><p>Una missione sul vostro territorio. Ogni consegna ha il suo punteggio massimo e i criteri che contano. Raccogliete il materiale e inviatelo per email a ${esc(CONSEGNA.email||"gli organizzatori")}, una mail per sfida; la commissione vota consegna per consegna.</p></div>
    <div class="panel"><span class="big">+${PTS_BONUS}</span><h3>Tappa completa</h3><p>Se su uno stesso obiettivo rispondete giusto alla domanda globale e ottenete punti nella sfida locale, ricevete un bonus di ${PTS_BONUS} punti.</p></div>
  </div>
  <section class="panel" style="margin-bottom:60px"><h3>Obiettivi di futuro</h3><p>Quando avete risposto a tutte le 17 domande globali e a tutte le 17 domande campane, e avete consegnato almeno ${SBLOCCO_LOCALI===1?"una sfida locale":SBLOCCO_LOCALI+" sfide locali"}, si sblocca la pagina <b>Obiettivi di futuro</b>: lì il clan sceglie i 3 obiettivi su cui vuole impegnarsi, e tutti possono vedere le scelte.</p></section>`;
}
