// Routes for /api/stardust - the staging inbox for quick captures and AI imports.

const express = require('express');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const Stardust = require('../models/stardust');

// GET /api/stardust - the inbox: waiting items + their batches.
router.get('/', (req, res) => {
    res.json(Stardust.inbox());
});

// GET /api/stardust/count - just the badge number.
router.get('/count', (req, res) => {
    res.json({ count: Stardust.count() });
});

// GET /api/stardust/prompt - the extraction prompt, ready to copy into an AI.
router.get('/prompt', (req, res) => {
    const promptPath = path.join(__dirname, '..', '..', 'AI-Ingestion-Prompt.md');
    fs.readFile(promptPath, 'utf8', (err, text) => {
        if (err) return res.status(404).json({ error: 'Prompt file not found' });
        res.type('text/plain').send(text);
    });
});

// POST /api/stardust - quick capture.
router.post('/', (req, res) => {
    try {
        res.status(201).json(Stardust.capture(req.body || {}));
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// POST /api/stardust/import - a batch from the extraction prompt's JSON.
router.post('/import', (req, res) => {
    try {
        res.status(201).json(Stardust.importBatch(req.body || {}));
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// POST /api/stardust/batches/:batchId/place-all - place every waiting item in the batch.
router.post('/batches/:batchId/place-all', (req, res) => {
    const result = Stardust.placeAll(req.params.batchId, req.body || {});
    if (!result) return res.status(404).json({ error: 'Batch not found or already placed' });
    res.json(result);
});

// POST /api/stardust/:id/place - place one item on the canvas.
router.post('/:id/place', (req, res) => {
    const result = Stardust.place(Number(req.params.id), req.body || {});
    if (!result) return res.status(404).json({ error: 'Item not found' });
    res.json(result);
});

// DELETE /api/stardust/:id - discard an item.
router.delete('/:id', (req, res) => {
    const removed = Stardust.discard(Number(req.params.id));
    if (!removed) return res.status(404).json({ error: 'Item not found' });
    res.status(204).send();
});

module.exports = router;
