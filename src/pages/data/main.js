// ════════════════════════════════════════════
// pages/data/main.js
// 資料頁進入點
// ════════════════════════════════════════════

import { subscribe, getSettingsState, setSettingsState } from '../../core/store/globalState.js';
import { setupCardToggles, showHint, debounce }          from '../../shared/utils/dom.js';
import { mount as mountSite,  
         unmount as unmountSite, renderSites }           from './components/siteTab.js';
import { mount as mountEmp, 
         unmount as unmountEmp, 
         renderEmployees, refreshMapSelects }            from './components/employeeTab.js';
import { renderDeadlinePanel }                           from './components/deadlinePanel.js';

const _cleanups = [];

export async function mount() {
  document.querySelectorAll('#page-data .tab-nav .tab').forEach(btn => {
    const h = () => {
      document.querySelectorAll('#page-data .tab-nav .tab').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('#page-data .tab-content').forEach(s => s.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`tab-${btn.dataset.tab}`)?.classList.add('active');
      if (btn.dataset.tab === 'overview') refreshMapSelects();
    };
    btn.addEventListener('click', h);
    _cleanups.push(() => btn.removeEventListener('click', h));
  });

  setupCardToggles('#page-data', _cleanups);
  mountSite();
  mountEmp();
  _setupDeadlinePanel();

  const unsub = subscribe(key => {
    if (key === 'sites')     renderSites();
    if (key === 'employees') renderEmployees();
    if (key === 'sites' || key === 'employees' || key === 'schedule') renderDeadlinePanel();
  });
  _cleanups.push(unsub);
}

export function unmount() {
  unmountSite();
  unmountEmp();
  _cleanups.forEach(fn => fn());
  _cleanups.length = 0;
}

// ── Deadline Panel ────────────────────────────
function _setupDeadlinePanel() {
  const input = document.getElementById('deadline-threshold');
  if (input) {
    // 從 storage 還原上次的天數
    input.value = getSettingsState().deadlineThreshold ?? 90;

    // 更新顯示防抖
    const debouncedShowHint = debounce(() => {
      showHint('deadline-hint');
    }, 600);

    const h = async () => {
      const val = parseInt(input.value);
      if (!val || val < 1) return;
      await setSettingsState({ deadlineThreshold: val });
      renderDeadlinePanel();
      debouncedShowHint();
    };

    input.addEventListener('input', h);
    _cleanups.push(() => input.removeEventListener('input', h));
  }
  renderDeadlinePanel();
}