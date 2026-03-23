require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const path = require('path');
const express = require('express');
const cors = require('cors');
const dashboardRoutes = require('./routes/dashboard');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3001;

// CORS for local development
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

// API routes
app.use('/api/dashboard', dashboardRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Serve built React app in production
const clientDistPath = path.resolve(__dirname, '../../client/dist');
app.use(express.static(clientDistPath));

// SPA fallback: non-API routes serve index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);

  // Keep-alive: ping self every 14 minutes to prevent Render free tier from sleeping
  const KEEP_ALIVE_URL = process.env.RENDER_EXTERNAL_URL || process.env.KEEP_ALIVE_URL;
  if (KEEP_ALIVE_URL) {
    const INTERVAL_MS = 14 * 60 * 1000; // 14 minutes
    setInterval(async () => {
      try {
        const res = await fetch(`${KEEP_ALIVE_URL}/api/health`);
        console.log(`[keep-alive] ping ${res.status} at ${new Date().toISOString()}`);
      } catch (err) {
        console.warn(`[keep-alive] ping failed: ${err.message}`);
      }
    }, INTERVAL_MS);
    console.log(`[keep-alive] enabled – pinging ${KEEP_ALIVE_URL} every 14 min`);
  }
});
