const express = require("express");
const router = express.Router();
const chantierController = require("../controllers/chantierController");

router.get("/", chantierController.getAllChantiers);
router.get("/:id", chantierController.getChantierById);
router.post("/", chantierController.createChantier);
router.patch("/:id", chantierController.updateChantier);
router.delete("/:id", chantierController.deleteChantier);

module.exports = router;
