const express = require('express');
const router = express.Router();
const {
  TauxMissionUtilisateur,
  User,
  TypeDeDeplacement
} = require('../models');
const authMiddleware = require('../middleware/authMiddleware');

// GET all mission rates
router.get('/', authMiddleware, async (req, res) => {
  try {
    console.log('Fetching mission rates...');

    const missionRates = await TauxMissionUtilisateur.findAll({
      include: [
        {
          model: User,
          as: 'user',                            
          attributes: ['id', 'nomComplete', 'courriel']
        },
        {
          model: TypeDeDeplacement,
          as: 'typeDeDeplacement',               
          attributes: ['id', 'nom', 'description']
        }
      ],
      order: [['dateCreation', 'DESC']]
    });

    console.log(`Found ${missionRates.length} mission rates`);
    res.json(missionRates);
  } catch (error) {
    console.error('Error fetching mission rates:', error);
    res.status(500).json({
      message: 'Error fetching mission rates',
      error: error.message
    });
  }
});

// PATCH update mission rate status
router.patch('/:id/status', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { statut, approuveParGestionnaireId } = req.body;

    console.log(`Updating mission rate ${id} to status: ${statut}`);

    // Validate status
    const validStatuses = ['en_attente', 'approuvé', 'rejeté'];
    if (!validStatuses.includes(statut)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    // Find the mission rate
    const missionRate = await TauxMissionUtilisateur.findByPk(id);
    if (!missionRate) {
      return res.status(404).json({ message: 'Mission rate not found' });
    }

    // Update the mission rate
    await missionRate.update({
      statut,
      approuveParGestionnaireId,
      dateModification: new Date()
    });

    // Fetch the updated record with associations
    const updatedMissionRate = await TauxMissionUtilisateur.findByPk(id, {
      include: [
        {
          model: User,
          as: 'user',                          
          attributes: ['id', 'nomComplete', 'courriel']
        },
        {
          model: TypeDeDeplacement,
          as: 'typeDeDeplacement',             
          attributes: ['id', 'nom', 'description']
        }
      ]
    });

    console.log('Mission rate updated successfully');
    res.json(updatedMissionRate);
  } catch (error) {
    console.error('Error updating mission rate status:', error);
    res.status(500).json({
      message: 'Error updating mission rate status',
      error: error.message
    });
  }
});


module.exports = router;