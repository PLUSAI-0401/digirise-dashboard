const fs = require('fs');
const path = require('path');

const OVERRIDES_PATH = path.join(__dirname, 'budgetOverrides.json');

function readOverridesFile() {
  try {
    const data = fs.readFileSync(OVERRIDES_PATH, 'utf8');
    return JSON.parse(data);
  } catch {
    return {};
  }
}

function writeOverridesFile(data) {
  fs.writeFileSync(OVERRIDES_PATH, JSON.stringify(data, null, 2), 'utf8');
}

function getOverrides(year, month) {
  const all = readOverridesFile();
  return all[`${year}-${month}`] || {};
}

function saveOverride(year, month, key, field, value) {
  const all = readOverridesFile();
  const monthKey = `${year}-${month}`;
  if (!all[monthKey]) all[monthKey] = {};
  if (!all[monthKey][key]) all[monthKey][key] = {};
  all[monthKey][key][field] = value;
  writeOverridesFile(all);
  return all[monthKey];
}

module.exports = { getOverrides, saveOverride };
