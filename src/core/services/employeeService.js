 // ════════════════════════════════════════════
// core/services/employeeService.js
// 人員純計算——不碰 DOM / storage
// ════════════════════════════════════════════

/**
 * 取得可預排的據點候選清單（純計算版）
 * 原 data.js 的 getArrangedCandidates() DOM 讀取部分已移至 employeeTab.js，
 * 計算邏輯集中在此。
 *
 * @param {object} params
 * @param {Site[]}     params.sites
 * @param {string}     params.empShift      - ''日班' | '夜班' |  '日/夜'
 * @param {string[]}   params.empDuties     - 已勾選的勤務
 * @param {boolean}    params.isReg
 * @param {string[]}   params.forbiddenIds  - 禁排的 siteId[]
 * @param {Array}      params.alreadyArranged - [{ siteId, duties[] }]（modal 內已預排）
 * @returns {{ site: Site, availableDuties: string[] }[]}
 */

import { SHIFT } from '../../shared/constants.js';
export function getArrangedCandidates({
  sites,
  empShift,
  empDuties,
  mobility,
  forbSiteIds,
  alreadyArrSites,
}) {
  const forbidSet    = new Set(forbSiteIds);
  const checkPeriods = empShift === '日班' ? ['day']
                     : empShift === '夜班' ? ['night']
                     : ['day', 'night'];
  const result = [];

  for (const site of sites) {
    if (forbidSet.has(site.id)) continue;

    const matchingDuties = new Set();

    for (const period of checkPeriods) {
      for (const shift of (site.shifts[period] ?? [])) {
        if (!empDuties.includes(shift.duty)) continue;

        if (mobility === '正班') {
          // 正班：用 last 判斷，再扣掉 modal 內已預排的數量
          const modalUsed = alreadyArrSites
            .filter(a => a.siteId === site.id && a.duty === shift.duty)
            .length;
          if (shift.last - modalUsed > 0) matchingDuties.add(shift.duty);
        } else {
          // 機動：不受滿員限制
          matchingDuties.add(shift.duty);
        }
      }
    }

    if (matchingDuties.size > 0) {
      result.push({ site, availableDuties: [...matchingDuties] });
    }
  }

  return result;
}
