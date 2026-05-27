// ════════════════════════════════════════════
// core/services/scheduleEngine.js
// 排班狀態機——純函式，不碰 DOM / storage
// ════════════════════════════════════════════

/**
 * 假別循環：undefined → 'work' → leave[0] → … → leave[n-1] → undefined
 *
 * @param {string|undefined} current
 * @param {string[]}         leaveTypes
 * @returns {string|undefined}
 */
export function nextLeave(current, leaveTypes) {
  if (current === undefined)  return 'work';
  if (current === 'work')     return leaveTypes[0];
  const idx = leaveTypes.indexOf(current);
  if (idx !== -1 && idx < leaveTypes.length - 1) return leaveTypes[idx + 1];
  if (idx === leaveTypes.length - 1)              return undefined;
  return 'work';
}

/**
 * 反向假別循環：undefined ← work ← leave[0] ← … ← leave[n-1] ← undefined
 */
export function prevLeave(current, leaveTypes) {
  if (current === undefined)              return leaveTypes[leaveTypes.length - 1];
  if (current === leaveTypes[0])          return 'work';
  if (current === 'work')                 return undefined;
  const idx = leaveTypes.indexOf(current);
  if (idx > 0)                            return leaveTypes[idx - 1];
  return undefined;
}

/**
 * 點擊格後，計算整個 schedule 的下一個狀態（immutable）
 *
 * @param {object} params
 * @param {object}   params.schedule
 * @param {string}   params.siteId
 * @param {string}   params.empId
 * @param {number}   params.day
 * @param {string[]} params.leaveTypes
 * @param {Employee} params.emp
 * @param {'forward'|'backward'} [params.direction='forward']
 * @returns {object}
 */
export function applyClick({ schedule, siteId, empId, day, leaveTypes, emp, direction = 'forward' }) {
  const next = { ...schedule };
  const cur  = next[siteId]?.[empId]?.[day];

  // dash 左右鍵都清空
  let nextVal;
  if (cur === 'dash') {
    nextVal = undefined;
  } else {
    nextVal = direction === 'backward'
      ? prevLeave(cur, leaveTypes)
      : nextLeave(cur, leaveTypes);
  }

  // 寫入目標格
  next[siteId] = { ...next[siteId] };
  next[siteId][empId] = { ...next[siteId][empId] };
  if (nextVal === undefined) {
    delete next[siteId][empId][day];
  } else {
    next[siteId][empId][day] = nextVal;
  }

  // 跨據點 dash 聯動
  const otherSiteIds = (emp.arranged ?? [])
    .map(a => a.siteId)
    .filter(id => id !== siteId);

  for (const otherId of otherSiteIds) {
    next[otherId] = { ...next[otherId] };
    next[otherId][empId] = { ...next[otherId][empId] };

    if (nextVal === 'work') {
      next[otherId][empId][day] = 'dash';
    } else if (nextVal === undefined) {
      delete next[otherId][empId][day];
    } else {
      // 假別：其他據點也同步
      next[otherId][empId][day] = nextVal;
    }
  }

  return next;
}