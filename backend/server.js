const express = require('express');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const cors = require('cors');

const connectDB = require('./config/db');

dotenv.config();

const app = express();

const corsOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: corsOrigins.length ? corsOrigins : true,
    credentials: true
  })
);
app.use(express.json({ limit: '1mb' }));

app.get('/', (_req, res) => {
  res.type('html').send(`<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><title>Creato3 API</title></head>
<body style="font-family:system-ui;max-width:40rem;margin:2rem;line-height:1.5">
  <h1>Creato3 backend (API only)</h1>
  <p>This is the Express server — not the React app. Use <strong>http://</strong> (not https) on this port.</p>
  <ul>
    <li><a href="/health"><code>/health</code></a> — JSON status</li>
    <li><code>/api/creators</code> — list creators (needs chain env + <code>CREATOR_ADDRESSES</code>)</li>
  </ul>
  <p>Run the UI: from repo root <code>npm run dev:frontend</code>, or <code>cd creato3-frontend && npm run dev</code> → usually <a href="http://127.0.0.1:5173/">http://127.0.0.1:5173/</a></p>
</body>
</html>`);
});

app.get('/health', (_req, res) => {
  res.status(200).json({ ok: true });
});

app.use('/api/creators', require('./routes/creators'));
app.use('/api/content', require('./routes/content'));
app.use('/api/agents', require('./routes/agents'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/subscribe', require('./routes/subscribe'));
app.use('/api/subscription', require('./routes/subscription'));

// Default 3001: macOS often binds AirPlay Receiver to 5000, which breaks http://localhost:5000 in browsers.
const PORT = process.env.PORT || 3001;

const gracefulShutdown = async (signal, server) => {
  console.log(`${signal} received. Shutting down gracefully...`);

  server.close(async () => {
    try {
      await mongoose.connection.close();
    } catch (error) {
      console.error(`MongoDB shutdown error: ${error.message}`);
    } finally {
      process.exit(0);
    }
  });
};

const startServer = async () => {
  try {
    await connectDB();

    const server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

    process.on('SIGINT', () => {
      void gracefulShutdown('SIGINT', server);
    });

    process.on('SIGTERM', () => {
      void gracefulShutdown('SIGTERM', server);
    });
  } catch (error) {
    console.error(`Server startup error: ${error.message}`);
    process.exit(1);
  }
};

startServer();

module.exports = app;
