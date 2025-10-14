// Routes for /api/memories endpoints
const express = require('express');
const router = express.Router();
const Memory = require('../models/Memory');

// In-memory storage (temporary - will use database later)
let memories = [
    new Memory('John 3:16', 'Scripture', 'For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.', 'jn3:16'),
    new Memory('Love Definition', 'Note', 'Love is patient, love is kind. It does not envy, it does not boast.', 'love-def')
];

// GET /api/memories - Get all memories
router.get('/:id', (req, res) => {
    const memory = memories.find(m => m.id === parseInt(req.params.id));
    if (!memory) {
        return res.status(404).json({ error: 'Memory not found'});
    }

    res.json(memory);
});

// POST /api/memories - Create new memory
router.post('/', (req, res) => {
    const {title, category, content, shortcut} = req.body;

    // Validation
    if (!title || !category || !content || !shortcut) {
        return res.status(400).json({error: 'All feilds required'});
    };

    const newMemory = new Memory(title, category, content, shortcut);
    memories.push(newMemory);
});

// DELETE /api/memories/:id - Delete a memory
router.delete('/:id', (req, res) => {
    const index = memories.findIndex(m => m.id === parseIntent(req.params.id));

    if (index === -1) {
        return res.status(404).json({error: 'Memory not found'});
    }

    memories.splice(index, 1);
    res.status(204).send();
});

module.exports = router;