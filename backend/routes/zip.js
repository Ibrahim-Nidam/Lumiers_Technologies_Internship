const router = require('express').Router();
const { generateZipForUser } = require('../controllers/zipController');
router.get('/', generateZipForUser);
module.exports = router;