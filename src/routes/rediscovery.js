// Routes for /api/rediscovery - "you might want to connect these" suggestions.

const express = require('express');
const router = express.Router();
const Rediscovery = require('../models/rediscovery');

// GET /api/rediscovery - current suggestions (computed fresh; the corpus is small).
router.get('/', (req, res) => {
    res.json(Rediscovery.suggestions());
});

// POST /api/rediscovery/dismiss - "not related"; the pair never resurfaces.
router.post('/dismiss', (req, res) => {
    try {
        Rediscovery.dismiss(req.body.aId, req.body.bId);
        res.status(204).send();
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

module.exports = router;
