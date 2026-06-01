// ════════════════════════════════════════════
// shared/utils/notify.js
// 使用者通知 UI
// ════════════════════════════════════════════

import { openModal, closeModal } from './dom.js';

/** 顯示 save hint，2 秒後淡出 */
export function showHint(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2000);
}

/**
 * 顯示 toast 訊息，4 秒後自動隱藏
 * @param {string}  msg
 * @param {boolean} isError
 */
export function showToastMsg(msg, isError = false) {
  const el = document.getElementById('toast-msg');
  if (!el) return;
  el.textContent = msg;
  el.style.color = isError ? 'var(--danger)' : 'var(--success)';
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 4000);
}

/**
 * 顯示確認 modal，回傳 Promise<boolean>
 * true = 確認，false = 取消
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
    const onOk = () => { cleanup(); closeModal('confirm-modal'); resolve(true); };
    const onCancel = () => { cleanup(); closeModal('confirm-modal'); resolve(false); };

    okBtn.addEventListener('click', onOk);
    cancelBtn.addEventListener('click', onCancel);
  });
}

/**
 * 顯示警告 modal，回傳 Promise
 * @param {string|string[]} msg - 單一字串或錯誤訊息陣列
 */
export function showWarning(msg) {
  return new Promise(resolve => {
    const container = document.getElementById('warning-msg');
    container.innerHTML = '';

    if (Array.isArray(msg)) {
      const ul = document.createElement('ul');
      ul.style.cssText = 'margin:0;padding-left:20px;text-align:left;';
      msg.forEach(item => {
        const li = document.createElement('li');
        li.textContent = item;
        li.style.marginBottom = '4px';
        ul.appendChild(li);
      });
      container.appendChild(ul);
    } else {
      container.textContent = msg;
      container.style.textAlign = 'center';
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