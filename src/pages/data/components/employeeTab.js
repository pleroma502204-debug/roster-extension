// ════════════════════════════════════════════
// pages/data/components/employeeTab.js
// 人員列表 + Modal CRUD + 通勤地圖 Tab
// ════════════════════════════════════════════

import {
  getSitesState, setSitesState,
  getEmployeesState, setEmployeesState,
  getSettingsState, getScheduleState,
} from '../../../core/store/globalState.js';
import { recalcLast }                            from '../../../core/services/siteService.js';
import { getArrangedCandidates }                 from '../../../core/services/employeeService.js';
import { SHIFT, MOBILITY, EMPLOYEE_TEMPLATE }    from '../../../shared/constants.js';
import { openModal, closeModal, bindModalClose, bindEl, fillSelect } from '../../../shared/utils/dom.js';
import { showConfirm, showToastMsg } from '../../../shared/utils/notify.js';
import { ValidationError }                       from './validation.js';


// ── 常數 ─────────────────────────────────────
let _editingEmpId = null;
const _cleanups = [];

/**
 * 人員表單基礎欄位對應配置
 * key: 資料物件的屬性名
 * id:  DOM 元素的 id
 * def: 新增人員時的預設值 (可為值或函式)
 */
const EMP_FIELDS = [
  { key: 'name',       id: 'e-name',       def: '' },
  { key: 'phone',      id: 'e-phone',      def: '' },
  { key: 'resignDate', id: 'e-resignDate', def: '' },
  { key: 'address',    id: 'e-address',    def: '' },
  { key: 'note',       id: 'e-note',       def: '' },
  { key: 'days',       id: 'e-days',       def: 1 },
  { key: 'shift',      id: 'e-shift',      def: () => SHIFT.day.value },
  { key: 'mobility',   id: 'e-mobility',   def: () => MOBILITY.flex.value }
];

// ── 初始化 ────────────────────────────────────
export function mount() {
  bindEl('btn-add-emp',       'click',  () => openEmpModal(null), _cleanups);
  bindEl('btn-save-emp',      'click',  saveEmployee, _cleanups);
  bindEl('emp-search',        'input',  renderEmployees, _cleanups);
  bindEl('emp-shift-filter',   'change', renderEmployees, _cleanups);
  bindEl('emp-mobility-filter',   'change', renderEmployees, _cleanups);
  bindEl('btn-add-forbidden', 'click',  () => _addSubRow('forbidden'), _cleanups);
  bindEl('btn-add-arranged',  'click',  () => _addSubRow('arranged'), _cleanups);
  bindEl('btn-open-map',      'click',  _openGoogleMaps, _cleanups);

  _buildSelects();
  _cleanups.push(bindModalClose('emp-modal'));
  _cleanups.push(bindModalClose('confirm-modal'));

  renderEmployees();
}

export function unmount() {
  _cleanups.forEach(fn => fn());
  _cleanups.length = 0;
}

// ── 列表渲染 ──────────────────────────────────
export function renderEmployees() {
  const sites     = getSitesState();
  const employees = getEmployeesState();
  const q      = document.getElementById('emp-search')?.value.trim().toLowerCase() ?? '';
  const shiftFilter = document.getElementById('emp-shift-filter')?.value ?? '';
  const mobilityFilter = document.getElementById('emp-mobility-filter')?.value ?? '';

  let filtered = employees;
  if (shiftFilter) filtered = filtered.filter(e => e.shift === shiftFilter);
  if (mobilityFilter) filtered = filtered.filter(e => e.mobility === mobilityFilter);
  if (q)      filtered = filtered.filter(e => e.name.includes(q) || e.phone?.includes(q) || e.address?.includes(q));

  document.getElementById('emp-count').textContent = `共 ${filtered.length} 筆`;
  const tbody = document.getElementById('employees-tbody');
  const empty = document.getElementById('employees-empty');

  if (filtered.length === 0) {
    tbody.innerHTML = '';
    empty.style.display = '';
    return;
  }
  empty.style.display = 'none';
  tbody.innerHTML = '';

  for (const emp of filtered) {
    const shiftLabel = { day: '日', night: '夜', both: '日/夜' }[emp.shift] ?? '—';
    const typeLabel = MOBILITY[emp.mobility ?? 'flex']?.label ?? '機動';
    const dutyText   = emp.duties?.join('、') || '—';
    const arrangedText = (emp.arranged ?? [])
      .map(a => {
        const s = sites.find(s => s.id === a.siteId);
        if (!s) return null;
        return `${s.shortName || s.name}${a.duties?.length ? `(${a.duties})` : ''}`;
      }).filter(Boolean).join('、') || '—';

    // 已排天數：當月 work 格數
    const schedule = getScheduleState();
    const month    = getSettingsState().month ?? '';
    let workedDays = 0;
    if (month) {
      for (const siteId of Object.keys(schedule)) {
        const dayMap = schedule[siteId]?.[emp.id] ?? {};
        workedDays += Object.values(dayMap).filter(v => v === 'work').length;
      }
    }
    const acceptDays = emp.days ?? 0;
    const daysWarn   = acceptDays > 0 && workedDays >= acceptDays;
    const daysHtml   = acceptDays
      ? `<span class="days-badge ${daysWarn ? 'urgent' : workedDays >= acceptDays * 0.8 ? 'warning' : 'ok'}">${workedDays} / ${acceptDays}</span>`
      : `${workedDays}`;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${emp.name}</td>
      <td>${shiftLabel}</td>
      <span class="badge badge-${emp.mobility ?? 'flex'}">${typeLabel}</span>
      <td>${dutyText}</td>
      <td>${arrangedText}</td>
      <td>${daysHtml}</td>
      <td>${emp.note ?? ''}</td>
      <td>
        <div class="td-actions">
          <button class="icon-btn" title="編輯">✏️</button>
          <button class="icon-btn danger" title="刪除">🗑</button>
        </div>
      </td>`;
    tr.querySelector('[title="編輯"]').addEventListener('click', e => { e.stopPropagation(); openEmpModal(emp.id); });
    tr.querySelector('[title="刪除"]').addEventListener('click', e => {
      e.stopPropagation();
      showConfirm(`確定要刪除「${emp.name}」嗎？`).then(async ok => {
        if (!ok) return;
        const updated = getEmployeesState().filter(e => e.id !== emp.id);
        await setEmployeesState(updated);
        await setSitesState(recalcLast(getSitesState(), updated));
        renderEmployees();
      });
    });

    tr.addEventListener('click', () => openEmpModal(emp.id));
    tbody.appendChild(tr);
  }
}

// ── Modal ─────────────────────────────────────
export function openEmpModal(id) {
  _editingEmpId = id;
  const employees = getEmployeesState();
  const emp = id ? employees.find(e => e.id === id) : EMPLOYEE_TEMPLATE();
  const duties = getSettingsState().duties ?? [];

  document.getElementById('emp-modal-title').textContent = id ? '編輯人員' : '新增人員';

  // 💡 自動化填表：遍歷常數
  for (const { key, id: elId, def } of EMP_FIELDS) {
    const el = document.getElementById(elId);
    if (!el) continue;

    if (id) { // 編輯模式
      if (key === 'mobility') {
        el.value = emp.mobility ?? MOBILITY.flex.value;
      } else {
        el.value = emp[key] ?? (typeof def === 'function' ? def() : def);
      }
    } else {
      el.value = typeof def === 'function' ? def() : def; // 新增模式
    }
  }

  // 特殊動態 UI 渲染（維持原樣）
  _renderDutyChips(duties, emp.duties ?? []);
  _renderSubList('forbidden', emp.forbidden ?? []);
  _renderSubList('arranged',  emp.arranged  ?? []);
  
  openModal('emp-modal');
}
function _buildSelects() {
  const shiftSel = document.getElementById('e-shift');
  shiftSel.innerHTML = '';
  for (const { value, label } of Object.values(SHIFT)) {
    shiftSel.insertAdjacentHTML('beforeend', `<option value="${value}">${label}</option>`);
  }

  const mobSel = document.getElementById('e-mobility');
  mobSel.innerHTML = '';
  for (const { value, label } of Object.values(MOBILITY)) {
    mobSel.insertAdjacentHTML('beforeend', `<option value="${value}">${label}</option>`);
  }
}

// ── 1. 負責收割畫面資料的純淨函式 ──
function _getEmployeeFormData() {
  const data = { // 基礎資料架構
    id:        _editingEmpId ?? crypto.randomUUID(),
    duties:    [...document.querySelectorAll('#e-duties input:checked')].map(cb => cb.value),
    forbidden: _collectSubList('forbidden'),
    arranged:  _collectSubList('arranged'),
  };
  for (const { key, id: elId } of EMP_FIELDS) {
    const el = document.getElementById(elId);
    if (!el) continue;
    if (key === 'mobility') { // mobility
      data.mobility = el.value;
    } else {  // 純文字就加上 .trim()
      data[key] = (el.type === 'text' || el.tagName === 'TEXTAREA') ? el.value.trim() : el.value;
    }
  }
  return data;
}

// ── 2. 負責抓出所有錯誤的純邏輯驗證（不碰 DOM） ──
function _validateEmployeeData(data) {
  const errors = [];
  
  // 基礎必填檢查
  if (!data.name)          errors.push('請填寫姓名');
  if (!data.address)       errors.push('請填寫地址');
  if (!data.duties.length) errors.push('請選擇至少一項勤務');
  
  // 跨欄位邏輯檢查
  if (data.shift === 'both' && data.mobility === 'regular') {
    errors.push('只有機動能兼日夜');
  }

  // 預排據點檢查（因為這部分強烈依賴 DOM 結構，維持就地遍歷）
  document.querySelectorAll('#arranged-list .sub-row').forEach(row => {
    const siteId = row.querySelector('select')?.value;
    const dutyId = row.querySelector('.arr-duty-select')?.value;

    if (siteId && !dutyId) {
      const siteName = getSitesState().find(s => s.id === siteId)?.name || '未知名社區';
      errors.push(`預排的「${siteName}」未選擇明確的勤務`);
    }
  });

  return errors;
}

// ── 3. 主進入點：極其乾淨的 Async 控制流 ──
async function saveEmployee() {
  try {
    const data = _getEmployeeFormData();
    const errors = _validateEmployeeData(data);

    if (errors.length > 0) throw new ValidationError(errors);

    // 驗證通過，直接寫入 State
    const employees = getEmployeesState();
    const updated = _editingEmpId
      ? employees.map(e => e.id === _editingEmpId ? data : e)
      : [...employees, data];

    await setEmployeesState(updated);
    await setSitesState(recalcLast(getSitesState(), updated));
    closeModal('emp-modal');
    renderEmployees();

  } catch (err) {
    if (err instanceof ValidationError) {
      showToastMsg(err.messages.join('・'), true);
    } else {
      console.error(err);
      showToastMsg('系統儲存時發生非預期錯誤：' + err.message, true);
    }
  }
}

// ── 勤務 chips ────────────────────────────────
function _renderDutyChips(duties, selected) {
  const grid = document.getElementById('e-duties');
  grid.innerHTML = '';
  for (const d of duties) {
    const chip = document.createElement('label');
    const checked = selected.includes(d);
    chip.className = 'duty-chip' + (checked ? ' selected' : '');
    chip.innerHTML = `<input type="checkbox" value="${d}" ${checked ? 'checked' : ''}>${d}`;
    chip.querySelector('input').addEventListener('change', () => chip.classList.toggle('selected'));
    grid.appendChild(chip);
  }
}

// ── Sub-list（禁排 / 預排）────────────────────
function _renderSubList(type, items) {
  const list = document.getElementById(`${type}-list`);
  list.innerHTML = '';
  items.forEach((item, i) => list.appendChild(_makeSubRow(type, i, item)));
}

function _makeSubRow(type, idx, item) {
  const row = document.createElement('div');
  row.className = 'sub-row' + (type === 'arranged' ? ' arranged-row' : '');
  
  const css = 'padding:6px 8px;background:var(--bg3);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:13px;';

  // 1. 建立共同欄位：據點下拉選單
  const siteSelect = document.createElement('select');
  siteSelect.style.cssText = css;
  siteSelect.innerHTML = '<option value="">選擇據點</option>';

  // 2. 根據類型，分流處理選單內容
  if (type === 'arranged') {
    _renderArrangedFields(row, siteSelect, item, css);
  } else {
    _renderForbiddenOptions(siteSelect, item);
    row.appendChild(siteSelect);
  }

  // 3. 建立共同欄位：日期與備註
  const dateInput = document.createElement('input');
  dateInput.type = 'date'; dateInput.value = item.date ?? '';
  dateInput.style.cssText = css;

  const noteInput = document.createElement('input');
  noteInput.type = 'text'; noteInput.placeholder = '備註';
  noteInput.value = item.note ?? '';
  noteInput.style.cssText = css;

  // 4. 建立共同欄位：刪除按鈕
  const delBtn = document.createElement('button');
  delBtn.textContent = '✕';
  delBtn.style.cssText = 'background:transparent;border:none;color:var(--text2);cursor:pointer;font-size:14px;padding:4px;flex-shrink:0;';
  delBtn.addEventListener('click', () => row.remove());

  // 5. 組合基本元件
  row.append(dateInput, noteInput, delBtn);
  return row;
}

// 💡 子功能 1：處理「禁排」的據點選單
function _renderForbiddenOptions(siteSelect, item) {
  const sites = getSitesState();
  for (const s of sites) {
    const opt = document.createElement('option');
    opt.value = s.id; opt.textContent = s.name;
    if (s.id === item.siteId) opt.selected = true;
    siteSelect.appendChild(opt);
  }
}

// 💡 子功能 2：處理「預排」的據點選單與勤務單選選單（含連動邏輯）
function _renderArrangedFields(row, siteSelect, item, commonCss) {
  const sites = getSitesState();
  
  // A. 收集目前 Modal 的狀態，計算可預排的據點名單 (Candidates)
  const empShift  = document.getElementById('e-shift').value;
  const empDuties = [...document.querySelectorAll('#e-duties input:checked')].map(cb => cb.value);
  const forbiddenIds = [...document.querySelectorAll('#forbidden-list .sub-row')]
    .map(r => r.querySelector('select')?.value).filter(Boolean);
  
  const alreadyArranged = [...document.querySelectorAll('#arranged-list .sub-row')]
    .map(r => ({
      siteId: r.querySelector('select')?.value ?? '',
      duties: [r.querySelector('.arr-duty-select')?.value].filter(Boolean),
    })).filter(a => a.siteId);

  const candidates = getArrangedCandidates({
    sites, empShift, empDuties,
    mobility: document.getElementById('e-mobility').value,
    forbiddenIds,
    alreadyArranged,
  });

  // B. 排除已被其他列選走的據點
  const usedIds = new Set(alreadyArranged.map(a => a.siteId));
  if (item.siteId) usedIds.delete(item.siteId);

  for (const { site } of candidates) {
    if (usedIds.has(site.id)) continue;
    const opt = document.createElement('option');
    opt.value = site.id; opt.textContent = site.name;
    if (site.id === item.siteId) opt.selected = true;
    siteSelect.appendChild(opt);
  }

  // C. 建立單選勤務的 select 元件
  const dutySelect = document.createElement('select');
  dutySelect.className = 'arr-duty-select';
  dutySelect.style.cssText = commonCss;

  // 內部函式：當據點切換時，動態刷新可用的勤務選項
  const refreshDutyOptions = () => {
dutySelect.innerHTML = '<option value="">選擇勤務</option>';
  
  // 1. 取得這筆資料原本存的勤務名稱 (相容陣列與字串)
  const prevSelectedDuty = Array.isArray(item.duties) ? item.duties[0] : item.duties;
  
  // 2. 重新動態計算可用勤務
  const freshCandidates = getArrangedCandidates({
    sites, empShift, empDuties,
    mobility: document.getElementById('e-mobility').value,
    forbiddenIds: [],
    alreadyArranged: [],
  });
  
  const matched = freshCandidates.find(c => c.site.id === siteSelect.value);
  
  // 3. 建立一個 Set 來記錄所有塞進去的選項，避免重複建立
  const renderedDuties = new Set();

  // 情況 A：如果排班引擎有算到可用勤務，把它們加進選單
  if (matched && matched.availableDuties) {
    for (const d of matched.availableDuties) {
      const opt = document.createElement('option');
      opt.value = d; opt.textContent = d;
      if (d === prevSelectedDuty) opt.selected = true;
      dutySelect.appendChild(opt);
      renderedDuties.add(d);
    }
  }

  // 情況 B【關鍵修復】：如果舊有勤務存在，但上面引擎因為 Modal 尚未完全開啟而漏算
  if (prevSelectedDuty && !renderedDuties.has(prevSelectedDuty)) {
    const opt = document.createElement('option');
    opt.value = prevSelectedDuty;
    opt.textContent = prevSelectedDuty;
    opt.selected = true; // 強制還原先前選過的值！
    dutySelect.appendChild(opt);
  }
  };

  // D. 綁定連動事件並初始化
  siteSelect.addEventListener('change', refreshDutyOptions);
  refreshDutyOptions();

  // E. 依序掛載到 row 的最前端
  row.prepend(siteSelect, dutySelect);
}

function _addSubRow(type) {
  const list = document.getElementById(`${type}-list`);
  list.appendChild(_makeSubRow(type, list.children.length, {}));
}

function _collectSubList(type) {
  return [...document.getElementById(`${type}-list`).children].map(row => {
    const siteId = row.querySelector('select')?.value ?? '';
    const inputs = row.querySelectorAll('input[type="date"], input[type="text"]');
    const base = { siteId, date: inputs[0]?.value ?? '', note: inputs[1]?.value.trim() ?? '' };
    
    if (type === 'arranged') {
       base.duties = row.querySelector('.arr-duty-select')?.value;
    }
    return base;
  }).filter(item => item.siteId);
}

// ── 通勤地圖 ──────────────────────────────────
export function refreshMapSelects() {
  const employees = getEmployeesState();
  const sites     = getSitesState();

  const empSel  = document.getElementById('map-emp-select');
  const siteSel = document.getElementById('map-site-select');
  const prevEmp  = empSel?.value;
  const prevSite = siteSel?.value;

  if (empSel) {
    empSel.innerHTML = '<option value="">選擇人員…</option>';
    for (const e of employees) {
      const opt = document.createElement('option');
      opt.value = e.id; opt.textContent = e.name;
      empSel.appendChild(opt);
    }
    empSel.value = prevEmp;
  }

  if (siteSel) {
    siteSel.innerHTML = '<option value="">選擇據點…</option>';
    for (const s of sites) {
      const opt = document.createElement('option');
      opt.value = s.id; opt.textContent = s.name;
      siteSel.appendChild(opt);
    }
    siteSel.value = prevSite;
  }
}

async function _openGoogleMaps() {
  const empId  = document.getElementById('map-emp-select')?.value;
  const siteId = document.getElementById('map-site-select')?.value;
  if (!empId || !siteId) { showToastMsg('請先選擇人員和據點', true); return; }

  const emp  = getEmployeesState().find(e => e.id === empId);
  const site = getSitesState().find(s => s.id === siteId);
  if (!emp?.address || !site?.address) { showToastMsg('人員或據點地址未填寫', true); return; }

  const url = `https://www.google.com/maps/dir/?api=1`
    + `&origin=${encodeURIComponent(emp.address)}`
    + `&destination=${encodeURIComponent(site.address)}`
    + `&travelmode=transit`;
  chrome.tabs.create({ url });
}