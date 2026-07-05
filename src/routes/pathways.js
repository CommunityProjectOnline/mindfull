// Routes for /api/pathways - the colored branches that emerge as Thoughts connect.
// Pathways are born automatically by the connection model; the client only reads them
// and overrides their color (or name).

const express = require('express');
const router = express.Router();
const Pathway = require('../models/pathway');

// GET /api/pathways - all pathways (used to color connections + mark Origins on load).
router.get('/', (req, res) => {
    res.json(Pathway.all());
});

// GET /api/pathways/palette - the branch color palette (for the color-override swatches).
router.get('/palette', (req, res) => {
    res.json(Pathway.PALETTE);
});

// PUT /api/pathways/:id - override a branch's color (and/or name).
router.put('/:id', (req, res) => {
    const { color, name } = req.body;
    const pathway = Pathway.update(Number(req.params.id), { color, name });
    if (!pathway) return res.status(404).json({ error: 'Pathway not found' });
    res.json(pathway);
});

module.exports = router;
