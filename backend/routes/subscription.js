const express = require('express');
const router = express.Router();

// Minimal subscription routes stub. Implement full subscription logic later.
router.get('/health', async (req, res) => {
  res.json({ service: 'subscription', status: 'ok' });
});

// Add other endpoints here as needed (create pool, join, leave, payments)

module.exports = router;
