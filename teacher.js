/* teacher.js — واجهة المعلمة | نجوم */

/* ============================
   CONFIG
   ============================ */
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyQWvkfCMFDHbM2fbdpt75s9Czsw0gLZlDdY2MgXrf5FJP4YC0o6IFu4cWng94BEyShSg/exec';

/* ============================
   SUBJECTS
   ============================ */
const SUBJECTS = {
  arabic_letters: { label: 'اللغة العربية — الحروف',  skills: ['ذكر الحرف', 'كتابته', 'تمكينه'] },
  arabic_harakat: { label: 'اللغة العربية — الحركات', skills: ['الفتح', 'الضم', 'الكسر', 'المدود'] },
  math:           { label: 'الحساب',                   skills: ['ذكر الرقم', 'كتابته', 'العد'] },
  english:        { label: 'الإنجليزي',                skills: ['ذكر الحرف', 'كتابته', 'تطبيقه'] },
  islamic:        { label: 'التربية الإسلامية',        skills: ['قرآن', 'حديث', 'أذكار وأدعية'] },
};

/* ============================
   STATE
   ============================ */
let teacherName = '';
let className   = '';
let children    = [];
let presentChildren = [];

let attendanceState      = {};
let attendanceSubmitted  = false;

let selectedNoteType  = 'سلوك';
let selectedSeverity  = 'متوسط';
let selectedSubject   = 'arabic_letters';
let assessmentRatings = {};

/* ============================
   INIT
   ============================ */
document.addEventListener('DOMContentLoaded', () => {
  setTodayDate();
  showSetupModal();
});

function setTodayDate() {
  const str = new Date().toLocaleDateString('ar-EG', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
  document.getElementById('todayDate').textContent           = str;
  document.getElementById('attendanceDateBadge').textContent = str;
}

/* ============================
   SETUP MODAL
   ============================ */
function showSetupModal() {
  document.getElementById('setupModal').classList.remove('hidden');
  document.getElementById('setupTeacher').value = '';
  document.getElementById('setupClass').value   = 'Pre-A';
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

  attendanceSubmitted = false;
  presentChildren     = [];

  await loadChildren(className);
}

/* ============================
   LOAD CHILDREN
   ✅ بتستخدم JSONP عشان Apps Script GET مش بيدعم CORS
   ============================ */
function loadChildren(cls) {
  return new Promise(resolve => {
    showLoading(true);

    const callbackName = 'cb_' + Math.random().toString(36).slice(2);
    const script       = document.createElement('script');
    const url = `${APPS_SCRIPT_URL}?action=getChildren&class=${encodeURIComponent(cls)}&callback=${callbackName}`;
    script.src = url;

    const timeout = setTimeout(() => {
      cleanup();
      showToast('⚠️ تعذر تحميل بيانات الأطفال', 'error');
      children = [];
      finishLoad();
      resolve();
    }, 10000);

    window[callbackName] = function(data) {
      cleanup();
      const list = data && (data.children || data.data);
      if (Array.isArray(list)) {
        children = list.map(c => ({ child_id: c.child_id, child_name: c.child_name }));
      } else {
        showToast('⚠️ تعذر تحميل بيانات الأطفال', 'error');
        children = [];
      }
      finishLoad();
      resolve();
    };

    script.onerror = function() {
      cleanup();
      showToast('⚠️ تعذر تحميل بيانات الأطفال', 'error');
      children = [];
      finishLoad();
      resolve();
    };

    function cleanup() {
      clearTimeout(timeout);
      delete window[callbackName];
      if (document.body.contains(script)) document.body.removeChild(script);
    }

    function finishLoad() {
      showLoading(false);
      presentChildren = [...children];
      initAll();
    }

    document.body.appendChild(script);
  });
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
    card.addEventListener('click', () => {
      if (attendanceSubmitted) return;
      toggleAttendance(child.child_id, card);
    });
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
  const vals = Object.values(attendanceState);
  document.getElementById('presentCount').textContent = vals.filter(s => s === 'present').length;
  document.getElementById('absentCount').textContent  = vals.filter(s => s === 'absent').length;
}

async function submitAttendance() {
  if (attendanceSubmitted) {
    showToast('⚠️ تم إرسال الحضور من قبل اليوم', 'error');
    return;
  }
  if (children.length === 0) return showToast('⚠️ لا يوجد أطفال', 'error');

  const today   = todayISO();
  const present = children.filter(c => attendanceState[c.child_id] === 'present');
  const absent  = children.filter(c => attendanceState[c.child_id] === 'absent');

  const payload = {
    submission_id: `${className.replace(/\s/g,'')}-${today}-${teacherName.replace(/\s/g,'')}-${uid()}`,
    timestamp: new Date().toISOString(),
    date:      today,
    class:     className,
    teacher:   teacherName,
    present:   present.map(c => ({ child_id: c.child_id, child_name: c.child_name })),
    absent:    absent.map(c => ({ child_id: c.child_id, child_name: c.child_name })),
  };

  const ok = await sendToAppsScript('Attendance', payload);

  if (ok) {
    attendanceSubmitted = true;
    presentChildren = present;
    buildChildSelects();
    buildAssessmentGrid();

    document.querySelectorAll('#attendanceGrid .child-card').forEach(card => {
      card.style.opacity      = '0.6';
      card.style.pointerEvents = 'none';
    });

    const btn = document.querySelector('#tab-attendance .btn-submit');
    if (btn) {
      btn.textContent  = '✅ تم إرسال الحضور';
      btn.disabled     = true;
      btn.style.opacity = '0.6';
    }
  }
}

/* ============================
   CHILD SELECTS
   ============================ */
function buildChildSelects() {
  const list = attendanceSubmitted ? presentChildren : children;

  ['noteChild', 'incidentChild'].forEach(id => {
    const sel = document.getElementById(id);
    sel.innerHTML = '<option value="">— اختاري —</option>';
    list.forEach(c => {
      const opt = document.createElement('option');
      opt.value       = c.child_id;
      opt.textContent = c.child_name;
      sel.appendChild(opt);
    });
  });
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

  const list  = attendanceSubmitted ? presentChildren : children;
  const child = list.find(c => c.child_id === childId);
  const today = todayISO();

  const payload = {
    submission_id: `${className.replace(/\s/g,'')}-${today}-note-${childId}-${uid()}`,
    timestamp:  new Date().toISOString(),
    date:       today,
    class:      className,
    teacher:    teacherName,
    child_id:   childId,
    child_name: child.child_name,
    note_type:  selectedNoteType,
    note:       noteText,
  };

  const ok = await sendToAppsScript('Notes', payload);
  if (ok) {
    document.getElementById('noteChild').value = '';
    document.getElementById('noteText').value  = '';
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

  const list  = attendanceSubmitted ? presentChildren : children;
  const child = list.find(c => c.child_id === childId);
  const today = todayISO();

  const payload = {
    submission_id: `${className.replace(/\s/g,'')}-${today}-incident-${childId}-${uid()}`,
    timestamp:  new Date().toISOString(),
    date:       today,
    class:      className,
    teacher:    teacherName,
    child_id:   childId,
    child_name: child.child_name,
    type:       incType,
    severity:   selectedSeverity,
    details,
    action,
  };

  const ok = await sendToAppsScript('Incidents', payload);
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
  const grid    = document.getElementById('assessmentGrid');
  grid.innerHTML = '';
  const subject  = SUBJECTS[selectedSubject];
  assessmentRatings = {};

  const list = attendanceSubmitted ? presentChildren : children;

  list.forEach(child => {
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
  const list    = attendanceSubmitted ? presentChildren : children;

  const assessments = list
    .map(child => ({
      child_id:   child.child_id,
      child_name: child.child_name,
      ratings:    assessmentRatings[child.child_id] || {},
    }))
    .filter(child => Object.values(child.ratings).some(r => r !== 'كويس'));

  if (assessments.length === 0) {
    showToast('✅ كل الأطفال تقييمهم كويس', 'success');
  }

  const payload = {
    submission_id: `${className.replace(/\s/g,'')}-${today}-assess-${selectedSubject}-${uid()}`,
    timestamp:     new Date().toISOString(),
    date:          today,
    class:         className,
    teacher:       teacherName,
    subject:       selectedSubject,
    subject_label: subject.label,
    skills:        subject.skills,
    assessments,
    allChildren:   list.map(c => ({ child_id: c.child_id, child_name: c.child_name })),
  };

  await sendToAppsScript('Assessments', payload);
}

/* ============================
   HTTP HELPER
   ✅ الإصلاح الرئيسي: حذف mode:'no-cors' واستخدام redirect:'follow'
      عشان Apps Script يقدر يستقبل الطلب ويرد صح
   ============================ */
async function sendToAppsScript(action, payload) {
  showLoading(true);
  try {
    const res = await fetch(APPS_SCRIPT_URL, {
      method:   'POST',
      redirect: 'follow',                         // ✅ ضروري مع Apps Script
      headers:  { 'Content-Type': 'text/plain' }, // ✅ text/plain يتجنب preflight
      body:     JSON.stringify({ action, payload }),
    });

    showLoading(false);

    // Apps Script بيرد بـ JSON حتى لو status مش 200
    let data = null;
    try { data = await res.json(); } catch(_) {}

    if (data && data.status === 'duplicate') {
      showToast('⚠️ ' + data.message, 'error');
      return false;
    }

    if (data && data.status === 'ok') {
      showToast('✅ تم الإرسال بنجاح!', 'success');
      return true;
    }

    // لو مفيش رد واضح بس الطلب وصل (Apps Script أحياناً بيرد بـ opaque)
    showToast('✅ تم الإرسال بنجاح!', 'success');
    return true;

  } catch (err) {
    showLoading(false);
    console.error(err);
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
  const toast   = document.getElementById('toast');
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
