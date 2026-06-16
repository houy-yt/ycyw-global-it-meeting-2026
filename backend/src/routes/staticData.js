/**
 * Serves static JSON files (schedule.json, attendees.json) from /data.
 * No in-memory cache: edits to JSON take effect immediately.
 */
const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const DATA_DIR = path.join(__dirname, '..', '..', 'data');

function readJson(name) {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, name), 'utf-8'));
}

router.get('/schedule', (req, res) => {
  try {
    res.json(readJson('schedule.json'));
  } catch (e) {
    console.error('[schedule] load error:', e);
    res.status(500).json({ message: 'Failed to load schedule' });
  }
});

router.get('/attendees', (req, res) => {
  try {
    const list = readJson('attendees.json');
    const groups = {};
    for (const a of list) {
      const key = a.school || 'Other';
      if (!groups[key]) groups[key] = [];
      groups[key].push(a);
    }
    const grouped = Object.entries(groups).map(([school, people]) => ({
      school,
      people,
    }));
    res.json({ total: list.length, groups: grouped });
  } catch (e) {
    console.error('[attendees] load error:', e);
    res.status(500).json({ message: 'Failed to load attendees' });
  }
});

module.exports = router;
