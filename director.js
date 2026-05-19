/* director.js — لوحة المديرة */

/* ============================
   CONFIG
   ============================ */
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyOAJrciJcnSXsxCUsMXQcqCablNhRx_3x75Sm_XAiqW6B_BfwL_K2hW4HY1cm6TrM2Fw/exec';
const N8N_BASE = 'http://localhost:5678/webhook'; // غيري لـ VPS عند النشر
const WEBHOOKS = {
  register: `${N8N_BASE}/RegisterChild`,
  payments: `${N8N_BASE}/Payments`,
};

/* ============================
   CHILDREN DATA (local fallback)
   ============================ */
const LOCAL_CHILDREN = {
  'KG1-A':    [
    { child_id:'KG1A-01', child_name:'أحمد محمد',   class:'KG1-A' },
    { child_id:'KG1A-02', child_name:'فاطمة علي',   class:'KG1-A' },
    { child_id:'KG1A-03', child_name:'محمد حسن',    class:'KG1-A' },
    { child_id:'KG1A-04', child_name:'سارة إبراهيم', class:'KG1-A' },
    { child_id:'KG1A-05', child_name:'علي كريم',    class:'KG1-A' },
    { child_id:'KG1A-06', child_name:'نور طارق',    class:'KG1-A' },
  ],
  'KG1-B':    [
    { child_id:'KG1B-01', child_name:'مريم خالد',   class:'KG1-B' },
    { child_id:'KG1B-02', child_name:'يوسف حسين',  class:'KG1-B' },
    { child_id:'KG1B-03', child_name:'ليلى محمود',  class:'KG1-B' },
  ],
  'KG2-A':    [
    { child_id:'KG2A-01', child_name:'سلمى منصور',  class:'KG2-A' },
    { child_id:'KG2A-02', child_name:'إياد حسن',    class:'KG2-A' },
    { child_id:'KG2A-03', child_name:'دينا أحمد',   class:'KG2-A' },
  ],
  'KG2-B':    [
    { child_id:'KG2B-01', child_name:'ماجدة كريم',  class:'KG2-B' },
    { child_id:'KG2B-02', child_name:'حسام علي',    class:'KG2-B' },
  ],
  'Nursery-A':[
    { child_id:'NURA-01', child_name:'لمار أحمد',   class:'Nursery-A' },
    { child_id:'NURA-02', child_name:'يزن محمد',    class:'Nursery-A' },
  ],
  'Nursery-B':[
    { child_id:'NURB-01', child_name:'جنا وليد',    class:'Nursery-B' },
    { child_id:'NURB-02', child_name:'ريم أحمد',    class:'Nursery-B' },
  ],
};

// Flatten all children
const ALL_CHILDREN = Object.values(LOCAL_CHILDREN).flat();

/* ============================
   DEMO DATA (fallback when Sheets unreachable)
   ============================ */
const DEMO_DATA = {
  totalChildren: 247,
  presentToday: 231,
  collectedThisMonth: 182500,
  unpaidCount: 14,
  classes: [
    { name:'KG1-A', teacher:'Miss Sara',  total:22, present:21 },
    { name:'KG1-B', teacher:'Miss Nour',  total:20, present:18 },
    { name:'KG2-A', teacher:'Miss Heba',  total:24, present:20 },
    { name:'KG2-B', teacher:'Miss Dina',  total:21, present:21 },
    { name:'Nursery-A', teacher:'Miss Rania', total:18, present:16 },
    { name:'Nursery-B', teacher:'Miss Ola',   total:15, present:14 },
  ],
  weeklyAttendance: [72, 88, 91, 85, 94, 93],
  weekDays: ['الأحد','الإثنين','الثلاثاء','الأربعاء','الخميس','اليوم'],
  recentPayments: [
    { child_name:'أحمد محمد',  class:'KG1-A', amount:1500, month:'2026-05', status:'مدفوع' },
    { child_name:'فاطمة علي',  class:'KG1-A', amount:750,  month:'2026-05', status:'جزئي' },
    { child_name:'سلمى منصور', class:'KG2-A', amount:1500, month:'2026-05', status:'مدفوع' },
    { child_name:'يوسف حسين',  class:'KG1-B', amount:1500, month:'2026-05', status:'مدفوع' },
    { child_name:'ماجدة كريم', class:'KG2-B', amount:0,    month:'2026-05', status:'غير مدفوع' },
  ],
  recentIncidents: [
    { icon:'⚠️', name:'علي كريم',   class:'KG1-A', text:'ملاحظة سلوكية — كان عدوانياً', time:'منذ ساعة' },
    { icon:'🚨', name:'إياد حسن',   class:'KG2-A', text:'وقوع — إصابة بسيطة في الركبة', time:'منذ 3 ساعات' },
    { icon:'📝', name:'لمار أحمد',  class:'Nursery-A', text:'مستلزمات — تحتاج كراسة رسم', time:'منذ يوم' },
  ],
  paymentStatus: [
    { child_name:'أحمد محمد',  class:'KG1-A', paid:1500, total:1500, status:'مدفوع' },
    { child_name:'فاطمة علي',  class:'KG1-A', paid:750,  total:1500, status:'جزئي' },
    { child_name:'سلمى منصور', class:'KG2-A', paid:1500, total:1500, status:'مدفوع' },
    { child_name:'يوسف حسين',  class:'KG1-B', paid:0,    total:1500, status:'غير مدفوع' },
    { child_name:'ماجدة كريم', class:'KG2-B', paid:1500, total:1500, status:'مدفوع' },
    { child_name:'إياد حسن',   class:'KG2-A', paid:500,  total:1500, status:'جزئي' },
  ],
};

/* ============================
   INIT
   ============================ */
document.addEventListener('DOMContentLoaded', () => {
  setTodayDate();
  setDefaultMonth();
  buildPayChildSelect();
  loadDashboard();
});

function setTodayDate() {
  const str = new Date().toLocaleDateString('ar-EG', {
    weekday:'long', year:'numeric', month:'long', day:'numeric'
  });
  document.getElementById('todayDate').textContent = str;
}

function setDefaultMonth() {
  const now = new Date();
  const m = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  document.getElementById('payMonth').value = m;
}

/* ============================
   TABS
   ============================ */
function switchTab(tabId, btn) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.getElementById('tab-' + tabId).classList.add('active');
  btn.classList.add('active');

  if (tabId === 'payments') loadPaymentStatus();
}

/* ============================
   LOAD DASHBOARD
   Tries Apps Script first, falls back to demo data
   ============================ */
async function loadDashboard() {
  document.querySelector('.refresh-btn')?.classList.add('spinning');
  setTimeout(() => document.querySelector('.refresh-btn')?.classList.remove('spinning'), 800);

  fetchJSONP(APPS_SCRIPT_URL + '?action=getDashboard', function(data) {
    if (data && data.totalChildren !== undefined) {
      renderDashboard(data);
    } else {
      renderDashboard(DEMO_DATA);
    }
    document.getElementById('lastUpdated').textContent =
      'آخر تحديث: ' + new Date().toLocaleTimeString('ar-EG');
  });
}

function renderDashboard(d) {
  // KPI
  animNum('kpiTotal',   d.totalChildren);
  animNum('kpiPresent', d.presentToday);

  document.getElementById('kpiPayments').textContent =
    (d.collectedThisMonth || 0).toLocaleString('ar-EG') + ' ج';
  document.getElementById('kpiUnpaid').textContent = d.unpaidCount || 0;

  const pct = Math.round((d.presentToday / d.totalChildren) * 100);
  document.getElementById('kpiPresentTrend').textContent = `${pct}% من الإجمالي`;
  document.getElementById('kpiPresentTrend').className = 'kpi-trend ' + (pct >= 90 ? 'up' : 'down');

  document.getElementById('kpiTotalTrend').textContent = 'طفل مسجل';
  document.getElementById('kpiPaymentsTrend').textContent = `هذا الشهر`;
  document.getElementById('kpiUnpaidTrend').textContent = `لم يدفعوا بعد`;
  document.getElementById('kpiUnpaidTrend').className = 'kpi-trend down';

  // Remove skeleton
  document.querySelectorAll('.kpi-card').forEach(c => c.classList.remove('skeleton'));

  // Classes
  renderClasses(d.classes || []);

  // Chart
  renderChart(d.weeklyAttendance || [], d.weekDays || []);

  // Payments
  renderRecentPayments(d.recentPayments || []);

  // Incidents
  renderIncidents(d.recentIncidents || []);
}

/* ============================
   CLASSES
   ============================ */
function renderClasses(classes) {
  const list = document.getElementById('classesList');
  if (!classes.length) { list.innerHTML = '<div class="loading-placeholder">لا توجد بيانات</div>'; return; }

  list.innerHTML = classes.map(c => {
    const pct = Math.round((c.present / c.total) * 100);
    const badgeClass = pct >= 90 ? 'badge-green' : pct >= 75 ? 'badge-amber' : 'badge-red';
    return `
      <div class="class-row">
        <div class="class-row-name">${c.name}</div>
        <div class="class-row-teacher">👩‍🏫 ${c.teacher}</div>
        <div class="class-row-bar-wrap">
          <div class="class-row-bar">
            <div class="class-row-bar-fill" style="width:${pct}%"></div>
          </div>
          <div class="class-row-pct">${c.present} / ${c.total} — ${pct}%</div>
        </div>
        <span class="class-row-badge ${badgeClass}">${pct >= 90 ? '✅' : pct >= 75 ? '⚠️' : '❌'} ${pct}%</span>
      </div>
    `;
  }).join('');
}

/* ============================
   CHART (vanilla canvas)
   ============================ */
function renderChart(values, labels) {
  const canvas = document.getElementById('attendanceChart');
  const ctx = canvas.getContext('2d');

  // HiDPI
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = (rect.width || canvas.offsetWidth || 600) * dpr;
  canvas.height = 160 * dpr;
  ctx.scale(dpr, dpr);

  const W = canvas.width / dpr;
  const H = 160;
  const pad = { top: 20, bottom: 30, left: 10, right: 10 };
  const chartW = W - pad.left - pad.right;
  const chartH = H - pad.top - pad.bottom;
  const max = 100;

  ctx.clearRect(0, 0, W, H);

  const barW = chartW / values.length * 0.55;
  const gap = chartW / values.length;

  values.forEach((val, i) => {
    const x = pad.left + i * gap + gap * 0.225;
    const barH = (val / max) * chartH;
    const y = pad.top + chartH - barH;
    const isToday = i === values.length - 1;

    // Bar
    const grad = ctx.createLinearGradient(0, y, 0, y + barH);
    if (isToday) {
      grad.addColorStop(0, 'rgba(59,130,246,0.9)');
      grad.addColorStop(1, 'rgba(99,102,241,0.6)');
    } else {
      grad.addColorStop(0, 'rgba(59,130,246,0.4)');
      grad.addColorStop(1, 'rgba(59,130,246,0.15)');
    }

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(x, y, barW, barH, [4, 4, 0, 0]);
    ctx.fill();

    // Value label
    ctx.fillStyle = isToday ? '#93c5fd' : 'rgba(155,163,192,0.7)';
    ctx.font = `${isToday ? 700 : 500} 10px Cairo, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(`${val}%`, x + barW / 2, y - 5);

    // Day label
    ctx.fillStyle = isToday ? '#e8eaf0' : 'rgba(107,116,148,0.9)';
    ctx.font = `${isToday ? 600 : 400} 9px Cairo, sans-serif`;
    ctx.fillText(labels[i] || '', x + barW / 2, H - 8);
  });
}

/* ============================
   RECENT PAYMENTS
   ============================ */
function renderRecentPayments(payments) {
  const list = document.getElementById('recentPaymentsList');
  if (!payments.length) { list.innerHTML = '<div class="loading-placeholder">لا توجد مدفوعات</div>'; return; }

  list.innerHTML = payments.map(p => {
    const icon = p.status === 'مدفوع' ? '✅' : p.status === 'جزئي' ? '🟡' : '❌';
    return `
      <div class="pay-row">
        <span class="pay-icon">${icon}</span>
        <div class="pay-info">
          <div class="pay-name">${p.child_name}</div>
          <div class="pay-meta">🏫 ${p.class} · 📅 ${p.month}</div>
        </div>
        <span class="pay-amount">${(p.amount||0).toLocaleString('ar-EG')} ج</span>
      </div>
    `;
  }).join('');
}

/* ============================
   INCIDENTS & NOTES
   ============================ */
function renderIncidents(items) {
  const list = document.getElementById('incidentsList');
  if (!items.length) { list.innerHTML = '<div class="loading-placeholder">لا توجد حوادث</div>'; return; }

  list.innerHTML = items.map(item => `
    <div class="incident-row">
      <span class="inc-icon">${item.icon}</span>
      <div class="inc-info">
        <div class="inc-name">${item.name} <span style="font-weight:400;color:var(--text-muted)">— ${item.class}</span></div>
        <div class="inc-meta">${item.text}</div>
      </div>
      <span style="font-size:0.68rem;color:var(--text-muted);white-space:nowrap">${item.time}</span>
    </div>
  `).join('');
}

/* ============================
   PAYMENT STATUS
   ============================ */
async function loadPaymentStatus() {
  fetchJSONP(APPS_SCRIPT_URL + '?action=getPaymentStatus', function(data) {
    if (data && data.paymentStatus) {
      renderPaymentStatus(data.paymentStatus);
    } else {
      renderPaymentStatus(DEMO_DATA.paymentStatus);
    }
  });
}


function renderPaymentStatus(items) {
  const list = document.getElementById('payStatusList');
  if (!items.length) { list.innerHTML = '<div class="loading-placeholder">لا توجد بيانات</div>'; return; }

  list.innerHTML = items.map(p => {
    const cls = p.status === 'مدفوع' ? 'ps-paid' : p.status === 'جزئي' ? 'ps-partial' : 'ps-unpaid';
    const icon = p.status === 'مدفوع' ? '✅' : p.status === 'جزئي' ? '🟡' : '❌';
    return `
      <div class="pay-status-row">
        <div class="pay-status-info">
          <div class="psi-name">${p.child_name}</div>
          <div class="psi-meta">🏫 ${p.class} · دفع ${(p.paid||0).toLocaleString('ar-EG')} من ${(p.total||0).toLocaleString('ar-EG')} ج</div>
        </div>
        <span class="pay-status-badge ${cls}">${icon} ${p.status}</span>
      </div>
    `;
  }).join('');
}

/* ============================
   REGISTER CHILD
   ============================ */
async function submitRegister() {
  const childName  = document.getElementById('regChildName').value.trim();
  const cls        = document.getElementById('regClass').value;
  const birthDate  = document.getElementById('regBirthDate').value;
  const gender     = document.querySelector('input[name="gender"]:checked')?.value;
  const parentName = document.getElementById('regParentName').value.trim();
  const phone      = document.getElementById('regPhone').value.trim();
  const fee        = parseFloat(document.getElementById('regFee').value);
  const payType    = document.querySelector('input[name="paymentType"]:checked')?.value;

  if (!childName)  return showToast('⚠️ أدخلي اسم الطفل', 'error');
  if (!cls)        return showToast('⚠️ اختاري الفصل', 'error');
  if (!parentName) return showToast('⚠️ أدخلي اسم ولي الأمر', 'error');
  if (!phone)      return showToast('⚠️ أدخلي رقم الهاتف', 'error');
  if (!fee || fee <= 0) return showToast('⚠️ أدخلي الرسوم الشهرية', 'error');

  const payload = {
    child_name:   childName,
    class:        cls,
    birth_date:   birthDate,
    gender,
    parent_name:  parentName,
    phone,
    fee,
    payment_type: payType,
  };

  const ok = await sendToWebhook(WEBHOOKS.register, payload);
  if (ok) {
    // Clear form
    ['regChildName','regParentName','regPhone','regFee','regBirthDate'].forEach(id => {
      document.getElementById(id).value = '';
    });
    document.getElementById('regClass').value = '';
  }
}

/* ============================
   PAYMENTS
   ============================ */
function buildPayChildSelect() {
  filterPayChildren();
}

function filterPayChildren() {
  const cls = document.getElementById('payClass').value;
  const sel = document.getElementById('payChild');
  const list = cls ? (LOCAL_CHILDREN[cls] || []) : ALL_CHILDREN;

  sel.innerHTML = '<option value="">— اختاري —</option>';
  list.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.child_id;
    opt.dataset.name = c.child_name;
    opt.dataset.class = c.class;
    opt.textContent = c.child_name + (cls ? '' : ` — ${c.class}`);
    sel.appendChild(opt);
  });
}

async function submitPayment() {
  const childSel = document.getElementById('payChild');
  const childId  = childSel.value;
  const amount   = parseFloat(document.getElementById('payAmount').value);
  const month    = document.getElementById('payMonth').value;

  if (!childId) return showToast('⚠️ اختاري الطفل أولاً', 'error');
  if (!amount || amount <= 0) return showToast('⚠️ أدخلي المبلغ', 'error');
  if (!month) return showToast('⚠️ اختاري الشهر', 'error');

  const opt = childSel.querySelector(`option[value="${childId}"]`);
  const childName = opt?.dataset.name || '';
  const cls = opt?.dataset.class || document.getElementById('payClass').value;

  const payload = {
    submission_id: `${cls.replace('-','')}-${month}-pay-${childId}-${uid()}`,
    timestamp: new Date().toISOString(),
    child_id: childId,
    child_name: childName,
    class: cls,
    amount_paid: amount,
    month,
  };

  const ok = await sendToWebhook(WEBHOOKS.payments, payload);
  if (ok) {
    document.getElementById('payAmount').value = '';
    document.getElementById('payChild').value = '';
    loadPaymentStatus();
  }
}

/* ============================
   HTTP HELPER
   ============================ */
async function sendToWebhook(url, payload) {
  showLoading(true);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    showLoading(false);
    if (res.ok) { showToast('✅ تم بنجاح!', 'success'); return true; }
    showToast('❌ خطأ في الإرسال', 'error'); return false;
  } catch (err) {
    showLoading(false);
    console.error(err);
    showToast('❌ تعذر الاتصال بالسيرفر', 'error');
    return false;
  }
}

/* ============================
   HELPERS
   ============================ */
function animNum(id, target) {
  const el = document.getElementById(id);
  const start = performance.now();
  const duration = 1200;
  function tick(now) {
    const p = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(2, -10 * p);
    el.textContent = Math.round(target * eased).toLocaleString('ar-EG');
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function showLoading(show) {
  document.getElementById('loadingOverlay').classList.toggle('show', show);
}

let toastTimer;
function showToast(msg, type = '') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show ' + type;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3200);
}

function fetchJSONP(url, callback) {
  const callbackName = 'cb_' + Math.random().toString(36).slice(2);
  const script = document.createElement('script');
  script.src = url + '&callback=' + callbackName;
  
  window[callbackName] = function(data) {
    delete window[callbackName];
    document.body.removeChild(script);
    callback(data);
  };
  
  script.onerror = function() {
    delete window[callbackName];
    document.body.removeChild(script);
    callback(null);
  };
  
  document.body.appendChild(script);
}

function uid() {
  return Math.random().toString(36).slice(2, 7);
}
