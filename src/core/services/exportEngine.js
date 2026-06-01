// ════════════════════════════════════════════
// core/services/exportEngine.js
// ExcelJS 報表輸出——不碰 DOM
// ExcelJS 透過全域 window.ExcelJS 存取
// ════════════════════════════════════════════

import { rocMonthLabel } from '../../shared/utils/date.js';

// ── 樣式常數 ──────────────────────────────────
const FONT         = '微軟正黑體';
const YELLOW_FILL  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF9C4' } };
const RED_FILL     = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE0E0' } };
const BLACK_FILL   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF111111' } };
const NO_FILL      = { type: 'pattern', pattern: 'none' };
const HEADER_FILL  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E2E50' } };
const HEADER_FONT  = { name: FONT, bold: true, color: { argb: 'FFDDE1FF' }, size: 14 };
const LABEL_FONT   = { name: FONT, bold: true, size: 14 };
const NORMAL_FONT  = { name: FONT, size: 14 };
const LEAVE_FONT   = { name: FONT, bold: true, color: { argb: 'FFCC0000' }, size: 14 };
const BLOCKED_FONT = { name: FONT, bold: true, color: { argb: 'FF444444' }, size: 14 };
const THIN_BORDER  = {
  top:    { style: 'thin', color: { argb: 'FF2E2E50' } },
  bottom: { style: 'thin', color: { argb: 'FF2E2E50' } },
  left:   { style: 'thin', color: { argb: 'FF2E2E50' } },
  right:  { style: 'thin', color: { argb: 'FF2E2E50' } },
};

// ── 特殊日 Map 輔助 ───────────────────────────
function _buildDistrictDayMap(sites, month) {
  const map = {};
  for (const site of sites) {
    if (!site.districtDate) continue;
    if (site.districtDate.slice(0, 7) !== month) continue;
    map[site.id] = parseInt(site.districtDate.slice(8));
  }
  return map;
}

function _buildResignDayMap(employees, month) {
  const map = {};
  for (const emp of employees) {
    if (!emp.resignDate) continue;
    if (emp.resignDate.slice(0, 7) !== month) continue;
    map[emp.id] = parseInt(emp.resignDate.slice(8));
  }
  return map;
}

// ── 內部輔助 ──────────────────────────────────
function _getCellFill(isHol, isDistDay) {
  if (isDistDay) return RED_FILL;
  if (isHol)     return YELLOW_FILL;
  return NO_FILL;
}

function applyCell(cell, value, isHol, isDistDay) {
  const display = (value === 'work' || value === 'dash')
    ? '' : (value ?? '');
  const isLeave = display !== '';
  cell.value     = display;
  cell.font      = isLeave ? LEAVE_FONT : NORMAL_FONT;
  cell.fill      = _getCellFill(isHol, isDistDay);
  cell.border    = THIN_BORDER;
  cell.alignment = { horizontal: 'center', vertical: 'middle' };
}

function applyBlockedCell(cell) {
  cell.value     = '✕';
  cell.font      = BLOCKED_FONT;
  cell.fill      = BLACK_FILL;
  cell.border    = THIN_BORDER;
  cell.alignment = { horizontal: 'center', vertical: 'middle' };
}

function buildDateHeaderRow(ws, month, days, holDays, districtDay, labelColWidth) {
  const corner = ws.getCell(1, 1);
  corner.font      = HEADER_FONT;
  corner.fill      = HEADER_FILL;
  corner.border    = THIN_BORDER;
  corner.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getColumn(1).width = labelColWidth;

  for (let d = 1; d <= days; d++) {
    const cell      = ws.getCell(1, d + 1);
    const isHol     = holDays.has(d);
    const isDistDay = districtDay === d;
    cell.value     = d;
    cell.font      = HEADER_FONT;
    cell.fill      = isDistDay ? RED_FILL : isHol ? YELLOW_FILL : HEADER_FILL;
    cell.border    = THIN_BORDER;
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getColumn(d + 1).width = 4;
  }
  ws.getRow(1).height = 22;
}

async function downloadWorkbook(wb, filename) {
  const buf  = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ── 社區班表 ──────────────────────────────────
export async function exportCommunityXlsx(settings, schedule, allSites, allEmps, holDays) {
  const month          = settings.month ?? '';
  const [y, m]         = month.split('-');
  const days           = new Date(+y, +m, 0).getDate();
  const wb             = new ExcelJS.Workbook();
  wb.creator           = settings.orgName ?? '排班小幫手';
  const districtDayMap = _buildDistrictDayMap(allSites, month);
  const resignDayMap   = _buildResignDayMap(allEmps, month);

  for (const site of allSites) {
    const districtDay = districtDayMap[site.id] ?? null;
    const ws          = wb.addWorksheet((site.shortName || site.name).slice(0, 31));
    buildDateHeaderRow(ws, month, days, holDays, districtDay, 12);
    ws.getCell(1, 1).value = `${site.shortName || site.name}  ${rocMonthLabel(month)}`;

    const siteData = schedule[site.id] ?? {};
    let row = 2;
    for (const emp of allEmps) {
      const resignDay = resignDayMap[emp.id] ?? null;
      const dayMap    = siteData[emp.id] ?? {};
      const nameCell  = ws.getCell(row, 1);
      nameCell.value     = emp.name;
      nameCell.font      = LABEL_FONT;
      nameCell.border    = THIN_BORDER;
      nameCell.alignment = { horizontal: 'left', vertical: 'middle' };
      for (let d = 1; d <= days; d++) {
        const cell = ws.getCell(row, d + 1);
        if (resignDay !== null && d > resignDay) {
          applyBlockedCell(cell);
        } else {
          applyCell(cell, d in dayMap ? dayMap[d] : '', holDays.has(d), districtDay === d);
        }
      }
      ws.getRow(row).height = 20;
      row++;
    }
  }
  await downloadWorkbook(wb, `社區班表_${month}.xlsx`);
}

// ── 人員班表（全員）──────────────────────────
export async function exportEmployeeXlsx(settings, schedule, allSites, allEmps, holDays) {
  const month          = settings.month ?? '';
  const [y, m]         = month.split('-');
  const days           = new Date(+y, +m, 0).getDate();
  const wb             = new ExcelJS.Workbook();
  wb.creator           = settings.orgName ?? '排班小幫手';
  const districtDayMap = _buildDistrictDayMap(allSites, month);
  const resignDayMap   = _buildResignDayMap(allEmps, month);

  for (const emp of allEmps) {
    const resignDay = resignDayMap[emp.id] ?? null;
    const ws        = wb.addWorksheet(emp.name.slice(0, 31));
    buildDateHeaderRow(ws, month, days, holDays, null, 12);
    ws.getCell(1, 1).value = `${emp.name}  ${rocMonthLabel(month)}`;

    let row = 2;
    for (const site of allSites) {
      const districtDay = districtDayMap[site.id] ?? null;
      const dayMap      = schedule[site.id]?.[emp.id] ?? {};
      const nameCell    = ws.getCell(row, 1);
      nameCell.value     = site.shortName || site.name;
      nameCell.font      = LABEL_FONT;
      nameCell.border    = THIN_BORDER;
      nameCell.alignment = { horizontal: 'left', vertical: 'middle' };
      for (let d = 1; d <= days; d++) {
        const cell = ws.getCell(row, d + 1);
        if (resignDay !== null && d > resignDay) {
          applyBlockedCell(cell);
        } else {
          applyCell(cell, d in dayMap ? dayMap[d] : '', holDays.has(d), districtDay === d);
        }
      }
      ws.getRow(row).height = 20;
      row++;
    }
  }
  await downloadWorkbook(wb, `人員班表_${month}.xlsx`);
}

// ── 大班表 ────────────────────────────────────
export async function exportBigXlsx(settings, schedule, allSites, allEmps, holDays) {
  const month        = settings.month ?? '';
  const [y, m]       = month.split('-');
  const days         = new Date(+y, +m, 0).getDate();
  const wb           = new ExcelJS.Workbook();
  const ws           = wb.addWorksheet('大班表');
  const resignDayMap = _buildResignDayMap(allEmps, month);
  buildDateHeaderRow(ws, month, days, holDays, null, 12);
  ws.getCell(1, 1).value = `${settings.orgName ?? ''}  ${rocMonthLabel(month)}`;

  let row = 2;
  for (const emp of allEmps) {
    const resignDay = resignDayMap[emp.id] ?? null;
    const nameCell  = ws.getCell(row, 1);
    nameCell.value     = emp.name;
    nameCell.font      = LABEL_FONT;
    nameCell.border    = THIN_BORDER;
    nameCell.alignment = { horizontal: 'left', vertical: 'middle' };

    for (let d = 1; d <= days; d++) {
      const cell = ws.getCell(row, d + 1);
      if (resignDay !== null && d > resignDay) {
        applyBlockedCell(cell);
        continue;
      }
      const isHol  = holDays.has(d);
      let cellVal  = ''; let isLeave = false;
      for (const site of allSites) {
        const dayMap = schedule[site.id]?.[emp.id];
        if (!dayMap || !(d in dayMap)) continue;
        const val = dayMap[d];
        if (val === 'dash') continue;
        if (val === 'work') { cellVal = site.name[2] || site.name[1]?.[0] || site.name[0]?.[0]; break; }
        cellVal = val; isLeave = true; break;
      }
      cell.value     = cellVal;
      cell.font      = isLeave ? LEAVE_FONT : NORMAL_FONT;
      cell.fill      = isHol ? YELLOW_FILL : NO_FILL;
      cell.border    = THIN_BORDER;
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    }
    ws.getRow(row).height = 20;
    row++;
  }
  await downloadWorkbook(wb, `大班表_${month}.xlsx`);
}