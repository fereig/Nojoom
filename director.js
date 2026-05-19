<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
  <title>نجوم — لوحة المديرة</title>
  <link rel="stylesheet" href="director.css" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
</head>
<body>

  <header class="topbar">
    <div class="topbar-logo">
      <span class="logo-star">★</span>
      <span class="logo-text">نجوم</span>
      <span class="role-badge">المديرة</span>
    </div>
    <div class="topbar-right">
      <span class="topbar-date" id="todayDate"></span>
      <button class="refresh-btn" onclick="loadDashboard()" title="تحديث البيانات">↻</button>
    </div>
  </header>

  <nav class="tabs">
    <button class="tab active" data-tab="dashboard">
      <span class="tab-icon">📊</span> لوحة التحكم
    </button>
    <button class="tab" data-tab="payments">
      <span class="tab-icon">💰</span> الحسابات والمصاريف
    </button>
  </nav>

  <main class="content-container">

    <section id="dashboardTab" class="tab-content active">
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon" style="background:#e0f2fe;color:#0284c7">👶</div>
          <div class="stat-info">
            <span class="stat-label">إجمالي الأطفال</span>
            <span class="stat-value" id="statTotalChildren">0</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:#dcfce7;color:#16a34a">✅</div>
          <div class="stat-info">
            <span class="stat-label">حضور اليوم</span>
            <span class="stat-value" id="statTodayPresent">0</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:#fee2e2;color:#dc2626">🚨</div>
          <div class="stat-info">
            <span class="stat-label">حوادث الشهر</span>
            <span class="stat-value" id="statMonthIncidents">0</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:#fef9c3;color:#ca8a04">💵</div>
          <div class="stat-info">
            <span class="stat-label">دخل الشهر الحالي</span>
            <span class="stat-value" id="statMonthRevenue">0</span>
          </div>
        </div>
      </div>

      <div class="card" style="margin-top:1.5rem">
        <h3 class="card-title">👶 تسجيل طفل جديد بالنظام</h3>
        <div class="field-group">
          <label>اسم الطفل ثلاثي</label>
          <input type="text" id="regName" placeholder="مثال: محمد أحمد محمود" />
        </div>
        <div class="field-group">
          <label>المصاريف الشهرية المستحقة (ج.م)</label>
          <input type="number" id="regFee" placeholder="مثال: 500" />
        </div>
        <button class="btn-submit" onclick="submitRegister()">
          <span>➕</span> تسجيل الطفل في الروضة
        </button>
      </div>
    </section>

    <section id="paymentsTab" class="tab-content">
      <div class="card">
        <h3 class="card-title">💰 تسجيل عملية دفع مصاريف</h3>
        <div class="field-group">
          <label>اختر الطفل</label>
          <select id="payChildSelect">
            <option value="">-- جاري تحميل القائمة... --</option>
          </select>
        </div>
        <div class="field-group">
          <label>المبلغ المدفوع (ج.م)</label>
          <input type="number" id="payAmount" placeholder="سيتم إدراج المتبقي تلقائياً" />
        </div>
        <button class="btn-submit" id="btnSubmitPayment" onclick="submitPayment()" disabled>
          <span>💰</span> تسجيل الدفعة
        </button>
      </div>

      <div class="section-title-row">
        <h3 class="section-heading">حالة التحصيل — هذا الشهر</h3>
        <button class="refresh-btn" onclick="loadPaymentsTab()">↻</button>
      </div>
      <div class="field-group" style="margin-bottom:1rem">
        <input type="text" id="paySearch" placeholder="🔍 ابحث باسم الطفل..." oninput="filterPaymentStatus()" />
      </div>

      <div class="section-title-row">
        <h3 class="section-heading" style="color:#ef4444">❌ لم يدفع / جزئي</h3>
        <span id="unpaidCount" style="font-size:0.8rem;color:var(--text-muted)"></span>
      </div>
      <div class="pay-status-list" id="unpaidList">
        <div class="loading-placeholder">⏳ جاري التحميل...</div>
      </div>

      <div class="section-title-row" style="margin-top:1.5rem">
        <h3 class="section-heading" style="color:#22c55e">✅ دفعوا كامل</h3>
        <span id="paidCount" style="font-size:0.8rem;color:var(--text-muted)"></span>
      </div>
      <div class="pay-status-list" id="paidList">
        <div class="loading-placeholder">⏳ جاري التحميل...</div>
      </div>
    </section>

  </main>

  <div class="toast" id="toast"></div>

  <div class="loading-overlay" id="loadingOverlay">
    <div class="spinner"></div>
    <div class="loading-text">جاري تحديث البيانات السحابية...</div>
  </div>

  <script src="director.js"></script>
</body>
</html>
