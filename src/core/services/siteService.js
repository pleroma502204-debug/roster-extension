// ════════════════════════════════════════════
// core/services/siteService.js
// 據點純計算——不碰 DOM / storage
// ════════════════════════════════════════════

/**
 * 根據正班預排重新計算所有據點 shifts 的 last（剩餘名額）
 * 儲存員工後呼叫，結果再透過 globalState.setSites() 寫回。
 *
 * @param {Site[]}     sites
 * @param {Employee[]} employees
 * @returns {Site[]}   新的 sites 陣列（immutable）
 */
export function recalcLast(sites, employees) {
  const regularEmps = employees.filter(e => e.isReg && e.shift !== 'both');

  return sites.map(site => {
    const newShifts = { day: [], night: [] };

    for (const period of ['day', 'night']) {
      newShifts[period] = (site.shifts[period] ?? []).map(shift => {
        const used = regularEmps
          .flatMap(e => e.arranged ?? [])
          .filter(a => a.siteId === site.id && a.duties?.includes(shift.duty))
          .length;
        return { ...shift, last: Math.max(0, shift.count - used) };
      });
    }

    return { ...site, shifts: newShifts };
  });
}
