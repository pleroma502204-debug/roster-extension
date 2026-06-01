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
  const regularEmps = employees.filter(e => e.mobility === '正班' && e.shift !== '日/夜');

  return sites.map(site => {
    const newShifts = { day: [], night: [] };

    for (const period of ['day', 'night']) {
      newShifts[period] = (site.shifts[period] ?? []).map(shift => {
        const used = regularEmps
          .flatMap(e => e.arrSites ?? [])
          .filter(a => a.siteId === site.id && a.duty === shift.duty)
          .length;
        return { ...shift, last: Math.max(0, shift.count - used) };
      });
    }

    return { ...site, shifts: newShifts };
  });
}

/**
 * 為新據點產生不重複的代表字
 * 優先順序：簡稱第一字 → 簡稱其他字 → 全稱各字 → 修改其他據點
 */
export function assignRepChar(newSite, allSites) {
  const used   = new Set(allSites.filter(s => s.id !== newSite.id).map(s => s.name[2]).filter(Boolean));
  const full   = newSite.name[0] ?? '';
  const short  = newSite.name[1] ?? '';
  const pool   = [...short, ...full].filter(c => c.trim());

  for (const c of pool) {
    if (!used.has(c)) return c;
  }

  // 所有字都衝突，找其他據點裡可以讓出的字
  for (const site of allSites) {
    if (site.id === newSite.id) continue;
    const altPool = [...(site.name[1] ?? ''), ...(site.name[0] ?? '')].filter(c => c.trim());
    for (const c of altPool) {
      if (!used.has(c) || c === site.name[2]) {
        // 把該據點的代表字改掉，把 c 讓給新據點
        site.name[2] = altPool.find(x => x !== c && !used.has(x)) ?? site.name[2];
        return c;
      }
    }
  }
  return full[0] ?? '？';
}