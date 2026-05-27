// ════════════════════════════════════════════
// pages/schedule/main.js
// ════════════════════════════════════════════

import {
  getSettingsState, getSitesState,
  getEmployeesState, getScheduleState, setScheduleState,
  subscribe, getDerived,
} from '../../core/store/globalState.js';
import { buildHolidaySet, isHoliday } from '../../core/services/holidayService.js';
import { applyClick }                 from '../../core/services/scheduleEngine.js';
import { DOW_ZH }                     from '../../shared/constants.js';

const _cleanups = [];
let _holidaySet = new Set();

export async function mount() {
  _rebuildHolidaySet();
  _updateMonthLabel();
  _setupTabs();
  _populateSelects();
  renderBigTable();
  renderCommunityTable();
  renderEmployeeTable();

  const unsub = subscribe(key => {
    if (key === 'settings') {
      _rebuildHolidaySet();
      _updateMonthLabel();
      renderBigTable();
      renderCommunityTable();
      renderEmployeeTable();
    }
    if (key === 'sites' || key === 'employees') {
      _populateSelects();
      renderBigTable();
      renderCommunityTable();
      renderEmployeeTable();
    }
    if (key === 'schedule') {
      renderBigTable();
      renderCommunityTable();
      renderEmployeeTable();
    }
  });
  _cleanups.push(unsub);
}

export function unmount() {
  _cleanups.forEach(fn => fn());
  _cleanups.length = 0;
}

// ── 月份標籤 ──────────────────────────────────
function _updateMonthLabel() {
  const month = getSettingsState().month ?? '';
  const el    = document.getElementById('month-label');
  if (el) el.textContent = month
    ? month.replace('-', ' 年 ') + ' 月'
    : '尚未設定月份';
}

function _rebuildHolidaySet() {
  const s = getSettingsState();
  _holidaySet = buildHolidaySet(s.month ?? '', s);
}

// ── Tab 切換 ──────────────────────────────────
function _setupTabs() {
  document.querySelectorAll('#page-schedule .tab-nav .tab').forEach(btn => {
    const h = () => {
      document.querySelectorAll('#page-schedule .tab-nav .tab').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('#page-schedule .tab-content').forEach(s => s.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`tab-${btn.dataset.tab}`)?.classList.add('active');
    };
    btn.addEventListener('click', h);
    _cleanups.push(() => btn.removeEventListener('click', h));
  });
}

// ── Selects ───────────────────────────────────
function _populateSelects() {
  const { activeSites: sites, activeEmployees: employees } = getDerived();

  const siteSel = document.getElementById('site-select');
  if (siteSel) {
    siteSel.innerHTML = '<option value="">跳至據點…</option>';
    for (const s of sites) {
      const opt = document.createElement('option');
      opt.value = s.id; opt.textContent = s.name;
      siteSel.appendChild(opt);
    }
    const h = () => {
      const id = siteSel.value; if (!id) return;
      document.getElementById(`site-table-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      siteSel.value = '';
    };
    siteSel.addEventListener('change', h);
    _cleanups.push(() => siteSel.removeEventListener('change', h));
  }

  const empSel = document.getElementById('emp-select');
  if (empSel) {
    empSel.innerHTML = '<option value="">跳至人員…</option>';
    for (const e of employees) {
      const opt = document.createElement('option');
      opt.value = e.id; opt.textContent = e.name;
      empSel.appendChild(opt);
    }
    const h = () => {
      const id = empSel.value; if (!id) return;
      document.getElementById(`emp-table-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      empSel.value = '';
    };
    empSel.addEventListener('change', h);
    _cleanups.push(() => empSel.removeEventListener('change', h));
  }
}

// ── 月份 meta ─────────────────────────────────
function _getMonthMeta() {
  const month = getSettingsState().month ?? '';
  if (!month) return null;
  const [y, m] = month.split('-').map(Number);
  return { y, m, days: new Date(y, m, 0).getDate() };
}

/**
 * 通用：從陣列建立 { id → day } Map
 * 只收錄 dateField 落在 monthStr 內的項目
 */
function _buildDayMap(arr, dateField, monthStr) {
  const map = {};
  for (const item of arr) {
    const date = item[dateField];
    if (!date || date.slice(0, 7) !== monthStr) continue;
    map[item.id] = parseInt(date.slice(8));
  }
  return map;
}

function _getEmpDutyLabel(emp, siteId) {
  const arr = emp.arranged?.find(a => a.siteId === siteId);
  return arr?.duties?.length ? arr.duties.join('/') : '—';
}

// ── 格狀態 ────────────────────────────────────
function _applyCellState(td, val, readonly = false) {
  td.classList.remove('state-work', 'state-pending', 'state-leave', 'state-dash');
  if (val === undefined)   { td.classList.add('state-pending'); td.textContent = ''; }
  else if (val === 'work') { td.classList.add('state-work');    td.textContent = '✔'; }
  else if (val === 'dash') { td.classList.add('state-dash');    td.textContent = '-'; }
  else                     { td.classList.add('state-leave');   td.textContent = val; }
  if (readonly) td.style.pointerEvents = 'none';
}

/**
 * 套用格的特殊底色（區大日 > 假日，優先順序）
 * 回傳是否已套用特殊色（供呼叫方決定是否還要套假日色）
 */
function _applyCellBg(td, isHol, isDistrictDay, isBlocked) {
  if (isBlocked) {
    td.classList.remove('col-holiday');
    td.style.background   = '#111';
    td.style.pointerEvents = 'none';
    return;
  }
  if (isDistrictDay) {
    td.classList.remove('col-holiday');
    td.style.background = 'rgba(255, 107, 107, 0.18)';
    return;
  }
  if (isHol) td.classList.add('col-holiday');
}

// ── 大班表（唯讀，總覽 tab）──────────────────
export function renderBigTable() {
  const wrap = document.getElementById('big-wrap');
  if (!wrap) return;
  const meta = _getMonthMeta();
  if (!meta) { wrap.innerHTML = '<p class="empty-state">請先在設定頁選擇排班月份</p>'; return; }

  const { y, m, days } = meta;
  const { activeSites: sites, activeEmployees: employees } = getDerived();
  const schedule     = getScheduleState();
  const monthStr     = `${y}-${String(m).padStart(2, '0')}`;
  const resignDayMap = _buildDayMap(employees, 'resignDate', monthStr);
  wrap.innerHTML     = '';

  const table = _makeTable('big-table', days);
  _buildDateHeader(table, '大班表', y, m, days);

  const tbody = document.createElement('tbody');
  for (const emp of employees) {
    const tr = document.createElement('tr');
    const labelTd = document.createElement('td');
    labelTd.className   = 'row-label';
    labelTd.textContent = emp.name;
    tr.appendChild(labelTd);

    const resignDay = resignDayMap[emp.id] ?? null;

    for (let d = 1; d <= days; d++) {
      const hol       = isHoliday(_holidaySet, y, m, d);
      const isBlocked = resignDay !== null && d > resignDay;
      const td        = document.createElement('td');
      td.className    = 'day-cell';

      if (isBlocked) {
        _applyCellBg(td, false, false, true);
        td.textContent = '';
      } else {
        let cellVal = ''; let cellColor = '';
        for (const site of sites) {
          const v = schedule[site.id]?.[emp.id]?.[d];
          if (v === undefined) continue;
          if (v === 'work')  { cellVal = (site.shortName || site.name).charAt(0); cellColor = 'var(--text2)'; break; }
          if (v === 'dash')  { continue; }
          cellVal = v; break;
        }
        _applyCellBg(td, hol, false, false);
        _applyCellState(td, cellVal || undefined, true);
        if (cellColor) td.style.color = cellColor;
      }
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  wrap.appendChild(table);
}

// ── 社區班表（據點 tab，可點擊）──────────────
export function renderCommunityTable() {
  const wrap = document.getElementById('community-wrap');
  if (!wrap) return;
  const meta = _getMonthMeta();
  if (!meta) { wrap.innerHTML = '<p class="empty-state">請先在設定頁選擇排班月份</p>'; return; }

  const { y, m, days } = meta;
  const { activeSites: sites, activeEmployees: employees } = getDerived();
  const schedule       = getScheduleState();
  const monthStr       = `${y}-${String(m).padStart(2, '0')}`;
  const districtDayMap = _buildDayMap(sites, 'districtDate', monthStr);
  const resignDayMap   = _buildDayMap(employees, 'resignDate', monthStr);
  wrap.innerHTML       = '';

  for (const site of sites) {
    const siteData    = schedule[site.id] ?? {};
    const districtDay = districtDayMap[site.id] ?? null;
    const regularEmps = employees.filter(e =>  e.isReg && e.arranged?.some(a => a.siteId === site.id));
    const flexEmps    = employees.filter(e => !e.isReg && e.arranged?.some(a => a.siteId === site.id));

    const table = _makeTable(`site-table-${site.id}`, days);
    _buildDateHeader(table, site.shortName || site.name, y, m, days, districtDay);

    const tbody = document.createElement('tbody');
    for (const emp of regularEmps) {
      tbody.appendChild(_makeScheduleRow({ emp, siteId: site.id, siteData, y, m, days, districtDay, resignDayMap }));
    }
    if (regularEmps.length > 0 && flexEmps.length > 0) {
      tbody.appendChild(_makeSeparatorRow(days));
    }
    for (const emp of flexEmps) {
      tbody.appendChild(_makeScheduleRow({ emp, siteId: site.id, siteData, y, m, days, districtDay, resignDayMap }));
    }
    table.appendChild(tbody);
    wrap.appendChild(table);
  }
}

// ── 人員班表（人員 tab，可點擊）──────────────
export function renderEmployeeTable() {
  const wrap = document.getElementById('employee-wrap');
  if (!wrap) return;
  const meta = _getMonthMeta();
  if (!meta) { wrap.innerHTML = '<p class="empty-state">請先在設定頁選擇排班月份</p>'; return; }

  const { y, m, days } = meta;
  const { activeSites: sites, activeEmployees: employees } = getDerived();
  const schedule       = getScheduleState();
  const monthStr       = `${y}-${String(m).padStart(2, '0')}`;
  const districtDayMap = _buildDayMap(sites, 'districtDate', monthStr);
  const resignDayMap   = _buildDayMap(employees, 'resignDate', monthStr);
  wrap.innerHTML       = '';

  for (const emp of employees) {
    const arrangedSites = sites.filter(s => emp.arranged?.some(a => a.siteId === s.id));
    if (arrangedSites.length === 0) continue;

    const resignDay = resignDayMap[emp.id] ?? null;

    const table = _makeTable(`emp-table-${emp.id}`, days);
    _buildDateHeader(table, emp.name, y, m, days, null);

    const tbody = document.createElement('tbody');
    for (const site of arrangedSites) {
      const siteData    = schedule[site.id] ?? {};
      const districtDay = districtDayMap[site.id] ?? null;
      const tr          = document.createElement('tr');

      const labelTd = document.createElement('td');
      labelTd.className   = 'row-label';
      labelTd.textContent = `${site.shortName || site.name} ${_getEmpDutyLabel(emp, site.id)}`;
      labelTd.title       = site.name;
      tr.appendChild(labelTd);

      for (let d = 1; d <= days; d++) {
        const hol         = isHoliday(_holidaySet, y, m, d);
        const isDistDay   = districtDay === d;
        const isBlocked   = resignDay !== null && d > resignDay;
        const td          = document.createElement('td');
        td.className      = 'day-cell';

        if (isBlocked) {
          _applyCellBg(td, false, false, true);
        } else {
          _applyCellBg(td, hol, isDistDay, false);
          _applyCellState(td, siteData[emp.id]?.[d]);
          td.addEventListener('click',       () => _onCellClick({ empId: emp.id, siteId: site.id, day: d }));
          td.addEventListener('contextmenu', e => { e.preventDefault(); _onCellClick({ empId: emp.id, siteId: site.id, day: d, direction: 'backward' }); });
        }
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    wrap.appendChild(table);
  }
}

// ── 點擊格 ────────────────────────────────────
async function _onCellClick({ empId, siteId, day, direction = 'forward' }) {
  const emp = getEmployeesState().find(e => e.id === empId);
  if (!emp) return;
  const newSchedule = applyClick({
    schedule:   getScheduleState(),
    siteId, empId, day, direction,
    leaveTypes: getSettingsState().leaveTypes ?? [],
    emp,
  });
  await setScheduleState(newSchedule);
}

// ── DOM 輔助 ──────────────────────────────────
function _makeTable(id, days) {
  const table = document.createElement('table');
  table.className        = 'schedule-table';
  table.id               = id;
  table.style.width      = `calc(var(--row-label) + ${days} * var(--cell-w))`;
  table.style.marginBottom = '32px';
  return table;
}

function _buildDateHeader(table, cornerLabel, y, m, days, districtDay = null) {
  const thead  = document.createElement('thead');
  const headTr = document.createElement('tr');
  const cornerTh = document.createElement('th');
  cornerTh.className   = 'row-label';
  cornerTh.textContent = cornerLabel;
  headTr.appendChild(cornerTh);
  for (let d = 1; d <= days; d++) {
    const dow       = new Date(y, m - 1, d).getDay();
    const hol       = isHoliday(_holidaySet, y, m, d);
    const isDistDay = districtDay === d;
    const th        = document.createElement('th');
    // 區大日 > 假日，優先套紅色 header
    if (isDistDay) {
      th.className = 'day-header';
      th.style.background = 'rgba(255, 107, 107, 0.3)';
      th.style.color      = '#ff8080';
    } else {
      th.className = 'day-header' + (hol ? ' is-holiday' : '');
    }
    th.innerHTML = `${d}<span class="dow">${DOW_ZH[dow]}</span>`;
    headTr.appendChild(th);
  }
  thead.appendChild(headTr);
  table.appendChild(thead);
}

function _makeScheduleRow({ emp, siteId, siteData, y, m, days, districtDay, resignDayMap }) {
  const tr        = document.createElement('tr');
  const resignDay = resignDayMap?.[emp.id] ?? null;

  const labelTd = document.createElement('td');
  labelTd.className   = 'row-label';
  labelTd.textContent = `${emp.name} ${_getEmpDutyLabel(emp, siteId)}`;
  tr.appendChild(labelTd);

  for (let d = 1; d <= days; d++) {
    const hol       = isHoliday(_holidaySet, y, m, d);
    const isDistDay = districtDay === d;
    const isBlocked = resignDay !== null && d > resignDay;
    const td        = document.createElement('td');
    td.className    = 'day-cell';

    if (isBlocked) {
      _applyCellBg(td, false, false, true);
    } else {
      _applyCellBg(td, hol, isDistDay, false);
      _applyCellState(td, siteData[emp.id]?.[d]);
      td.addEventListener('click',       () => _onCellClick({ empId: emp.id, siteId, day: d }));
      td.addEventListener('contextmenu', e => { e.preventDefault(); _onCellClick({ empId: emp.id, siteId, day: d, direction: 'backward' }); });
    }
    tr.appendChild(td);
  }
  return tr;
}

function _makeSeparatorRow(days) {
  const tr = document.createElement('tr');
  const td = document.createElement('td');
  td.colSpan = days + 1;
  td.style.cssText = 'height:8px;background:transparent;border:none;';
  tr.appendChild(td);
  return tr;
}