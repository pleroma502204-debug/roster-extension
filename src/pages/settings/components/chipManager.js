// ════════════════════════════════════════════
// pages/settings/components/chipManager.js
// 通用 chip 增刪元件
// 假別 / 轄區 / 駐地 / 勤務 共用
// ════════════════════════════════════════════

import { getSettingsState, setSettingsState } from '../../../core/store/globalState.js';
import { showHint }                           from '../../../shared/utils/notify.js';

/**
 * 建立一個 chip 管理器
 *
 * @param {object}   config
 * @param {string}   config.stateKey     - settings 裡的 key，例如 'leaveTypes'
 * @param {string[]} config.defaults     - 對應的預設陣列
 * @param {string}   config.containerId  - chips 容器的 DOM id
 * @param {string}   config.inputId      - 輸入框的 DOM id
 * @param {string}   config.addBtnId     - 新增按鈕的 DOM id
 * @param {string}   config.hintId       - save-hint 的 DOM id
 * @param {string[]} config.cleanups     - 外部 _cleanups 陣列（由 main.js 傳入）
 */
export function setupChipManager({
  stateKey, defaults, containerId, inputId, addBtnId, hintId, cleanups,
}) {
  _render();

  // 新增按鈕
  const addBtn = document.getElementById(addBtnId);
  if (addBtn) {
    const h = () => _add();
    addBtn.addEventListener('click', h);
    cleanups.push(() => addBtn.removeEventListener('click', h));
  }

  // Enter 鍵
  const input = document.getElementById(inputId);
  if (input) {
    const h = e => { if (e.key === 'Enter') _add(); };
    input.addEventListener('keydown', h);
    cleanups.push(() => input.removeEventListener('keydown', h));
  }

  function _getList() {
    return getSettingsState()[stateKey] ?? defaults;
  }

  function _render() {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    for (const item of _getList()) {
      const chip = document.createElement('div');
      chip.className = 'chip setting-chip';
      chip.innerHTML = `<span>${item}</span><button class="chip-del" title="刪除">✕</button>`;
      chip.querySelector('.chip-del').addEventListener('click', () => _remove(item));
      container.appendChild(chip);
    }
  }

  async function _add() {
    const input = document.getElementById(inputId);
    const val   = input?.value.trim();
    if (!val) return;
    const list = [..._getList()];
    if (list.includes(val)) { input.value = ''; return; }
    list.push(val);
    input.value = '';
    await setSettingsState({ [stateKey]: list });
    _render();
    showHint(hintId);
  }

  async function _remove(item) {
    const list = _getList().filter(x => x !== item);
    await setSettingsState({ [stateKey]: list });
    _render();
    showHint(hintId);
  }
}