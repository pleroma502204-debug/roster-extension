// ════════════════════════════════════════════
// core/store/globalState.js
// 唯一記憶體真相來源
//
// 規則：
//   - 任何模組讀資料 → 用 get*()
//   - 任何模組寫資料 → 用 set*()，不得直接 import storage.js
//   - storage.js 只有這個檔案可以 import
// ════════════════════════════════════════════

import {
  getSettings,  setSettings  as _setSettings,
  getSites,     setSites     as _setSites,
  getEmployees, setEmployees as _setEmployees,
  getMonthSchedule, setMonthSchedule as _setMonthSchedule,
} from '../../shared/storage.js';
import { DEFAULT_DUTIES, DEFAULT_LEAVE_TYPES, DEFAULT_DISTS, DEFAULT_LOCATED } from '../../shared/constants.js';
import { daysUntil } from '../../shared/utils/date.js';

// ── 記憶體狀態 ────────────────────────────────
const _state = {
  settings:  {},
  sites:     [],
  employees: [],
  schedule:  {},
};

// ── 衍生快取（不寫 storage，從 _state 計算）──
const _derived = {
  activeSites:     [],   // 合約日 >= 排班月份 的據點
  activeEmployees: [],   // 離職日 >= 排班月份 的人員
  deadlines:       [],   // [{ type, name, date, days }] 依距今排序
};

const _listeners = new Set();

// ── 初始化 ────────────────────────────────────
export async function init() {
  const [settings, sites, employees] = await Promise.all([
    getSettings(),
    getSites(),
    getEmployees(),
  ]);

  _state.settings = {
    holidayMap:   {},
    holidayRaw:   {},
    calOverrides: {},
    ...settings,
    dists:             settings.dists             ?? DEFAULT_DISTS,
    leaveTypes:        settings.leaveTypes        ?? DEFAULT_LEAVE_TYPES,
    duties:            settings.duties            ?? DEFAULT_DUTIES,
    located:           settings.located           ?? DEFAULT_LOCATED,
    deadlineThreshold: settings.deadlineThreshold ?? 90,
  };
  _state.sites     = sites;
  _state.employees = employees;

  const month = _state.settings.month ?? '';
  _state.schedule = month ? await getMonthSchedule(month) : {};

  _rebuildDerived();
  _bindStorageListener();
}

// ── Getter ────────────────────────────────────
export const getSettingsState  = () => _state.settings;
export const getSitesState     = () => _state.sites;
export const getEmployeesState = () => _state.employees;
export const getScheduleState  = () => _state.schedule;
export const getDerived        = () => _derived;

// ── Setter ────────────────────────────────────
export async function setSettingsState(patch) {
  _state.settings = { ..._state.settings, ...patch };
  await _setSettings(_state.settings);
  _rebuildDerived();
  _notify('settings');
}

export async function setSitesState(sites) {
  _state.sites = sites;
  await _setSites(sites);
  _rebuildDerived();
  _notify('sites');
}

export async function setEmployeesState(employees) {
  _state.employees = employees;
  await _setEmployees(employees);
  _rebuildDerived();
  _notify('employees');
}

export async function setScheduleState(schedule) {
  _state.schedule = schedule;
  const month = _state.settings.month ?? '';
  if (month) await _setMonthSchedule(month, schedule);
  _notify('schedule');
}

// ── 衍生資料重算 ──────────────────────────────
function _rebuildDerived() {
  const month = _state.settings.month ?? '';

  // 過濾過期據點（合約日早於排班月份）
  _derived.activeSites = _state.sites.filter(site => {
    if (!site.contractDate || !month) return true;
    return site.contractDate.slice(0, 7) >= month;
  });

  // 過濾過期人員（離職日早於排班月份）
  _derived.activeEmployees = _state.employees.filter(emp => {
    if (!emp.resignDate || !month) return true;
    return emp.resignDate.slice(0, 7) >= month;
  });

  // 期限清單：合約日 + 區大日 + 離職日，依距今排序
  const rows = [];
  for (const site of _state.sites) {
    const label = site.shortName || site.name;
    if (site.contractDate) rows.push({ type: '合約日', name: label, date: site.contractDate, days: daysUntil(site.contractDate) });
    if (site.districtDate) rows.push({ type: '區大日', name: label, date: site.districtDate, days: daysUntil(site.districtDate) });
  }
  for (const emp of _state.employees) {
    if (emp.resignDate) rows.push({ type: '離職日', name: emp.name, date: emp.resignDate, days: daysUntil(emp.resignDate) });
  }
  rows.sort((a, b) => (a.days ?? Infinity) - (b.days ?? Infinity));
  _derived.deadlines = rows;
}

// ── 訂閱 ──────────────────────────────────────
export function subscribe(fn) {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}

function _notify(key) {
  _listeners.forEach(fn => fn(key));
}

// ── chrome.storage.onChanged ──────────────────
let _storageListenerBound = false;
function _bindStorageListener() {
  if (_storageListenerBound) return;
  _storageListenerBound = true;

  chrome.storage.onChanged.addListener(async (changes, area) => {
    if (area !== 'local') return;

    if (changes.settings) {
      _state.settings = { ..._state.settings, ...changes.settings.newValue };
      _rebuildDerived();
      _notify('settings');
    }
    if (changes.sites) {
      _state.sites = changes.sites.newValue ?? [];
      _rebuildDerived();
      _notify('sites');
    }
    if (changes.employees) {
      _state.employees = changes.employees.newValue ?? [];
      _rebuildDerived();
      _notify('employees');
    }
    if (changes.schedules) {
      const month = _state.settings.month ?? '';
      _state.schedule = changes.schedules.newValue?.[month] ?? {};
      _notify('schedule');
    }
  });
}