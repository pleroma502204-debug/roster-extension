// ════════════════════════════════════════════
// shared/utils/dom.js
// ════════════════════════════════════════════

/** 開啟 modal（加 .open class） */
export function openModal(id) {
  document.getElementById(id)?.classList.add('open');
}

/** 關閉 modal */
export function closeModal(id) {
  document.getElementById(id)?.classList.remove('open');
}

/**
 * 綁定 modal 的通用關閉行為：
 * - [data-close] 按鈕點擊關閉
 * - 點背景關閉
 * 回傳 cleanup 函式供 unmount 使用。
 */
export function bindModalClose(backdropId) {
  const backdrop = document.getElementById(backdropId);
  if (!backdrop) return () => {};

  const handlers = [];

  // data-close 按鈕
  backdrop.querySelectorAll('[data-close]').forEach(btn => {
    const h = () => closeModal(btn.dataset.close);
    btn.addEventListener('click', h);
    handlers.push([btn, 'click', h]);
  });

  // 點背景
  const bgH = e => { if (e.target === backdrop) closeModal(backdropId); };
  backdrop.addEventListener('click', bgH);
  handlers.push([backdrop, 'click', bgH]);

  return () => handlers.forEach(([el, ev, h]) => el.removeEventListener(ev, h));
}

/** 顯示 save hint，2 秒後淡出 */
export function showHint(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2000);
}

/**
 * 顯示 export 訊息，4 秒後自動隱藏
 * @param {string} msg
 * @param {boolean} isError
 */
export function showExportMsg(msg, isError = false) {
  const el = document.getElementById('export-msg');
  if (!el) return;
  el.textContent = msg;
  el.style.color = isError ? 'var(--danger)' : 'var(--text2)';
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 4000);
}

/**
 * 顯示確認 modal，回傳 Promise<boolean>
 * true = 使用者按確認，false = 取消
 * @param {string} msg
 */
export function showConfirm(msg) {
  return new Promise(resolve => {
    document.getElementById('confirm-msg').textContent = msg;
    openModal('confirm-modal');

    const okBtn     = document.getElementById('btn-confirm-ok');
    const cancelBtn = document.getElementById('btn-confirm-cancel');

    const cleanup = () => {
      okBtn.removeEventListener('click', onOk);
      cancelBtn.removeEventListener('click', onCancel);
    };
    const onOk = () => {
      cleanup();
      closeModal('confirm-modal');
      resolve(true);
    };
    const onCancel = () => {
      cleanup();
      closeModal('confirm-modal');
      resolve(false);
    };

    okBtn.addEventListener('click', onOk);
    cancelBtn.addEventListener('click', onCancel);
  });
}

/**
 * 顯示警告 modal，回傳 Promise（按確定後 resolve）
 * @param {string|string[]} msg - 支援單一字串或錯誤訊息陣列
 */
export function showWarning(msg) {
  return new Promise(resolve => {
    const msgContainer = document.getElementById('warning-msg');
    msgContainer.innerHTML = ''; // 清空舊內容

    if (Array.isArray(msg)) {
      // 如果傳進來的是陣列，建立一個不帶原生點點的清單
      const ul = document.createElement('ul');
      ul.style.margin = '0';
      ul.style.paddingLeft = '20px';
      ul.style.textAlign = 'left'; // 錯誤清單通常靠左對齊比較好看

      msg.forEach(item => {
        const li = document.createElement('li');
        li.textContent = item; // 使用 textContent 防禦潛在的 XSS 注入
        li.style.marginBottom = '4px';
        ul.appendChild(li);
      });
      
      msgContainer.appendChild(ul);
    } else {
      msgContainer.textContent = msg;
      msgContainer.style.textAlign = 'center'; // 單行字串維持置中
    }

    openModal('warning-modal');

    const okBtn = document.getElementById('btn-warning-ok');
    const onOk = () => {
      okBtn.removeEventListener('click', onOk);
      closeModal('warning-modal');
      resolve();
    };
    okBtn.addEventListener('click', onOk);
  });
}

/**
 * 綁定 card 折疊展開（點 header 切換 .is-open）
 * 自動略過 header 內的按鈕、select、number input
 *
 * @param {string}     scopeSelector - 限定範圍，例如 '#page-settings'
 * @param {Function[]} cleanups      - 外部 _cleanups 陣列
 */
export function setupCardToggles(scopeSelector, cleanups) {
  const scope = document.querySelector(scopeSelector);
  if (!scope) return;

  scope.querySelectorAll('.card').forEach(card => card.classList.remove('is-open'));

  const toggleCard = (event) => {
    if (
      event.target.closest('.card-header-actions') ||
      event.target.closest('button')               ||
      event.target.closest('select')               ||
      event.target.closest('input[type="number"]')
    ) return;
    event.currentTarget.closest('.card')?.classList.toggle('is-open');
  };

  scope.querySelectorAll('.card-header').forEach(header => {
    header.addEventListener('click', toggleCard);
    cleanups.push(() => header.removeEventListener('click', toggleCard));
  });
}

/**
 * 綁定事件並記錄 cleanup
 * @param {string}     id       - DOM element id
 * @param {string}     event    - 事件名稱
 * @param {Function}   handler  - 事件處理函式
 * @param {Function[]} cleanups - 外部 _cleanups 陣列
 */
export function bindEl(id, event, handler, cleanups) {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener(event, handler);
  cleanups.push(() => el.removeEventListener(event, handler));
}

/**
 * 建立防抖（Debounce）版本的函式
 * @param {Function} fn    - 真正要執行的函式
 * @param {number}   delay - 延遲毫秒數
 * @returns {Function}     - 具有防抖功能的全新函式
 */
export function debounce(fn, delay = 500) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

export class ValidationError extends Error {
  constructor(messages) {
    super('表單欄位驗證失敗');
    this.name = 'ValidationError';
    this.messages = messages; // 儲存錯誤訊息陣列，例如：['請填寫姓名', '請填寫地址']
  }
}