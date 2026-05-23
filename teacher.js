/* teacher.js — واجهة المعلمة | نجوم */

/* ============================
   IMPORTS
   ============================ */
import {
  getChildren,
  submitAttendance as dlSubmitAttendance,
  submitNote       as dlSubmitNote,
  submitIncident   as dlSubmitIncident,
  submitAssessment as dlSubmitAssessment,
} from './data-layer.js';

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
let attendanceSubmitted = false;
let presentChildren     = [];
let attendanceState   = {};
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
  document.getElementById('todayDate').textContent            = str;
  document.getElementById('attendanceDateBadge').textContent  = str;
}

/* ============================
   SETUP MODAL
   ============================ */
function showSetupModal() {
  document.getElementById('setupModal').classList.remove('hidden');
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

  await loadChildren(className);
}

/* ============================
   LOAD CHILDREN
   ============================ */
async function loadChildren(cls) {
  showLoading(true);
  try {
    const list = await getChildren(cls);
    if (Array.isArray(list)) {
      children = list.map(c => ({ child_id: c.child_id, child_name: c.child_name }));
    } else {
      throw new Error('بيانات غير صحيحة');
    }
  } catch (err) {
    console.error(err);
    showToast('⚠️ تعذر تحميل بيانات الأطفال', 'error');
    children = [];
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
    submission_id: `${className.replace('-','')}-${today}-${teacherName.replace(/\s/g,'')}-${uid()}`,
    timestamp: new Date().toISOString(),
    date:      today,
    class:     className,
    teacher:   teacherName,
    present:   present.map(c => ({ child_id: c.child_id, child_name: c.child_name })),
    absent:    absent.map(c => ({ child_id: c.child_id, child_name: c.child_name })),
  };

  showLoading(true);
  const result = await dlSubmitAttendance(payload);
  showLoading(false);

  if (result && !result.duplicate) {
    attendanceSubmitted = true;
    presentChildren    = present;

    buildChildSelects();
    buildAssessmentGrid();

    document.querySelectorAll('#attendanceGrid .child-card').forEach(card => {
      card.style.opacity       = '0.6';
      card.style.pointerEvents = 'none';
    });

    const btn = document.querySelector('#tab-attendance .btn-submit');
    if (btn) {
      btn.textContent   = '✅ تم إرسال الحضور';
      btn.disabled      = true;
      btn.style.opacity = '0.6';
    }
    showToast('✅ تم إرسال الحضور بنجاح!', 'success');
  } else if (result && result.duplicate) {
    showToast('⚠️ ' + result.message, 'error');
  } else {
    showToast('❌ تعذر الاتصال — تحققي من الإنترنت', 'error');
  }
}

/* ============================
   CHILD SELECTS (Notes + Incidents)
   ============================ */
function buildChildSelects() {
  const list = attendanceSubmitted ? presentChildren : children;

  ['noteChild', 'incidentChild'].forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return;
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

  showLoading(true);
  const result = await dlSubmitNote(payload);
  showLoading(false);

  if (result && !result.duplicate) {
    showToast('✅ تم إرسال الملاحظة بنجاح!', 'success');
    document.getElementById('noteChild').value = '';
    document.getElementById('noteText').value  = '';
  } else if (result && result.duplicate) {
    showToast('⚠️ ' + result.message, 'error');
  } else {
    showToast('❌ تعذر الاتصال', 'error');
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

  showLoading(true);
  const result = await dlSubmitIncident(payload);
  showLoading(false);

  if (result && !result.duplicate) {
    showToast('✅ تم تسجيل الحادثة بنجاح!', 'success');
    document.getElementById('incidentChild').value   = '';
    document.getElementById('incidentDetails').value = '';
    document.getElementById('incidentAction').value  = '';
  } else if (result && result.duplicate) {
    showToast('⚠️ ' + result.message, 'error');
  } else {
    showToast('❌ تعذر الاتصال', 'error');
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
  const subject     = SUBJECTS[selectedSubject];
  const today       = todayISO();
  const assessments = children
    .map(child => ({
      child_id:   child.child_id,
      child_name: child.child_name,
      ratings:    assessmentRatings[child.child_id] || {},
    }))
    .filter(child => Object.values(child.ratings).some(r => r !== 'كويس'));

  if (assessments.length === 0) {
    return showToast('✅ كل الأطفال تقييمهم كويس', 'success');
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

  showLoading(true);
  const result = await dlSubmitAssessment(payload);
  showLoading(false);

  if (result && !result.duplicate) {
    showToast('✅ تم إرسال التقييمات بنجاح!', 'success');
  } else if (result && result.duplicate) {
    showToast('⚠️ ' + result.message, 'error');
  } else {
    showToast('❌ تعذر الاتصال', 'error');
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

/* ============================
   EXPOSE GLOBALS (للـ HTML onclick)
   ============================ */
window.saveSetup        = saveSetup;
window.switchTab        = switchTab;
window.toggleAttendance = toggleAttendance;
window.submitAttendance = submitAttendance;
window.selectNoteType   = selectNoteType;
window.submitNote       = submitNote;
window.selectSeverity   = selectSeverity;
window.submitIncident   = submitIncident;
window.selectSubject    = selectSubject;
window.setRating        = setRating;
window.submitAssessments = submitAssessments;
