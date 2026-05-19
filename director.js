/* director.js — لوحة المديرة */

/* ============================
   CONFIG
   ============================ */
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwET2jd8CtgKvozjNdab7st4GkD8roSqKnY30KyuUzRVpiDcSXTRIBUv0TKfjwwlv_BiQ/exec';
/* ============================
   JSONP HELPER
   ============================ */
function fetchJSONP(url, callback) {
  const callbackName = 'cb_' + Math.random().toString(36).slice(2);
  const script = document.createElement('script');
  script.src = url + '&callback=' + callbackName;

  const timeout = setTimeout(() => {
    delete window[callbackName];
    if (document.body.contains(script)) document.body.removeChild(script);
    console.warn('JSONP timeout:', url);
    callback(null);
  }, 20000);

  window[callbackName] = function(data) {
    clearTimeout(timeout);
    delete window[callbackName];
    if (document.body.contains(script)) document.body.removeChild(script);
    callback(data);
  };

  script.onerror = function() {
    clearTimeout(timeout);
    delete window[callbackName];
    if (document.body.contains(script)) document.body.removeChild(script);
    console.warn('JSONP error:', url);
    callback(null);
  };

  document.body.appendChild(script);
}



function filterPayChildren() {
  loadPayChildren();
}
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

  if (tabId === 'payments') {
    loadPaymentsTab();
  }
}

/* ============================
   LOAD DASHBOARD
   ============================ */
function loadDashboard(retryCount = 0) {
  document.querySelector('.refresh-btn')?.classList.add('spinning');

  fetchJSONP(APPS_SCRIPT_URL + '?action=getDashboard', function(data) {
    document.querySelector('.refresh-btn')?.classList.remove('spinning');
    
    if (data && data.status === 'ok') {
      renderDashboard(data);
    } else if (retryCount < 3) {
      // ✅ retry تلقائي بعد ثانيتين
      setTimeout(() => loadDashboard(retryCount + 1), 3000);
      return;
    } else {
      renderDashboardEmpty();
    }
    
    document.getElementById('lastUpdated').textContent =
      'آخر تحديث: ' + new Date().toLocaleTimeString('ar-EG');
  });
}

function renderDashboard(d) {
  animNum('kpiTotal',   d.totalChildren        || 0);
  animNum('kpiPresent', d.presentToday         || 0);

  document.getElementById('kpiPayments').textContent =
    (d.collectedThisMonth || 0).toLocaleString('ar-EG') + ' ج';
  document.getElementById('kpiUnpaid').textContent = d.unpaidCount || 0;

  const pct = d.totalChildren
    ? Math.round((d.presentToday / d.totalChildren) * 100)
    : 0;
  document.getElementById('kpiPresentTrend').textContent = `${pct}% من الإجمالي`;
  document.getElementById('kpiPresentTrend').className   = 'kpi-trend ' + (pct >= 90 ? 'up' : 'down');

  document.getElementById('kpiTotalTrend').textContent    = 'طفل مسجل';
  document.getElementById('kpiPaymentsTrend').textContent = 'هذا الشهر';
  document.getElementById('kpiUnpaidTrend').textContent   = 'لم يدفعوا بعد';
  document.getElementById('kpiUnpaidTrend').className     = 'kpi-trend down';

  document.querySelectorAll('.kpi-card').forEach(c => c.classList.remove('skeleton'));

  renderClasses(d.classes              || []);
  renderChart(d.weeklyAttendance       || [], d.weekDays || []);
  renderRecentPayments(d.recentPayments || []);
  renderIncidents(d.recentIncidents    || []);
}

function renderDashboardEmpty() {
  ['kpiTotal','kpiPresent'].forEach(id => {
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
  const pad = { top:20, bottom:30, left:10, right:10 };
  const chartW = W - pad.left - pad.right;
  const chartH = H - pad.top  - pad.bottom;

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
    ctx.roundRect(x, y, barW, barH, [4,4,0,0]);
    ctx.fill();

    ctx.fillStyle  = isToday ? '#93c5fd' : 'rgba(155,163,192,0.7)';
    ctx.font       = `${isToday ? 700 : 500} 10px Cairo, sans-serif`;
    ctx.textAlign  = 'center';
    ctx.fillText(`${val}%`, x + barW / 2, y - 5);

    ctx.fillStyle  = isToday ? '#e8eaf0' : 'rgba(107,116,148,0.9)';
    ctx.font       = `${isToday ? 600 : 400} 9px Cairo, sans-serif`;
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
        <span class="pay-amount">${(p.amount||0).toLocaleString('ar-EG')} ج</span>
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
   PAYMENTS TAB — تحميل الأطفال
   ============================ */
function loadPaymentsTab() {
  const cls = document.getElementById('payClass').value;
  const sel = document.getElementById('payChild');
  sel.innerHTML = '<option value="">⏳ جاري التحميل...</option>';
  document.getElementById('payStatusList').innerHTML =
    '<div class="loading-placeholder">⏳ جاري التحميل...</div>';

  const url = `${APPS_SCRIPT_URL}?action=getPaymentsTab` +
    (cls ? `&class=${encodeURIComponent(cls)}` : '');

  fetchJSONP(url, function(data) {
    // أطفال
    sel.innerHTML = '<option value="">— اختاري —</option>';
    if (data && data.children && data.children.length) {
      data.children.forEach(c => {
        const opt = document.createElement('option');
        opt.value         = c.child_id;
        opt.dataset.name  = c.child_name;
        opt.dataset.class = c.class;
        opt.textContent   = c.child_name + (cls ? '' : ` — ${c.class}`);
        sel.appendChild(opt);
      });
    } else {
      sel.innerHTML = '<option value="">⚠️ تعذر تحميل الأطفال</option>';
    }

    // حالة الدفع
    if (data && data.paymentStatus) {
      renderPaymentStatus(data.paymentStatus);
    } else {
      document.getElementById('payStatusList').innerHTML =
        '<div class="loading-placeholder">⚠️ تعذر تحميل البيانات</div>';
    }
  });
}

function filterPayChildren() {
  loadPaymentsTab();
}

function loadPaymentStatus() {
  loadPaymentsTab();
}

function renderPaymentStatus(items) {
  const list = document.getElementById('payStatusList');
  if (!items.length) {
    list.innerHTML = '<div class="loading-placeholder">لا توجد بيانات</div>';
    return;
  }
  list.innerHTML = items.map(p => {
    const cls  = p.status === 'مدفوع' ? 'ps-paid' : p.status === 'جزئي' ? 'ps-partial' : 'ps-unpaid';
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

  if (!childName)       return showToast('⚠️ أدخلي اسم الطفل', 'error');
  if (!cls)             return showToast('⚠️ اختاري الفصل', 'error');
  if (!parentName)      return showToast('⚠️ أدخلي اسم ولي الأمر', 'error');
  if (!phone)           return showToast('⚠️ أدخلي رقم الهاتف', 'error');
  if (!fee || fee <= 0) return showToast('⚠️ أدخلي الرسوم الشهرية', 'error');

  const payload = {
    action: 'RegisterChild',
    payload: {
      child_name:   childName,
      class:        cls,
      birth_date:   birthDate,
      gender,
      parent_name:  parentName,
      phone,
      fee,
      payment_type: payType,
    }
  };

  const ok = await sendToAppsScript(payload);
  if (ok) {
    ['regChildName','regParentName','regPhone','regFee','regBirthDate']
      .forEach(id => { document.getElementById(id).value = ''; });
    document.getElementById('regClass').value = '';
  }
}

/* ============================
   SUBMIT PAYMENT
   ============================ */
async function submitPayment() {
  const childSel = document.getElementById('payChild');
  const childId  = childSel.value;
  const amount   = parseFloat(document.getElementById('payAmount').value);
  const month    = document.getElementById('payMonth').value;

  if (!childId)             return showToast('⚠️ اختاري الطفل أولاً', 'error');
  if (!amount || amount<=0) return showToast('⚠️ أدخلي المبلغ', 'error');
  if (!month)               return showToast('⚠️ اختاري الشهر', 'error');

  const opt       = childSel.querySelector(`option[value="${childId}"]`);
  const childName = opt?.dataset.name  || '';
  const cls       = opt?.dataset.class || document.getElementById('payClass').value;

  const payload = {
    action: 'Payments',
    payload: {
      submission_id: `${cls.replace(/\s/g,'')}-${month}-pay-${childId}-${uid()}`,
      timestamp:     new Date().toISOString(),
      child_id:      childId,
      child_name:    childName,
      class:         cls,
      amount_paid:   amount,
      month,
    }
  };

  const ok = await sendToAppsScript(payload);
  if (ok) {
    document.getElementById('payAmount').value = '';
    document.getElementById('payChild').value  = '';
    loadPaymentStatus();
  }
}

/* ============================
   HTTP HELPER — Apps Script
   ============================ */
async function sendToAppsScript(payload) {
  showLoading(true);
  try {
    const res = await fetch(APPS_SCRIPT_URL, {
      method:   'POST',
      redirect: 'follow',
      headers:  { 'Content-Type': 'text/plain' },  // ← غيري من application/json
      body:     JSON.stringify(payload),
    });

    showLoading(false);
    let data = null;
    try { data = await res.json(); } catch(_) {}

    if (data && data.status === 'duplicate') {
      showToast('⚠️ ' + data.message, 'error');
      return false;
    }
    if (data && data.status === 'ok') {
      showToast('✅ تم بنجاح!', 'success');
      return true;
    }
    showToast('✅ تم بنجاح!', 'success');
    return true;

  } catch(err) {
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
  document.getElementById('loadingOverlay').classList.toggle('show', show);
}

let toastTimer;
function showToast(msg, type = '') {
  const t    = document.getElementById('toast');
  t.textContent = msg;
  t.className   = 'toast show ' + type;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3200);
}

function uid() {
  return Math.random().toString(36).slice(2, 7);
}
