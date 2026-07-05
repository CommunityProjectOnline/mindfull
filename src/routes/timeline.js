// Routes for /api/timeline - the full event history, oldest first, for the Big Bang replay.

const express = require('express');
const router = express.Router();
const Timeline = require('../models/timeline');

router.get('/', (req, res) => {
    res.json(Timeline.events());
});

module.exports = router;
