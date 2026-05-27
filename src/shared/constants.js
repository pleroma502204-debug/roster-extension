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
  leaveTypes:  null,   // null 表示尚未初始化，由 globalState.init() 補上預設值
  duties:      null,
  dists:       null,
  holidayMap:  {},
  holidayRaw:  {},
  calOverrides: {},
};

// 據點範本
export const SITE_TEMPLATE = () => ({
  id:           crypto.randomUUID(),
  name:         '',
  shortName:    '',
  dist:         '',
  located:      '',
  address:      '',
  phone:        '',
  email:        '',
  note:         '',
  contractDate: '',
  districtDate: '',
  contacts:     [],
  shifts: {
    day:   [],   // [{ duty, count, last }]
    night: [],
  },
});

// 人員範本
export const EMPLOYEE_TEMPLATE = () => ({
  id:        crypto.randomUUID(),
  name:       '',
  address:    '',
  phone:      '',
  note:       '',
  resignDate: '',
  isReg:      false,
  days:       0,
  shift:      'day',   // 'day' | 'night' | 'both'
  duties:     [],
  forbidden:  [],      // [{ siteId, date, note }]
  arranged:   [],      // [{ siteId, duties, date, note }]
});

// 勤務預設（設定頁可增刪）
export const DEFAULT_DUTIES = ['櫃檯', '中控', '車道', '機巡', '特勤', '督導'];

// 假別預設（設定頁可增刪）
export const DEFAULT_LEAVE_TYPES = ['休', '事', '喪', '補'];

// 轄區預設（設定頁可增刪）
export const DEFAULT_DISTS = ['北北基', '桃竹苗', '雲嘉南', '高屏'];

// 駐地預設（設定頁可增刪）
export const DEFAULT_LOCATED = ['廠區', '商辦', '住宅', '醫院', '學校', '其他'];

// 班段設定
export const SHIFT = {
  day:   { value: 'day',   label: '日班' },
  night: { value: 'night', label: '夜班' },
  both:  { value: 'both',  label: '日/夜' }
};

// 班別設定
export const MOBILITY = {
  regular: { value: 'regular', label: '正班' },
  flex:    { value: 'flex',    label: '機動' },
};

// 日期星期中文
export const DOW_ZH = ['日', '一', '二', '三', '四', '五', '六'];
