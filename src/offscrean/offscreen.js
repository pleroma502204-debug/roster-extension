// offscreen.js
// 在 offscreen document 中執行 ExcelJS，產生 XLSX 並觸發下載

import { exportCommunityXlsx, exportEmployeeXlsx, exportBigXlsx } from '../core/services/exportEngine.js';
import { buildHolidayDaySet } from '../core/services/holidayService.js';

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action !== '_XLSX_EXPORT') return;
  const { settings, sites, employees, schedule, month } = msg.payload;
  const holDays = buildHolidayDaySet(month, settings);

  (async () => {
    await exportCommunityXlsx(settings, schedule, sites, employees,           holDays);
    await exportEmployeeXlsx( settings, schedule, sites, employees,           holDays);
    await exportBigXlsx(      settings, schedule, sites, employees,           holDays);
  })();
});