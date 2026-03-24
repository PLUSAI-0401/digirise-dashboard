const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const OVERRIDES_PATH = path.join(__dirname, 'budgetOverrides.json');

// --- PostgreSQL (production) ---
let pool = null;
let dbReady = false;

if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  // Create table on startup
  pool.query(`
    CREATE TABLE IF NOT EXISTS budget_overrides (
      month_key TEXT NOT NULL,
      kpi_key   TEXT NOT NULL,
      field     TEXT NOT NULL,
      value     NUMERIC NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (month_key, kpi_key, field)
    )
  `)
    .then(() => {
      dbReady = true;
      console.log('[db] budget_overrides table ready');
    })
    .catch((err) => {
      console.warn('[db] Failed to init table, falling back to file:', err.message);
    });
}

// --- File fallback (local dev) ---
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

// --- Public API ---
async function getOverrides(year, month) {
  const monthKey = `${year}-${month}`;

  if (pool && dbReady) {
    const { rows } = await pool.query(
      'SELECT kpi_key, field, value FROM budget_overrides WHERE month_key = $1',
      [monthKey]
    );
    const result = {};
    for (const row of rows) {
      if (!result[row.kpi_key]) result[row.kpi_key] = {};
      result[row.kpi_key][row.field] = Number(row.value);
    }
    return result;
  }

  // File fallback
  const all = readOverridesFile();
  return all[monthKey] || {};
}

async function saveOverride(year, month, key, field, value) {
  const monthKey = `${year}-${month}`;

  if (pool && dbReady) {
    await pool.query(
      `INSERT INTO budget_overrides (month_key, kpi_key, field, value, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (month_key, kpi_key, field)
       DO UPDATE SET value = $4, updated_at = NOW()`,
      [monthKey, key, field, value]
    );
    // Return current month overrides
    return getOverrides(year, month);
  }

  // File fallback
  const all = readOverridesFile();
  if (!all[monthKey]) all[monthKey] = {};
  if (!all[monthKey][key]) all[monthKey][key] = {};
  all[monthKey][key][field] = value;
  writeOverridesFile(all);
  return all[monthKey];
}

module.exports = { getOverrides, saveOverride };
