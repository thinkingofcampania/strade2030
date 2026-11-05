/* =====================================================================
   STRADE 2030 · Area della commissione
   ===================================================================== */
$("#brand").innerHTML = BRAND + `<div><b>Strade 2030</b><small>Thinking of Campania · Commissione</small></div>`;
let sb=null;
const S={ session:null, clans:{}, subs:[], evals:{}, camp:[], campEvals:{}, campKey:{}, reqs:[], board:[],
          view:"local", filter:"pending", goalFilter:0, zonaFilter:"", campGoal:1, reqFilter:"open", tmp:{} };
const key=(c,g)=>c+"|"+g;
const goal=n=>GOALS[n-1];
const selStyle='class="pill-select"';

(async function init(){
  if(!isConfigured()) return fatal("L'app non è ancora collegata al database. Segui il passo 3 del file LEGGIMI.");
  sb=makeClient();
  const { data:{ session } } = await sb.auth.getSession();
  if(session){ S.session=session; await enter(); } else renderLogin();
})();

function renderLogin(msg){
  $("#app").innerHTML = `<div class="reg"><h1>Commissione</h1>
   <p class="muted">Accesso riservato agli organizzatori.</p>
   <form id="lf" class="panel stack" style="margin-top:20px">
     <label class="f">Email<input type="email" id="em" required autocomplete="username"></label>
     <label class="f">Password<input type="password" id="pw" required autocomplete="current-password"></label>
     <button class="btn" type="submit">Entra</button>
     <p class="err ${msg?"":"hidden"}" id="le">${esc(msg||"")}</p>
   </form></div>`;
  $("#lf").addEventListener("submit", async e=>{
    e.preventDefault(); e.submitter.disabled=true;
    const { data, error } = await sb.auth.signInWithPassword({ email:$("#em").value.trim(), password:$("#pw").value });
    if(error){ e.submitter.disabled=false; const p=$("#le"); p.textContent="Email o password non corretti."; p.classList.remove("hidden"); return; }
    S.session=data.session; await enter();
  });
}

async function enter(){
  const { data:isAdm } = await sb.rpc("is_admin");
  if(!isAdm){ await sb.auth.signOut(); return renderLogin("Questo account non fa parte della commissione."); }
  ["#tabs","#refresh","#logout"].forEach(s=>$(s).classList.remove("hidden"));
  await loadAll();
}

async function loadAll(){
  const r = await Promise.all([
    sb.from("clans").select("*"),
    sb.from("submissions").select("*").order("updated_at",{ascending:true}),
    sb.from("evaluations").select("*"),
    sb.from("campana_answers").select("*").order("updated_at",{ascending:true}),
    sb.from("campana_evals").select("*"),
    sb.from("campana_key").select("*"),
    sb.from("richieste_accesso").select("*").order("created_at",{ascending:false}),
    sb.rpc("classifica"),
    sb.rpc("scelte_pubbliche")
  ]);
  const bad=r.find(x=>x.error); if(bad){ console.error(bad.error); toast("Errore nel caricamento. Hai eseguito l'aggiornamento del database?"); }
  const [c,s,e,ca,ce,ck,rq,b,sc]=r;
  S.clans=Object.fromEntries((c.data||[]).map(x=>[x.id,{...x, name:nomeCom(x)}]));   // nome completo: clan e noviziato
  S.subs=s.data||[];
  S.evals=Object.fromEntries((e.data||[]).map(x=>[key(x.clan_id,x.goal),x]));
  S.camp=ca.data||[];
  S.campEvals=Object.fromEntries((ce.data||[]).map(x=>[key(x.clan_id,x.goal),x]));
  S.campKey=Object.fromEntries((ck.data||[]).map(x=>[x.goal,x]));
  S.reqs=rq.data||[];
  S.board=b.data||[];
  S.scelte=sc.data||[];
  render();
}

$("#refresh").onclick=()=>loadAll().then(()=>toast("Dati aggiornati"));
$("#logout").onclick=async()=>{ await sb.auth.signOut(); location.reload(); };
document.querySelectorAll("[data-view]").forEach(b=>b.onclick=()=>{ S.view=b.dataset.view; S.filter="pending"; render(); window.scrollTo({top:0}); });

function render(){
  document.querySelectorAll("[data-view]").forEach(b=>b.setAttribute("aria-selected", b.dataset.view===S.view));
  const open=S.reqs.filter(r=>!r.gestita).length;
  $('[data-view="req"]').textContent = open ? `Richieste (${open})` : "Richieste";
  ({local:renderLocal, campana:renderCampana, future:renderFuturo, req:renderReq, clans:renderClans})[S.view]();
}
const clanOf = id => S.clans[id] || {name:"?", zona:"?"};
const zonaOpts = () => `<option value="">Tutte le zone</option>${ZONE.map(z=>`<option ${z===S.zonaFilter?"selected":""}>${esc(z)}</option>`).join("")}`;
function filterBar(pend, done, all, extra=""){
  return `<div class="filters">
     <button data-f="pending" aria-pressed="${S.filter==="pending"}">Da valutare (${pend})</button>
     <button data-f="done" aria-pressed="${S.filter==="done"}">Valutate (${done})</button>
     <button data-f="all" aria-pressed="${S.filter==="all"}">Tutte (${all})</button>
     ${extra}
     <select id="zf" ${selStyle} aria-label="Filtra per zona">${zonaOpts()}</select>
   </div>`;
}
function bindFilters(rerender){
  document.querySelectorAll("[data-f]").forEach(b=>b.onclick=()=>{ S.filter=b.dataset.f; rerender(); });
  $("#zf").onchange=e=>{ S.zonaFilter=e.target.value; rerender(); };
}

/* ---------- Sfide locali: voto per consegna ---------- */
function partInputs(parts, prefix, scores){
  return parts.map((p,i)=>{ const k=prefix+(i+1);
    return `<label class="pin"><span><b>Prova ${i+1} · ${esc(LIVELLI[i]||"")}</b> ${esc(p.t)}<small>${p.k.map(esc).join(" · ")}</small></span>
      <input type="number" min="0" max="${p.p}" step="1" data-k="${k}" data-max="${p.p}" value="${scores?.[k]??""}" placeholder="0–${p.p}"><em>/ ${p.p}</em></label>`; }).join("");
}
function computeLocal(G, scores){
  const val=(k,max)=>Math.max(0,Math.min(max,Math.round(+scores[k]||0)));
  return G.parts.reduce((s,p,i)=>s+val("d"+(i+1),p.p),0);
}
function renderLocal(){
  const all=S.subs.map(s=>({s, ev:S.evals[key(s.clan_id,s.goal)], clan:clanOf(s.clan_id)}))
    .filter(x=>(!S.goalFilter || x.s.goal===S.goalFilter) && (!S.zonaFilter || x.clan.zona===S.zonaFilter));
  const isNew=x=>!x.ev || new Date(x.s.updated_at) > new Date(x.ev.evaluated_at);
  const pend=all.filter(isNew), done=all.filter(x=>!isNew(x));
  const list=S.filter==="pending"?pend:S.filter==="done"?done:all;
  const goalSel=`<select id="gf" ${selStyle} aria-label="Filtra per obiettivo"><option value="0">Tutti gli obiettivi</option>${GOALS.map(G=>`<option value="${G.n}" ${S.goalFilter===G.n?"selected":""}>${G.n}. ${esc(G.t)}</option>`).join("")}</select>`;
  const clanOpts=Object.values(S.clans).sort((a,b)=>a.zona.localeCompare(b.zona)||a.name.localeCompare(b.name)).map(c=>`<option value="${esc(c.id)}">${esc(c.zona)} · ${esc(c.name)}</option>`).join("");
  $("#app").innerHTML = `<section class="hero"><h1>Sfide locali</h1><p>Le Comunità R/S mandano il materiale a ${esc(CONSEGNA.email||"l'email del progetto")}, con l'oggetto della sfida, e premono "Abbiamo inviato la mail". Ogni sfida ha ${goal(1).parts.length} prove da 0 a ${goal(1).parts[0].p} punti: lascia vuote quelle non consegnate. Il totale (massimo ${LOCAL_MAX}) e la classifica si calcolano da soli. Se una Comunità R/S manda altre prove dopo la valutazione, la sfida torna tra quelle da valutare.</p></section>
   <details class="panel add-sub"><summary><b>La Comunità R/S ha mandato la mail ma non compare qui?</b> Registra tu la consegna</summary>
     <div class="row-actions"><select id="asClan" ${selStyle} style="width:auto;max-width:100%"><option value="">Comunità R/S…</option>${clanOpts}</select>
     <select id="asGoal" ${selStyle} style="width:auto"><option value="">Obiettivo…</option>${GOALS.map(G=>`<option value="${G.n}">${G.n}. ${esc(G.t)}</option>`).join("")}</select>
     <button class="btn small" id="asBtn">Registra consegna</button></div></details>
   ${filterBar(pend.length, done.length, all.length, goalSel)}
   <div class="stack" style="padding-bottom:60px">
   ${list.length ? list.map(x=>{ const G=goal(x.s.goal), sc=x.ev?.criteria||{}, s=x.s;
     const updatedAfter = x.ev && new Date(s.updated_at) > new Date(x.ev.evaluated_at);
     const inputs = partInputs(G.parts, "d", sc);
     return `<article class="adm-item" data-c="${esc(s.clan_id)}" data-g="${s.goal}">
      <div class="adm-head"><span class="goal-dot" style="background:${G.c}">${G.n}</span><b>${esc(x.clan.name)}</b><span class="muted">Zona ${esc(x.clan.zona)}${x.clan.grp?" · "+esc(x.clan.grp):""} · Sfida locale</span>
        <span class="status ${x.ev&&!updatedAfter?"ok":"wait"}" data-st style="margin-left:auto">${x.ev?`${x.ev.points} pt${updatedAfter?" · nuove prove":""}`:"Da valutare"}</span></div>
      <div class="mailbox"><span>Materiale nella mail con oggetto</span> <span class="subject">${esc(subjectOf(x.clan,G))}</span>
        <a class="btn ghost small" href="${esc(gmailSearch(x.clan,G))}" target="_blank" rel="noopener">Cerca in Gmail</a></div>
      ${s.text && !/^Materiale inviato via email$|^Registrata dalla commissione$/.test(s.text)?`<p class="pre muted small" style="margin:0">${esc(s.text)}</p>${linksHtml(s.links)}`:""}
      <small class="muted">${s.text==="Registrata dalla commissione"?"Registrata dalla commissione":"Segnata come inviata"} il ${new Date(s.updated_at).toLocaleString("it-IT")}${updatedAfter?" · la Comunità R/S ha segnalato nuove prove dopo la valutazione":""}</small>
      <div class="pins">${inputs}</div>
      <p class="total-line">Totale sfida: <b data-total>${computeLocal(G, sc)}</b> / ${LOCAL_MAX}</p>
      <label class="f small">Commento per la Comunità R/S<textarea style="min-height:60px" data-comment maxlength="1000">${esc(x.ev?.comment||"")}</textarea></label>
      <div><button class="btn small" data-save>${x.ev?"Aggiorna valutazione":"Salva valutazione"}</button></div>
     </article>`; }).join("")
   : `<p class="muted">${S.filter==="pending"?"Nessuna sfida in attesa. Quando una Comunità R/S consegna una sfida locale compare qui (premi Aggiorna).":"Nessuna sfida in questa vista."}</p>`}
   </div>`;
  bindFilters(renderLocal);
  $("#gf").onchange=e=>{ S.goalFilter=+e.target.value; renderLocal(); };
  $("#asBtn").onclick=async e=>{
    const clan_id=$("#asClan").value, g=+$("#asGoal").value;
    if(!clan_id || !g) return toast("Scegli Comunità R/S e obiettivo.");
    if(S.subs.some(x=>x.clan_id===clan_id && x.goal===g)) return toast("Questa consegna c'è già nell'elenco.");
    e.target.disabled=true;
    const { data, error } = await sb.from("submissions").insert({ clan_id, goal:g, text:"Registrata dalla commissione", links:[] }).select().single();
    e.target.disabled=false;
    if(error){ console.error(error); return toast("Non registrata. Hai eseguito l'aggiornamento 3 del database?"); }
    S.subs.push(data); S.filter="pending"; S.goalFilter=g; renderLocal(); toast("Consegna registrata: ora puoi valutarla");
  };
  document.querySelectorAll(".adm-item").forEach(card=>{
    const G=goal(+card.dataset.g);
    card.addEventListener("input",()=>{ card.querySelector("[data-total]").textContent=computeLocal(G, readScores(card)); });
    card.querySelector("[data-save]").onclick=e=>saveLocal(card,e.target);
  });
}
function subjectOf(c,G){ return `${c.zona} - ${c.name} - Obiettivo ${G.n} - Sfida locale`; }
function gmailSearch(c,G){ return "https://mail.google.com/mail/u/0/#search/" + encodeURIComponent(`subject:("${c.name}" "Obiettivo ${G.n}")`); }
function readScores(card){
  const sc={};
  card.querySelectorAll("[data-k]").forEach(i=>{ if(i.value!=="") sc[i.dataset.k]=Math.max(0,Math.min(+i.dataset.max,Math.round(+i.value||0))); });
  return sc;
}
async function saveLocal(card,btn){
  const clan_id=card.dataset.c, g=+card.dataset.g, G=goal(g);
  const criteria=readScores(card);
  card.querySelectorAll("[data-k]").forEach(i=>{ if(i.value!=="") i.value=criteria[i.dataset.k]; });
  const points=computeLocal(G, criteria);
  const comment=card.querySelector("[data-comment]").value.trim().slice(0,1000)||null;
  btn.disabled=true;
  const { data, error } = await sb.from("evaluations")
    .upsert({ clan_id, goal:g, criteria, points, comment, evaluated_at:new Date().toISOString() }, { onConflict:"clan_id,goal" })
    .select().single();
  btn.disabled=false;
  if(error){ console.error(error); return toast("Valutazione non salvata, riprova."); }
  S.evals[key(clan_id,g)]=data;
  const st=card.querySelector("[data-st]"); st.textContent=`${points} pt`; st.className="status ok";
  btn.textContent="Aggiorna valutazione";
  toast(`Valutazione salvata: ${points} punti`);
}

/* ---------- Sfide campane ---------- */
function renderCampana(){
  const g=S.campGoal, G=goal(g), C=G.campana;
  const all=S.camp.filter(a=>a.goal===g).map(a=>({a, ev:S.campEvals[key(a.clan_id,a.goal)], clan:clanOf(a.clan_id)}))
    .filter(x=>!S.zonaFilter || x.clan.zona===S.zonaFilter);
  const pend=all.filter(x=>!x.ev), done=all.filter(x=>x.ev);
  const list=S.filter==="pending"?pend:S.filter==="done"?done:all;
  const pendAll=GOALS.map(X=>S.camp.filter(a=>a.goal===X.n && !S.campEvals[key(a.clan_id,a.goal)]).length);
  const mc=!!C.o, K=S.campKey[g]||{};
  const keyPanel = mc
    ? `<p class="muted small" style="margin:0">Domanda a risposta multipla: il punteggio si assegna da solo. La risposta giusta è salvata solo nel database.</p>
       <div class="opts">${C.o.map((o,i)=>`<label class="opt ${K.correct===i?"right":""}"><input type="radio" name="kc" value="${i}" ${K.correct===i?"checked":""}> ${esc(o)}</label>`).join("")}</div>
       <label class="f">Spiegazione mostrata alle Comunità R/S dopo la risposta<textarea id="kFb" maxlength="1000" style="min-height:70px">${esc(K.feedback||"")}</textarea></label>
       <div><button class="btn small ghost" id="saveKey">Salva risposta giusta e spiegazione</button> <span class="muted small">Se cambi la risposta giusta, i punti delle Comunità R/S vengono ricalcolati.</span></div>`
    : `<label class="f">Risposta di riferimento <span class="h">Riservata alla commissione: le Comunità R/S non la vedono mai.</span><textarea id="refTxt" maxlength="4000" style="min-height:90px" placeholder="Inserite qui la risposta verificata e i criteri per assegnare i punti">${esc(K.reference||"")}</textarea></label>
       <div><button class="btn small ghost" id="saveRef">Salva risposta di riferimento</button></div>`;
  $("#app").innerHTML = `<section class="hero"><h1>Sfide campane</h1><p>Ricerche sulla Campania a risposta aperta: confronta la risposta della Comunità R/S con quella di riferimento e dai da 0 a ${PTS_CAMPANA} punti. Contano dati corretti, anno e fonte citati.</p></section>
   <div class="goal-tabs">${GOALS.map(X=>`<button data-cg="${X.n}" aria-pressed="${X.n===g}" style="--c:${X.c}">${X.n}${pendAll[X.n-1]?`<sup>${pendAll[X.n-1]}</sup>`:""}</button>`).join("")}</div>
   <section class="panel stack" style="margin-bottom:16px">
     <h2>${G.n}. ${esc(G.t)}</h2>
     <p class="q" style="margin:0">${esc(C.q)}</p>
     ${C.nota?`<p class="muted small" style="margin:0"><i>${esc(C.nota)}</i></p>`:""}
     <p class="source" style="margin:0"><b>Fonte:</b> ${C.src.map(([n,u])=>u?`<a href="${esc(u)}" target="_blank" rel="noopener">${esc(n)}</a>`:esc(n)).join(" · ")}</p>
     ${keyPanel}
   </section>
   ${filterBar(pend.length, done.length, all.length)}
   <div class="stack" style="padding-bottom:60px">
   ${list.length? list.map(x=>`<article class="adm-item" data-c="${esc(x.a.clan_id)}">
      <div class="adm-head"><b>${esc(x.clan.name)}</b><span class="muted">Zona ${esc(x.clan.zona)}${x.clan.grp?" · "+esc(x.clan.grp):""}</span>
        <span class="status ${x.ev?"ok":"wait"}" data-st style="margin-left:auto">${x.ev?`${x.ev.points} pt`:"Da valutare"}</span></div>
      <p class="pre" style="margin:0">${mc && x.a.choice!=null ? esc(C.o[x.a.choice]||x.a.answer) : esc(x.a.answer)}</p>
      <small class="muted">Inviata il ${new Date(x.a.updated_at).toLocaleString("it-IT")}</small>
      ${mc?"":`<div class="pins"><label class="pin"><span>Punteggio</span><input type="number" min="0" max="${PTS_CAMPANA}" step="1" data-pts value="${x.ev?.points??""}" placeholder="0–${PTS_CAMPANA}"><em>/ ${PTS_CAMPANA}</em></label></div>
      <label class="f small">Commento per la Comunità R/S<textarea style="min-height:50px" data-comment maxlength="1000">${esc(x.ev?.comment||"")}</textarea></label>
      <div><button class="btn small" data-save>${x.ev?"Aggiorna valutazione":"Salva valutazione"}</button></div>`}
    </article>`).join("")
   : `<p class="muted">Nessuna risposta in questa vista.</p>`}
   </div>`;
  document.querySelectorAll("[data-cg]").forEach(b=>b.onclick=()=>{ S.campGoal=+b.dataset.cg; renderCampana(); });
  bindFilters(renderCampana);
  const sk=$("#saveKey"); if(sk) sk.onclick=async e=>{
    const sel=document.querySelector('input[name="kc"]:checked');
    if(!sel) return toast("Scegli la risposta giusta.");
    if(K.correct!=null && +sel.value!==K.correct && !confirm("Cambiare la risposta giusta? I punti di tutte le Comunità R/S che hanno già risposto verranno ricalcolati.")) return;
    e.target.disabled=true;
    const { data, error } = await sb.from("campana_key").upsert({ goal:g, correct:+sel.value, feedback:$("#kFb").value.trim()||null, updated_at:new Date().toISOString() },{ onConflict:"goal" }).select().single();
    if(!error) await sb.rpc("ricalcola_campana",{ p_goal:g });
    e.target.disabled=false;
    if(error){ console.error(error); return toast("Non salvata, riprova."); }
    S.campKey[g]=data; toast("Risposta giusta salvata"); await loadAll();
  };
  const sr=$("#saveRef"); if(sr) sr.onclick=async e=>{
    e.target.disabled=true;
    const { data, error } = await sb.from("campana_key").upsert({ goal:g, reference:$("#refTxt").value.trim()||null, updated_at:new Date().toISOString() },{ onConflict:"goal" }).select().single();
    e.target.disabled=false;
    if(error){ console.error(error); return toast("Non salvata, riprova."); }
    S.campKey[g]=data; toast("Risposta di riferimento salvata");
  };
  document.querySelectorAll(".adm-item [data-save]").forEach(b=>b.onclick=async()=>{
    const card=b.closest("[data-c]"), clan_id=card.dataset.c;
    const inp=card.querySelector("[data-pts]");
    if(inp.value==="") return toast("Inserisci un punteggio da 0 a "+PTS_CAMPANA);
    const points=Math.max(0,Math.min(PTS_CAMPANA,Math.round(+inp.value||0))); inp.value=points;
    const comment=card.querySelector("[data-comment]").value.trim().slice(0,1000)||null;
    b.disabled=true;
    const { data, error } = await sb.from("campana_evals").upsert({ clan_id, goal:g, points, comment, evaluated_at:new Date().toISOString() },{ onConflict:"clan_id,goal" }).select().single();
    b.disabled=false;
    if(error){ console.error(error); return toast("Valutazione non salvata, riprova."); }
    S.campEvals[key(clan_id,g)]=data;
    const st=card.querySelector("[data-st]"); st.textContent=`${points} pt`; st.className="status ok"; b.textContent="Aggiorna valutazione";
    toast(`Valutazione salvata: ${points} punti`);
  });
}

/* ---------- Richieste di accesso ---------- */
const norm=s=>(s||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/\b(clan|noviziato)\b/g,"").replace(/[^a-z0-9]+/g," ").trim();
function guessClan(r){
  const all=Object.values(S.clans), t=norm(r.clan);
  return all.find(c=>c.email && c.email.toLowerCase()===r.email.toLowerCase())
      || all.find(c=>c.zona===r.zona && norm(c.name) && t.includes(norm(c.name)))
      || all.find(c=>norm(c.name) && t.includes(norm(c.name)))
      || null;
}
function renderReq(){
  const list=S.reqs.filter(r=>S.reqFilter==="all" || !r.gestita);
  $("#app").innerHTML = `<section class="hero"><h1>Richieste di accesso</h1><p>Comunità R/S che hanno dimenticato codice o password. Trova la Comunità R/S, comunica il codice o genera una password temporanea, e rispondi all'email indicata. Per sicurezza, rispondi solo se l'email coincide con quella di riferimento della Comunità R/S, oppure dopo una verifica con i capi.</p></section>
   <div class="filters"><button data-rf="open" aria-pressed="${S.reqFilter==="open"}">Da gestire (${S.reqs.filter(r=>!r.gestita).length})</button><button data-rf="all" aria-pressed="${S.reqFilter==="all"}">Tutte (${S.reqs.length})</button></div>
   <div class="stack" style="padding-bottom:60px">
   ${list.length? list.map(r=>{ const g=guessClan(r); const cands=Object.values(S.clans).filter(c=>c.zona===r.zona || c.id===g?.id).sort((a,b)=>a.name.localeCompare(b.name));
     return `<article class="adm-item" data-r="${r.id}">
      <div class="adm-head"><b>${esc(r.clan)}</b><span class="muted">Zona ${esc(r.zona||"?")} · ${new Date(r.created_at).toLocaleString("it-IT")}</span>
        <span class="status ${r.gestita?"ok":"wait"}" style="margin-left:auto">${r.gestita?"Gestita":"Da gestire"}</span></div>
      <p style="margin:0">Email: <a href="mailto:${esc(r.email)}">${esc(r.email)}</a>${r.messaggio?` · ${esc(r.messaggio)}`:""}</p>
      <div class="req-row"><select data-pick ${selStyle} style="width:auto;max-width:100%"><option value="">Scegli la Comunità R/S…</option>${cands.map(c=>`<option value="${esc(c.id)}" ${g?.id===c.id?"selected":""}>${esc(c.name)}${c.grp?" · "+esc(c.grp):""}${c.zona!==r.zona?" (zona "+esc(c.zona)+")":""}</option>`).join("")}</select>
        <span data-info class="muted small"></span></div>
      <div class="row-actions"><button class="btn small ghost" data-reset>Genera password temporanea</button>
        <button class="btn small ghost" data-done>${r.gestita?"Segna da gestire":"Segna come gestita"}</button></div>
      <div data-out></div>
    </article>`; }).join("")
   : `<p class="muted">Nessuna richiesta da gestire.</p>`}
   </div>`;
  document.querySelectorAll("[data-rf]").forEach(b=>b.onclick=()=>{ S.reqFilter=b.dataset.rf; renderReq(); });
  document.querySelectorAll("[data-r]").forEach(card=>{
    const r=S.reqs.find(x=>String(x.id)===card.dataset.r);
    const pick=card.querySelector("[data-pick]"), info=card.querySelector("[data-info]");
    const showInfo=()=>{ const c=S.clans[pick.value]; info.innerHTML = c ? `Codice <b>${esc(c.code)}</b> · email di riferimento ${esc(c.email||"—")}${c.email && c.email.toLowerCase()===r.email.toLowerCase()?" ✓ coincide":" · <b>non coincide</b>"}` : ""; };
    pick.onchange=showInfo; showInfo();
    card.querySelector("[data-reset]").onclick=async e=>{
      const c=S.clans[pick.value]; if(!c) return toast("Scegli prima la Comunità R/S.");
      if(!confirm(`Generare una nuova password per ${c.name}? Quella attuale smetterà di funzionare.`)) return;
      e.target.disabled=true;
      const { data, error } = await sb.rpc("reset_password_clan",{ p_clan:c.id });
      e.target.disabled=false;
      if(error){ console.error(error); return toast("Password non generata. Hai eseguito l'aggiornamento del database?"); }
      card.querySelector("[data-out]").innerHTML = credBox(c, data, r.email);
    };
    card.querySelector("[data-done]").onclick=async e=>{
      e.target.disabled=true;
      const { error } = await sb.from("richieste_accesso").update({ gestita:!r.gestita }).eq("id",r.id);
      if(error){ e.target.disabled=false; return toast("Non aggiornata, riprova."); }
      r.gestita=!r.gestita; render();
    };
  });
}
function credBox(c, pw, to){
  const subject="Strade 2030 · Accesso della Comunità R/S";
  const body=`Ciao,\n\necco i dati per entrare in Strade 2030:\n\nCodice Comunità R/S: ${c.code}\n${pw?`Password temporanea: ${pw}\n\nAppena entrati, cambiatela da "Profilo della Comunità R/S" > "Cambia password".\n`:""}\nBuona strada!\nLa commissione di Strade 2030`;
  return `<div class="cred"><p style="margin:0">Codice: <b>${esc(c.code)}</b>${pw?` · Password temporanea: <b class="mono">${esc(pw)}</b>`:""}</p>
    <a class="btn small" href="mailto:${esc(to||c.email||"")}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}">Scrivi la mail alla Comunità R/S</a></div>`;
}

/* ---------- Comunità R/S ---------- */
function renderClans(){
  const pts=Object.fromEntries(S.board.map(r=>[r.clan_id,r]));
  const rows=Object.values(S.clans).filter(c=>!S.zonaFilter || c.zona===S.zonaFilter)
    .sort((a,b)=>(pts[b.id]?.totale||0)-(pts[a.id]?.totale||0) || a.name.localeCompare(b.name));
  const nSubs=id=>S.subs.filter(s=>s.clan_id===id).length;
  const nCamp=id=>S.camp.filter(s=>s.clan_id===id).length;
  // possibili doppioni: stesso nome nella stessa zona, oppure stessa email
  const nk=c=>(c.zona||"")+"|"+norm(c.name), all=Object.values(S.clans);
  const doppio=c=>all.some(x=>x.id!==c.id && (nk(x)===nk(c) || (c.email && x.email && x.email.toLowerCase()===c.email.toLowerCase())));
  const nDoppi=all.filter(doppio).length;
  $("#app").innerHTML = `<section class="hero"><h1>Comunità&nbsp;R/S iscritte</h1><p>${Object.keys(S.clans).length} Comunità R/S. Se una Comunità R/S dimentica il codice lo trovi qui; per la password usa "Nuova password". Se una Comunità R/S si è iscritta più volte, tieni l'account con più risposte e premi "Elimina" sugli altri.</p>
    ${nDoppi?`<p class="notice" style="margin-top:12px"><b>${nDoppi} account sembrano doppioni</b> (stesso nome nella stessa zona o stessa email): sono segnati nella tabella.</p>`:""}
    <div style="margin-top:16px;display:flex;gap:10px;flex-wrap:wrap;align-items:center"><button class="btn" id="csv">Scarica classifica (CSV)</button><select id="zf" ${selStyle} aria-label="Filtra per zona">${zonaOpts()}</select></div></section>
   <div class="panel tablewrap" style="margin-bottom:60px">
    <table class="t"><thead><tr><th>Comunità R/S</th><th>Zona</th><th>Gruppo</th><th>Codice</th><th>Email</th><th>Campane</th><th>Locali</th><th>Galleria</th><th class="num">Totale</th><th></th></tr></thead>
    <tbody>${rows.map(c=>{ const p=pts[c.id]||{}; return `<tr data-id="${esc(c.id)}"><td><b>${esc(c.name)}</b>${doppio(c)?` <span class="status wait">possibile doppione</span>`:""}</td><td>${esc(c.zona)}</td><td>${esc(c.grp||"")}</td><td>${esc(c.code)}</td><td>${c.email?`<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>`:""}</td><td>${nCamp(c.id)}/17</td><td>${nSubs(c.id)}</td><td>${galleryCell(c)}</td>
      <td class="num"><b>${p.totale??0}</b></td><td class="row-btns"><button class="btn ghost small" data-pw>Nuova password</button> <button class="btn ghost small danger" data-del>Elimina</button></td></tr>
      <tr class="cred-row hidden" data-out-for="${esc(c.id)}"><td colspan="10"></td></tr>`; }).join("")}</tbody></table>
   </div>`;
  $("#csv").onclick=()=>downloadCsv(rows,pts);
  $("#zf").onchange=e=>{ S.zonaFilter=e.target.value; renderClans(); };
  document.querySelectorAll("[data-hide]").forEach(b=>b.onclick=()=>toggleGallery(b));
  document.querySelectorAll("[data-del]").forEach(b=>b.onclick=()=>eliminaClan(b));
  document.querySelectorAll("[data-pw]").forEach(b=>b.onclick=async()=>{
    const id=b.closest("tr").dataset.id, c=S.clans[id];
    if(!confirm(`Generare una nuova password per ${c.name}? Quella attuale smetterà di funzionare.`)) return;
    b.disabled=true;
    const { data, error } = await sb.rpc("reset_password_clan",{ p_clan:id });
    b.disabled=false;
    if(error){ console.error(error); return toast("Password non generata. Hai eseguito l'aggiornamento del database?"); }
    const row=document.querySelector(`[data-out-for="${CSS.escape(id)}"]`); row.classList.remove("hidden");
    row.firstElementChild.innerHTML=credBox(c, data, c.email);
  });
}
function galleryCell(c){
  const url=c.photo ? sb.storage.from("clan").getPublicUrl(c.photo).data.publicUrl : null;
  const info=`${url?`<a href="${esc(url)}" target="_blank" rel="noopener"><img class="mini" src="${esc(url)}" alt="Foto"></a>`:`<span class="muted">nessuna foto</span>`}<small class="muted">${(c.members||[]).length} membri</small>`;
  return `<div class="gcell">${info}<button class="btn ghost small" data-hide="${esc(c.id)}" data-h="${c.hidden?1:0}">${c.hidden?"Mostra":"Nascondi"}</button>${c.hidden?`<span class="status wait">nascosto</span>`:""}</div>`;
}
async function toggleGallery(b){
  const id=b.dataset.hide, hide=b.dataset.h!=="1";
  if(hide && !confirm("Nascondere questa Comunità R/S (foto e nomi) dalle pagine pubbliche?")) return;
  b.disabled=true;
  const { error } = await sb.rpc("nascondi_clan",{ p_clan:id, p_hidden:hide });
  if(error){ b.disabled=false; console.error(error); return toast("Operazione non riuscita."); }
  S.clans[id].hidden=hide; renderClans(); toast(hide?"Comunità R/S nascosta dalle pagine pubbliche":"Comunità R/S di nuovo visibile");
}
function downloadCsv(rows,pts){
  const q=v=>`"${String(v??"").replace(/"/g,'""')}"`;
  const lines=[["Posizione","Comunità R/S","Zona","Gruppo","Codice","Email","Globale","Campana","Locale","Bonus","Totale","Sfide locali valutate"].map(q).join(";")];
  rows.forEach((c,i)=>{ const p=pts[c.id]||{}; lines.push([i+1,c.name,c.zona,c.grp,c.code,c.email,p.globale??0,p.campana??0,p.locale??0,p.bonus??0,p.totale??0,p.completate??0].map(q).join(";")); });
  const blob=new Blob(["﻿"+lines.join("\n")],{type:"text/csv;charset=utf-8"});
  const a=document.createElement("a"); a.href=URL.createObjectURL(blob);
  a.download=`classifica-strade2030-${new Date().toISOString().slice(0,10)}.csv`; a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),2000);
}

/* ---------- Obiettivi di futuro: resoconto riservato alla commissione ---------- */
function sdgBox(n, cls=""){
  const G=goal(n);
  return `<span class="sdg ${cls}" style="--c:${G.c}" title="${n}. ${esc(G.t)}"><b>${n}</b><i>${esc(G.t)}</i></span>`;
}
function renderFuturo(){
  const rows=(S.scelte||[]).filter(r=>r.livello==="clan" && (!S.zonaFilter || r.zona===S.zonaFilter));
  const counts=GOALS.map(G=>({G, n:rows.filter(r=>r.goal===G.n).length})).sort((a,b)=>b.n-a.n || a.G.n-b.G.n);
  const maxC=Math.max(1,...counts.map(c=>c.n));
  const byClan={};
  rows.forEach(r=>{ (byClan[r.soggetto] ||= {nome:r.nome, zona:r.zona, grp:r.grp, goals:[]}).goals.push(r); });
  const list=Object.values(byClan);
  const zone=ZONE.filter(z=>list.some(c=>c.zona===z));
  $("#app").innerHTML = `<section class="hero"><h1>Obiettivi di futuro</h1><p>Le scelte delle Comunità R/S. <b>Sono visibili solo qui</b>: ogni Comunità R/S vede soltanto le proprie, così nessuno si fa influenzare. Mostratele a tutti alla fine della sfida.</p></section>
   <div class="filters"><select id="zf" ${selStyle} aria-label="Filtra per zona">${zonaOpts()}</select><button class="btn ghost small" id="csvF" type="button">Scarica per Excel</button></div>
   <div class="stack" style="padding-bottom:60px">
   <section class="panel"><h2>Quante volte è stato scelto ogni obiettivo</h2>
    <p class="muted">${list.length} Comunità R/S${S.zonaFilter?" della zona "+esc(S.zonaFilter):""} hanno scelto i loro 3 obiettivi.</p>
    <ol class="hbars">${counts.map(({G,n})=>`<li>${sdgBox(G.n,"mini")}<span class="hb-label">${G.n}. ${esc(G.t)}</span><span class="hb-track"><i style="width:${n/maxC*100}%;background:${G.c}"></i></span><b>${n}</b></li>`).join("")}</ol>
   </section>
   ${list.length ? zone.map(z=>`<section class="zone-block"><h2 class="zone-title">Zona ${esc(z)} <span>${list.filter(c=>c.zona===z).length}</span></h2>
    <div class="choices">${list.filter(c=>c.zona===z).sort((a,b)=>a.nome.localeCompare(b.nome)).map(c=>`<article class="choice">
      <h3>${esc(c.nome)}${c.grp?` <span>- ${esc(c.grp)}</span>`:""}</h3>
      <div class="choice-icons">${c.goals.sort((a,b)=>a.goal-b.goal).map(r=>`<div>${sdgBox(r.goal)}${r.perche?`<p>${esc(r.perche)}</p>`:""}</div>`).join("")}</div>
    </article>`).join("")}</div></section>`).join("")
    : `<p class="muted">Ancora nessuna Comunità R/S ha scelto i suoi obiettivi.</p>`}
   </div>`;
  $("#zf").onchange=e=>{ S.zonaFilter=e.target.value; renderFuturo(); };
  $("#csvF").onclick=()=>{
    const q=v=>`"${String(v??"").replace(/"/g,'""')}"`;
    const lines=[["Zona","Comunità R/S","Gruppo","Obiettivo","Nome obiettivo","Perché"].map(q).join(";")];
    rows.forEach(r=>lines.push([r.zona,r.nome,r.grp,r.goal,goal(r.goal).t,r.perche].map(q).join(";")));
    const blob=new Blob(["\ufeff"+lines.join("\n")],{type:"text/csv;charset=utf-8"});
    const u=URL.createObjectURL(blob), l=document.createElement("a"); l.href=u; l.download="obiettivi-di-futuro.csv"; l.click(); URL.revokeObjectURL(u);
  };
}

/* ---------- Eliminare una Comunità R/S (per esempio un account doppio) ---------- */
async function eliminaClan(b){
  const id=b.closest("tr").dataset.id, c=S.clans[id];
  const risposte=S.camp.filter(s=>s.clan_id===id).length, consegne=S.subs.filter(s=>s.clan_id===id).length;
  if(!confirm(`Eliminare definitivamente "${c.name}" (zona ${c.zona}, codice ${c.code})?\n\nSi cancellano anche le sue risposte (${risposte} campane), le sfide locali consegnate (${consegne}), le valutazioni, gli obiettivi di futuro e la foto. Non si può annullare.`)) return;
  const conferma=prompt(`Per confermare scrivi il codice della Comunità R/S: ${c.code}`);
  if((conferma||"").trim().toUpperCase()!==c.code.toUpperCase()) return toast("Eliminazione annullata: il codice non corrisponde.");
  b.disabled=true;
  if(c.photo){ try{ await sb.storage.from("clan").remove([c.photo]); }catch(e){} }
  const { error } = await sb.rpc("elimina_clan",{ p_clan:id });
  if(error){ b.disabled=false; console.error(error); return toast("Comunità R/S non eliminata. Hai eseguito l'aggiornamento 8 del database?"); }
  toast(`${c.name} eliminato`);
  await loadAll();
}
