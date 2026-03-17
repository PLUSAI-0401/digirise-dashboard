const https = require('https');

const LINE_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;

/**
 * LINE Messaging API: Get follower insight for a specific date
 * @param {string} date - YYYYMMDD format
 * @returns {Promise<{followers: number, targetedReaches: number, blocks: number} | null>}
 */
function getFollowerInsight(date) {
  return new Promise((resolve, reject) => {
    if (!LINE_ACCESS_TOKEN) {
      return resolve(null);
    }

    const options = {
      hostname: 'api.line.me',
      path: `/v2/bot/insight/followers?date=${date}`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${LINE_ACCESS_TOKEN}`,
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.status === 'ready') {
            resolve(parsed);
          } else {
            // Data not ready yet
            resolve(null);
          }
        } catch (e) {
          resolve(null);
        }
      });
    });

    req.on('error', () => resolve(null));
    req.setTimeout(10000, () => { req.destroy(); resolve(null); });
    req.end();
  });
}

/**
 * Format date as YYYYMMDD
 */
function formatDate(year, month, day) {
  return `${year}${String(month).padStart(2, '0')}${String(day).padStart(2, '0')}`;
}

/**
 * Get the latest available follower data.
 * Try today first, then fall back to yesterday.
 */
async function getLatestFollowerData(year, month, day) {
  // Try today first
  const todayDate = formatDate(year, month, day);
  const todayData = await getFollowerInsight(todayDate);
  if (todayData) {
    return { data: todayData, date: todayDate };
  }

  // Fall back to yesterday
  const yesterday = day - 1;
  if (yesterday >= 1) {
    const yesterdayDate = formatDate(year, month, yesterday);
    const yesterdayData = await getFollowerInsight(yesterdayDate);
    if (yesterdayData) {
      return { data: yesterdayData, date: yesterdayDate };
    }
  }

  return null;
}

/**
 * Get LINE metrics for a given month
 * - Total followers at end of month (or latest available date)
 * - New followers added during the month (current month end - first day of month)
 * @param {number} year
 * @param {number} month
 * @returns {Promise<{totalFollowers, newFollowers, targetedReaches, blocks} | null>}
 */
async function getLineMetrics(year, month) {
  if (!LINE_ACCESS_TOKEN) {
    return null;
  }

  try {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const currentDay = now.getDate();

    let endResult;

    if (year === currentYear && month === currentMonth) {
      // Current month: try today first, then yesterday
      endResult = await getLatestFollowerData(year, month, currentDay);
    } else if (year < currentYear || (year === currentYear && month < currentMonth)) {
      // Past month: use last day of that month
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = formatDate(year, month, lastDay);
      const endData = await getFollowerInsight(endDate);
      if (endData) {
        endResult = { data: endData, date: endDate };
      }
    } else {
      // Future month: no data
      return null;
    }

    if (!endResult) return null;

    // Baseline: first day of the current month (March 1 for March data)
    const startDate = formatDate(year, month, 1);
    const startData = await getFollowerInsight(startDate);

    const totalFollowers = endResult.data.followers || 0;
    const targetedReaches = endResult.data.targetedReaches || 0;
    const blocks = endResult.data.blocks || 0;

    // New followers = latest - first day of month
    const startFollowers = startData ? (startData.followers || 0) : 0;
    const newFollowers = totalFollowers - startFollowers;

    return {
      totalFollowers,
      newFollowers: Math.max(0, newFollowers),
      targetedReaches,
      blocks,
      dataDate: endResult.date,
    };
  } catch (err) {
    console.error('LINE API error:', err.message);
    return null;
  }
}

module.exports = { getLineMetrics };
