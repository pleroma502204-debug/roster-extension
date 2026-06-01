// ════════════════════════════════════════════
// shared/constants.js
// ════════════════════════════════════════════

// Storage keys
export const KEYS = {
  SETTINGS:  'settings',
  SITES:     'sites',
  EMPLOYEES: 'employees',
  SCHEDULES: 'schedules',  // { "2025-06": { siteId: { empId: { day: val } } } }
};

// 預設設定
export const DEFAULT_SETTINGS = {
  month: (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  })(),
  orgName:     '',
  onDutyKey:   null,  // null 表示尚未初始化，由 globalState.init() 補上預設值
  leaveTypes:  null,   
  duties:      null,
  regions:     null,
  holidayMap:  {},
  holidayRaw:  {},
  calOverrides: {},
};

// 據點範本
export const SITE_TEMPLATE = () => ({
  id:       crypto.randomUUID(),
  name:     [], // [全名, 簡稱, 代表字]
  region:   '',
  located:  '',
  addr:     [], // [縣市, 區域, 詳址]
  tel:      '',
  email:    '',
  note:     '',
  CEDate:   '',
  HOADate:  '',
  contacts: [],
  shifts: {
    day:   [],   // [{ duty, count, last }]
    night: [],
  },
});

// 人員範本
export const EMPLOYEE_TEMPLATE = () => ({
  id:        crypto.randomUUID(),
  name:      '',
  addr:      '',
  tel:       '',
  note:      '',
  lastDate:  '',
  mobility:  '機動',   // '正班' | '機動'
  days:      1,
  shift:     '日班',   // '日班' | '夜班' | '日/夜'
  duties:    [],
  forbSites: [],       // [{ siteId, date, note }]
  arrSites:  [],       // [{ siteId, duty}]
});

export const DEFAULT_ONDUTY_KEY = ['✔', '-'];

// 勤務預設（設定頁可增刪）
export const DEFAULT_DUTIES = ['櫃檯', '中控', '車道', '機巡', '特勤', '督導'];

// 假別預設（設定頁可增刪）
export const DEFAULT_LEAVE_TYPES = ['休', '事', '喪', '補'];

// 轄區預設（設定頁可增刪）
export const DEFAULT_REGIONS = ['北北基', '桃竹苗', '雲嘉南', '高屏'];

// 駐地預設（設定頁可增刪）
export const DEFAULT_LOCATED = ['廠區', '商辦', '住宅', '醫院', '學校', '其他'];

// 班段設定
export const SHIFT = ['日班', '夜班', '日/夜']

// 班別設定
export const MOBILITY = ['正班', '機動']

// 日期星期中文
export const DOW_ZH = ['日', '一', '二', '三', '四', '五', '六'];
