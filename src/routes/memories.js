// Routes for /api/memories - named clusters of connected Thoughts (the "white papers").

const express = require('express');
const router = express.Router();
const Memory = require('../models/memory');

// GET /api/memories - all Memories (canvas bubbles + the Memories panel).
router.get('/', (req, res) => {
    res.json(Memory.all());
});

// GET /api/memories/:id - full Memory for the document view:
// member Thoughts in chronological order + the connections among them.
router.get('/:id', (req, res) => {
    const memory = Memory.getById(Number(req.params.id));
    if (!memory) return res.status(404).json({ error: 'Memory not found' });
    res.json(memory);
});

// POST /api/memories - create a named Memory from a set of Thoughts.
router.post('/', (req, res) => {
    const { name, thoughtIds } = req.body;
    try {
        const memory = Memory.create({ name, thoughtIds });
        res.status(201).json(memory);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// PUT /api/memories/:id - rename.
router.put('/:id', (req, res) => {
    try {
        const memory = Memory.rename(Number(req.params.id), req.body.name);
        if (!memory) return res.status(404).json({ error: 'Memory not found' });
        res.json(memory);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// POST /api/memories/:id/arrange - re-lay the Memory out as an organic formation
// (Origin far left, branches fanning right) on clear ground near its current home.
router.post('/:id/arrange', (req, res) => {
    try {
        const memory = Memory.arrange(Number(req.params.id));
        if (!memory) return res.status(404).json({ error: 'Memory not found' });
        res.json(memory);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// POST /api/memories/:id/thoughts - add Thoughts to the Memory (it grows).
router.post('/:id/thoughts', (req, res) => {
    const memory = Memory.addThoughts(Number(req.params.id), req.body.thoughtIds);
    if (!memory) return res.status(404).json({ error: 'Memory not found' });
    res.json(memory);
});

// DELETE /api/memories/:id/thoughts/:thoughtId - remove one Thought from the Memory.
router.delete('/:id/thoughts/:thoughtId', (req, res) => {
    const memory = Memory.removeThought(Number(req.params.id), Number(req.params.thoughtId));
    if (!memory) return res.status(404).json({ error: 'Memory not found' });
    res.json(memory);
});

// DELETE /api/memories/:id - delete the Memory (its Thoughts stay on the canvas).
router.delete('/:id', (req, res) => {
    const removed = Memory.remove(Number(req.params.id));
    if (!removed) return res.status(404).json({ error: 'Memory not found' });
    res.status(204).send();
});

module.exports = router;
