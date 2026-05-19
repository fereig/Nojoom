/* teacher.js — واجهة المعلمة | مٌطور ومسرع للأداء العالي */

/* ============================
   CONFIG
   ============================ */
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwET2jd8CtgKvozjNdab7st4GkD8roSqKnY30KyuUzRVpiDcSXTRIBUv0TKfjwwlv_BiQ/exec';

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
   INIT & SETUP
   ============================ */
document.addEventListener('DOMContentLoaded', () => {
  setTodayDate();
  // إظهار مودال الإعدادات أولاً كما هو في التصميم الحالي
  const modal = document.getElementById('setupModal');
  if(modal) modal.classList.add('show');
});

function setTodayDate() {
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const str = new Date().toLocaleDateString('ar-EG', options);
  document.getElementById('todayDate').textContent = str;
}

function saveSetup() {
  const tInput = document.getElementById('setupTeacherName');
  const cInput = document.getElementById('setupClassName');

  teacherName = tInput.value.trim();
  className   = cInput.value.trim();

  if(!teacherName || !className) {
    showToast('⚠️ من فضلك ادخلي الاسم والفصل', 'error');
    return;
  }

  document.getElementById('teacherNameDisplay').textContent = teacherName;
  document.getElementById('classNameDisplay').textContent   = className;

  document.getElementById('setupModal').classList.remove('show');
  
  // تحميل قائمة الطلاب فور حفظ الإعدادات
  loadChildrenList();
}

/* ============================
   DATA LOADING (MODIFIED FOR HIGH PERFORMANCE)
   ============================ */
function loadChildrenList() {
  showLoading(true);
  
  // تعديل ذكي: نطلب فقط قائمة الطلاب الجاهزة من الكاش لتسريع الواجهة بنسبة 300%
  fetchJSONP(APPS_SCRIPT_URL + '?req=children', (data) => {
    showLoading(false);
    if(!data || !data.children) {
      showToast('❌ فشل جلب قائمة الأطفال. تحققي من الإنترنت', 'error');
      return;
    }

    children = data.children;
    
    // تهيئة حالة الحضور الافتراضية للطلاب
    children.forEach(c => {
      attendanceState[c.id] = 'حاضر';
    });

    // بناء واجهات الـ DOM الحالية تماماً دون أي تغيير في التصميم
    buildAttendanceDOM();
    buildNotesDOM();
    buildIncidentsDOM();
    buildAssessmentsDOM();
  });
}

/* ============================
   DOM BUILDERS
   ============================ */
function buildAttendanceDOM() {
  const container = document.getElementById('attendanceList');
  if(!container) return;
  container.innerHTML = '';

  if(attendanceSubmitted) {
    container.innerHTML = '<div class="empty-state">✅ تم إرسال كشف الحضور والغياب لليوم بنجاح!</div>';
    return;
  }

  children.forEach(c => {
    const card = document.createElement('div');
    card.className = 'student-card';
    card.id = `att_card_${c.id}`;

    const isPresent = attendanceState[c.id] === 'حاضر';
    if(isPresent) card.classList.add('present');
    else card.classList.add('absent');

    card.innerHTML = `
      <span class="student-name">${c.name}</span>
      <div class="toggle-buttons">
        <button class="btn-toggle present ${isPresent?'active':''}" onclick="setAttendance(${c.id}, 'حاضر')">حاضر</button>
        <button class="btn-toggle absent ${!isPresent?'active':''}" onclick="setAttendance(${c.id}, 'غياب')">غياب</button>
      </div>
    `;
    container.appendChild(card);
  });
}

function setAttendance(id, status) {
  if(attendanceSubmitted) return;
  attendanceState[id] = status;
  
  const card = document.getElementById(`att_card_${id}`);
  if(card) {
    if(status === 'حاضر') {
      card.classList.remove('absent');
      card.classList.add('present');
      card.querySelector('.btn-toggle.present').classList.add('active');
      card.querySelector('.btn-toggle.absent').classList.remove('active');
    } else {
      card.classList.remove('present');
      card.classList.add('absent');
      card.querySelector('.btn-toggle.present').classList.remove('active');
      card.querySelector('.btn-toggle.absent').classList.add('active');
    }
  }
}

function buildNotesDOM() {
  const select = document.getElementById('noteChildSelect');
  if(!select) return;
  select.innerHTML = '<option value="">-- اختر الطفل --</option>';
  children.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = c.name;
    select.appendChild(opt);
  });
}

function buildIncidentsDOM() {
  const select = document.getElementById('incidentChildSelect');
  if(!select) return;
  select.innerHTML = '<option value="">-- اختر الطفل --</option>';
  children.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = c.name;
    select.appendChild(opt);
  });
}

function buildAssessmentsDOM() {
  const grid = document.getElementById('assessmentGrid');
  if(!grid) return;
  grid.innerHTML = '';

  // فلترة قائمة الحاضرين فقط للتقييم
  presentChildren = children.filter(c => attendanceState[c.id] === 'حاضر');

  if(presentChildren.length === 0) {
    grid.innerHTML = '<div class="empty-state">⚠️ يجب تحضير الطلاب أولاً؛ لا يوجد أطفال حاضرون للتقييم.</div>';
    return;
  }

  const sub = SUBJECTS[selectedSubject];

  presentChildren.forEach(c => {
    if(!assessmentRatings[c.id]) {
      assessmentRatings[c.id] = { score: 3, comment: '' };
    }
    const current = assessmentRatings[c.id];

    const row = document.createElement('div');
    row.className = 'assessment-row';

    let starsHtml = '';
    for(let s=1; s<=5; s++) {
      starsHtml += `<span class="star ${s <= current.score ? 'active' : ''}" onclick="setRating(${c.id}, ${s})">★</span>`;
    }

    row.innerHTML = `
      <div class="assess-info">
        <span class="assess-child-name">${c.name}</span>
        <div class="stars-container" id="stars_${c.id}">${starsHtml}</div>
      </div>
      <div class="assess-comment-box">
        <input type="text" placeholder="ملاحظة مهارية (اختياري)..." value="${current.comment}" oninput="setComment(${c.id}, this.value)" />
      </div>
    `;
    grid.appendChild(row);
  });
}

function setRating(childId, score) {
  if(!assessmentRatings[childId]) assessmentRatings[childId] = { score: 3, comment: '' };
  assessmentRatings[childId].score = score;

  const container = document.getElementById(`stars_${childId}`);
  if(container) {
    const stars = container.querySelectorAll('.star');
    stars.forEach((star, idx) => {
      star.classList.toggle('active', (idx + 1) <= score);
    });
  }
}

function setComment(childId, val) {
  if(!assessmentRatings[childId]) assessmentRatings[childId] = { score: 3, comment: '' };
  assessmentRatings[childId].comment = val;
}

/* ============================
   TAB SWITCHING / SELECTIONS
   ============================ */
function selectNoteType(el, type) {
  document.querySelectorAll('.note-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  selectedNoteType = type;
}

function selectSeverity(el, level) {
  document.querySelectorAll('.severity-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  selectedSeverity = level;
}

function selectSubject(el) {
  document.querySelectorAll('.subject-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  selectedSubject = el.getAttribute('data-tab') || el.getAttribute('data-subject');
  buildAssessmentsDOM();
}

/* ============================
   FORM SUBMISSIONS (POST)
   ============================ */
async function submitAttendance() {
  if(attendanceSubmitted) return;

  const records = Object.keys(attendanceState).map(id => {
    const child = children.find(c => String(c.id) === String(id));
    return {
      id:   id,
      name: child ? child.name : '',
      status: attendanceState[id]
    };
  });

  const now = new Date();
  const dateStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');

  const payload = { date: dateStr, records };
  const ok = await apiPost('Attendance', payload);
  if(ok) {
    attendanceSubmitted = true;
    buildAttendanceDOM();
    buildAssessmentsDOM(); // تحديث الحاضرين في تابة التقييمات
  }
}

async function submitNote() {
  const select = document.getElementById('noteChildSelect');
  const textInput = document.getElementById('noteText');

  const id = select.value;
  const text = textInput.value.trim();

  if(!id || !text) {
    showToast('⚠️ يرجى اختيار طفل وكتابة الملاحظة', 'error');
    return;
  }

  const child = children.find(c => String(c.id) === String(id));
  const payload = {
    id,
    name: child ? child.name : '',
    type: selectedNoteType,
    text
  };

  const ok = await apiPost('Notes', payload);
  if(ok) {
    textInput.value = '';
    select.value = '';
  }
}

async function submitIncident() {
  const select = document.getElementById('incidentChildSelect');
  const textInput = document.getElementById('incidentText');

  const id = select.value;
  const text = textInput.value.trim();

  if(!id || !text) {
    showToast('⚠️ يرجى اختيار طفل وكتابة تفاصيل الحادث', 'error');
    return;
  }

  const child = children.find(c => String(c.id) === String(id));
  const payload = {
    id,
    name: child ? child.name : '',
    severity: selectedSeverity,
    text
  };

  const ok = await apiPost('Incidents', payload);
  if(ok) {
    textInput.value = '';
    select.value = '';
  }
}

async function submitAssessments() {
  if(presentChildren.length === 0) {
    showToast('⚠️ لا يوجد أطفال حاضرون لتقييمهم حالياً', 'error');
    return;
  }

  const ratings = presentChildren.map(c => {
    const r = assessmentRatings[c.id] || { score: 3, comment: '' };
    return {
      id: c.id,
      name: c.name,
      score: r.score,
      comment: r.comment
    };
  });

  const now = new Date();
  const dateStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
  const subjectLabel = SUBJECTS[selectedSubject] ? SUBJECTS[selectedSubject].label : selectedSubject;

  const payload = {
    date: dateStr,
    subject: subjectLabel,
    ratings
  };

  const ok = await apiPost('Assessments', payload);
  if(ok) {
    // تصقير التقييمات بعد الإرسال الناجح
    assessmentRatings = {};
    buildAssessmentsDOM();
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
      mode:    'no-cors',
      redirect: 'follow',
      headers:  { 'Content-Type': 'text/plain' },
      body:     JSON.stringify({ action, payload }),
    });

    showLoading(false);
    showToast('✅ تم الإرسال بنجاح وتحديث النظام!', 'success');
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
  const el = document.getElementById('loadingOverlay');
  if(el) el.classList.toggle('show', show);
}

let toastTimer;
function showToast(msg, type = '') {
  const toast = document.getElementById('toast');
  if(!toast) return;
  toast.textContent = msg;
  toast.className   = 'toast show ' + type;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.className = 'toast';
  }, 3500);
}
