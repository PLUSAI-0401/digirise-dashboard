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
            // Data not ready yet (e.g., today's data)
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
 * Get LINE metrics for a given month
 * - Total followers at end of month (or latest available date)
 * - New followers added during the month
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

    // Determine the "end" date for the requested month
    // LINE API data is available up to yesterday
    let endDate;
    if (year === currentYear && month === currentMonth) {
      // Current month: use yesterday's data (today's not available yet)
      const yesterday = currentDay - 1;
      if (yesterday < 1) {
        // First day of month, no data for this month yet
        endDate = null;
      } else {
        endDate = formatDate(year, month, yesterday);
      }
    } else if (year < currentYear || (year === currentYear && month < currentMonth)) {
      // Past month: use last day of that month
      const lastDay = new Date(year, month, 0).getDate();
      endDate = formatDate(year, month, lastDay);
    } else {
      // Future month: no data
      return null;
    }

    if (!endDate) return null;

    // Start date: last day of previous month (to get baseline)
    let startYear = year;
    let startMonth = month - 1;
    if (startMonth < 1) {
      startMonth = 12;
      startYear = year - 1;
    }
    const lastDayPrevMonth = new Date(startYear, startMonth, 0).getDate();
    const startDate = formatDate(startYear, startMonth, lastDayPrevMonth);

    // Fetch both dates in parallel
    const [endData, startData] = await Promise.all([
      getFollowerInsight(endDate),
      getFollowerInsight(startDate),
    ]);

    if (!endData) return null;

    const totalFollowers = endData.followers || 0;
    const targetedReaches = endData.targetedReaches || 0;
    const blocks = endData.blocks || 0;

    // Calculate new followers for the month
    const startFollowers = startData ? (startData.followers || 0) : 0;
    const newFollowers = totalFollowers - startFollowers;

    return {
      totalFollowers,
      newFollowers: Math.max(0, newFollowers),
      targetedReaches,
      blocks,
      dataDate: endDate,
    };
  } catch (err) {
    console.error('LINE API error:', err.message);
    return null;
  }
}

module.exports = { getLineMetrics };
