const express = require('express');
const db = require('../db');

const router = express.Router();

router.get('/', (req, res) => {
  const { q } = req.query;
  let stores = db.prepare('SELECT * FROM anydesk_stores ORDER BY name').all();
  if (q && q.trim()) {
    const needle = q.trim().toLowerCase();
    stores = stores.filter((s) => s.name.toLowerCase().includes(needle));
  }
  const devicesStmt = db.prepare('SELECT id, label, device_id FROM anydesk_devices WHERE store_id = ?');
  const result = stores.map((s) => ({
    ...s,
    devices: devicesStmt.all(s.id),
  }));
  res.json(result);
});

router.post('/', (req, res) => {
  const { name, note = '', program = 'AnyDesk', devices = [] } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'name is required' });
  const result = db
    .prepare('INSERT INTO anydesk_stores (name, note, program) VALUES (?, ?, ?)')
    .run(name.trim(), note || null, program || 'AnyDesk');
  const insertDevice = db.prepare('INSERT INTO anydesk_devices (store_id, label, device_id) VALUES (?, ?, ?)');
  devices.forEach((d) => {
    if (d.label && d.id) insertDevice.run(result.lastInsertRowid, d.label, d.id);
  });
  const store = db.prepare('SELECT * FROM anydesk_stores WHERE id = ?').get(result.lastInsertRowid);
  const storeDevices = db.prepare('SELECT id, label, device_id FROM anydesk_devices WHERE store_id = ?').all(store.id);
  res.status(201).json({ ...store, devices: storeDevices });
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM anydesk_stores WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Store not found' });
  const name = req.body.name ?? existing.name;
  const note = req.body.note ?? existing.note;
  const program = req.body.program ?? existing.program;
  db.prepare('UPDATE anydesk_stores SET name = ?, note = ?, program = ? WHERE id = ?').run(
    name, note, program, req.params.id
  );
  const store = db.prepare('SELECT * FROM anydesk_stores WHERE id = ?').get(req.params.id);
  const storeDevices = db.prepare('SELECT id, label, device_id FROM anydesk_devices WHERE store_id = ?').all(store.id);
  res.json({ ...store, devices: storeDevices });
});

router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM anydesk_stores WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Store not found' });
  res.status(204).end();
});

router.post('/:id/devices', (req, res) => {
  const store = db.prepare('SELECT * FROM anydesk_stores WHERE id = ?').get(req.params.id);
  if (!store) return res.status(404).json({ error: 'Store not found' });
  const { label, device_id } = req.body;
  if (!label || !device_id) return res.status(400).json({ error: 'label and device_id are required' });
  const result = db
    .prepare('INSERT INTO anydesk_devices (store_id, label, device_id) VALUES (?, ?, ?)')
    .run(req.params.id, label.trim(), String(device_id).trim());
  const device = db.prepare('SELECT id, label, device_id FROM anydesk_devices WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(device);
});

router.put('/devices/:deviceId', (req, res) => {
  const existing = db.prepare('SELECT * FROM anydesk_devices WHERE id = ?').get(req.params.deviceId);
  if (!existing) return res.status(404).json({ error: 'Device not found' });
  const label = req.body.label ?? existing.label;
  const device_id = req.body.device_id ?? existing.device_id;
  db.prepare('UPDATE anydesk_devices SET label = ?, device_id = ? WHERE id = ?').run(
    label, String(device_id), req.params.deviceId
  );
  const device = db.prepare('SELECT id, label, device_id FROM anydesk_devices WHERE id = ?').get(req.params.deviceId);
  res.json(device);
});

router.delete('/devices/:deviceId', (req, res) => {
  const result = db.prepare('DELETE FROM anydesk_devices WHERE id = ?').run(req.params.deviceId);
  if (result.changes === 0) return res.status(404).json({ error: 'Device not found' });
  res.status(204).end();
});

module.exports = router;
