// ════════════════════════════════════════════
// pages/data/components/siteTab.js
// 據點列表 + Modal CRUD
// ════════════════════════════════════════════

import { getSitesState, setSitesState }         from '../../../core/store/globalState.js';
import { getSettingsState }                      from '../../../core/store/globalState.js';
import { SITE_TEMPLATE }                         from '../../../shared/constants.js';
import { 
  openModal, closeModal, bindModalClose, showConfirm, showWarning, bindEl, ValidationError
} from '../../../shared/utils/dom.js';

let _editingSiteId = null;
const _cleanups = [];

// ── 初始化 ────────────────────────────────────
export function mount() {
  bindEl('btn-add-site',        'click',  () => openSiteModal(null), _cleanups);
  bindEl('btn-save-site',       'click',  saveSite, _cleanups);
  bindEl('site-dist-filter',    'change', renderSites, _cleanups);
  bindEl('site-located-filter', 'change', renderSites, _cleanups);
  bindEl('site-search',         'input',  renderSites, _cleanups);
  bindEl('shift-day-add',       'click',  () => addShiftRow('day'), _cleanups);
  bindEl('shift-night-add',     'click',  () => addShiftRow('night'), _cleanups);
  bindEl('contacts-add', 'click', () => {
    document.getElementById('contacts-list').appendChild(makeContactRow());
  }, _cleanups);

  _renderSelectOptions('site-dist-filter', getSettingsState().dists);
  _renderSelectOptions('site-located-filter', getSettingsState().located);

  _cleanups.push(bindModalClose('site-modal'));
  _cleanups.push(bindModalClose('confirm-modal'));
  _cleanups.push(bindModalClose('warning-modal'));

  renderSites();
}

export function unmount() {
  _cleanups.forEach(fn => fn());
  _cleanups.length = 0;
}

// ── 列表渲染 ──────────────────────────────────
export function renderSites() {
  const sites = getSitesState();
  const q = document.getElementById('site-search')?.value.trim().toLowerCase() ?? '';

  let filtered = sites;
  const distFilter    = document.getElementById('site-dist-filter')?.value ?? '';
  const locatedFilter = document.getElementById('site-located-filter')?.value ?? '';

  if (distFilter) filtered = filtered.filter(s => s.dist === distFilter);
  if (locatedFilter) filtered = filtered.filter(s => s.located === locatedFilter);
  if (q)           filtered = filtered.filter(s => s.name.includes(q) || 
                                                   s.shortName?.includes(q) || 
                                                   s.address?.includes(q));

  document.getElementById('site-count').textContent = `共 ${filtered.length} 筆`;
  const tbody = document.getElementById('sites-tbody');
  const empty = document.getElementById('sites-empty');

  if (filtered.length === 0) {
    tbody.innerHTML = '';
    empty.style.display = '';
    return;
  }
  empty.style.display = 'none';
  tbody.innerHTML = '';

  for (const site of filtered) {
    const dayTotal   = (site.shifts?.day   ?? []).reduce((s, r) => s + (r.count || 0), 0);
    const nightTotal = (site.shifts?.night ?? []).reduce((s, r) => s + (r.count || 0), 0);

    // 缺額摘要
    const vacancies = [];
    for (const period of ['day', 'night']) {
      const label = period === 'day' ? '日' : '夜';
      for (const shift of (site.shifts[period] ?? [])) {
        const remaining = shift.last ?? shift.count;
        if (remaining > 0) vacancies.push(`${label}${shift.duty}×${remaining}`);
      }
    }
    const vacancyHtml = vacancies.length
      ? vacancies.map(v => `<span class="vacancy-badge">${v}</span>`).join(' ')
      : '<span class="days-badge ok">滿編</span>';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${site.shortName ?? ''}</td>
      <td>${site.dist ?? ''}</td>
      <td>${site.located ?? ''}</td>
      <td>${site.phone ?? ''}</td>
      <td>${dayTotal   || '—'}</td>
      <td>${nightTotal || '—'}</td>
      <td>${vacancyHtml}</td>
      <td>${site.note ?? ''}</td>
      <td>
        <div class="td-actions">
          <button class="icon-btn" title="編輯">✏️</button>
          <button class="icon-btn danger" title="刪除">🗑</button>
        </div>
      </td>`;
    tr.querySelector('[title="編輯"]').addEventListener('click', e => {
      e.stopPropagation(); openSiteModal(site.id);
    });
    tr.querySelector('[title="刪除"]').addEventListener('click', e => {
      e.stopPropagation();
      showConfirm(`確定要刪除「${site.name}」嗎？`).then(ok => {
        if (!ok) return;
        setSitesState(getSitesState().filter(s => s.id !== site.id));
        renderSites();
      });
    });
    tr.addEventListener('click', () => openSiteModal(site.id));
    tbody.appendChild(tr);
  }
}

// ── Modal ─────────────────────────────────────
function openSiteModal(id) {
  _editingSiteId = id;
  const sites = getSitesState();
  const site  = id ? sites.find(s => s.id === id) : SITE_TEMPLATE();
  const duties = getSettingsState().duties ?? [];
  const dist = getSettingsState().dists ?? [];
  const located = getSettingsState().located ?? [];

  document.getElementById('site-modal-title').textContent = id ? '編輯據點' : '新增據點';
  document.getElementById('s-name').value         = site.name         ?? '';
  document.getElementById('s-shortName').value    = site.shortName    ?? '';
  document.getElementById('s-phone').value        = site.phone        ?? '';

  document.getElementById('s-dist').value         = site.dist         ?? '';
  document.getElementById('s-located').value      = site.located      ?? '';
  document.getElementById('s-email').value        = site.email        ?? '';

  document.getElementById('s-address').value      = site.address      ?? '';
  document.getElementById('s-note').value         = site.note         ?? '';
  document.getElementById('s-contractDate').value = site.contractDate ?? '';
  document.getElementById('s-districtDate').value = site.districtDate ?? '';

  _renderSelectOptions('s-dist', getSettingsState().dists, site.dist ?? []);
  _renderSelectOptions('s-located', getSettingsState().located, site.located ?? []);
  _renderContactList(site.contacts ?? []);
  _renderShifts('day',   site.shifts?.day   ?? [], duties);
  _renderShifts('night', site.shifts?.night ?? [], duties);
  openModal('site-modal');
}

async function saveSite() {
  try {
    const fields = [
      { key: 'name',      id: 's-name',      errMsg: '請填寫名稱', valueType: 'text' },
      { key: 'shortName', id: 's-shortName', errMsg: '請填寫簡稱', valueType: 'text' },
      { key: 'address',   id: 's-address',   errMsg: '請填寫地址', valueType: 'text' },
      { key: 'phone',     id: 's-phone',     errMsg: '請填寫社區電話', valueType: 'text' },
      { key: 'dist',      id: 's-dist',      errMsg: '請選擇轄區', valueType: 'select' },
      { key: 'located',   id: 's-located',   errMsg: '請選擇駐地', valueType: 'select' },
    ];

    const data = {
      id: _editingSiteId ?? crypto.randomUUID(),
      contacts: _collectContacts(),
      shifts: { day: _collectShifts('day'), night: _collectShifts('night') },
      email: document.getElementById('s-email').value.trim(),
      note: document.getElementById('s-note').value.trim(),
      contractDate: document.getElementById('s-contractDate').value,
      districtDate: document.getElementById('s-districtDate').value,
    };
    const errors = [];

    for (const { key, id, errMsg, valueType } of fields) {
      const el = document.getElementById(id);
      const value = valueType === 'select' ? el.value : el.value.trim();
      
      data[key] = value; // 直接灌進 data 物件
      if (!value) errors.push(errMsg);
    }

    if (errors.length > 0) { throw new ValidationError(errors); }

    const sites = getSitesState();
    await setSitesState(
      _editingSiteId ? sites.map(s => s.id === _editingSiteId ? data : s)
                     : [...sites, data]
    );
    closeModal('site-modal');
    renderSites();

  } catch (err) {
    if (err instanceof ValidationError) {
      await showWarning(err.messages); 
    } else {
      console.error(err);
      await showWarning('系統儲存時發生非預期錯誤：' + err.message);
    }
  }
}

// ── 下拉選單渲染 ─----───────────────────────────────
function _renderSelectOptions(selectId, options, selectedValue) {
  const selectEl = document.getElementById(selectId);
  if (!selectEl) return;
  const currentSelected = Array.isArray(selectedValue) ? selectedValue[0] : selectedValue;

  for (const opt of options) {
    const option = document.createElement('option');
    option.value = opt;
    option.textContent = opt;

    if (opt === currentSelected) {
      option.selected = true;
    }

    selectEl.appendChild(option);
  }
}

// ── 聯絡人 ────────────────────────────────────
function _renderContactList(contacts) {
  const list = document.getElementById('contacts-list');
  list.innerHTML = '';
  for (const c of contacts) list.appendChild(makeContactRow(c));
}

export function makeContactRow(item = {}) {
  const css = 'padding:6px 8px;background:var(--bg3);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:13px;width:100%;';
  const row = document.createElement('div');
  row.className = 'sub-row contact-row';
  row.innerHTML = `
    <input type="text" placeholder="姓名" value="${item.name ?? ''}" style="${css}">
    <input type="text" placeholder="職稱" value="${item.job  ?? ''}" style="${css}">
    <input type="text" placeholder="電話" value="${item.tel  ?? ''}" style="${css}">
    <input type="text" placeholder="備註" value="${item.note ?? ''}" style="${css}">
    <button style="background:transparent;border:none;color:var(--text2);cursor:pointer;font-size:14px;padding:4px;">✕</button>`;
  row.querySelector('button').addEventListener('click', () => row.remove());
  return row;
}

function _collectContacts() {
  return [...document.querySelectorAll('#contacts-list .contact-row')].map(row => {
    const inputs = row.querySelectorAll('input');
    return { name: inputs[0].value.trim(), job: inputs[1].value.trim(), tel: inputs[2].value.trim(), note: inputs[3].value.trim() };
  }).filter(c => c.name || c.tel);
}

// ── Shifts 編輯器 ─────────────────────────────
function _renderShifts(period, shifts, duties) {
  const container = document.getElementById(`shifts-${period}`);
  container.innerHTML = '';
  shifts.forEach((shift, i) => container.appendChild(_makeShiftRow(period, i, shift, duties)));
}

function _makeShiftRow(period, idx, shift, duties) {
  const row = document.createElement('div');
  row.className = 'shift-row';
  row.dataset.idx = idx;

  const label = document.createElement('span');
  label.className = 'shift-label';
  label.textContent = period === 'day' ? `日${idx + 1}` : `夜${idx + 1}`;

  const dutySelect = document.createElement('select');
  dutySelect.style.cssText = 'padding:6px 8px;background:var(--bg3);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:13px;';
  for (const d of duties) {
    const opt = document.createElement('option');
    opt.value = d; opt.textContent = d;
    if (d === shift.duty) opt.selected = true;
    dutySelect.appendChild(opt);
  }

  const countInput = document.createElement('input');
  countInput.type = 'number'; countInput.min = 1; countInput.max = 99;
  countInput.value = shift.count ?? 1;
  countInput.style.cssText = 'padding:6px 8px;background:var(--bg3);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:13px;width:100%;';

  const delBtn = document.createElement('button');
  delBtn.textContent = '✕';
  delBtn.style.cssText = 'background:transparent;border:none;color:var(--text2);cursor:pointer;font-size:14px;padding:4px;';
  delBtn.addEventListener('click', () => { row.remove(); _reIndexShiftLabels(period); });

  row.append(label, dutySelect, countInput, delBtn);
  return row;
}

function addShiftRow(period) {
  const container = document.getElementById(`shifts-${period}`);
  if (container.children.length >= 8) return;
  const duties = getSettingsState().duties ?? [];
  container.appendChild(_makeShiftRow(period, container.children.length, { duty: duties[0], count: 1 }, duties));
}

function _reIndexShiftLabels(period) {
  [...document.getElementById(`shifts-${period}`).children].forEach((row, i) => {
    row.dataset.idx = i;
    row.querySelector('.shift-label').textContent = period === 'day' ? `日${i + 1}` : `夜${i + 1}`;
  });
}

function _collectShifts(period) {
  const sites = getSitesState();
  const existingShifts = _editingSiteId
    ? (sites.find(s => s.id === _editingSiteId)?.shifts[period] ?? [])
    : [];
  return [...document.getElementById(`shifts-${period}`).children].map(row => {
    const duty  = row.querySelector('select').value;
    const count = parseInt(row.querySelector('input').value) || 1;
    const prev  = existingShifts.find(s => s.duty === duty);
    const last  = (prev && prev.count === count) ? prev.last : count;
    return { duty, count, last };
  });
}