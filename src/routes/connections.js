// Routes for /api/connections - typed links between Thoughts, persisted to SQLite.

const express = require('express');
const router = express.Router();
const Connection = require('../models/connection');

// GET /api/connections - all connections (used to redraw pathways on load).
router.get('/', (req, res) => {
    res.json(Connection.all());
});

// POST /api/connections - create a typed connection.
router.post('/', (req, res) => {
    const { fromThoughtId, toThoughtId, type } = req.body;
    try {
        const conn = Connection.create({ fromThoughtId, toThoughtId, type });
        res.status(201).json(conn);
    } catch (err) {
        // Validation problems (self-link, duplicate, missing Thought) are client errors.
        res.status(409).json({ error: err.message });
    }
});

// PUT /api/connections/:id - change a connection's type.
router.put('/:id', (req, res) => {
    const conn = Connection.updateType(Number(req.params.id), req.body.type);
    if (!conn) return res.status(404).json({ error: 'Connection not found' });
    res.json(conn);
});

// DELETE /api/connections/:id
router.delete('/:id', (req, res) => {
    const removed = Connection.remove(Number(req.params.id));
    if (!removed) return res.status(404).json({ error: 'Connection not found' });
    res.status(204).send();
});

module.exports = router;
