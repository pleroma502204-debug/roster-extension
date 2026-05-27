// popup.js

// ── 導覽 ──────────────────────────────────────
document.getElementById('btn-home').addEventListener('click', async () => {
  const url  = chrome.runtime.getURL('index.html');
  const [tab] = await chrome.tabs.query({ url });

  // 查重
  if (tab) {
    await chrome.tabs.update(tab.id, { active: true });
    await chrome.windows.update(tab.windowId, { focused: true });
  } else {
    await chrome.tabs.create({ url });
  }
  window.close();
});

// ── 狀態訊息 ──────────────────────────────────
function showStatus(msg, type = 'ok') {
  const el = document.getElementById('status-msg');
  el.textContent = msg;
  el.className   = `show ${type}`;
  setTimeout(() => { el.className = ''; el.textContent = ''; }, 3000);
}

// ── 生成班表 ──────────────────────────────────
document.getElementById('btn-export-xlsx').addEventListener('click', async () => {
  try {
    const res = await chrome.runtime.sendMessage({ action: 'EXPORT_SCHEDULE', format: 'xlsx' });
    if (res?.ok) showStatus('班表已生成 ✓');
    else         showStatus(res?.error ?? '匯出失敗', 'error');
  } catch (e) { showStatus(e.message, 'error'); }
});

document.getElementById('btn-export-json').addEventListener('click', async () => {
  try {
    const res = await chrome.runtime.sendMessage({ action: 'EXPORT_SCHEDULE', format: 'json' });
    if (res?.ok) showStatus('班表已生成 ✓');
    else         showStatus(res?.error ?? '匯出失敗', 'error');
  } catch (e) { showStatus(e.message, 'error'); }
});

// ── 基本資料匯出 ──────────────────────────────
document.getElementById('btn-export-data').addEventListener('click', async () => {
  try {
    const res = await chrome.runtime.sendMessage({ action: 'EXPORT_BASE_DATA' });
    if (res?.ok) showStatus('基本資料已匯出 ✓');
    else         showStatus(res?.error ?? '匯出失敗', 'error');
  } catch (e) { showStatus(e.message, 'error'); }
});

// ── 基本資料匯入 ──────────────────────────────
document.getElementById('btn-import-data').addEventListener('click', () => {
  document.getElementById('import-file').click();
});

document.getElementById('import-file').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  try {
    const text = await file.text();
    const data = JSON.parse(text);
    const res  = await chrome.runtime.sendMessage({ action: 'IMPORT_BASE_DATA', data });
    if (res?.ok) showStatus('基本資料已匯入 ✓');
    else         showStatus(res?.error ?? '匯入失敗', 'error');
  } catch (e) {
    showStatus('檔案格式錯誤', 'error');
  }

  // 清空 input，下次還能選同一個檔案
  e.target.value = '';
});