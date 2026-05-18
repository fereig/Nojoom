/* teacher.js — واجهة المعلمة */

/* ============================
   CONFIG
   ============================ */
const WEBHOOK_BASE = 'https://script.google.com/macros/s/AKfycbx3A1Q8h8VCPd8k3CYPffM7rbVXtbe6_UpFu6z5m_AMrhb8wif0tVSSY-pofy9uahlVVQ/exec';

// n8n webhooks — غيري الـ BASE_URL لما تنشري على VPS
const N8N_BASE = 'http://localhost:5678/webhook';
const WEBHOOKS = {
  attendance:  `${N8N_BASE}/Attendance`,
  checkout:    `${N8N_BASE}/Checkout`,
  notes:       `${N8N_BASE}/Notes`,
  incidents:   `${N8N_BASE}/Incidents`,
  assessments: `${N8N_BASE}/Assessments`,
};

/* ============================
   CHILDREN DATA
   — في الإنتاج: اجلبيها من الـ sheet
   ============================ */
const CHILDREN_DB = {
  'KG1-A': [
    { child_id: 'KG1A-01', child_name: 'أحمد محمد' },
    { child_id: 'KG1A-02', child_name: 'فاطمة علي' },
    { child_id: 'KG1A-03', child_name: 'محمد حسن' },
    { child_id: 'KG1A-04', child_name: 'سارة إبراهيم' },
    { child_id: 'KG1A-05', child_name: 'علي كريم' },
    { child_id: 'KG1A-06', child_name: 'نور طارق' },
    { child_id: 'KG1A-07', child_name: 'ياسمين أحمد' },
    { child_id: 'KG1A-08', child_name: 'عمر سمير' },
    { child_id: 'KG1A-09', child_name: 'ليلى منصور' },
    { child_id: 'KG1A-10', child_name: 'خالد وليد' },
  ],
  'KG1-B': [
    { child_id: 'KG1B-01', child_name: 'مريم خالد' },
    { child_id: 'KG1B-02', child_name: 'يوسف حسين' },
    { child_id: 'KG1B-03', child_name: 'ليلى محمود' },
    { child_id: 'KG1B-04', child_name: 'كريم عادل' },
    { child_id: 'KG1B-05', child_name: 'رانيا وليد' },
    { child_id: 'KG1B-06', child_name: 'أيمن فاروق' },
  ],
  'KG2-A': [
    { child_id: 'KG2A-01', child_name: 'سلمى منصور' },
    { child_id: 'KG2A-02', child_name: 'إياد حسن' },
    { child_id: 'KG2A-03', child_name: 'دينا أحمد' },
    { child_id: 'KG2A-04', child_name: 'طارق عمر' },
    { child_id: 'KG2A-05', child_name: 'هبة سعيد' },
    { child_id: 'KG2A-06', child_name: 'نادية مصطفى' },
  ],
  'KG2-B': [
    { child_id: 'KG2B-01', child_name: 'ماجدة كريم' },
    { child_id: 'KG2B-02', child_name: 'حسام علي' },
    { child_id: 'KG2B-03', child_name: 'إسلام طارق' },
    { child_id: 'KG2B-04', child_name: 'منى إبراهيم' },
    { child_id: 'KG2B-05', child_name: 'خالد محمود' },
  ],
  'Nursery-A': [
    { child_id: 'NURA-01', child_name: 'لمار أحمد' },
    { child_id: 'NURA-02', child_name: 'يزن محمد' },
    { child_id: 'NURA-03', child_name: 'روان علي' },
    { child_id: 'NURA-04', child_name: 'تالة سمير' },
    { child_id: 'NURA-05', child_name: 'آدم حسن' },
  ],
  'Nursery-B': [
    { child_id: 'NURB-01', child_name: 'جنا وليد' },
    { child_id: 'NURB-02', child_name: 'ريم أحمد' },
    { child_id: 'NURB-03', child_name: 'زياد كريم' },
  ],
};

const SUBJECTS = {
  arabic_letters:  { label: 'اللغة العربية — الحروف',   skills: ['ذكر الحرف', 'كتابته', 'تمكينه'] },
  arabic_harakat:  { label: 'اللغة العربية — الحركات',  skills: ['الفتح', 'الضم', 'الكسر', 'المدود'] },
  math:            { label: 'الحساب',                    skills: ['ذكر الرقم', 'كتابته', 'العد'] },
  english:         { label: 'الإنجليزي',                 skills: ['ذكر الحرف', 'كتابته', 'تطبيقه'] },
  islamic:         { label: 'التربية الإسلامية',         skills: ['قرآن', 'حديث', 'أذكار وأدعية'] },
};

/* ============================
   STATE
   ============================ */
let teacherName = '';
let className = '';
let children = [];
let attendanceState = {}; // child_id → 'present' | 'absent'
let selectedNoteType = 'سلوك';
let selectedSeverity = 'متوسط';
let selectedSubject = 'arabic_letters';
let assessmentRatings = {}; // child_id → { skill → rating }

/* ============================
   INIT
   ============================ */
document.addEventListener('DOMContentLoaded', () => {
  setTodayDate();
  loadSetup();
});

function setTodayDate() {
  const now = new Date();
  const opts = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const str = now.toLocaleDateString('ar-EG', opts);
  document.getElementById('todayDate').textContent = str;
  document.getElementById('attendanceDateBadge').textContent = str;
}

function loadSetup() {
  teacherName = localStorage.getItem('nojoom_teacher') || '';
  className   = localStorage.getItem('nojoom_class') || '';

  if (!teacherName || !className) {
    document.getElementById('setupModal').classList.remove('hidden');
    return;
  }
  document.getElementById('setupModal').classList.add('hidden');
  initAll();
}

function saveSetup() {
  const t = document.getElementById('setupTeacher').value.trim();
  const c = document.getElementById('setupClass').value;
  if (!t) { showToast('⚠️ أدخلي اسمك أولاً', 'error'); return; }
  teacherName = t;
  className = c;
  localStorage.setItem('nojoom_teacher', t);
  localStorage.setItem('nojoom_class', c);
  document.getElementById('setupModal').classList.add('hidden');
  initAll();
}

function initAll() {
  children = CHILDREN_DB[className] || [];

  document.getElementById('teacherNameDisplay').textContent = teacherName;
  document.getElementById('classNameDisplay').textContent = className;

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

  // Default: everyone present
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
  const current = attendanceState[childId];
  if (current === 'present') {
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
  const present = Object.values(attendanceState).filter(s => s === 'present').length;
  const absent  = Object.values(attendanceState).filter(s => s === 'absent').length;
  document.getElementById('presentCount').textContent = present;
  document.getElementById('absentCount').textContent = absent;
}

async function submitAttendance() {
  const present = children.filter(c => attendanceState[c.child_id] === 'present');
  const absent  = children.filter(c => attendanceState[c.child_id] === 'absent');
  const today = todayISO();

  const payload = {
    submission_id: `${className.replace('-','')}-${today}-${teacherName.replace(' ','')}-${uid()}`,
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
      opt.value = c.child_id;
      opt.textContent = c.child_name;
      sel.appendChild(opt);
    });
  });
}

async function submitCheckout() {
  const childId   = document.getElementById('checkoutChild').value;
  const receiver  = document.getElementById('receiverName').value.trim();
  const recType   = document.querySelector('input[name="receiverType"]:checked')?.value;

  if (!childId) return showToast('⚠️ اختاري الطفل أولاً', 'error');
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
    document.getElementById('receiverName').value = '';
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

  if (!childId)   return showToast('⚠️ اختاري الطفل أولاً', 'error');
  if (!noteText)  return showToast('⚠️ اكتبي الملاحظة أولاً', 'error');

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
    document.getElementById('noteChild').value = '';
    document.getElementById('noteText').value = '';
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
  const childId  = document.getElementById('incidentChild').value;
  const details  = document.getElementById('incidentDetails').value.trim();
  const action   = document.getElementById('incidentAction').value.trim();
  const incType  = document.querySelector('input[name="incidentType"]:checked')?.value;

  if (!childId)  return showToast('⚠️ اختاري الطفل أولاً', 'error');
  if (!details)  return showToast('⚠️ أدخلي تفاصيل الحادثة', 'error');
  if (!action)   return showToast('⚠️ أدخلي الإجراء المتخذ', 'error');

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
    document.getElementById('incidentChild').value = '';
    document.getElementById('incidentDetails').value = '';
    document.getElementById('incidentAction').value = '';
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

    const card = document.createElement('div');
    card.className = 'assess-card';

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

    card.innerHTML = `
      <div class="assess-name">👤 ${child.child_name}</div>
      <div class="assess-skills">${skillRows}</div>
    `;
    grid.appendChild(card);
  });
}

function setRating(childId, skill, value, btn) {
  assessmentRatings[childId][skill] = value;
  const row = btn.closest('.assess-skill-row');
  row.querySelectorAll('.skill-btn').forEach(b => {
    b.classList.remove('active-good', 'active-mid', 'active-bad');
  });
  if (value === 'كويس')           btn.classList.add('active-good');
  else if (value === 'يحتاج متابعة') btn.classList.add('active-mid');
  else                             btn.classList.add('active-bad');
}

async function submitAssessments() {
  const subject = SUBJECTS[selectedSubject];
  const today = todayISO();

  // Only include children with non-"كويس" ratings OR all if teacher wants full report
  const assessments = children.map(child => ({
    child_id: child.child_id,
    child_name: child.child_name,
    ratings: assessmentRatings[child.child_id] || {},
  })).filter(child =>
    Object.values(child.ratings).some(r => r !== 'كويس')
  );

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
    showToast('❌ تعذر الاتصال — تحققي من الإنترنت', 'error');
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
  toast.className = 'toast show ' + type;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove('show');
  }, 3200);
}

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

function uid() {
  return Math.random().toString(36).slice(2, 7);
}
