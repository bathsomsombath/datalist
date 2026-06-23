'use strict';
/*
 * Workshop Controller — HTTP/API server.
 * Express serves the REST API under /api and the static SPA from /public.
 */
const path = require('node:path');
const express = require('express');
const repo = require('./db');

repo.init();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Tiny async wrapper so thrown errors become 500s instead of crashing.
const h = (fn) => (req, res) => {
  try { fn(req, res); }
  catch (err) { console.error(err); res.status(500).json({ error: err.message }); }
};
const bad = (res, msg) => res.status(400).json({ error: msg });

/* ---------- bootstrap ---------- */
app.get('/api/state', h((req, res) => res.json(repo.getState())));
app.get('/api/health', (req, res) => res.json({ ok: true }));

/* ---------- customers ---------- */
app.get('/api/customers', h((req, res) => res.json(repo.getCustomers())));
app.post('/api/customers', h((req, res) => {
  if (!String(req.body.name || '').trim()) return bad(res, 'Name is required');
  res.status(201).json(repo.createCustomer(req.body));
}));
app.put('/api/customers/:id', h((req, res) => {
  if (!String(req.body.name || '').trim()) return bad(res, 'Name is required');
  const row = repo.updateCustomer(Number(req.params.id), req.body);
  row ? res.json(row) : res.status(404).json({ error: 'Not found' });
}));
app.delete('/api/customers/:id', h((req, res) => {
  repo.deleteCustomer(Number(req.params.id)) ? res.json({ ok: true }) : res.status(404).json({ error: 'Not found' });
}));

/* ---------- vehicles ---------- */
app.get('/api/vehicles', h((req, res) => res.json(repo.getVehicles())));
app.post('/api/vehicles', h((req, res) => {
  if (!req.body.customerId) return bad(res, 'customerId is required');
  if (!String(req.body.make || '').trim() && !String(req.body.model || '').trim()) return bad(res, 'Make or model is required');
  res.status(201).json(repo.createVehicle(req.body));
}));
app.put('/api/vehicles/:id', h((req, res) => {
  if (!req.body.customerId) return bad(res, 'customerId is required');
  const row = repo.updateVehicle(Number(req.params.id), req.body);
  row ? res.json(row) : res.status(404).json({ error: 'Not found' });
}));
app.delete('/api/vehicles/:id', h((req, res) => {
  repo.deleteVehicle(Number(req.params.id)) ? res.json({ ok: true }) : res.status(404).json({ error: 'Not found' });
}));

/* ---------- jobs ---------- */
app.get('/api/jobs', h((req, res) => res.json(repo.getJobs())));
app.get('/api/jobs/:id', h((req, res) => {
  const j = repo.getJob(Number(req.params.id));
  j ? res.json(j) : res.status(404).json({ error: 'Not found' });
}));
app.post('/api/jobs', h((req, res) => {
  if (!req.body.customerId) return bad(res, 'customerId is required');
  if (!String(req.body.title || '').trim()) return bad(res, 'Job title is required');
  res.status(201).json(repo.createJob(req.body));
}));
app.put('/api/jobs/:id', h((req, res) => {
  if (!req.body.customerId) return bad(res, 'customerId is required');
  if (!String(req.body.title || '').trim()) return bad(res, 'Job title is required');
  res.json(repo.updateJob(Number(req.params.id), req.body));
}));
app.patch('/api/jobs/:id/status', h((req, res) => {
  const j = repo.setJobStatus(Number(req.params.id), req.body.status);
  j ? res.json(j) : bad(res, 'Invalid status');
}));
app.delete('/api/jobs/:id', h((req, res) => {
  repo.deleteJob(Number(req.params.id)) ? res.json({ ok: true }) : res.status(404).json({ error: 'Not found' });
}));

/* ---------- technicians ---------- */
app.get('/api/techs', h((req, res) => res.json(repo.getTechs())));
app.post('/api/techs', h((req, res) => res.status(201).json(repo.addTech(req.body.name))));
app.delete('/api/techs/:name', h((req, res) => res.json(repo.deleteTech(req.params.name))));

/* ---------- settings ---------- */
app.get('/api/settings', h((req, res) => res.json(repo.getSettings())));
app.put('/api/settings', h((req, res) => res.json(repo.updateSettings(req.body))));

app.listen(PORT, () => {
  console.log(`🔧 Workshop Controller running at http://localhost:${PORT}`);
});
