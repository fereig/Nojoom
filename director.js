/* director.js — لوحة المديرة | نجوم */

/* ============================
   IMPORTS
   ============================ */
import {
  getDashboard,
  getPaymentStatus,
  submitPayment    as dlSubmitPayment,
  registerChild    as dlRegisterChild,
} from './data-layer.js';

/* ============================
   STATE
   ============================ */
let allPaymentStatus = [];

/* ============================
   INIT
   ============================ */
document.addEventListener('DOMContentLoaded', () => {
  setTodayDate();
  setDefaultMonth();
  loadDashboard();
});

function setTodayDate() {
  const str = new Date().toLocaleDateString('ar-EG', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
  document.getElementById('todayDate').textContent = str;
}

function setDefaultMonth() {
  const now = new Date();
  const m = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
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

  if (tabId === 'payments') loadPaymentsTab();
}

/* ============================
   LOAD DASHBOARD
   ============================ */
async function loadDashboard() {
  document.querySelector('.refresh-btn')?.classList.add('spinning');

  try {
    const data = await getDashboard();
    document.querySelector('.refresh-btn')?.classList.remove('spinning');

    if (data && data.status === 'ok') {
      renderDashboard(data);
    } else {
      renderDashboardEmpty();
    }
  } catch (err) {
    console.error(err);
    document.querySelector('.refresh-btn')?.classList.remove('spinning');
    renderDashboardEmpty();
  }

  document.getElementById('lastUpdated').textContent =
    'آخر تحديث: ' + new Date().toLocaleTimeString('ar-EG');
}

function renderDashboard(d) {
  animNum('kpiTotal',   d.totalChildren  || 0);
  animNum('kpiPresent', d.presentToday   || 0);

  document.getElementById('kpiPayments').textContent =
    (d.collectedThisMonth || 0).toLocaleString('ar-EG') + ' ج';
  document.getElementById('kpiUnpaid').textContent = d.unpaidCount || 0;

  const pct = d.totalChildren
    ? Math.round((d.presentToday / d.totalChildren) * 100) : 0;
  document.getElementById('kpiPresentTrend').textContent = `${pct}% من الإجمالي`;
  document.getElementById('kpiPresentTrend').className   = 'kpi-trend ' + (pct >= 90 ? 'up' : 'down');

  document.getElementById('kpiTotalTrend').textContent    = 'طفل مسجل';
  document.getElementById('kpiPaymentsTrend').textContent = 'هذا الشهر';
  document.getElementById('kpiUnpaidTrend').textContent   = 'لم يدفعوا بعد';
  document.getElementById('kpiUnpaidTrend').className     = 'kpi-trend down';

  document.querySelectorAll('.kpi-card').forEach(c => c.classList.remove('skeleton'));

  renderClasses(d.classes            || []);
  renderChart(d.weeklyAttendance     || [], d.weekDays || []);
  renderRecentPayments(d.recentPayments || []);
  renderIncidents(d.recentIncidents  || []);
}

function renderDashboardEmpty() {
  ['kpiTotal', 'kpiPresent'].forEach(id => {
    document.getElementById(id).textContent = '—';
  });
  document.getElementById('kpiPayments').textContent = '—';
  document.getElementById('kpiUnpaid').textContent   = '—';
  document.querySelectorAll('.kpi-card').forEach(c => c.classList.remove('skeleton'));
  document.getElementById('classesList').innerHTML =
    '<div class="loading-placeholder">⚠️ تعذر تحميل البيانات</div>';
  document.getElementById('recentPaymentsList').innerHTML =
    '<div class="loading-placeholder">⚠️ تعذر تحميل البيانات</div>';
  document.getElementById('incidentsList').innerHTML =
    '<div class="loading-placeholder">⚠️ تعذر تحميل البيانات</div>';
}

/* ============================
   CLASSES
   ============================ */
function renderClasses(classes) {
  const list = document.getElementById('classesList');
  if (!classes.length) {
    list.innerHTML = '<div class="loading-placeholder">لا توجد بيانات حضور اليوم</div>';
    return;
  }
  list.innerHTML = classes.map(c => {
    const pct = c.total > 0 ? Math.round((c.present / c.total) * 100) : 0;
    const badgeClass = pct >= 90 ? 'badge-green' : pct >= 75 ? 'badge-amber' : 'badge-red';
    return `
      <div class="class-row">
        <div class="class-row-name">${c.name}</div>
        <div class="class-row-teacher">👩‍🏫 ${c.teacher || '—'}</div>
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
   CHART
   ============================ */
function renderChart(values, labels) {
  const canvas = document.getElementById('attendanceChart');
  const ctx    = canvas.getContext('2d');

  const dpr  = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width  = (rect.width || canvas.offsetWidth || 600) * dpr;
  canvas.height = 160 * dpr;
  ctx.scale(dpr, dpr);

  const W = canvas.width / dpr;
  const H = 160;
  const pad = { top: 20, bottom: 30, left: 10, right: 10 };
  const chartW = W - pad.left - pad.right;
  const chartH = H - pad.top - pad.bottom;

  ctx.clearRect(0, 0, W, H);

  const gap  = chartW / (values.length || 1);
  const barW = gap * 0.55;

  values.forEach((val, i) => {
    const x    = pad.left + i * gap + gap * 0.225;
    const barH = (val / 100) * chartH;
    const y    = pad.top + chartH - barH;
    const isToday = i === values.length - 1;

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

    ctx.fillStyle = isToday ? '#93c5fd' : 'rgba(155,163,192,0.7)';
    ctx.font      = `${isToday ? 700 : 500} 10px Cairo, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(`${val}%`, x + barW / 2, y - 5);

    ctx.fillStyle = isToday ? '#e8eaf0' : 'rgba(107,116,148,0.9)';
    ctx.font      = `${isToday ? 600 : 400} 9px Cairo, sans-serif`;
    ctx.fillText(labels[i] || '', x + barW / 2, H - 8);
  });
}

/* ============================
   RECENT PAYMENTS
   ============================ */
function renderRecentPayments(payments) {
  const list = document.getElementById('recentPaymentsList');
  if (!payments.length) {
    list.innerHTML = '<div class="loading-placeholder">لا توجد مدفوعات</div>';
    return;
  }
  list.innerHTML = payments.map(p => {
    const icon = p.status === 'مدفوع' ? '✅' : p.status === 'جزئي' ? '🟡' : '❌';
    return `
      <div class="pay-row">
        <span class="pay-icon">${icon}</span>
        <div class="pay-info">
          <div class="pay-name">${p.child_name}</div>
          <div class="pay-meta">🏫 ${p.class} · 📅 ${p.month}</div>
        </div>
        <span class="pay-amount">${(p.amount || 0).toLocaleString('ar-EG')} ج</span>
      </div>
    `;
  }).join('');
}

/* ============================
   INCIDENTS
   ============================ */
function renderIncidents(items) {
  const list = document.getElementById('incidentsList');
  if (!items.length) {
    list.innerHTML = '<div class="loading-placeholder">لا توجد حوادث</div>';
    return;
  }
  list.innerHTML = items.map(item => `
    <div class="incident-row">
      <span class="inc-icon">${item.icon}</span>
      <div class="inc-info">
        <div class="inc-name">${item.name}
          <span style="font-weight:400;color:var(--text-muted)">— ${item.class}</span>
        </div>
        <div class="inc-meta">${item.text}</div>
      </div>
      <span style="font-size:0.68rem;color:var(--text-muted);white-space:nowrap">${item.time}</span>
    </div>
  `).join('');
}

/* ============================
   PAYMENTS TAB
   ============================ */
async function loadPaymentsTab() {
  allPaymentStatus = [];

  document.getElementById('unpaidList').innerHTML =
    '<div class="loading-placeholder">⏳ جاري التحميل...</div>';
  document.getElementById('paidList').innerHTML   = '';
  document.getElementById('unpaidCount').textContent = '';
  document.getElementById('paidCount').textContent   = '';

  try {
    const data = await getPaymentStatus();
    if (Array.isArray(data)) {
      allPaymentStatus = data;
    } else if (data && data.paymentStatus) {
      allPaymentStatus = data.paymentStatus;
    }
    const search = (document.getElementById('paySearch')?.value || '').trim();
    if (search) {
      filterPaymentStatus();
    } else {
      document.getElementById('unpaidList').innerHTML =
        '<div class="loading-placeholder">🔍 ابحث عن طفل لعرض حالته</div>';
    }
  } catch (err) {
    console.error(err);
    document.getElementById('unpaidList').innerHTML =
      '<div class="loading-placeholder">⚠️ تعذر تحميل البيانات</div>';
  }
}

/* ============================
   SEARCH — اختيار طفل للدفع
   ============================ */
function searchPayChild() {
  const input = document.getElementById('payChildSearch');
  const q     = input.value.trim();
  const box   = document.getElementById('payChildSuggestions');

  if (q.length < 2) { box.style.display = 'none'; return; }

  if (!allPaymentStatus.length) {
    loadPaymentsTab();
    return;
  }

 const matches = allPaymentStatus.filter(p => {
  const nameParts = p.child_name.split(' ');
  const searchParts = q.split(' ').filter(w => w.length > 0);
  return searchParts.every(sword =>
    nameParts.some(nword => nword.startsWith(sword))
  );
}).slice(0, 6);
  if (!matches.length) { box.style.display = 'none'; return; }

  const rect = input.getBoundingClientRect();
  box.style.top   = (rect.bottom + 4) + 'px';
  box.style.right = (window.innerWidth - rect.right) + 'px';
  box.style.width = rect.width + 'px';

  box.innerHTML = matches.map(p => `
    <div onclick="selectChild('${p.child_id}','${p.child_name}','${p.class}')"
      style="padding:12px 16px;cursor:pointer;border-bottom:1px solid rgba(255,255,255,0.05);font-family:Cairo,sans-serif;font-size:0.9rem">
      ${p.child_name}
      <span style="color:rgba(255,255,255,0.4);font-size:0.78rem"> — ${p.class}</span>
    </div>
  `).join('');

  box.style.display = 'block';
}

function selectChild(id, name, cls) {
  document.getElementById('payChildSearch').value     = name;
  document.getElementById('payChildSuggestions').style.display = 'none';
  const btn             = document.getElementById('paySubmitBtn');
  btn.dataset.childId   = id;
  btn.dataset.childName = name;
  btn.dataset.class     = cls;
  btn.disabled          = false;
  btn.style.opacity     = '1';
}

/* ============================
   FILTER — حالة تحصيل الشهر
   ============================ */
function filterPaymentStatus() {
  const search = (document.getElementById('paySearch')?.value || '').trim();

  if (!search) {
    document.getElementById('unpaidList').innerHTML =
      '<div class="loading-placeholder">🔍 ابحث عن طفل لعرض حالته</div>';
    document.getElementById('paidList').innerHTML   = '';
    document.getElementById('unpaidCount').textContent = '';
    document.getElementById('paidCount').textContent   = '';
    return;
  }

 const filtered = allPaymentStatus.filter(p => {
  const nameParts = p.child_name.split(' ');
  const searchParts = search.split(' ').filter(w => w.length > 0);
  return searchParts.every(sword =>
    nameParts.some(nword => nword.startsWith(sword))
  );
});
  const unpaid   = filtered.filter(p => p.status !== 'مدفوع');
  const paid     = filtered.filter(p => p.status === 'مدفوع');

  document.getElementById('unpaidCount').textContent = `(${unpaid.length})`;
  document.getElementById('paidCount').textContent   = `(${paid.length})`;

  if (unpaid.length) {
    document.getElementById('unpaidList').innerHTML = unpaid.map(p => `
      <div class="pay-status-row" onclick="selectChild('${p.child_id}','${p.child_name}','${p.class}')"
        style="cursor:pointer" id="psr-${p.child_id}">
        <div class="pay-status-info">
          <div class="psi-name">${p.child_name}</div>
          <div class="psi-meta">
            🏫 ${p.class} ·
            دفع ${(p.paid || 0).toLocaleString('ar-EG')} ج ·
            متبقي ${(p.remaining || 0).toLocaleString('ar-EG')} ج
          </div>
        </div>
        <span class="pay-status-badge ${p.status === 'جزئي' ? 'ps-partial' : 'ps-unpaid'}">
          ${p.status === 'جزئي' ? '🟡 جزئي' : '❌ لم يدفع'}
        </span>
      </div>
    `).join('');
  } else {
    document.getElementById('unpaidList').innerHTML =
      '<div class="loading-placeholder">✅ لا يوجد متأخرين</div>';
  }

  if (paid.length) {
    document.getElementById('paidList').innerHTML = paid.map(p => `
      <div class="pay-status-row">
        <div class="pay-status-info">
          <div class="psi-name">${p.child_name}</div>
          <div class="psi-meta">🏫 ${p.class} · ✅ ${(p.paid || 0).toLocaleString('ar-EG')} ج</div>
        </div>
        <span class="pay-status-badge ps-paid">✅ مدفوع</span>
      </div>
    `).join('');
  } else {
    document.getElementById('paidList').innerHTML =
      '<div class="loading-placeholder">لا يوجد</div>';
  }
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

  if (!childName)       return showToast('⚠️ أدخلي اسم الطفل', 'error');
  if (!cls)             return showToast('⚠️ اختاري الفصل', 'error');
  if (!parentName)      return showToast('⚠️ أدخلي اسم ولي الأمر', 'error');
  if (!phone)           return showToast('⚠️ أدخلي رقم الهاتف', 'error');
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

  showLoading(true);
  const result = await dlRegisterChild(payload);
  showLoading(false);

  if (result && result.ok) {
    showToast('✅ تم تسجيل الطفل بنجاح!', 'success');
    ['regChildName', 'regParentName', 'regPhone', 'regFee', 'regBirthDate']
      .forEach(id => { document.getElementById(id).value = ''; });
    document.getElementById('regClass').value = '';
  } else if (result && result.duplicate) {
    showToast('⚠️ ' + result.message, 'error');
  } else {
    showToast('❌ تعذر الاتصال', 'error');
  }
}

/* ============================
   SUBMIT PAYMENT
   ============================ */
async function submitPayment() {
  const btn       = document.getElementById('paySubmitBtn');
  const childId   = btn.dataset.childId;
  const childName = btn.dataset.childName;
  const cls       = btn.dataset.class;
  const amount    = parseFloat(document.getElementById('payAmount').value);
  const month     = document.getElementById('payMonth').value;

  if (!childId)               return showToast('⚠️ اختاري الطفل من القائمة أولاً', 'error');
  if (!amount || amount <= 0) return showToast('⚠️ أدخلي المبلغ', 'error');
  if (!month)                 return showToast('⚠️ اختاري الشهر', 'error');

  const payload = {
    submission_id: `${cls.replace(/\s/g, '')}-${month}-pay-${childId}-${uid()}`,
    timestamp:     new Date().toISOString(),
    child_id:      childId,
    child_name:    childName,
    class:         cls,
    amount_paid:   amount,
    month,
  };

  showLoading(true);
  const result = await dlSubmitPayment(payload);
  showLoading(false);

  if (result && !result.duplicate) {
    showToast('✅ تم تسجيل الدفعة بنجاح!', 'success');
    document.getElementById('payAmount').value = '';
    document.getElementById('payChildSearch').value = '';
    btn.disabled      = true;
    btn.style.opacity = '0.5';
    btn.textContent   = '💰 تسجيل الدفعة';
    delete btn.dataset.childId;
    delete btn.dataset.childName;
    delete btn.dataset.class;
    loadPaymentsTab();
  } else if (result && result.duplicate) {
    showToast('⚠️ ' + result.message, 'error');
  } else {
    showToast('❌ تعذر الاتصال', 'error');
  }
}

/* ============================
   HELPERS
   ============================ */
function animNum(id, target) {
  const el       = document.getElementById(id);
  const start    = performance.now();
  const duration = 1200;
  function tick(now) {
    const p     = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(2, -10 * p);
    el.textContent = Math.round(target * eased).toLocaleString('ar-EG');
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function showLoading(show) {
  const el = document.getElementById('loadingOverlay');
  if (el) el.classList.toggle('show', show);
}

let toastTimer;
function showToast(msg, type = '') {
  const t       = document.getElementById('toast');
  t.textContent = msg;
  t.className   = 'toast show ' + type;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3200);
}

function uid() {
  return Math.random().toString(36).slice(2, 7);
}

/* ============================
   EXPOSE GLOBALS (للـ HTML onclick)
   ============================ */
window.switchTab           = switchTab;
window.loadDashboard       = loadDashboard;
window.filterPaymentStatus = filterPaymentStatus;
window.searchPayChild      = searchPayChild;
window.selectChild         = selectChild;
window.submitRegister      = submitRegister;
window.submitPayment       = submitPayment;
