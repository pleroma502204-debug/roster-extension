// ════════════════════════════════════════════
// app.js — SPA router
// ════════════════════════════════════════════

import { init }       from './src/core/store/globalState.js';
import { startClock } from './src/shared/utils/date.js';

const PAGE_MODULES = {
  data:     () => import('./src/pages/data/main.js'),
  schedule: () => import('./src/pages/schedule/main.js'),
  settings: () => import('./src/pages/settings/main.js'),
};

const PAGE_TEMPLATES = {
  data:     'tpl-data',
  schedule: 'tpl-schedule',
  settings: 'tpl-settings',
};

let _currentUnmount = null;

async function navigate(pageKey) {
  if (_currentUnmount) {
    _currentUnmount();
    _currentUnmount = null;
  }

  const root = document.getElementById('page-root');
  root.innerHTML = '';

  const tpl = document.getElementById(PAGE_TEMPLATES[pageKey]);
  root.append(tpl.content.cloneNode(true));

  const mod = await PAGE_MODULES[pageKey]();
  _currentUnmount = mod.unmount ?? null;
  await mod.mount();

  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.page === pageKey);
  });
}

function bindSidebarNav() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => navigate(btn.dataset.page));
  });
}

// ── 啟動 ──────────────────────────────────────
(async () => {
  await init();
  startClock();
  bindSidebarNav();
  await navigate('settings');
})();