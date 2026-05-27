// ════════════════════════════════════════════
// shared/utils/date.js
// ════════════════════════════════════════════

/** 'YYYY-MM' → { y, m, days } */
export function parseMonth(month) {
  if (!month) return null;
  const [y, m] = month.split('-').map(Number);
  return { y, m, days: new Date(y, m, 0).getDate() };
}

/** 'YYYY-MM-DD' → 距今天數（負數表示已過期） */
export function daysUntil(dateStr) {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

/** 'YYYY-MM-DD' → 'YYYY/MM/DD'，空值回傳 '—' */
export function formatDate(dateStr) {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('-');
  return `${y}/${m}/${d}`;
}

/** 'YYYY-MM' → '民國 NNN 年 M 月' */
export function rocMonthLabel(month) {
  if (!month) return '';
  const [y, m] = month.split('-');
  return `民國 ${parseInt(y) - 1911} 年 ${parseInt(m)} 月`;
}

/** (year, month1based, day) → 'YYYYMMDD' */
export function toDateStr(y, m, d) {
  return `${y}${String(m).padStart(2, '0')}${String(d).padStart(2, '0')}`;
}

// ── appNow：全域時鐘 ──────────────────────────
let _now = _format(new Date());

function _format(d) {
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ` +
         `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/** 取得當前時間字串 'YYYY-MM-DD HH:MM:SS' */
export function appNow() { return _now; }

/** 啟動時鐘，每秒更新並刷新所有 #app-now 元素 */
export function startClock() {
  const tick = () => {
    _now = _format(new Date());
    document.querySelectorAll('#app-now').forEach(el => {
      el.textContent = _now;
    });
  };
  tick();
  setInterval(tick, 1000);
}