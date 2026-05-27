// ════════════════════════════════════════════
// core/services/holidayService.js
// 假日集合計算——純函式，不碰 DOM / storage
// ════════════════════════════════════════════

import { toDateStr, parseMonth } from '../../shared/utils/date.js';

/**
 * 建立假日 Set<'YYYYMMDD'>
 * 供 schedule 頁的 isHoliday() 使用。
 *
 * @param {string} month      - 'YYYY-MM'
 * @param {object} settings   - 含 holidayMap / calOverrides
 * @returns {Set<string>}
 */
export function buildHolidaySet(month, settings) {
  const set = new Set();
  if (!month) return set;

  const [y, m]  = month.split('-');
  const map     = settings.holidayMap?.[y] ?? {};
  const over    = settings.calOverrides ?? {};
  const days    = new Date(+y, +m, 0).getDate();

  // fallback：無 API 資料時，六日視為假日
  if (Object.keys(map).length === 0) {
    for (let d = 1; d <= days; d++) {
      const dow = new Date(+y, +m - 1, d).getDay();
      if (dow === 0 || dow === 6) set.add(toDateStr(y, m, d));
    }
  } else {
    for (const [ds, isHol] of Object.entries(map)) {
      if (isHol) set.add(ds);
    }
  }

  // 套手動覆蓋
  for (const [ds, val] of Object.entries(over)) {
    if (val === 'holiday') set.add(ds);
    else                   set.delete(ds);
  }

  return set;
}

/**
 * 從 Set<'YYYYMMDD'> 判斷某日是否為假日
 * @param {Set<string>} holidaySet
 * @param {number|string} y
 * @param {number|string} m
 * @param {number|string} d
 */
export function isHoliday(holidaySet, y, m, d) {
  return holidaySet.has(toDateStr(y, m, d));
}

/**
 * 建立假日 Set<number>（day number，供 exportEngine 使用）
 * @param {string} month
 * @param {object} settings
 * @returns {Set<number>}
 */
export function buildHolidayDaySet(month, settings) {
  if (!month) return new Set();
  const [y, m]  = month.split('-');
  const moStr   = String(m).padStart(2, '0');
  const map     = settings.holidayMap?.[y] ?? {};
  const over    = settings.calOverrides ?? {};
  const days    = new Date(+y, +m, 0).getDate();
  const set     = new Set();

  if (Object.keys(map).length === 0) {
    for (let d = 1; d <= days; d++) {
      const dow = new Date(+y, +m - 1, d).getDay();
      if (dow === 0 || dow === 6) set.add(d);
    }
  } else {
    for (const [ds, isHol] of Object.entries(map)) {
      if (ds.startsWith(`${y}${moStr}`)) {
        const d = parseInt(ds.slice(6));
        if (isHol) set.add(d);
      }
    }
  }

  for (const [ds, val] of Object.entries(over)) {
    if (ds.startsWith(`${y}${moStr}`)) {
      const d = parseInt(ds.slice(6));
      if (val === 'holiday') set.add(d);
      else                   set.delete(d);
    }
  }

  return set;
}
