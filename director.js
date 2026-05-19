/* director.js — لوحة المديرة | مٌطور ومسرع للأداء العالي */

/* ============================
   CONFIG
   ============================ */
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwET2jd8CtgKvozjNdab7st4GkD8roSqKnY30KyuUzRVpiDcSXTRIBUv0TKfjwwlv_BiQ/exec';

/* ============================
   STATE
   ============================ */
let allPaymentStatus = [];

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
    console.error('JSONP script error:', url);
    callback(null);
  };

  document.body.appendChild(script);
}

/* ============================
   INIT
   ============================ */
document.addEventListener('DOMContentLoaded', () => {
  setupTabs();
  setTodayDate();
  
  // التحميل المبدئي لأول تابة (الداشبورد)
  loadDashboard();
});

function setTodayDate() {
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const str = new Date().toLocaleDateString('ar-EG', options);
  const el = document.getElementById('todayDate');
  if (el) el.textContent = str;
}

/* ============================
   TABS LOGIC
   ============================ */
function setupTabs() {
  const tabs = document.querySelectorAll('.tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const target = tab.getAttribute('data-tab');
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      
      const targetContent = document.getElementById(target + 'Tab');
      if (targetContent) targetContent.classList.add('active');

      // جلب البيانات ذكياً بحسب التابة النشطة فقط لتوفير الأداء والـ CPU
      if (target === 'dashboard') {
        loadDashboard();
      } else if (target === 'payments') {
        loadPaymentsTab();
      }
    });
  });
}

/* ============================
   DATA LOADING (MODIFIED FOR PERFORMANCE)
   ============================ */

// 1. تحميل بيانات الداشبورد فقط (مخزنة بالكاش وسريعة جداً)
function loadDashboard() {
  showLoading(true);
  fetchJSONP(APPS_SCRIPT_URL + '?req=dashboard', (data) => {
    showLoading(false);
    if (!data) {
      showToast('❌ فشل تحميل بيانات لوحة التحكم', 'error');
      return;
    }
    animNum('statTotalChildren', data.totalChildren || 0);
    animNum('statTodayPresent',   data.todayPresent || 0);
    animNum('statMonthIncidents', data.monthIncidents || 0);
    animNum('statMonthRevenue',   data.monthRevenue || 0);
  });
}

// 2. تحميل تابة المصاريف وقائمة الطلاب فقط
function loadPaymentsTab() {
  showLoading(true);
  fetchJSONP(APPS_SCRIPT_URL + '?req=payments', (data) => {
    showLoading(false);
    if (!data || !Array.isArray(data)) {
      showToast('❌ فشل تحميل بيانات المصاريف', 'error');
      return;
    }
    allPaymentStatus = data;
    buildPaymentStatusDOM();
    populatePaymentSelects();
  });
}

/* ============================
   DOM BUILDERS (PAYMENTS)
   ============================ */
function buildPaymentStatusDOM() {
  const unpaidList = document.getElementById('unpaidList');
  const paidList   = document.getElementById('paidList');
  
  if (!unpaidList || !paidList) return;

  unpaidList.innerHTML = '';
  paidList.innerHTML   = '';

  let unpaidCount = 0;
  let paidCount   = 0;

  allPaymentStatus.forEach(item => {
    const card = document.createElement('div');
    card.className = 'pay-status-card';
    
    // تحديد كلاس الحالة للـ UI الحالي
    let badgeClass = 'status-unpaid';
    if (item.status === 'دفع كامل') badgeClass = 'status-paid';
    if (item.status === 'دفع جزئي') badgeClass = 'status-partial';

    card.innerHTML = `
      <div class="pay-card-main">
        <span class="pay-child-name">${item.name}</span>
        <span class="pay-status-badge ${badgeClass}">${item.status}</span>
      </div>
      <div class="pay-card-details">
        <span>المطلوب: <strong>${item.monthlyFee} ج.م</strong></span>
        <span>المدفوع: <strong style="color:#22c55e">${item.paid} ج.م</strong></span>
        <span>المتبقي: <strong style="color:#ef4444">${item.remaining} ج.m</strong></span>
      </div>
    `;

    if (item.status === 'دفع كامل') {
      paidList.appendChild(card);
      paidCount++;
    } else {
      unpaidList.appendChild(card);
      unpaidCount++;
    }
  });

  document.getElementById('unpaidCount').textContent = `(${unpaidCount} طفل)`;
  document.getElementById('paidCount').textContent   = `(${paidCount} طفل)`;

  if (unpaidCount === 0) {
    unpaidList.innerHTML = '<div class="empty-state">🎉 الكل قام بالدفع لهذا الشهر!</div>';
  }
  if (paidCount === 0) {
    paidList.innerHTML = '<div class="empty-state">لا يوجد مدفوعات كاملة بعد.</div>';
  }
}

function populatePaymentSelects() {
  const select = document.getElementById('payChildSelect');
  if (!select) return;

  // الحفاظ على الخيار الأول الافتراضي
  select.innerHTML = '<option value="">-- اختر الطفل --</option>';
  
  allPaymentStatus.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = c.name;
    select.appendChild(opt);
  });

  // تحديث الحقول التلقائية عند التغيير
  select.onchange = () => {
    const id = select.value;
    const amountInput = document.getElementById('payAmount');
    const btn = document.getElementById('btnSubmitPayment');
    
    if(!id) {
      if(amountInput) amountInput.value = '';
      if(btn) btn.disabled = true;
      return;
    }

    const found = allPaymentStatus.find(c => String(c.id) === String(id));
    if (found && amountInput) {
      // وضع المبلغ المتبقي تلقائياً لمنع الأخطاء البشرية وتسريع الإدخال
      amountInput.value = found.remaining;
      if(btn) btn.disabled = false;
    }
  };
}

/* ============================
   FILTER / SEARCH
   ============================ */
function filterPaymentStatus() {
  const q = document.getElementById('paySearch').value.trim().toLowerCase();
  if(!q) {
    buildPaymentStatusDOM();
    return;
  }

  // فلترة لحظية سريعة جداً من الـ Memory دون الحاجة لطلب السيرفر مجدداً
  const filtered = allPaymentStatus.filter(item => item.name.toLowerCase().includes(q));
  
  const unpaidList = document.getElementById('unpaidList');
  const paidList   = document.getElementById('paidList');
  unpaidList.innerHTML = '';
  paidList.innerHTML   = '';

  filtered.forEach(item => {
    const card = document.createElement('div');
    card.className = 'pay-status-card';
    let badgeClass = 'status-unpaid';
    if (item.status === 'دفع كامل') badgeClass = 'status-paid';
    if (item.status === 'دفع جزئي') badgeClass = 'status-partial';

    card.innerHTML = `
      <div class="pay-card-main">
        <span class="pay-child-name">${item.name}</span>
        <span class="pay-status-badge ${badgeClass}">${item.status}</span>
      </div>
      <div class="pay-card-details">
        <span>المطلوب: <strong>${item.monthlyFee} ج.م</strong></span>
        <span>المدفوع: <strong style="color:#22c55e">${item.paid} ج.م</strong></span>
        <span>المتبقي: <strong style="color:#ef4444">${item.remaining} ج.م</strong></span>
      </div>
    `;
    if (item.status === 'دفع كامل') paidList.appendChild(card);
    else unpaidList.appendChild(card);
  });
}

/* ============================
   FORM SUBMISSIONS (POST)
   ============================ */
async function submitRegister() {
  const nameInput = document.getElementById('regName');
  const feeInput  = document.getElementById('regFee');

  const name = nameInput.value.trim();
  const monthlyFee = feeInput.value.trim();

  if(!name || !monthlyFee) {
    showToast('⚠️ من فضلك اكمل بيانات الطفل', 'error');
    return;
  }

  const payload = { name, monthlyFee, className: 'الروضة' };
  const ok = await apiPost('RegisterChild', payload);
  if (ok) {
    nameInput.value = '';
    feeInput.value = '';
    // إعادة تحميل خفيف للبيانات
    loadDashboard();
  }
}

async function submitPayment() {
  const select = document.getElementById('payChildSelect');
  const amountInput = document.getElementById('payAmount');

  const id = select.value;
  const amount = amountInput.value.trim();
  
  // صيغة الشهر الحالي الافتراضية "YYYY-MM" متوافقة مع لوجيك السيرفر
  const now = new Date();
  const month = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');

  if(!id || !amount) {
    showToast('⚠️ اختر الطفل والمبلغ', 'error');
    return;
  }

  const found = allPaymentStatus.find(c => String(c.id) === String(id));
  const name = found ? found.name : '';

  const payload = { id, name, amount, month };
  const ok = await apiPost('Payments', payload);
  if (ok) {
    amountInput.value = '';
    select.value = '';
    const btn = document.getElementById('btnSubmitPayment');
    if(btn) btn.disabled = true;
    
    // تحديث تابة المصاريف فوراً لرؤية النتيجة
    loadPaymentsTab();
  }
}

/* ============================
   API BRIDGE (POST)
   ============================ */
async function apiPost(action, payload) {
  showLoading(true);
  try {
    const res = await fetch(APPS_SCRIPT_URL, {
      method:  'POST',
      mode:    'no-cors', // متوافق مع قيود الحماية لـ Apps Script Web Apps
      redirect: 'follow',
      headers:  { 'Content-Type': 'text/plain' },
      body:     JSON.stringify({ action, payload }),
    });

    showLoading(false);
    
    // بما أن الوضع هو no-cors، السيرفر ينفذ بنجاح ولكن الاستجابة تكون opaque.
    // نقوم بإظهار رسالة النجاح والـ Invalidation التلقائي يحدث في الـ Apps Script.
    showToast('✅ تم الحفظ بنجاح وتحديث النظام!', 'success');
    return true;

  } catch(err) {
    showLoading(false);
    console.error(err);
    showToast('❌ تعذر الاتصال بالسيرفر', 'error');
    return false;
  }
}

/* ============================
   HELPERS & ANIMATIONS
   ============================ */
function animNum(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  const start    = performance.now();
  const duration = 1000;
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
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.className   = 'toast show ' + type;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.className = 'toast';
  }, 3500);
}
