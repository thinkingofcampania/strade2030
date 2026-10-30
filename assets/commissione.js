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
    sb.rpc("classifica")
  ]);
  const bad=r.find(x=>x.error); if(bad){ console.error(bad.error); toast("Errore nel caricamento. Hai eseguito l'aggiornamento del database?"); }
  const [c,s,e,ca,ce,ck,rq,b]=r;
  S.clans=Object.fromEntries((c.data||[]).map(x=>[x.id,x]));
  S.subs=s.data||[];
  S.evals=Object.fromEntries((e.data||[]).map(x=>[key(x.clan_id,x.goal),x]));
  S.camp=ca.data||[];
  S.campEvals=Object.fromEntries((ce.data||[]).map(x=>[key(x.clan_id,x.goal),x]));
  S.campKey=Object.fromEntries((ck.data||[]).map(x=>[x.goal,x]));
  S.reqs=rq.data||[];
  S.board=b.data||[];
  render();
}

$("#refresh").onclick=()=>loadAll().then(()=>toast("Dati aggiornati"));
$("#logout").onclick=async()=>{ await sb.auth.signOut(); location.reload(); };
document.querySelectorAll("[data-view]").forEach(b=>b.onclick=()=>{ S.view=b.dataset.view; S.filter="pending"; render(); window.scrollTo({top:0}); });

function render(){
  document.querySelectorAll("[data-view]").forEach(b=>b.setAttribute("aria-selected", b.dataset.view===S.view));
  const open=S.reqs.filter(r=>!r.gestita).length;
  $('[data-view="req"]').textContent = open ? `Richieste (${open})` : "Richieste";
  ({local:renderLocal, campana:renderCampana, req:renderReq, clans:renderClans})[S.view]();
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
    return `<label class="pin"><span>${esc(p.t)}<small>${p.k.map(esc).join(" · ")}</small></span>
      <input type="number" min="0" max="${p.p}" step="1" data-k="${k}" data-max="${p.p}" value="${scores?.[k]??""}" placeholder="0–${p.p}"><em>/ ${p.p}</em></label>`; }).join("");
}
function computeLocal(G, scores){
  const val=(k,max)=>Math.max(0,Math.min(max,Math.round(+scores[k]||0)));
  if(!G.acts) return G.parts.reduce((s,p,i)=>s+val("d"+(i+1),p.p),0);
  const perAct=G.acts.map(A=>A.parts.reduce((s,p,i)=>s+val(A.id+(i+1),p.p),0)).sort((a,b)=>b-a);
  return perAct.slice(0,G.choose).reduce((s,x)=>s+x,0);
}
function renderLocal(){
  const all=S.subs.map(s=>({s, ev:S.evals[key(s.clan_id,s.goal)], clan:clanOf(s.clan_id)}))
    .filter(x=>(!S.goalFilter || x.s.goal===S.goalFilter) && (!S.zonaFilter || x.clan.zona===S.zonaFilter));
  const pend=all.filter(x=>!x.ev), done=all.filter(x=>x.ev);
  const list=S.filter==="pending"?pend:S.filter==="done"?done:all;
  const goalSel=`<select id="gf" ${selStyle} aria-label="Filtra per obiettivo"><option value="0">Tutti gli obiettivi</option>${GOALS.map(G=>`<option value="${G.n}" ${S.goalFilter===G.n?"selected":""}>${G.n}. ${esc(G.t)}</option>`).join("")}</select>`;
  $("#app").innerHTML = `<section class="hero"><h1>Sfide locali</h1><p>Un voto per ogni consegna: il totale della sfida (massimo ${LOCAL_MAX}) e la classifica si calcolano da soli. Per l'obiettivo 3 contano le ${goal(3).choose} attività con il voto più alto.</p></section>
   ${filterBar(pend.length, done.length, all.length, goalSel)}
   <div class="stack" style="padding-bottom:60px">
   ${list.length ? list.map(x=>{ const G=goal(x.s.goal), sc=x.ev?.criteria||{}, s=x.s;
     const updatedAfter = x.ev && new Date(s.updated_at) > new Date(x.ev.evaluated_at);
     const inputs = G.acts
       ? G.acts.map(A=>`<div class="act-in"><b>${A.id} · ${esc(A.t)}</b>${partInputs(A.parts, A.id, sc)}</div>`).join("")
       : partInputs(G.parts, "d", sc);
     return `<article class="adm-item" data-c="${esc(s.clan_id)}" data-g="${s.goal}">
      <div class="adm-head"><span class="goal-dot" style="background:${G.c}">${G.n}</span><b>${esc(x.clan.name)}</b><span class="muted">Zona ${esc(x.clan.zona)}${x.clan.grp?" · "+esc(x.clan.grp):""} · ${esc(G.lt)}</span>
        <span class="status ${x.ev?"ok":"wait"}" data-st style="margin-left:auto">${x.ev?`${x.ev.points} pt`:"Da valutare"}</span></div>
      <p class="pre" style="margin:0">${esc(s.text)}</p>
      ${linksHtml(s.links)}
      ${s.photos?.length?`<p class="muted small">${s.photos.length} foto caricate con la versione precedente del sito.</p>`:""}
      <small class="muted">Consegnata il ${new Date(s.updated_at).toLocaleString("it-IT")}${updatedAfter?" · aggiornata dopo la valutazione":""}</small>
      <div class="pins">${inputs}</div>
      <p class="total-line">Totale sfida: <b data-total>${computeLocal(G, sc)}</b> / ${LOCAL_MAX}</p>
      <label class="f small">Commento per il clan<textarea style="min-height:60px" data-comment maxlength="1000">${esc(x.ev?.comment||"")}</textarea></label>
      <div><button class="btn small" data-save>${x.ev?"Aggiorna valutazione":"Salva valutazione"}</button></div>
     </article>`; }).join("")
   : `<p class="muted">${S.filter==="pending"?"Nessuna sfida in attesa. Quando un clan consegna una sfida locale compare qui (premi Aggiorna).":"Nessuna sfida in questa vista."}</p>`}
   </div>`;
  bindFilters(renderLocal);
  $("#gf").onchange=e=>{ S.goalFilter=+e.target.value; renderLocal(); };
  document.querySelectorAll(".adm-item").forEach(card=>{
    const G=goal(+card.dataset.g);
    card.addEventListener("input",()=>{ card.querySelector("[data-total]").textContent=computeLocal(G, readScores(card)); });
    card.querySelector("[data-save]").onclick=e=>saveLocal(card,e.target);
  });
}
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
  $("#app").innerHTML = `<section class="hero"><h1>Sfide campane</h1><p>Risposte aperte, da 0 a ${PTS_CAMPANA} punti. La risposta di riferimento la vede solo la commissione.</p></section>
   <div class="goal-tabs">${GOALS.map(X=>`<button data-cg="${X.n}" aria-pressed="${X.n===g}" style="--c:${X.c}">${X.n}${pendAll[X.n-1]?`<sup>${pendAll[X.n-1]}</sup>`:""}</button>`).join("")}</div>
   <section class="panel stack" style="margin-bottom:16px">
     <h2>${G.n}. ${esc(G.t)}</h2>
     <p class="q" style="margin:0">${esc(C.q)}</p>
     ${C.nota?`<p class="muted small" style="margin:0"><i>${esc(C.nota)}</i></p>`:""}
     <p class="source" style="margin:0"><b>Fonte:</b> ${C.src.map(([n,u])=>u?`<a href="${esc(u)}" target="_blank" rel="noopener">${esc(n)}</a>`:esc(n)).join(" · ")}</p>
     <label class="f">Risposta di riferimento <span class="h">Riservata alla commissione: i clan non la vedono mai.</span><textarea id="refTxt" maxlength="4000" style="min-height:90px" placeholder="Inserite qui la risposta verificata e i criteri per assegnare i punti">${esc(S.campKey[g]?.reference||"")}</textarea></label>
     <div><button class="btn small ghost" id="saveRef">Salva risposta di riferimento</button></div>
   </section>
   ${filterBar(pend.length, done.length, all.length)}
   <div class="stack" style="padding-bottom:60px">
   ${list.length? list.map(x=>`<article class="adm-item" data-c="${esc(x.a.clan_id)}">
      <div class="adm-head"><b>${esc(x.clan.name)}</b><span class="muted">Zona ${esc(x.clan.zona)}${x.clan.grp?" · "+esc(x.clan.grp):""}</span>
        <span class="status ${x.ev?"ok":"wait"}" data-st style="margin-left:auto">${x.ev?`${x.ev.points} pt`:"Da valutare"}</span></div>
      <p class="pre" style="margin:0">${esc(x.a.answer)}</p>
      <small class="muted">Inviata il ${new Date(x.a.updated_at).toLocaleString("it-IT")}</small>
      <div class="pins"><label class="pin"><span>Punteggio</span><input type="number" min="0" max="${PTS_CAMPANA}" step="1" data-pts value="${x.ev?.points??""}" placeholder="0–${PTS_CAMPANA}"><em>/ ${PTS_CAMPANA}</em></label></div>
      <label class="f small">Commento per il clan<textarea style="min-height:50px" data-comment maxlength="1000">${esc(x.ev?.comment||"")}</textarea></label>
      <div><button class="btn small" data-save>${x.ev?"Aggiorna valutazione":"Salva valutazione"}</button></div>
    </article>`).join("")
   : `<p class="muted">Nessuna risposta in questa vista.</p>`}
   </div>`;
  document.querySelectorAll("[data-cg]").forEach(b=>b.onclick=()=>{ S.campGoal=+b.dataset.cg; renderCampana(); });
  bindFilters(renderCampana);
  $("#saveRef").onclick=async e=>{
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
const norm=s=>(s||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/\bclan\b/g,"").replace(/[^a-z0-9]+/g," ").trim();
function guessClan(r){
  const all=Object.values(S.clans), t=norm(r.clan);
  return all.find(c=>c.email && c.email.toLowerCase()===r.email.toLowerCase())
      || all.find(c=>c.zona===r.zona && norm(c.name) && t.includes(norm(c.name)))
      || all.find(c=>norm(c.name) && t.includes(norm(c.name)))
      || null;
}
function renderReq(){
  const list=S.reqs.filter(r=>S.reqFilter==="all" || !r.gestita);
  $("#app").innerHTML = `<section class="hero"><h1>Richieste di accesso</h1><p>Clan che hanno dimenticato codice o password. Trova il clan, comunica il codice o genera una password temporanea, e rispondi all'email indicata. Per sicurezza, rispondi solo se l'email coincide con quella di riferimento del clan, oppure dopo una verifica con i capi.</p></section>
   <div class="filters"><button data-rf="open" aria-pressed="${S.reqFilter==="open"}">Da gestire (${S.reqs.filter(r=>!r.gestita).length})</button><button data-rf="all" aria-pressed="${S.reqFilter==="all"}">Tutte (${S.reqs.length})</button></div>
   <div class="stack" style="padding-bottom:60px">
   ${list.length? list.map(r=>{ const g=guessClan(r); const cands=Object.values(S.clans).filter(c=>c.zona===r.zona || c.id===g?.id).sort((a,b)=>a.name.localeCompare(b.name));
     return `<article class="adm-item" data-r="${r.id}">
      <div class="adm-head"><b>${esc(r.clan)}</b><span class="muted">Zona ${esc(r.zona||"?")} · ${new Date(r.created_at).toLocaleString("it-IT")}</span>
        <span class="status ${r.gestita?"ok":"wait"}" style="margin-left:auto">${r.gestita?"Gestita":"Da gestire"}</span></div>
      <p style="margin:0">Email: <a href="mailto:${esc(r.email)}">${esc(r.email)}</a>${r.messaggio?` · ${esc(r.messaggio)}`:""}</p>
      <div class="req-row"><select data-pick ${selStyle} style="width:auto;max-width:100%"><option value="">Scegli il clan…</option>${cands.map(c=>`<option value="${esc(c.id)}" ${g?.id===c.id?"selected":""}>${esc(c.name)}${c.grp?" · "+esc(c.grp):""}${c.zona!==r.zona?" (zona "+esc(c.zona)+")":""}</option>`).join("")}</select>
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
      const c=S.clans[pick.value]; if(!c) return toast("Scegli prima il clan.");
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
  const subject="Strade 2030 · Accesso del clan";
  const body=`Ciao,\n\necco i dati per entrare in Strade 2030:\n\nCodice clan: ${c.code}\n${pw?`Password temporanea: ${pw}\n\nAppena entrati, cambiatela da "Profilo del clan" > "Cambia password".\n`:""}\nBuona strada!\nLa commissione di Strade 2030`;
  return `<div class="cred"><p style="margin:0">Codice: <b>${esc(c.code)}</b>${pw?` · Password temporanea: <b class="mono">${esc(pw)}</b>`:""}</p>
    <a class="btn small" href="mailto:${esc(to||c.email||"")}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}">Scrivi la mail al clan</a></div>`;
}

/* ---------- Clan ---------- */
function renderClans(){
  const pts=Object.fromEntries(S.board.map(r=>[r.clan_id,r]));
  const rows=Object.values(S.clans).filter(c=>!S.zonaFilter || c.zona===S.zonaFilter)
    .sort((a,b)=>(pts[b.id]?.totale||0)-(pts[a.id]?.totale||0) || a.name.localeCompare(b.name));
  const nSubs=id=>S.subs.filter(s=>s.clan_id===id).length;
  const nCamp=id=>S.camp.filter(s=>s.clan_id===id).length;
  $("#app").innerHTML = `<section class="hero"><h1>Clan iscritti</h1><p>${Object.keys(S.clans).length} clan. Se un clan dimentica il codice lo trovi qui; per la password usa "Nuova password".</p>
    <div style="margin-top:16px;display:flex;gap:10px;flex-wrap:wrap;align-items:center"><button class="btn" id="csv">Scarica classifica (CSV)</button><select id="zf" ${selStyle} aria-label="Filtra per zona">${zonaOpts()}</select></div></section>
   <div class="panel tablewrap" style="margin-bottom:60px">
    <table class="t"><thead><tr><th>Clan</th><th>Zona</th><th>Gruppo</th><th>Codice</th><th>Email</th><th>Campane</th><th>Locali</th><th>Galleria</th><th class="num">Totale</th><th></th></tr></thead>
    <tbody>${rows.map(c=>{ const p=pts[c.id]||{}; return `<tr data-id="${esc(c.id)}"><td><b>${esc(c.name)}</b></td><td>${esc(c.zona)}</td><td>${esc(c.grp||"")}</td><td>${esc(c.code)}</td><td>${c.email?`<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>`:""}</td><td>${nCamp(c.id)}/17</td><td>${nSubs(c.id)}</td><td>${galleryCell(c)}</td>
      <td class="num"><b>${p.totale??0}</b></td><td><button class="btn ghost small" data-pw>Nuova password</button></td></tr>
      <tr class="cred-row hidden" data-out-for="${esc(c.id)}"><td colspan="10"></td></tr>`; }).join("")}</tbody></table>
   </div>`;
  $("#csv").onclick=()=>downloadCsv(rows,pts);
  $("#zf").onchange=e=>{ S.zonaFilter=e.target.value; renderClans(); };
  document.querySelectorAll("[data-hide]").forEach(b=>b.onclick=()=>toggleGallery(b));
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
  if(hide && !confirm("Nascondere questo clan (foto, nomi e scelte) dalle pagine pubbliche?")) return;
  b.disabled=true;
  const { error } = await sb.rpc("nascondi_clan",{ p_clan:id, p_hidden:hide });
  if(error){ b.disabled=false; console.error(error); return toast("Operazione non riuscita."); }
  S.clans[id].hidden=hide; renderClans(); toast(hide?"Clan nascosto dalle pagine pubbliche":"Clan di nuovo visibile");
}
function downloadCsv(rows,pts){
  const q=v=>`"${String(v??"").replace(/"/g,'""')}"`;
  const lines=[["Posizione","Clan","Zona","Gruppo","Codice","Email","Globale","Campana","Locale","Bonus","Totale","Sfide locali valutate"].map(q).join(";")];
  rows.forEach((c,i)=>{ const p=pts[c.id]||{}; lines.push([i+1,c.name,c.zona,c.grp,c.code,c.email,p.globale??0,p.campana??0,p.locale??0,p.bonus??0,p.totale??0,p.completate??0].map(q).join(";")); });
  const blob=new Blob(["﻿"+lines.join("\n")],{type:"text/csv;charset=utf-8"});
  const a=document.createElement("a"); a.href=URL.createObjectURL(blob);
  a.download=`classifica-strade2030-${new Date().toISOString().slice(0,10)}.csv`; a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),2000);
}
