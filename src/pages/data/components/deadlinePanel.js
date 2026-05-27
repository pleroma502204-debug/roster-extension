// ════════════════════════════════════════════
// pages/data/components/deadlinePanel.js
// 期限總覽：據點合約日、區大日 + 員工離職日
// ════════════════════════════════════════════

import { getSettingsState, getDerived } from '../../../core/store/globalState.js';
import { formatDate }                   from '../../../shared/utils/date.js';

export function renderDeadlinePanel() {
  const tbody     = document.getElementById('deadline-tbody');
  const empty     = document.getElementById('deadline-empty');
  const threshold = getSettingsState().deadlineThreshold ?? 90;
  if (!tbody) return;

  const { deadlines } = getDerived();

  if (deadlines.length === 0) {
    tbody.innerHTML = '';
    if (empty) empty.style.display = '';
    return;
  }
  if (empty) empty.style.display = 'none';
  tbody.innerHTML = '';

  for (const row of deadlines) {
    const tr     = document.createElement('tr');
    const isWarn = row.days !== null && row.days <= threshold;
    if (isWarn) tr.classList.add('row-warn');
    tr.innerHTML = `
      <td>${row.name}</td>
      <td>${row.type}</td>
      <td>${formatDate(row.date)}</td>
      <td>${_daysBadge(row.days, threshold)}</td>`;
    tbody.appendChild(tr);
  }
}

function _daysBadge(days, threshold) {
  if (days === null) return '<span class="days-badge none">未設定</span>';
  const label = days < 0 ? `已過期 ${Math.abs(days)} 天` : `${days} 天後`;
  const cls   = days < 0 ? 'urgent' : days <= threshold ? 'warning' : 'ok';
  return `<span class="days-badge ${cls}">${label}</span>`;
}