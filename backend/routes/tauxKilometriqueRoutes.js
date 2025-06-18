const express = require('express');
const router = express.Router();
const controller = require('../controllers/tauxKilometriqueController');
const authMiddleware = require("../middleware/authMiddleware");


router.get('/user',authMiddleware, controller.getUserCarLoans);

router.get('/',authMiddleware, controller.getAll);
router.post('/',authMiddleware, controller.create);
router.put('/:id',authMiddleware, controller.update);
router.delete('/:id',authMiddleware, controller.remove);

module.exports = router;
