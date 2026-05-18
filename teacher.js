/* teacher.js — واجهة المعلمة | نسخة مُصلَحة */

/* ============================
   CONFIG
   ============================ */

// Apps Script — مصدر بيانات الأطفال والـ webhooks
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx3A1Q8h8VCPd8k3CYPffM7rbVXtbe6_UpFu6z5m_AMrhb8wif0tVSSY-pofy9uahlVVQ/exec';

// n8n webhooks — غيري N8N_BASE لما تنشري على VPS
const N8N_BASE = 'https://chomp-phonebook-evict.ngrok-free.dev/webhook';
const WEBHOOKS = {
  attendance:  `${N8N_BASE}/Attendance`,
  checkout:    `${N8N_BASE}/Checkout`,
  notes:       `${N8N_BASE}/Notes`,
  incidents:   `${N8N_BASE}/Incidents`,
  assessments: `${N8N_BASE}/Assessments`,
};

/* ============================
   SUBJECTS
   ============================ */
const SUBJECTS = {
  arabic_letters:  { label: 'اللغة العربية — الحروف',   skills: ['ذكر الحرف', 'كتابته', 'تمكينه'] },
  arabic_harakat:  { label: 'اللغة العربية — الحركات',  skills: ['الفتح', 'الضم', 'الكسر', 'المدود'] },
  math:            { label: 'الحساب',                    skills: ['ذكر الرقم', 'كتابته', 'العد'] },
  english:         { label: 'الإنجليزي',                 skills: ['ذكر الحرف', 'كتابته', 'تطبيقه'] },
  islamic:         { label: 'التربية الإسلامية',         skills: ['قرآن', 'حديث', 'أذكار وأدعية'] },
};

/* ============================
   STATE
   — مفيش حاجة بتتحفظ في localStorage غير إعدادات الجهاز لو احتجنا
   — teacherName و className بيتدخلوا من المودال كل جلسة
   ============================ */
let teacherName = '';
let className   = '';
let children    = []; // بيتملى من Apps Script

let attendanceState   = {}; // child_id → 'present' | 'absent'
let selectedNoteType  = 'سلوك';
let selectedSeverity  = 'متوسط';
let selectedSubject   = 'arabic_letters';
let assessmentRatings = {}; // child_id → { skill → rating }

/* ============================
   INIT
   ============================ */
document.addEventListener('DOMContentLoaded', () => {
  setTodayDate();
  // المودال يظهر دايماً عند كل فتح جديد للصفحة
  showSetupModal();
});

function setTodayDate() {
  const now = new Date();
  const opts = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const str  = now.toLocaleDateString('ar-EG', opts);
  document.getElementById('todayDate').textContent = str;
  document.getElementById('attendanceDateBadge').textContent = str;
}

/* ============================
   SETUP MODAL
   — يظهر كل مرة تفتح فيها الصفحة (مفيش localStorage للاسم)
   ============================ */
function showSetupModal() {
  document.getElementById('setupModal').classList.remove('hidden');
  // مسح أي قيم قديمة عشان ما تظهرش
  document.getElementById('setupTeacher').value = '';
  document.getElementById('setupClass').value   = 'KG1-A';
}

async function saveSetup() {
  const t = document.getElementById('setupTeacher').value.trim();
  const c = document.getElementById('setupClass').value;

  if (!t) { showToast('⚠️ أدخلي اسمك أولاً', 'error'); return; }

  teacherName = t;
  className   = c;

  document.getElementById('teacherNameDisplay').textContent = teacherName;
  document.getElementById('classNameDisplay').textContent   = className;
  document.getElementById('setupModal').classList.add('hidden');

  // جيبي الأطفال من الشيت بعد ما نعرف الفصل
  await loadChildrenFromSheet(className);
}

/* ============================
   LOAD CHILDREN FROM APPS SCRIPT
   ============================ */
async function loadChildrenFromSheet(cls) {
  showLoading(true);

  try {
    // Apps Script بيستقبل ?action=getChildren&class=KG1-A
    const url = `${APPS_SCRIPT_URL}?action=getChildren&class=${encodeURIComponent(cls)}`;
    const res = await fetch(url);

    if (!res.ok) throw new Error('HTTP ' + res.status);

    const data = await res.json();

    // المفروض يرجع { children: [{child_id, child_name}, ...] }
    if (data && Array.isArray(data.children)) {
      children = data.children;
    } else {
      throw new Error('بيانات غير صحيحة من السيرفر');
    }

  } catch (err) {
    console.error('loadChildren error:', err);
    showToast('⚠️ تعذر تحميل بيانات الأطفال — تحققي من الاتصال', 'error');
    children = []; // فاضي عشان متشتغلش ببيانات غلط
  }

  showLoading(false);
  initAll();
}

function initAll() {
  buildAttendanceGrid();
  buildChildSelects();
  buildAssessmentGrid();
}

/* ============================
   TABS
   ============================ */
function switchTab(tabId, btn) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.getElementById('tab-' + tabId).classList.add('active');
  btn.classList.add('active');
}

/* ============================
   ATTENDANCE
   ============================ */
function buildAttendanceGrid() {
  const grid = document.getElementById('attendanceGrid');
  grid.innerHTML = '';
  attendanceState = {};

  if (children.length === 0) {
    grid.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:2rem;grid-column:1/-1">لا يوجد أطفال في هذا الفصل</p>';
    updateAttendanceSummary();
    return;
  }

  // الكل حاضر بالـ default
  children.forEach(c => { attendanceState[c.child_id] = 'present'; });

  children.forEach(child => {
    const card = document.createElement('div');
    card.className = 'child-card present';
    card.dataset.id = child.child_id;
    card.innerHTML = `
      <div class="child-avatar">👤</div>
      <span class="child-name">${child.child_name}</span>
      <span class="child-status-icon">✅</span>
    `;
    card.addEventListener('click', () => toggleAttendance(child.child_id, card));
    grid.appendChild(card);
  });

  updateAttendanceSummary();
}

function toggleAttendance(childId, card) {
  if (attendanceState[childId] === 'present') {
    attendanceState[childId] = 'absent';
    card.className = 'child-card absent';
    card.querySelector('.child-status-icon').textContent = '❌';
  } else {
    attendanceState[childId] = 'present';
    card.className = 'child-card present';
    card.querySelector('.child-status-icon').textContent = '✅';
  }
  updateAttendanceSummary();
}

function updateAttendanceSummary() {
  const vals    = Object.values(attendanceState);
  const present = vals.filter(s => s === 'present').length;
  const absent  = vals.filter(s => s === 'absent').length;
  document.getElementById('presentCount').textContent = present;
  document.getElementById('absentCount').textContent  = absent;
}

async function submitAttendance() {
  if (children.length === 0) return showToast('⚠️ لا يوجد أطفال لإرسال الحضور', 'error');

  const present = children.filter(c => attendanceState[c.child_id] === 'present');
  const absent  = children.filter(c => attendanceState[c.child_id] === 'absent');
  const today   = todayISO();

  const payload = {
    submission_id: `${className.replace('-','')}-${today}-${teacherName.replace(/\s/g,'')}-${uid()}`,
    timestamp: new Date().toISOString(),
    date: today,
    class: className,
    teacher: teacherName,
    present: present.map(c => ({ child_id: c.child_id, child_name: c.child_name })),
    absent:  absent.map(c => ({ child_id: c.child_id, child_name: c.child_name })),
  };

  await sendToWebhook(WEBHOOKS.attendance, payload);
}

/* ============================
   CHECKOUT
   ============================ */
function buildChildSelects() {
  ['checkoutChild', 'noteChild', 'incidentChild'].forEach(id => {
    const sel = document.getElementById(id);
    sel.innerHTML = '<option value="">— اختاري —</option>';
    children.forEach(c => {
      const opt = document.createElement('option');
      opt.value       = c.child_id;
      opt.textContent = c.child_name;
      sel.appendChild(opt);
    });
  });
}

async function submitCheckout() {
  const childId  = document.getElementById('checkoutChild').value;
  const receiver = document.getElementById('receiverName').value.trim();
  const recType  = document.querySelector('input[name="receiverType"]:checked')?.value;

  if (!childId)  return showToast('⚠️ اختاري الطفل أولاً', 'error');
  if (!receiver) return showToast('⚠️ أدخلي اسم المستلِم', 'error');

  const child = children.find(c => c.child_id === childId);
  const today = todayISO();

  const payload = {
    submission_id: `${className.replace('-','')}-${today}-checkout-${childId}-${uid()}`,
    timestamp: new Date().toISOString(),
    date: today,
    class: className,
    teacher: teacherName,
    child_id: childId,
    child_name: child.child_name,
    received_by_type: recType,
    received_by_name: receiver,
  };

  const ok = await sendToWebhook(WEBHOOKS.checkout, payload);
  if (ok) {
    document.getElementById('checkoutChild').value = '';
    document.getElementById('receiverName').value  = '';
  }
}

/* ============================
   NOTES
   ============================ */
function selectNoteType(el) {
  document.querySelectorAll('.type-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  selectedNoteType = el.dataset.value;
}

async function submitNote() {
  const childId  = document.getElementById('noteChild').value;
  const noteText = document.getElementById('noteText').value.trim();

  if (!childId)  return showToast('⚠️ اختاري الطفل أولاً', 'error');
  if (!noteText) return showToast('⚠️ اكتبي الملاحظة أولاً', 'error');

  const child = children.find(c => c.child_id === childId);
  const today = todayISO();

  const payload = {
    submission_id: `${className.replace('-','')}-${today}-note-${childId}-${uid()}`,
    timestamp: new Date().toISOString(),
    date: today,
    class: className,
    teacher: teacherName,
    child_id: childId,
    child_name: child.child_name,
    note_type: selectedNoteType,
    note: noteText,
  };

  const ok = await sendToWebhook(WEBHOOKS.notes, payload);
  if (ok) {
    document.getElementById('noteChild').value  = '';
    document.getElementById('noteText').value   = '';
  }
}

/* ============================
   INCIDENTS
   ============================ */
function selectSeverity(el) {
  document.querySelectorAll('.severity-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  selectedSeverity = el.dataset.value;
}

async function submitIncident() {
  const childId = document.getElementById('incidentChild').value;
  const details = document.getElementById('incidentDetails').value.trim();
  const action  = document.getElementById('incidentAction').value.trim();
  const incType = document.querySelector('input[name="incidentType"]:checked')?.value;

  if (!childId) return showToast('⚠️ اختاري الطفل أولاً', 'error');
  if (!details) return showToast('⚠️ أدخلي تفاصيل الحادثة', 'error');
  if (!action)  return showToast('⚠️ أدخلي الإجراء المتخذ', 'error');

  const child = children.find(c => c.child_id === childId);
  const today = todayISO();

  const payload = {
    submission_id: `${className.replace('-','')}-${today}-incident-${childId}-${uid()}`,
    timestamp: new Date().toISOString(),
    date: today,
    class: className,
    teacher: teacherName,
    child_id: childId,
    child_name: child.child_name,
    type: incType,
    severity: selectedSeverity,
    details,
    action,
  };

  const ok = await sendToWebhook(WEBHOOKS.incidents, payload);
  if (ok) {
    document.getElementById('incidentChild').value   = '';
    document.getElementById('incidentDetails').value = '';
    document.getElementById('incidentAction').value  = '';
  }
}

/* ============================
   ASSESSMENTS
   ============================ */
function selectSubject(el) {
  document.querySelectorAll('.subject-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  selectedSubject = el.dataset.subject;
  buildAssessmentGrid();
}

function buildAssessmentGrid() {
  const grid = document.getElementById('assessmentGrid');
  grid.innerHTML = '';
  const subject = SUBJECTS[selectedSubject];
  assessmentRatings = {};

  children.forEach(child => {
    assessmentRatings[child.child_id] = {};
    subject.skills.forEach(s => { assessmentRatings[child.child_id][s] = 'كويس'; });

    const skillRows = subject.skills.map(skill => `
      <div class="assess-skill-row">
        <span class="skill-label">${skill}</span>
        <div class="skill-btns">
          <button class="skill-btn active-good"
            onclick="setRating('${child.child_id}','${skill}','كويس',this)">كويس</button>
          <button class="skill-btn"
            onclick="setRating('${child.child_id}','${skill}','يحتاج متابعة',this)">يحتاج متابعة</button>
          <button class="skill-btn"
            onclick="setRating('${child.child_id}','${skill}','ضعيف',this)">ضعيف</button>
        </div>
      </div>
    `).join('');

    const card = document.createElement('div');
    card.className = 'assess-card';
    card.innerHTML = `
      <div class="assess-name">👤 ${child.child_name}</div>
      <div class="assess-skills">${skillRows}</div>
    `;
    grid.appendChild(card);
  });
}

function setRating(childId, skill, value, btn) {
  assessmentRatings[childId][skill] = value;
  btn.closest('.assess-skill-row').querySelectorAll('.skill-btn').forEach(b => {
    b.classList.remove('active-good', 'active-mid', 'active-bad');
  });
  if (value === 'كويس')              btn.classList.add('active-good');
  else if (value === 'يحتاج متابعة') btn.classList.add('active-mid');
  else                               btn.classList.add('active-bad');
}

async function submitAssessments() {
  const subject = SUBJECTS[selectedSubject];
  const today   = todayISO();

  const assessments = children.map(child => ({
    child_id: child.child_id,
    child_name: child.child_name,
    ratings: assessmentRatings[child.child_id] || {},
  })).filter(child => Object.values(child.ratings).some(r => r !== 'كويس'));

  if (assessments.length === 0) {
    return showToast('✅ كل الأطفال تقييمهم كويس — لا يوجد ما يُرسَل', 'success');
  }

  const payload = {
    submission_id: `${className.replace('-','')}-${today}-assess-${selectedSubject}-${uid()}`,
    timestamp: new Date().toISOString(),
    date: today,
    class: className,
    teacher: teacherName,
    subject: selectedSubject,
    subject_label: subject.label,
    skills: subject.skills,
    assessments,
  };

  await sendToWebhook(WEBHOOKS.assessments, payload);
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

    if (res.ok) {
      showToast('✅ تم الإرسال بنجاح!', 'success');
      return true;
    } else {
      const txt = await res.text();
      console.error('Server error:', txt);
      showToast('❌ خطأ في الإرسال — حاولي مرة أخرى', 'error');
      return false;
    }
  } catch (err) {
    showLoading(false);
    console.error('Network error:', err);
    showToast('❌ تعذر الاتصال بـ n8n — تأكد من تشغيله', 'error');
    return false;
  }
}

/* ============================
   UI HELPERS
   ============================ */
function showLoading(show) {
  document.getElementById('loadingOverlay').classList.toggle('show', show);
}

let toastTimer;
function showToast(msg, type = '') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className   = 'toast show ' + type;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3200);
}

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

function uid() {
  return Math.random().toString(36).slice(2, 7);
}
