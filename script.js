// ---------- State ----------
let dailyMoney = 0;
let currentMoney = 0;
let savingsMoney = 0;

let addHistory = [];
let deductHistory = [];
let transferHistory = [];
let currentHistory='add'; 

let modalState = { action:null, source:null }; 

const $ = id => document.getElementById(id);
const fmt = n => Number(n).toFixed(2);
const nowLabel = () => new Date().toLocaleString();

// ---------- Load/Save LocalStorage ----------
function loadData(){
  dailyMoney = parseFloat(localStorage.getItem('dailyMoney')) || 0;
  currentMoney = parseFloat(localStorage.getItem('currentMoney')) || 0;
  savingsMoney = parseFloat(localStorage.getItem('savingsMoney')) || 0;

  addHistory = JSON.parse(localStorage.getItem('addHistory')||'[]');
  deductHistory = JSON.parse(localStorage.getItem('deductHistory')||'[]');
  transferHistory = JSON.parse(localStorage.getItem('transferHistory')||'[]');

  updateDisplay();
}

function saveData(){
  localStorage.setItem('dailyMoney', dailyMoney);
  localStorage.setItem('currentMoney', currentMoney);
  localStorage.setItem('savingsMoney', savingsMoney);

  localStorage.setItem('addHistory', JSON.stringify(addHistory));
  localStorage.setItem('deductHistory', JSON.stringify(deductHistory));
  localStorage.setItem('transferHistory', JSON.stringify(transferHistory));
}

// ---------- UI Functions ----------
function updateDisplay(highlight){
  animateCount('dailyAmount', dailyMoney, highlight==='daily'?'add':null);
  animateCount('currentAmount', currentMoney, highlight==='current'?'add':null);
  animateCount('savingsAmount', savingsMoney, highlight==='savings'?'add':null);
  renderHistory();
  saveData(); // Save after every change
}

function animateCount(id, targetValue, flashType){
  const el = $(id);
  if(!el) return;
  const start = parseFloat(el.textContent)||0;
  const end = Number(targetValue);
  const duration = 420;
  const startTime = performance.now();
  function step(t){
    const p = Math.min(1, (t-startTime)/duration);
    const val = start + (end-start)*easeOutCubic(p);
    el.textContent = fmt(val);
    if(p<1) requestAnimationFrame(step);
    else { el.textContent = fmt(end); if(flashType) flashClass(el, flashType, 600); }
  }
  requestAnimationFrame(step);
}

function easeOutCubic(t){ return (--t)*t*t+1; }
function flashClass(el,cls,ms){ el.classList.add(cls); setTimeout(()=>el.classList.remove(cls),ms); }
function showToast(text){ const t=$('toast'); t.textContent=text; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),2000); }

function pushHistory(action, source, value, reason='No reason', extra=''){
  const item={action, source, value:Number(value), reason:reason||'No reason', time:nowLabel(), extra};
  if(action==='add') addHistory.unshift(item);
  else if(action==='deduct') deductHistory.unshift(item);
  else if(action==='transfer') transferHistory.unshift(item);
  renderHistory();
}

function renderHistory(){
  const list=$('historyList');
  let arr=[];
  if(currentHistory==='add') arr=addHistory;
  else if(currentHistory==='deduct') arr=deductHistory;
  else if(currentHistory==='transfer') arr=transferHistory;

  if(!arr.length){ 
    list.innerHTML=`<div class="history-item"><div class="history-meta">No transactions yet</div></div>`; 
    return; 
  }

  list.innerHTML=arr.map(it=>{
    let text='';
    if(it.action==='add') text='added';
    else if(it.action==='deduct') text='deducted';
    else if(it.action==='transfer') text='transferred';

    const extra = it.extra?` ${it.extra}`:'';
    return `
      <div class="history-item">
        <div><strong class="history-amount">₱${fmt(it.value)}</strong> ${text}${extra}</div>
        <div class="history-meta">${it.source} · ${it.time} · <em>${escapeHtml(it.reason)}</em></div>
      </div>
    `;
  }).join('');
}

function showHistory(tab){
  currentHistory = tab;
  $('addBtn').classList.toggle('active', tab==='add');
  $('deductBtn').classList.toggle('active', tab==='deduct');
  $('transferBtn').classList.toggle('active', tab==='transfer');
  renderHistory();
}

function escapeHtml(s){ if(!s)return ''; return s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'); }

// ---------- Modal ----------
function openModal(action, source){
  modalState={action, source};
  $('modalBackdrop').classList.remove('hidden');
  $('modalAmount').value=''; $('modalReason').value='';

  const titleMap={ add:'Add Money', deduct:'Deduct Money', transfer:'Transfer Money'};
  $('modalTitle').innerText = titleMap[action]+' — '+capitalize(source);

  if(action==='transfer'){
    $('transferTargetDiv').classList.remove('hidden');
    const sel = $('transferTarget');
    sel.value='';
    for(const opt of sel.options) opt.disabled = (opt.value===source || opt.value==='');
  } else $('transferTargetDiv').classList.add('hidden');

  $('modalConfirmBtn').onclick = () => modalConfirm();
  setTimeout(()=>$('modalAmount').focus(),120);
}

function closeModal(){ $('modalBackdrop').classList.add('hidden'); modalState={action:null,source:null}; }
function capitalize(s){ return s.charAt(0).toUpperCase()+s.slice(1); }

function modalConfirm(){
  const amount = parseFloat($('modalAmount').value);
  const reason = $('modalReason').value.trim();
  const { action, source } = modalState;
  if(isNaN(amount)||amount<=0){ alert('Enter a valid amount'); return; }

  if(action==='add'){
    if(!reason){ alert('Reason is required'); return; }
    performAdd(source, amount, reason);
  } else if(action==='deduct'){
    if(!reason){ alert('Reason is required'); return; }
    performDeduct(source, amount, reason,false);
  } else if(action==='transfer'){
    const target=$('transferTarget').value;
    if(!target){ alert('Select a wallet'); return; }
    performTransfer(source,target,amount,reason||`Transferred to ${capitalize(target)}`);
  }
  closeModal();
}

// ---------- Actions ----------
function performAdd(type, value, reason){
  if(type==='daily') dailyMoney+=value;
  else if(type==='current') currentMoney+=value;
  else if(type==='savings') savingsMoney+=value;
  pushHistory('add', type, value, reason);
  animateAfterChange(type,'add');
  showToast(`₱${fmt(value)} added to ${capitalize(type)}`);
  updateDisplay(type);
}

function performDeduct(type,value,reason,toSavings){
  if(type==='daily' && value>dailyMoney){ alert('Not enough money'); return; }
  if(type==='current' && value>currentMoney){ alert('Not enough money'); return; }
  if(type==='savings' && value>savingsMoney){ alert('Not enough money'); return; }

  if(toSavings){
    if(type==='daily') dailyMoney-=value;
    else if(type==='current') currentMoney-=value;
    savingsMoney+=value;
    pushHistory('deduct',type,value,reason,'→ Savings');
    pushHistory('add','savings',value,`From ${capitalize(type)}`);
    animateTransfer(type);
    showToast(`₱${fmt(value)} moved to Savings`);
  } else {
    if(type==='daily') dailyMoney-=value;
    else if(type==='current') currentMoney-=value;
    else if(type==='savings') savingsMoney-=value;
    pushHistory('deduct',type,value,reason);
    showToast(`₱${fmt(value)} deducted from ${capitalize(type)}`);
  }
  animateAfterChange(type, 'deduct');
  updateDisplay('savings');
}

function performTransfer(source,target,amount,reason){
  if(source===target){ alert('Cannot transfer to same wallet'); return; }

  if(source==='daily' && amount>dailyMoney){ alert('Not enough money'); return; }
  if(source==='current' && amount>currentMoney){ alert('Not enough money'); return; }
  if(source==='savings' && amount>savingsMoney){ alert('Not enough money'); return; }

  if(source==='daily') dailyMoney-=amount;
  else if(source==='current') currentMoney-=amount;
  else if(source==='savings') savingsMoney-=amount;

  if(target==='daily') dailyMoney+=amount;
  else if(target==='current') currentMoney+=amount;
  else if(target==='savings') savingsMoney+=amount;

  pushHistory('transfer', source, amount, reason, `→ ${capitalize(target)}`);
  animateTransfer(source);
  showToast(`₱${fmt(amount)} transferred from ${capitalize(source)} to ${capitalize(target)}`);
  updateDisplay();
}

/* End day */
function endDay(){
  if(dailyMoney===0){ alert('No daily money to move'); return; }
  const choice=prompt("End day: type 'savings' to move to Savings, or 'current' to move to Current");
  if(!choice) return;
  if(choice.toLowerCase()==='savings'){
    const val=dailyMoney; dailyMoney=0; savingsMoney+=val;
    pushHistory('deduct','daily',val,'End of Day → Savings','→ Savings');
    pushHistory('add','savings',val,'End of Day from Daily');
    animateTransfer('daily'); showToast(`End day: ₱${fmt(val)} moved to Savings`);
  } else if(choice.toLowerCase()==='current'){
    const val=dailyMoney; dailyMoney=0; currentMoney+=val;
    pushHistory('deduct','daily',val,'End of Day → Current');
    pushHistory('add','current',val,'End of Day from Daily');
    animateTransfer('daily'); showToast(`End day: ₱${fmt(val)} moved to Current`);
  } else { alert('Cancelled or invalid choice'); return; }
  updateDisplay();
}

/* ---------- Small UI animations ---------- */
function animateAfterChange(source, kind){ const el=$(source+'Amount'); if(el) flashClass(el,kind==='add'?'add':'deduct',700); }
function animateTransfer(source){ const sourceCard=document.getElementById(source+'Card'); if(!sourceCard) return; flashClass(sourceCard,'add',700); }

/* ---------- Init ---------- */
loadData();
renderHistory();



/* ---------- Service Worker registration ---------- */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js')
      .then(reg => console.log('Service Worker registered', reg))
      .catch(err => console.log('Service Worker failed', err));
  });
}