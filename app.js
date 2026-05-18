/* app.js — نجوم Sales Demo */

/* ============================
   ANIMATED COUNTERS
   ============================ */
function animateCounter(el, target, duration = 1800) {
  const start = performance.now();
  const from = 0;

  function update(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    // Ease out expo
    const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
    const current = Math.round(from + (target - from) * eased);
    el.textContent = current.toLocaleString('ar-EG');
    if (progress < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

function initCounters() {
  const statNums = document.querySelectorAll('.stat-num[data-target]');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const target = parseInt(el.dataset.target);
        animateCounter(el, target);
        observer.unobserve(el);
      }
    });
  }, { threshold: 0.3 });

  statNums.forEach(el => observer.observe(el));
}

/* ============================
   LIVE ACTIVITY FEED
   ============================ */
const feedEvents = [
  { icon: '✅', name: 'مريم أحمد', text: 'وصلت الحضانة بأمان', type: 'present' },
  { icon: '🏠', name: 'خالد محمود', text: 'انصرف مع والده', type: 'checkout' },
  { icon: '📝', name: 'ليلى إبراهيم', text: 'ملاحظة: أداء ممتاز في الرياضيات', type: 'note' },
  { icon: '💰', name: 'عمر حسن', text: 'دُفعت رسوم مايو كاملة', type: 'payment' },
  { icon: '✅', name: 'رانيا سمير', text: 'وصلت الحضانة بأمان', type: 'present' },
  { icon: '🚨', name: 'يوسف علي', text: 'حادثة بسيطة — تم التعامل معها', type: 'incident' },
  { icon: '🏠', name: 'نادية كريم', text: 'انصرفت مع جدتها', type: 'checkout' },
  { icon: '✅', name: 'أيمن فاروق', text: 'وصل الحضانة بأمان', type: 'present' },
  { icon: '📊', name: 'سلمى طارق', text: 'تقييم اللغة العربية: ممتاز', type: 'note' },
  { icon: '💰', name: 'إياد منصور', text: 'دُفع جزء من رسوم مايو', type: 'payment' },
];

let feedIndex = 0;

function addFeedItem() {
  const feed = document.getElementById('previewFeed');
  if (!feed) return;

  const event = feedEvents[feedIndex % feedEvents.length];
  feedIndex++;

  const times = ['للتو', 'منذ دقيقة', 'منذ دقيقتين', 'منذ 3 دقائق'];
  const time = times[Math.floor(Math.random() * times.length)];

  const li = document.createElement('li');
  li.className = 'feed-item';
  li.dataset.type = event.type;
  li.style.animation = 'fadeSlideIn 0.4s ease both';
  li.innerHTML = `
    <span class="feed-icon">${event.icon}</span>
    <div class="feed-body">
      <strong>${event.name}</strong> — ${event.text}
      <span class="feed-time">${time}</span>
    </div>
  `;

  feed.insertBefore(li, feed.firstChild);

  // Keep max 5 items
  while (feed.children.length > 5) {
    feed.removeChild(feed.lastChild);
  }
}

function initLiveFeed() {
  // Add new feed items every 4 seconds
  setInterval(addFeedItem, 4000);
}

/* ============================
   TELEGRAM MESSAGES SIMULATION
   ============================ */
const tgMessages = [
  { text: '✅ <strong>أحمد محمد</strong> وصل الحضانة بأمان 🌟<br/>📅 اليوم | 🏫 KG1-A', time: '08:31' },
  { text: '❌ <strong>سارة خالد</strong> غائبة اليوم<br/>📅 اليوم | 🏫 KG1-B', time: '08:32' },
  { text: '🏠 <strong>محمد علي</strong> انصرف بأمان<br/>👤 استلمه: والده | 📅 اليوم', time: '12:45' },
  { text: '💰 <strong>إيصال دفع</strong> — رانيا سمير<br/>✅ المدفوع: 1500 جنيه | الحالة: مدفوع', time: '10:15' },
  { text: '⚠️ <strong>ملاحظة</strong> على نور إبراهيم<br/>📝 تحتاج مستلزمات دراسية | 🏫 KG2-A', time: '09:55' },
];

let tgIndex = 1;

function addTelegramMsg() {
  const container = document.getElementById('tgMessages');
  if (!container) return;

  const msg = tgMessages[tgIndex % tgMessages.length];
  tgIndex++;

  const div = document.createElement('div');
  div.className = 'tg-msg';
  div.style.animation = 'fadeSlideIn 0.4s ease both';
  div.innerHTML = `
    <div class="tg-bubble">${msg.text}</div>
    <span class="tg-ts">${msg.time} ✓✓</span>
  `;

  container.appendChild(div);

  // Keep max 3 messages
  while (container.children.length > 3) {
    container.removeChild(container.firstChild);
  }
}

function initTelegramSim() {
  setInterval(addTelegramMsg, 5500);
}

/* ============================
   CHART BARS ANIMATION
   ============================ */
function animateChartBars() {
  const bars = document.querySelectorAll('.bar-fill');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        // Bars are already set via CSS --h variable; just ensure they animate
        const bar = entry.target;
        bar.style.opacity = '0';
        bar.style.height = '0';
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            bar.style.transition = 'height 1s cubic-bezier(0.16,1,0.3,1), opacity 0.5s ease';
            bar.style.opacity = '1';
            bar.style.height = bar.style.getPropertyValue('--h') || getComputedStyle(bar).getPropertyValue('--h');
          });
        });
        observer.unobserve(bar);
      }
    });
  }, { threshold: 0.1 });

  bars.forEach(b => observer.observe(b));
}

/* ============================
   SCROLL REVEAL
   ============================ */
function initScrollReveal() {
  const targets = document.querySelectorAll(
    '.feat-card, .wf-step, .trust-card, .class-card, .pcard'
  );

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        entry.target.style.animation = `fadeUp 0.5s ${i * 0.05}s ease both`;
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  targets.forEach(t => {
    t.style.opacity = '0';
    observer.observe(t);
  });
}

/* ============================
   CLASS MODAL
   ============================ */
const classChildren = {
  'KG1-A': [
    { name: 'أحمد محمد', present: true },
    { name: 'فاطمة علي', present: true },
    { name: 'محمد حسن', present: true },
    { name: 'سارة إبراهيم', present: true },
    { name: 'علي كريم', present: false },
    { name: 'نور طارق', present: true },
    { name: 'ياسمين أحمد', present: true },
    { name: 'عمر سمير', present: true },
  ],
  'KG1-B': [
    { name: 'مريم خالد', present: true },
    { name: 'يوسف حسين', present: true },
    { name: 'ليلى محمود', present: false },
    { name: 'كريم عادل', present: true },
    { name: 'رانيا وليد', present: true },
    { name: 'أيمن فاروق', present: true },
  ],
  'KG2-A': [
    { name: 'سلمى منصور', present: true },
    { name: 'إياد حسن', present: false },
    { name: 'دينا أحمد', present: true },
    { name: 'طارق عمر', present: false },
    { name: 'هبة سعيد', present: true },
    { name: 'نادية مصطفى', present: true },
  ],
  'KG2-B': [
    { name: 'ماجدة كريم', present: true },
    { name: 'حسام علي', present: true },
    { name: 'إسلام طارق', present: true },
    { name: 'منى إبراهيم', present: true },
    { name: 'خالد محمود', present: true },
  ],
  'Nursery-A': [
    { name: 'لمار أحمد', present: true },
    { name: 'يزن محمد', present: true },
    { name: 'روان علي', present: false },
    { name: 'تالة سمير', present: true },
    { name: 'آدم حسن', present: true },
    { name: 'جنا وليد', present: true },
  ],
};

window.openClassModal = function(card) {
  const className = card.dataset.class;
  const teacher = card.dataset.teacher;
  const count = card.dataset.count;
  const present = card.dataset.present;

  document.getElementById('modalTitle').textContent = `فصل ${className}`;
  document.getElementById('modalMeta').textContent =
    `👩‍🏫 ${teacher} — ${present} حاضر من أصل ${count} طفل`;

  const childrenContainer = document.getElementById('modalChildren');
  const children = classChildren[className] || [];
  childrenContainer.innerHTML = children.map(c => `
    <div class="modal-child-row">
      <span class="modal-child-name">👤 ${c.name}</span>
      <span class="modal-child-status ${c.present ? 's-present' : 's-absent'}">
        ${c.present ? '✅ حاضر' : '❌ غائب'}
      </span>
    </div>
  `).join('');

  document.getElementById('classModal').classList.add('open');
};

window.closeModal = function(e) {
  if (e.target === document.getElementById('classModal')) {
    document.getElementById('classModal').classList.remove('open');
  }
};

/* ============================
   SMOOTH NAV HIGHLIGHT
   ============================ */
function initNavHighlight() {
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-links a[href^="#"]');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        navLinks.forEach(link => {
          link.style.color = '';
          if (link.getAttribute('href') === '#' + entry.target.id) {
            link.style.color = 'var(--text)';
          }
        });
      }
    });
  }, { threshold: 0.4 });

  sections.forEach(s => observer.observe(s));
}

/* ============================
   INIT ALL
   ============================ */
document.addEventListener('DOMContentLoaded', () => {
  initCounters();
  initLiveFeed();
  initTelegramSim();
  initScrollReveal();
  initNavHighlight();

  // Delay chart animation slightly so layout settles
  setTimeout(animateChartBars, 800);
});
