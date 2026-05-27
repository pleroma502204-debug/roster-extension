// ════════════════════════════════════════════
// shared/storage.js — 純 I/O，不含業務邏輯
// 規則：任何模組不得直接 import 此檔，
//       一律透過 globalState 存取資料。
// ════════════════════════════════════════════

import { KEYS, DEFAULT_SETTINGS } from './constants.js';

// ── 通用 ─────────────────────────────────────
async function get(key) {
  const result = await chrome.storage.local.get(key);
  return result[key] ?? null;
}

async function set(key, value) {
  await chrome.storage.local.set({ [key]: value });
}

async function initIfAbsent(key, defaultValue) {
  const existing = await get(key);
  if (existing === null) {
    await set(key, defaultValue);
    return defaultValue;
  }
  return existing;
}

// ── 設定 ─────────────────────────────────────
export async function getSettings() {
  return await initIfAbsent(KEYS.SETTINGS, { ...DEFAULT_SETTINGS });
}
export async function setSettings(settings) {
  await set(KEYS.SETTINGS, settings);
}

// ── 據點 ─────────────────────────────────────
export async function getSites() {
  return await initIfAbsent(KEYS.SITES, []);
}
export async function setSites(sites) {
  await set(KEYS.SITES, sites);
}

// ── 人員 ─────────────────────────────────────
export async function getEmployees() {
  return await initIfAbsent(KEYS.EMPLOYEES, []);
}
export async function setEmployees(employees) {
  await set(KEYS.EMPLOYEES, employees);
}

// ── 班表 ─────────────────────────────────────
export async function getSchedules() {
  return await initIfAbsent(KEYS.SCHEDULES, {});
}
export async function setSchedules(schedules) {
  await set(KEYS.SCHEDULES, schedules);
}

export async function getMonthSchedule(month) {
  const all = await getSchedules();
  return all[month] ?? {};
}
export async function setMonthSchedule(month, data) {
  const all = await getSchedules();
  all[month] = data;
  await setSchedules(all);
}
