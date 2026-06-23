'use strict';
/* Workshop Controller — frontend. Talks to the Express/SQLite API. */

const STATUSES = [
  { id:'booked',   label:'Booked',         color:'#7c5cff' },
  { id:'progress', label:'In Progress',    color:'#4f8ef7' },
  { id:'parts',    label:'Awaiting Parts', color:'#ca8a04' },
  { id:'ready',    label:'Ready',          color:'#0ea5a5' },
  { id:'done',     label:'Completed',      color:'#22c55e' },
  { id:'invoiced', label:'Invoiced',       color:'#64748b' },
];
const OPEN_STATUSES = ['booked','progress','parts','ready'];
const PRIORITIES = {
  low:    {label:'Low',    icon:'○', color:'#a0a8bb'},
  normal: {label:'Normal', icon:'◔', color:'#4f8ef7'},
  high:   {label:'High',   icon:'◑', color:'#ca8a04'},
  urgent: {label:'Urgent', icon:'⬤', color:'#ef4444'},
};

let state = { customers:[], vehicles:[], jobs:[], techs:[], settings:{rate:90,currency:'$',tax:0} };
let jobFilter = 'all', currentTab = 'dash';
let editingJobId=null, editingCustId=null, editingVehId=null;
let draftParts=[], draftLabour=[], draftStatus='booked';

/* ───────── API ───────── */
async function api(method, path, body){
  const opt = { method, headers:{} };
  if(body!==undefined){ opt.headers['Content-Type']='application/json'; opt.body=JSON.stringify(body); }
  const res = await fetch('/api'+path, opt);
  if(!res.ok){ let msg='Request failed'; try{ msg=(await res.json()).error||msg; }catch(e){} throw new Error(msg); }
  return res.status===204 ? null : res.json();
}
async function refresh(){
  state = await api('GET','/state');
  setConn(true);
}
function setConn(ok){
  const c=document.getElementById('conn'), l=document.getElementById('connLabel');
  c.className='conn '+(ok?'on':'off'); l.textContent=ok?'Connected':'Offline — server unreachable';
}

/* ───────── HELPERS ───────── */
function esc(t){ return String(t==null?'':t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function todayStr(){ return new Date().toISOString().slice(0,10); }
function money(n){ const c=state.settings.currency||'$'; return c+(Number(n)||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2}); }
function statusOf(id){ return STATUSES.find(s=>s.id===id)||STATUSES[0]; }
function byId(arr,id){ return arr.find(x=>x.id===id); }
function showToast(msg){ const t=document.getElementById('toast'); t.textContent=msg; t.classList.add('show'); clearTimeout(t._t); t._t=setTimeout(()=>t.classList.remove('show'),2200); }

function lineTotal(l){ return (Number(l.qty)||0)*(Number(l.price)||0); }
function jobParts(j){ return (j.parts||[]).reduce((s,l)=>s+lineTotal(l),0); }
function jobLabour(j){ return (j.labour||[]).reduce((s,l)=>s+lineTotal(l),0); }
function jobSubtotal(j){ return jobParts(j)+jobLabour(j); }
function jobTax(j){ return jobSubtotal(j)*((state.settings.tax||0)/100); }
function jobTotal(j){ return jobSubtotal(j)+jobTax(j); }
function customerName(id){ const c=byId(state.customers,id); return c?c.name:'—'; }
function vehicleLabel(id){ const v=byId(state.vehicles,id); if(!v) return '—'; return [v.year,v.make,v.model].filter(Boolean).join(' ')||'Vehicle'; }
function vehicleLabelWithPlate(v){ return [v.year,v.make,v.model].filter(Boolean).join(' ')+(v.plate?' · '+v.plate:''); }
function vehiclePlate(id){ const v=byId(state.vehicles,id); return v&&v.plate?v.plate:''; }

/* ───────── TABS ───────── */
function switchTab(name){
  currentTab=name;
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.toggle('active', b.dataset.tab===name));
  document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));
  document.getElementById('panel-'+name).classList.add('active');
  renderCurrent();
}
function renderCurrent(){
  if(currentTab==='dash') renderDash();
  else if(currentTab==='jobs') renderJobs();
  else if(currentTab==='customers') renderCustomers();
  else if(currentTab==='vehicles') renderVehicles();
  else if(currentTab==='settings') renderSettings();
  refreshBadges();
}
function refreshBadges(){
  document.getElementById('jobsBadge').textContent = state.jobs.filter(j=>OPEN_STATUSES.includes(j.status)).length;
}

/* ───────── DASHBOARD ───────── */
function renderDash(){
  const el=document.getElementById('dashContent');
  const open=state.jobs.filter(j=>OPEN_STATUSES.includes(j.status));
  const counts={}; STATUSES.forEach(s=>counts[s.id]=0); state.jobs.forEach(j=>counts[j.status]=(counts[j.status]||0)+1);
  const openRevenue=open.reduce((s,j)=>s+jobTotal(j),0);
  const invoiced=state.jobs.filter(j=>j.status==='invoiced').reduce((s,j)=>s+jobTotal(j),0);
  const overdue=open.filter(j=>j.dueDate && j.dueDate<todayStr());
  const maxCount=Math.max(1,...STATUSES.map(s=>counts[s.id]));

  let html=`<div class="stat-grid">
    <div class="stat accent"><span class="lab">Open jobs</span><span class="val">${open.length}</span><span class="sub">${overdue.length} overdue</span></div>
    <div class="stat"><span class="lab">In progress</span><span class="val">${counts.progress||0}</span><span class="sub">${counts.parts||0} awaiting parts</span></div>
    <div class="stat"><span class="lab">Ready for pickup</span><span class="val">${counts.ready||0}</span><span class="sub">${counts.done||0} completed</span></div>
    <div class="stat"><span class="lab">Open job value</span><span class="val mono">${money(openRevenue)}</span><span class="sub">${money(invoiced)} invoiced</span></div>
  </div>`;

  html+=`<div class="card-block"><div class="card-head"><span>Jobs by status</span><a onclick="switchTab('jobs')">View all →</a></div><div class="status-bars">`;
  STATUSES.forEach(s=>{ const n=counts[s.id]||0;
    html+=`<div class="sbar"><div class="nm"><span style="width:9px;height:9px;border-radius:50%;background:${s.color};display:inline-block"></span>${s.label}</div>
      <div class="track"><div class="fill" style="width:${(n/maxCount)*100}%;background:${s.color}"></div></div><div class="n">${n}</div></div>`;
  });
  html+=`</div></div>`;

  const active=[...open].sort((a,b)=>(a.dueDate||'9999').localeCompare(b.dueDate||'9999')).slice(0,6);
  html+=`<div class="card-block"><div class="card-head"><span>Active jobs</span><a onclick="openJob(null)">＋ New</a></div>`;
  if(!active.length){ html+=`<div class="empty" style="padding:34px"><div class="ic">✅</div><div class="t">No open jobs — all clear.</div></div>`; }
  else active.forEach(j=>{ const s=statusOf(j.status); const od=j.dueDate&&j.dueDate<todayStr();
    html+=`<div class="mini-row" onclick="openJob(${j.id})">
      <span class="badge" style="background:${s.color}1a;color:${s.color}"><span class="dot" style="background:${s.color}"></span>${s.label}</span>
      <div class="grow"><div class="t">${esc(j.title||'Untitled job')}</div>
      <div class="s">${esc(customerName(j.customerId))} · ${esc(vehicleLabel(j.vehicleId))} ${vehiclePlate(j.vehicleId)?'· '+esc(vehiclePlate(j.vehicleId)):''}</div></div>
      <div style="text-align:right"><div class="mono" style="font-weight:700">${money(jobTotal(j))}</div>
      <div class="s" style="${od?'color:#ef4444;font-weight:700':''}">${j.dueDate?(od?'Overdue '+j.dueDate:'Due '+j.dueDate):'No due date'}</div></div>
    </div>`;
  });
  html+=`</div>`;
  el.innerHTML=html;
}

/* ───────── JOBS ───────── */
function renderJobFilters(){
  const wrap=document.getElementById('jobFilters');
  const counts={all:state.jobs.length, open:state.jobs.filter(j=>OPEN_STATUSES.includes(j.status)).length};
  STATUSES.forEach(s=>counts[s.id]=state.jobs.filter(j=>j.status===s.id).length);
  let html=`<div class="fpill ${jobFilter==='all'?'active':''}" onclick="setJobFilter('all')">All <span class="cnt">${counts.all}</span></div>`;
  html+=`<div class="fpill ${jobFilter==='open'?'active':''}" onclick="setJobFilter('open')">Open <span class="cnt">${counts.open}</span></div>`;
  STATUSES.forEach(s=>{ html+=`<div class="fpill ${jobFilter===s.id?'active':''}" onclick="setJobFilter('${s.id}')">
    <span style="width:7px;height:7px;border-radius:50%;background:${s.color};display:inline-block"></span>${s.label} <span class="cnt">${counts[s.id]}</span></div>`; });
  wrap.innerHTML=html;
}
function setJobFilter(f){ jobFilter=f; renderJobs(); }
function renderJobs(){
  renderJobFilters();
  const q=(document.getElementById('jobSearch').value||'').toLowerCase().trim();
  let rows=state.jobs.slice().sort((a,b)=>b.id-a.id);
  if(jobFilter==='open') rows=rows.filter(j=>OPEN_STATUSES.includes(j.status));
  else if(jobFilter!=='all') rows=rows.filter(j=>j.status===jobFilter);
  if(q) rows=rows.filter(j=>[j.title,customerName(j.customerId),vehicleLabel(j.vehicleId),vehiclePlate(j.vehicleId),j.tech].join(' ').toLowerCase().includes(q));
  const wrap=document.getElementById('jobsTableWrap');
  if(!rows.length){ wrap.innerHTML=emptyState('🗂️', state.jobs.length?'No jobs match this filter.':'No jobs yet — create your first job card.','＋ New Job','openJob(null)'); return; }
  let html=`<table class="data-table"><thead><tr><th>#</th><th>Job</th><th>Vehicle</th><th>Tech</th><th>Status</th><th>Due</th><th class="right">Total</th></tr></thead><tbody>`;
  rows.forEach(j=>{ const s=statusOf(j.status); const od=j.dueDate&&j.dueDate<todayStr()&&OPEN_STATUSES.includes(j.status); const p=PRIORITIES[j.priority]||PRIORITIES.normal;
    html+=`<tr onclick="openJob(${j.id})">
      <td class="cell-sub mono">#${j.id}</td>
      <td><div class="cell-strong">${esc(j.title||'Untitled')}</div><div class="cell-sub"><span class="pri" style="color:${p.color}">${p.icon} ${p.label}</span> · ${esc(customerName(j.customerId))}</div></td>
      <td><div>${esc(vehicleLabel(j.vehicleId))}</div><div class="cell-sub mono">${esc(vehiclePlate(j.vehicleId)||'—')}</div></td>
      <td>${esc(j.tech||'—')}</td>
      <td><span class="badge" style="background:${s.color}1a;color:${s.color}"><span class="dot" style="background:${s.color}"></span>${s.label}</span></td>
      <td class="cell-sub" ${od?'style="color:#ef4444;font-weight:700"':''}>${j.dueDate||'—'}</td>
      <td class="right mono cell-strong">${money(jobTotal(j))}</td>
    </tr>`;
  });
  html+=`</tbody></table>`;
  wrap.innerHTML=html;
}

/* ───────── JOB MODAL ───────── */
function fillSelect(sel, items, valKey, labelFn, placeholder, selected){
  let html = placeholder!=null ? `<option value="">${esc(placeholder)}</option>` : '';
  items.forEach(it=>{ html+=`<option value="${it[valKey]}" ${String(it[valKey])===String(selected)?'selected':''}>${esc(labelFn(it))}</option>`; });
  sel.innerHTML=html;
}
function renderJobFlow(){
  document.getElementById('jobFlow').innerHTML=STATUSES.map(s=>`<div class="step ${draftStatus===s.id?'on':''}" style="${draftStatus===s.id?'background:'+s.color:''}" onclick="setDraftStatus('${s.id}')">${s.label}</div>`).join('');
}
function setDraftStatus(id){ draftStatus=id; renderJobFlow(); }
function onJobCustomerChange(){
  const cid=document.getElementById('jobCustomer').value;
  const vehs=state.vehicles.filter(v=>String(v.customerId)===String(cid));
  fillSelect(document.getElementById('jobVehicle'), vehs, 'id', vehicleLabelWithPlate, vehs.length?'Select vehicle…':'No vehicles for customer', '');
}
function openJob(id){
  editingJobId=id;
  const j = id!=null ? byId(state.jobs,id) : null;
  document.getElementById('jobModalTitle').textContent = j ? '🗂️ Job #'+j.id : '🗂️ New Job';
  document.getElementById('jobDeleteBtn').style.display = j ? '' : 'none';
  fillSelect(document.getElementById('jobCustomer'), state.customers, 'id', c=>c.name, 'Select customer…', j?j.customerId:'');
  fillSelect(document.getElementById('jobTech'), state.techs.map(t=>({id:t,name:t})), 'id', t=>t.name, 'Unassigned', j?j.tech:'');
  draftStatus = j ? j.status : 'booked';
  draftParts = j ? JSON.parse(JSON.stringify(j.parts||[])) : [];
  draftLabour = j ? JSON.parse(JSON.stringify(j.labour||[])) : [];
  document.getElementById('jobTitle').value = j?j.title||'':'';
  document.getElementById('jobPriority').value = j?j.priority||'normal':'normal';
  document.getElementById('jobOdo').value = j&&j.odo!=null?j.odo:'';
  document.getElementById('jobDateIn').value = j?j.dateIn||todayStr():todayStr();
  document.getElementById('jobDueDate').value = j?j.dueDate||'':'';
  document.getElementById('jobNotes').value = j?j.notes||'':'';
  renderJobFlow();
  onJobCustomerChange();
  if(j) document.getElementById('jobVehicle').value = j.vehicleId||'';
  renderLines();
  openModal('jobOverlay');
}
function renderLines(){
  document.getElementById('partsTable').innerHTML = lineTableHTML(draftParts,'part');
  document.getElementById('labourTable').innerHTML = lineTableHTML(draftLabour,'labour');
  renderJobTotals();
}
function lineTableHTML(arr,type){
  const unit = type==='labour' ? 'hrs' : 'qty';
  if(!arr.length) return `<div class="li-empty">No ${type==='labour'?'labour':'parts'} added.</div>`;
  let html=`<div class="li-row head"><div>Description</div><div>${unit}</div><div>Unit</div><div class="amt">Amount</div><div></div></div>`;
  arr.forEach((li,i)=>{
    html+=`<div class="li-row">
      <input value="${esc(li.desc)}" placeholder="${type==='labour'?'Labour description':'Part name / number'}" oninput="updateLine('${type}',${i},'desc',this.value)"/>
      <input type="number" min="0" step="${type==='labour'?'0.25':'1'}" value="${li.qty}" oninput="updateLine('${type}',${i},'qty',this.value)"/>
      <input type="number" min="0" step="0.01" value="${li.price}" oninput="updateLine('${type}',${i},'price',this.value)"/>
      <div class="amt">${money(lineTotal(li))}</div>
      <button class="del" onclick="removeLine('${type}',${i})" title="Remove">×</button>
    </div>`;
  });
  return html;
}
function addLine(type){
  if(type==='labour') draftLabour.push({desc:'', qty:1, price:state.settings.rate||0});
  else draftParts.push({desc:'', qty:1, price:0});
  renderLines();
}
function updateLine(type,i,field,val){
  const arr = type==='labour'?draftLabour:draftParts;
  if(!arr[i]) return;
  arr[i][field] = field==='desc' ? val : (val===''?'':Number(val));
  renderJobTotals();
  const rows=document.getElementById(type==='labour'?'labourTable':'partsTable').querySelectorAll('.li-row:not(.head)');
  if(rows[i]) rows[i].querySelector('.amt').textContent=money(lineTotal(arr[i]));
}
function removeLine(type,i){ const arr=type==='labour'?draftLabour:draftParts; arr.splice(i,1); renderLines(); }
function renderJobTotals(){
  const tmp={parts:draftParts, labour:draftLabour};
  let html=`<div class="tr"><span class="muted">Parts</span><span class="mono">${money(jobParts(tmp))}</span></div>
    <div class="tr"><span class="muted">Labour</span><span class="mono">${money(jobLabour(tmp))}</span></div>
    <div class="tr"><span class="muted">Subtotal</span><span class="mono">${money(jobSubtotal(tmp))}</span></div>`;
  if(state.settings.tax) html+=`<div class="tr"><span class="muted">Tax (${state.settings.tax}%)</span><span class="mono">${money(jobTax(tmp))}</span></div>`;
  html+=`<div class="tr grand"><span>Total</span><span class="mono">${money(jobTotal(tmp))}</span></div>`;
  document.getElementById('jobTotals').innerHTML=html;
}
async function saveJob(){
  const customerId=document.getElementById('jobCustomer').value;
  const title=document.getElementById('jobTitle').value.trim();
  if(!customerId){ showToast('⚠️ Pick a customer'); return; }
  if(!title){ showToast('⚠️ Add a complaint / job title'); return; }
  const clean=arr=>arr.filter(l=>String(l.desc).trim()||Number(l.qty)||Number(l.price)).map(l=>({desc:String(l.desc).trim(),qty:Number(l.qty)||0,price:Number(l.price)||0}));
  const data={
    customerId:+customerId,
    vehicleId: document.getElementById('jobVehicle').value?+document.getElementById('jobVehicle').value:null,
    title, status:draftStatus, tech:document.getElementById('jobTech').value,
    priority:document.getElementById('jobPriority').value,
    odo: document.getElementById('jobOdo').value!==''?Number(document.getElementById('jobOdo').value):null,
    dateIn:document.getElementById('jobDateIn').value, dueDate:document.getElementById('jobDueDate').value,
    notes:document.getElementById('jobNotes').value.trim(), parts:clean(draftParts), labour:clean(draftLabour),
  };
  try{
    if(editingJobId!=null){ await api('PUT','/jobs/'+editingJobId,data); showToast('✅ Job updated'); }
    else { const j=await api('POST','/jobs',data); showToast('✅ Job #'+j.id+' created'); }
    await refresh(); closeModal('jobOverlay'); renderCurrent();
  }catch(e){ showToast('⚠️ '+e.message); }
}
let jobDelArm=false;
async function deleteJob(){
  const btn=document.getElementById('jobDeleteBtn');
  if(!jobDelArm){ jobDelArm=true; btn.textContent='Confirm delete?'; btn.classList.add('confirming'); setTimeout(()=>{jobDelArm=false;btn.textContent='Delete';btn.classList.remove('confirming');},2500); return; }
  try{ await api('DELETE','/jobs/'+editingJobId); await refresh(); closeModal('jobOverlay'); renderCurrent(); showToast('🗑️ Job deleted'); }
  catch(e){ showToast('⚠️ '+e.message); }
  jobDelArm=false; btn.textContent='Delete'; btn.classList.remove('confirming');
}
function printJob(){
  const cid=+document.getElementById('jobCustomer').value;
  const vid=document.getElementById('jobVehicle').value?+document.getElementById('jobVehicle').value:null;
  const j={parts:draftParts,labour:draftLabour,title:document.getElementById('jobTitle').value,tech:document.getElementById('jobTech').value,dateIn:document.getElementById('jobDateIn').value,status:draftStatus,notes:document.getElementById('jobNotes').value,vehicleId:vid};
  const c=byId(state.customers,cid)||{}; const v=byId(state.vehicles,vid)||{};
  const liRows=(arr,unit)=>arr.filter(l=>l.desc).map(l=>`<tr><td>${esc(l.desc)}</td><td style="text-align:right">${l.qty} ${unit}</td><td style="text-align:right">${money(l.price)}</td><td style="text-align:right">${money(lineTotal(l))}</td></tr>`).join('');
  const w=window.open('','_blank');
  w.document.write(`<html><head><title>Job ${editingJobId?'#'+editingJobId:''} — ${esc(c.name||'')}</title>
  <style>body{font-family:Arial,sans-serif;color:#1a1a2e;padding:30px;max-width:720px;margin:auto}h1{font-size:20px}h2{font-size:13px;text-transform:uppercase;letter-spacing:.05em;color:#7a8499;border-bottom:1px solid #ddd;padding-bottom:4px;margin-top:24px}table{width:100%;border-collapse:collapse;font-size:13px;margin-top:8px}td,th{padding:6px 4px;border-bottom:1px solid #eee;text-align:left}.tot{font-size:16px;font-weight:bold;text-align:right;margin-top:10px}.meta{font-size:13px;line-height:1.7}</style></head><body>
  <h1>🔧 Workshop Job Card ${editingJobId?'#'+editingJobId:''}</h1>
  <div class="meta"><b>Customer:</b> ${esc(c.name||'—')} &nbsp; ${esc(c.phone||'')}<br/>
  <b>Vehicle:</b> ${esc(vehicleLabel(vid))} ${v.plate?'· '+esc(v.plate):''}<br/>
  <b>Job:</b> ${esc(j.title||'—')}<br/><b>Technician:</b> ${esc(j.tech||'—')} &nbsp; <b>Date in:</b> ${esc(j.dateIn||'—')} &nbsp; <b>Status:</b> ${statusOf(j.status).label}</div>
  <h2>Parts</h2><table><tr><th>Description</th><th style="text-align:right">Qty</th><th style="text-align:right">Unit</th><th style="text-align:right">Amount</th></tr>${liRows(j.parts,'')||'<tr><td colspan=4>None</td></tr>'}</table>
  <h2>Labour</h2><table><tr><th>Description</th><th style="text-align:right">Hrs</th><th style="text-align:right">Rate</th><th style="text-align:right">Amount</th></tr>${liRows(j.labour,'hrs')||'<tr><td colspan=4>None</td></tr>'}</table>
  ${j.notes?`<h2>Notes</h2><div class="meta">${esc(j.notes).replace(/\n/g,'<br/>')}</div>`:''}
  <div class="tot">Subtotal: ${money(jobSubtotal(j))}<br/>${state.settings.tax?`Tax (${state.settings.tax}%): ${money(jobTax(j))}<br/>`:''}Total: ${money(jobTotal(j))}</div>
  </body></html>`);
  w.document.close(); w.focus(); setTimeout(()=>w.print(),250);
}

/* ───────── CUSTOMERS ───────── */
function renderCustomers(){
  const q=(document.getElementById('custSearch').value||'').toLowerCase().trim();
  let rows=state.customers.slice().sort((a,b)=>a.name.localeCompare(b.name));
  if(q) rows=rows.filter(c=>[c.name,c.phone,c.email].join(' ').toLowerCase().includes(q));
  const wrap=document.getElementById('custTableWrap');
  if(!rows.length){ wrap.innerHTML=emptyState('👤', state.customers.length?'No customers match.':'No customers yet.','＋ New Customer','openCustomer(null)'); return; }
  let html=`<table class="data-table"><thead><tr><th>Name</th><th>Contact</th><th>Vehicles</th><th class="right">Jobs</th></tr></thead><tbody>`;
  rows.forEach(c=>{
    const vehs=state.vehicles.filter(v=>v.customerId===c.id);
    const jobs=state.jobs.filter(j=>j.customerId===c.id);
    const openJobs=jobs.filter(j=>OPEN_STATUSES.includes(j.status)).length;
    html+=`<tr onclick="openCustomer(${c.id})">
      <td class="cell-strong">${esc(c.name)}</td>
      <td class="cell-sub">${esc(c.phone||'')}${c.phone&&c.email?'<br/>':''}${esc(c.email||'')||(c.phone?'':'—')}</td>
      <td class="cell-sub">${vehs.length?vehs.map(v=>`<span class="veh-chip">🚗 ${esc(v.plate||vehicleLabel(v.id))}</span>`).join(''):'—'}</td>
      <td class="right"><span class="cell-strong">${jobs.length}</span>${openJobs?` <span class="tag" style="background:#eef4ff;color:#4f8ef7">${openJobs} open</span>`:''}</td>
    </tr>`;
  });
  html+=`</tbody></table>`; wrap.innerHTML=html;
}
function openCustomer(id){
  editingCustId=id;
  const c=id!=null?byId(state.customers,id):null;
  document.getElementById('custModalTitle').textContent=c?'👤 '+c.name:'👤 New Customer';
  document.getElementById('custDeleteBtn').style.display=c?'':'none';
  document.getElementById('custName').value=c?c.name:'';
  document.getElementById('custPhone').value=c?c.phone||'':'';
  document.getElementById('custEmail').value=c?c.email||'':'';
  document.getElementById('custNotes').value=c?c.notes||'':'';
  const vb=document.getElementById('custVehicles');
  if(c){ const vehs=state.vehicles.filter(v=>v.customerId===c.id);
    vb.innerHTML=`<div class="field"><label>Vehicles (${vehs.length})</label><div>${vehs.length?vehs.map(v=>`<span class="veh-chip">🚗 ${esc(vehicleLabelWithPlate(v))}</span>`).join(''):'<span class="muted" style="font-size:12px">None yet — add from the Vehicles tab.</span>'}</div></div>`;
  } else vb.innerHTML='';
  openModal('custOverlay');
}
async function saveCustomer(){
  const name=document.getElementById('custName').value.trim();
  if(!name){ showToast('⚠️ Name required'); return; }
  const data={ name, phone:document.getElementById('custPhone').value.trim(), email:document.getElementById('custEmail').value.trim(), notes:document.getElementById('custNotes').value.trim() };
  try{
    if(editingCustId!=null){ await api('PUT','/customers/'+editingCustId,data); showToast('✅ Customer updated'); }
    else { await api('POST','/customers',data); showToast('✅ Customer added'); }
    await refresh(); closeModal('custOverlay'); renderCurrent();
  }catch(e){ showToast('⚠️ '+e.message); }
}
let custDelArm=false;
async function deleteCustomer(){
  const btn=document.getElementById('custDeleteBtn');
  const linkedJobs=state.jobs.filter(j=>j.customerId===editingCustId).length;
  const linkedVeh=state.vehicles.filter(v=>v.customerId===editingCustId).length;
  if(!custDelArm){ custDelArm=true; btn.textContent=(linkedJobs||linkedVeh)?`Delete + ${linkedVeh} veh / ${linkedJobs} jobs?`:'Confirm delete?'; btn.classList.add('confirming'); setTimeout(()=>{custDelArm=false;btn.textContent='Delete';btn.classList.remove('confirming');},2800); return; }
  try{ await api('DELETE','/customers/'+editingCustId); await refresh(); closeModal('custOverlay'); renderCurrent(); showToast('🗑️ Customer removed'); }
  catch(e){ showToast('⚠️ '+e.message); }
  custDelArm=false; btn.textContent='Delete'; btn.classList.remove('confirming');
}

/* ───────── VEHICLES ───────── */
function renderVehicles(){
  const q=(document.getElementById('vehSearch').value||'').toLowerCase().trim();
  let rows=state.vehicles.slice().sort((a,b)=>(a.make||'').localeCompare(b.make||''));
  if(q) rows=rows.filter(v=>[v.make,v.model,v.plate,v.vin,v.year,customerName(v.customerId)].join(' ').toLowerCase().includes(q));
  const wrap=document.getElementById('vehTableWrap');
  if(!rows.length){ wrap.innerHTML=emptyState('🚗', state.vehicles.length?'No vehicles match.':'No vehicles yet.','＋ New Vehicle','openVehicle(null)'); return; }
  let html=`<table class="data-table"><thead><tr><th>Vehicle</th><th>Plate</th><th>Owner</th><th>VIN</th><th class="right">Jobs</th></tr></thead><tbody>`;
  rows.forEach(v=>{ const jobs=state.jobs.filter(j=>j.vehicleId===v.id).length;
    html+=`<tr onclick="openVehicle(${v.id})">
      <td><div class="cell-strong">${esc([v.year,v.make,v.model].filter(Boolean).join(' ')||'Vehicle')}</div><div class="cell-sub">${esc(v.colour||'')}</div></td>
      <td class="mono cell-strong">${esc(v.plate||'—')}</td>
      <td class="cell-sub">${esc(customerName(v.customerId))}</td>
      <td class="cell-sub mono">${esc(v.vin||'—')}</td>
      <td class="right cell-strong">${jobs}</td>
    </tr>`;
  });
  html+=`</tbody></table>`; wrap.innerHTML=html;
}
function openVehicle(id){
  editingVehId=id;
  if(!state.customers.length && id==null){ showToast('⚠️ Add a customer first'); return; }
  const v=id!=null?byId(state.vehicles,id):null;
  document.getElementById('vehModalTitle').textContent=v?'🚗 '+([v.year,v.make,v.model].filter(Boolean).join(' ')):'🚗 New Vehicle';
  document.getElementById('vehDeleteBtn').style.display=v?'':'none';
  fillSelect(document.getElementById('vehCustomer'), state.customers, 'id', c=>c.name, 'Select owner…', v?v.customerId:'');
  document.getElementById('vehYear').value=v?v.year||'':'';
  document.getElementById('vehMake').value=v?v.make||'':'';
  document.getElementById('vehModel').value=v?v.model||'':'';
  document.getElementById('vehPlate').value=v?v.plate||'':'';
  document.getElementById('vehColour').value=v?v.colour||'':'';
  document.getElementById('vehVin').value=v?v.vin||'':'';
  openModal('vehOverlay');
}
async function saveVehicle(){
  const customerId=document.getElementById('vehCustomer').value;
  if(!customerId){ showToast('⚠️ Pick an owner'); return; }
  const make=document.getElementById('vehMake').value.trim(), model=document.getElementById('vehModel').value.trim();
  if(!make&&!model){ showToast('⚠️ Add make or model'); return; }
  const data={ customerId:+customerId, year:document.getElementById('vehYear').value, make, model,
    plate:document.getElementById('vehPlate').value.trim(), colour:document.getElementById('vehColour').value.trim(), vin:document.getElementById('vehVin').value.trim() };
  try{
    if(editingVehId!=null){ await api('PUT','/vehicles/'+editingVehId,data); showToast('✅ Vehicle updated'); }
    else { await api('POST','/vehicles',data); showToast('✅ Vehicle added'); }
    await refresh(); closeModal('vehOverlay'); renderCurrent();
  }catch(e){ showToast('⚠️ '+e.message); }
}
let vehDelArm=false;
async function deleteVehicle(){
  const btn=document.getElementById('vehDeleteBtn');
  const linked=state.jobs.filter(j=>j.vehicleId===editingVehId).length;
  if(!vehDelArm){ vehDelArm=true; btn.textContent=linked?`Unlink ${linked} jobs?`:'Confirm delete?'; btn.classList.add('confirming'); setTimeout(()=>{vehDelArm=false;btn.textContent='Delete';btn.classList.remove('confirming');},2600); return; }
  try{ await api('DELETE','/vehicles/'+editingVehId); await refresh(); closeModal('vehOverlay'); renderCurrent(); showToast('🗑️ Vehicle removed'); }
  catch(e){ showToast('⚠️ '+e.message); }
  vehDelArm=false; btn.textContent='Delete'; btn.classList.remove('confirming');
}

/* ───────── SETTINGS ───────── */
function renderSettings(){
  document.getElementById('setRate').value=state.settings.rate;
  document.getElementById('setCur').value=state.settings.currency;
  document.getElementById('setTax').value=state.settings.tax;
  renderTechs();
}
async function saveSettings(){
  const data={ rate:Number(document.getElementById('setRate').value)||0, currency:document.getElementById('setCur').value||'$', tax:Number(document.getElementById('setTax').value)||0 };
  try{ state.settings=await api('PUT','/settings',data); showToast('✅ Settings saved'); }catch(e){ showToast('⚠️ '+e.message); }
}
function renderTechs(){
  const el=document.getElementById('techList');
  if(!state.techs.length){ el.innerHTML='<div class="muted" style="font-size:12px">No technicians yet.</div>'; return; }
  el.innerHTML=state.techs.map(t=>`<div class="tech-item"><span class="nm">🧑‍🔧 ${esc(t)}</span><button class="rm" onclick="removeTech('${esc(t).replace(/'/g,"\\'")}')" title="Remove">×</button></div>`).join('');
}
async function addTech(){
  const inp=document.getElementById('newTech'); const name=inp.value.trim();
  if(!name) return;
  try{ state.techs=await api('POST','/techs',{name}); inp.value=''; renderTechs(); showToast('✅ Technician added'); }catch(e){ showToast('⚠️ '+e.message); }
}
async function removeTech(name){
  try{ state.techs=await api('DELETE','/techs/'+encodeURIComponent(name)); renderTechs(); }catch(e){ showToast('⚠️ '+e.message); }
}

/* ───────── SHARED UI ───────── */
function emptyState(ic,text,btnLabel,btnAction){
  return `<div class="empty"><div class="ic">${ic}</div><div class="t">${esc(text)}</div>${btnLabel?`<button class="btn btn-primary btn-sm" onclick="${btnAction}">${btnLabel}</button>`:''}</div>`;
}
function openModal(id){ document.getElementById(id).classList.add('show'); }
function closeModal(id){ document.getElementById(id).classList.remove('show'); }
document.addEventListener('keydown',e=>{ if(e.key==='Escape') document.querySelectorAll('.overlay.show').forEach(o=>o.classList.remove('show')); });

/* ───────── BOOT ───────── */
(async function boot(){
  try{ await refresh(); }
  catch(e){ setConn(false); showToast('⚠️ Could not reach server'); }
  renderCurrent();
})();
