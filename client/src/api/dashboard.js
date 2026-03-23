const API_BASE = '/api/dashboard';

async function fetchJSON(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  return response.json();
}

export const fetchSummary = (year, month) =>
  fetchJSON(`${API_BASE}/summary?year=${year}&month=${month}`);

export const fetchMembers = (year, month) =>
  fetchJSON(`${API_BASE}/members?year=${year}&month=${month}`);

export const fetchPlans = () =>
  fetchJSON(`${API_BASE}/plans`);

export const fetchBudget = (year, month) =>
  fetchJSON(`${API_BASE}/budget?year=${year}&month=${month}`);

export const fetchMemberList = () =>
  fetchJSON(`${API_BASE}/members/list`);

export const fetchWeeklyMembers = () =>
  fetchJSON(`${API_BASE}/members/weekly`);

export const refreshCache = () =>
  fetch(`${API_BASE}/refresh`, { method: 'POST' }).then(r => r.json());

export const updateBudgetOverride = (year, month, key, field, value) =>
  fetch(`${API_BASE}/budget/override`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ year, month, key, field, value }),
  }).then(r => r.json());
