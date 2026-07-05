// Routes for /api/thoughts - the core unit of MindFull. Backed by SQLite via the Thought model.

const express = require('express');
const router = express.Router();
const Thought = require('../models/thought');

// GET /api/thoughts - all Thoughts, in Big Bang order (oldest first).
router.get('/', (req, res) => {
    res.json(Thought.all());
});

// GET /api/thoughts/:id - a single Thought, including its Go Deeper entries.
router.get('/:id', (req, res) => {
    const thought = Thought.getById(Number(req.params.id));
    if (!thought) return res.status(404).json({ error: 'Thought not found' });
    res.json(thought);
});

// POST /api/thoughts - create a Thought.
router.post('/', (req, res) => {
    const { title, category, shortcut, content, source, x, y, tags } = req.body;
    if (!title || !category) {
        return res.status(400).json({ error: 'Title and category are required' });
    }
    try {
        const thought = Thought.create({ title, category, shortcut, content, source, x, y, tags });
        res.status(201).json(thought);
    } catch (err) {
        // Most likely a duplicate shortcut (UNIQUE constraint).
        if (String(err.message).includes('UNIQUE')) {
            return res.status(409).json({ error: 'That shortcut is already in use' });
        }
        throw err;
    }
});

// PUT /api/thoughts/:id - partial update. Also handles position saves ({x, y}) from dragging.
router.put('/:id', (req, res) => {
    try {
        const thought = Thought.update(Number(req.params.id), req.body);
        if (!thought) return res.status(404).json({ error: 'Thought not found' });
        res.json(thought);
    } catch (err) {
        if (String(err.message).includes('UNIQUE')) {
            return res.status(409).json({ error: 'That shortcut is already in use' });
        }
        throw err;
    }
});

// POST /api/thoughts/:id/depth - "Go Deeper": append an in-depth entry.
router.post('/:id/depth', (req, res) => {
    const { body } = req.body;
    if (!body || !String(body).trim()) {
        return res.status(400).json({ error: 'Depth body is required' });
    }
    const thought = Thought.addDepth(Number(req.params.id), String(body).trim());
    if (!thought) return res.status(404).json({ error: 'Thought not found' });
    res.status(201).json(thought);
});

// DELETE /api/thoughts/:id
router.delete('/:id', (req, res) => {
    const removed = Thought.remove(Number(req.params.id));
    if (!removed) return res.status(404).json({ error: 'Thought not found' });
    res.status(204).send();
});

module.exports = router;
