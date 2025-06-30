const express = require('express');
const router = express.Router();
const backupController = require('../controllers/backupController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/', authMiddleware, backupController.createDatabaseBackup);

module.exports = router;
