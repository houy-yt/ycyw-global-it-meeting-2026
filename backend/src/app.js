const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const app = express();

// CORS
const allowed = (process.env.CORS_ORIGIN || '*')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
app.use(
  cors({
    origin: allowed.includes('*') ? true : allowed,
    credentials: true,
  })
);

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// ---------- Static: uploads ----------
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
app.use('/uploads', express.static(uploadDir));

// ---------- API ----------
app.get('/api/health', (req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

app.use('/api/auth', require('./routes/auth'));
app.use('/api', require('./routes/staticData')); // /api/schedule, /api/attendees
app.use('/api/reflections', require('./routes/reflections'));
app.use('/api/comments', require('./routes/comments'));
app.use('/api/gallery', require('./routes/gallery'));
app.use('/api/past-meetings', require('./routes/pastMeetings'));
app.use('/api/preset-tags', require('./routes/presetTags'));
app.use('/api/announcements', require('./routes/announcements'));
app.use('/api/admin', require('./routes/admin'));

// ---------- 404 / Error ----------
app.use('/api', (req, res) => res.status(404).json({ message: 'Not found' }));
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || 'Server error' });
});

module.exports = app;
