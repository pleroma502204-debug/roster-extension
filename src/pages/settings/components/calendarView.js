// ════════════════════════════════════════════
// pages/settings/components/calendarView.js
// 平假日行事曆
// ════════════════════════════════════════════

import { getSettingsState, setSettingsState } from '../../../core/store/globalState.js';
import { bindEl }                             from '../../../shared/utils/dom.js';
import { showHint }                           from '../../../shared/utils/notify.js';

const TODAY = new Date();

/**
 * 初始化行事曆，回傳 { getYear, getMonth } 供 main.js 在儲存月份時同步更新
 *
 * @param {{ calYear: number, calMonth: number, cleanups: Function[] }} ctx
 */
export function setupCalendar(ctx) {
  bindEl('cal-prev', 'click', () => {
    ctx.calMonth--;
    if (ctx.calMonth < 0) { ctx.calMonth = 11; ctx.calYear--; }
    renderCalendar(ctx);
  }, ctx.cleanups);
  bindEl('cal-next', 'click', () => {
    ctx.calMonth++;
    if (ctx.calMonth > 11) { ctx.calMonth = 0; ctx.calYear++; }
    renderCalendar(ctx);
  }, ctx.cleanups);
  bindEl('btn-fetch-holidays', 'click', () => fetchHolidays(ctx), ctx.cleanups);
  bindEl('btn-reset-overrides', 'click', () => resetOverrides(ctx), ctx.cleanups);

  renderCalendar(ctx);
}

export function renderCalendar(ctx) {
  const settings   = getSettingsState();
  const holidayMap = settings.holidayMap?.[String(ctx.calYear)] ?? {};
  const overrides  = settings.calOverrides ?? {};

  document.getElementById('cal-title').textContent = `${ctx.calYear} 年 ${ctx.calMonth + 1} 月`;

  const grid        = document.getElementById('cal-grid');
  const firstDay    = new Date(ctx.calYear, ctx.calMonth, 1).getDay();
  const daysInMonth = new Date(ctx.calYear, ctx.calMonth + 1, 0).getDate();
  grid.innerHTML    = '';

  for (let i = 0; i < firstDay; i++) {
    const blank = document.createElement('div');
    blank.className = 'cal-day empty';
    grid.appendChild(blank);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${ctx.calYear}${String(ctx.calMonth+1).padStart(2,'0')}${String(d).padStart(2,'0')}`;
    const dow     = new Date(ctx.calYear, ctx.calMonth, d).getDay();
    const isToday = ctx.calYear  === TODAY.getFullYear()
                 && ctx.calMonth === TODAY.getMonth()
                 && d === TODAY.getDate();

    const override  = overrides[dateStr];
    let   isHoliday;
    if (override)                   isHoliday = override === 'holiday';
    else if (dateStr in holidayMap) isHoliday = holidayMap[dateStr];
    else                            isHoliday = (dow === 0 || dow === 6);

    const cell = document.createElement('div');
    cell.className = 'cal-day';
    if (override) cell.classList.add(override === 'holiday' ? 'override-holiday' : 'override-work');
    else          cell.classList.add(isHoliday ? 'holiday' : 'workday');
    if (isToday)  cell.classList.add('today');

    const numEl = document.createElement('div');
    numEl.className   = 'day-num';
    numEl.textContent = d;
    cell.appendChild(numEl);

    const rawArr = settings.holidayRaw?.[String(ctx.calYear)];
    if (rawArr) {
      const item = rawArr.find(x => x.date === dateStr);
      if (item?.description) {
        const lbl = document.createElement('div');
        lbl.className   = 'day-label';
        lbl.textContent = item.description;
        cell.appendChild(lbl);
      }
    }

    cell.addEventListener('click', () => _toggleDay(ctx, dateStr, isHoliday));
    grid.appendChild(cell);
  }
}

async function _toggleDay(ctx, dateStr, currentIsHoliday) {
  const overrides = { ...(getSettingsState().calOverrides ?? {}) };
  if (overrides[dateStr]) delete overrides[dateStr];
  else overrides[dateStr] = currentIsHoliday ? 'workday' : 'holiday';
  await setSettingsState({ calOverrides: overrides });
  renderCalendar(ctx);
  showHint('cal-hint');
}

async function resetOverrides(ctx) {
  await setSettingsState({ calOverrides: {} });
  renderCalendar(ctx);
  showHint('cal-hint');
}

async function fetchHolidays(ctx) {
  const hint = document.getElementById('cal-fetch-hint');
  if (hint) { hint.textContent = `正在抓取 ${ctx.calYear} 年假日資料…`; hint.classList.add('show'); }
  try {
    const url  = `https://cdn.jsdelivr.net/gh/ruyut/TaiwanCalendar/data/${ctx.calYear}.json`;
    const res  = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const yearMap = {};
    for (const item of data) yearMap[item.date] = item.isHoliday;

    const holidayMap = { ...(getSettingsState().holidayMap ?? {}) };
    const holidayRaw = { ...(getSettingsState().holidayRaw ?? {}) };
    holidayMap[String(ctx.calYear)] = yearMap;
    holidayRaw[String(ctx.calYear)] = data;
    await setSettingsState({ holidayMap, holidayRaw });

    if (hint) {
      hint.textContent = `✓ 已載入 ${ctx.calYear} 年假日資料（共 ${data.length} 筆）`;
      setTimeout(() => hint.classList.remove('show'), 3000);
    }
    renderCalendar(ctx);
  } catch (e) {
    if (hint) hint.textContent = `✗ 載入失敗：${e.message}`;
  }
}