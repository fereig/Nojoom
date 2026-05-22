/* data-layer.js — نجوم | الوسيط بين الفرونت و Firebase/Sheets */

import { db, collection, getDocs, addDoc,
         query, where, orderBy, limit,
         doc, setDoc } from "./firebase-config.js";

// ============================================================
// الإعداد — لو Firebase واقفت حول USE_FIREBASE = false
// ============================================================
const USE_FIREBASE    = true;
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzZvOO382UqsC1hLoooqOtkMgTWDjIbBZlUlzhwIh3h5XeMN3_OWJ5q98Ux-0L2q8_UtA/exec';

// ============================================================
// CHILDREN
// ============================================================

// جيب أطفال فصل معين
export async function getChildren(cls) {
  if (USE_FIREBASE) {
    try {
      const q   = query(collection(db, "children"),
                        where("class", "==", cls),
                        where("active", "==", true));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (err) {
      console.warn("Firebase getChildren فشلت، بنرجع لـ Sheets:", err);
      return await _sheetsGetChildren(cls);
    }
  }
  return await _sheetsGetChildren(cls);
}

// جيب كل الأطفال
export async function getAllChildren() {
  if (USE_FIREBASE) {
    try {
      const q    = query(collection(db, "children"), where("active", "==", true));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (err) {
      console.warn("Firebase getAllChildren فشلت:", err);
      return await _sheetsGetAllChildren();
    }
  }
  return await _sheetsGetAllChildren();
}

// ============================================================
// DASHBOARD
// ============================================================
export async function getDashboard() {
  // الداشبورد فيه حسابات معقدة — نرجع لـ Sheets دايمًا
  return await _sheetsGet("getDashboard");
}

// ============================================================
// PAYMENT STATUS
// ============================================================
export async function getPaymentStatus() {
  if (USE_FIREBASE) {
    try {
      const [children, payments] = await Promise.all([
        getAllChildren(),
        _firebaseGetCurrentMonthPayments()
      ]);

      const now          = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;

      return children.map(child => {
        const payType   = String(child.payment_type || 'شهري').trim();
        const totalFee  = Number(child.fee) || 1500;
        const fullAmount = payType === 'ترمي' ? totalFee * 3
                         : payType === 'سنوي' ? totalFee * 12
                         : totalFee;

        const childPays = payments.filter(p => p.child_id === child.child_id);
        const paid      = childPays.reduce((s, p) => s + (Number(p.amount_paid) || 0), 0);
        const remaining = Math.max(0, fullAmount - paid);
        const status    = paid >= fullAmount ? 'مدفوع' : paid > 0 ? 'جزئي' : 'غير مدفوع';

        return {
          child_id:   child.child_id,
          child_name: child.child_name,
          class:      child.class,
          paid, total: fullAmount, remaining, status
        };
      });
    } catch (err) {
      console.warn("Firebase getPaymentStatus فشلت:", err);
      return await _sheetsGet("getPaymentStatus");
    }
  }
  return await _sheetsGet("getPaymentStatus");
}

// ============================================================
// SUBMIT ACTIONS — بتكتب في الاتنين مع بعض
// ============================================================

export async function submitAttendance(payload) {
  // دايمًا بيبعت لـ Sheets عشان Telegram يشتغل
  const sheetsResult = await _sheetsPost("Attendance", payload);

  // لو Firebase شغالة، احفظ فيها كمان
  if (USE_FIREBASE && sheetsResult) {
    try {
      const allChildren = [...(payload.present || []), ...(payload.absent || [])];
      for (const child of allChildren) {
        const status = (payload.present || []).find(p => p.child_id === child.child_id) ? 'حاضر' : 'غائب';
        await addDoc(collection(db, "attendance"), {
          submission_id: payload.submission_id + '-' + child.child_id,
          timestamp:     payload.timestamp,
          date:          payload.date,
          child_id:      child.child_id,
          child_name:    child.child_name,
          class:         payload.class,
          teacher:       payload.teacher,
          status,
        });
      }
    } catch (err) { console.warn("Firebase attendance save فشلت:", err); }
  }
  return sheetsResult;
}

export async function submitNote(payload) {
  const sheetsResult = await _sheetsPost("Notes", payload);
  if (USE_FIREBASE && sheetsResult) {
    try {
      await addDoc(collection(db, "notes"), payload);
    } catch (err) { console.warn("Firebase notes save فشلت:", err); }
  }
  return sheetsResult;
}

export async function submitIncident(payload) {
  const sheetsResult = await _sheetsPost("Incidents", payload);
  if (USE_FIREBASE && sheetsResult) {
    try {
      await addDoc(collection(db, "incidents"), payload);
    } catch (err) { console.warn("Firebase incidents save فشلت:", err); }
  }
  return sheetsResult;
}

export async function submitAssessment(payload) {
  const sheetsResult = await _sheetsPost("Assessments", payload);
  if (USE_FIREBASE && sheetsResult) {
    try {
      await addDoc(collection(db, "assessments"), payload);
    } catch (err) { console.warn("Firebase assessments save فشلت:", err); }
  }
  return sheetsResult;
}

export async function submitPayment(payload) {
  const sheetsResult = await _sheetsPost("Payments", payload);
  if (USE_FIREBASE && sheetsResult) {
    try {
      await addDoc(collection(db, "payments"), payload);
    } catch (err) { console.warn("Firebase payments save فشلت:", err); }
  }
  return sheetsResult;
}

export async function registerChild(payload) {
  return await _sheetsPost("RegisterChild", payload);
}

// ============================================================
// PRIVATE — Firebase Helpers
// ============================================================
async function _firebaseGetCurrentMonthPayments() {
  const now          = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const q    = query(collection(db, "payments"),
                     where("month", ">=", currentMonth),
                     where("month", "<",  currentMonth + "-99"));
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data());
}

// ============================================================
// PRIVATE — Sheets Helpers
// ============================================================
async function _sheetsGet(action) {
  const res  = await fetch(`${APPS_SCRIPT_URL}?action=${action}`);
  return await res.json();
}

async function _sheetsGetChildren(cls) {
  const res  = await fetch(`${APPS_SCRIPT_URL}?action=getChildren&class=${encodeURIComponent(cls)}`);
  const data = await res.json();
  return data.children || [];
}

async function _sheetsGetAllChildren() {
  const res  = await fetch(`${APPS_SCRIPT_URL}?action=getAllChildren`);
  const data = await res.json();
  return data.children || [];
}

async function _sheetsPost(action, payload) {
  try {
    const res = await fetch(APPS_SCRIPT_URL, {
      method:   'POST',
      redirect: 'follow',
      headers:  { 'Content-Type': 'text/plain' },
      body:     JSON.stringify({ action, payload }),
    });
    const data = await res.json();
    if (data && data.status === 'duplicate') return { duplicate: true, message: data.message };
    return { ok: true };
  } catch (err) {
    console.error("Sheets post فشلت:", err);
    return null;
  }
}
