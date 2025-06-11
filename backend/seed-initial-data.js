require("dotenv").config();
const { sequelize, Role, TypeDeDeplacement, TypeDepense } = require("./models");

// 1) Static arrays for “roles”, “types_de_deplacement” and “types_depenses”
const rolesToSeed = [
  { nom: "agent", description: "Niveau d'accès de base" },
  { nom: "manager", description: "Accès à la gestion d'équipe" },
  { nom: "SuperManager", description: "Accès à la gestion d'équipe" },
  { nom: "admin", description: "Accès complet au système" },
  { nom: "SuperAdmin", description: "Accès complet au système" },
];

const typesDeDeplacementToSeed = [
  { nom: "Repas",   description: "Déplacement dans le cadre du travail" },
  { nom: "< 500 KM", description: "Déplacement de moins de 500 km" },
  { nom: "> 500 KM",   description: "Déplacement de plus de 500 km" },
];

const typesDepensesToSeed = [
  { nom: "Déjeuner",       description: "Frais de nourriture durant le déplacement" },
  { nom: "Gazole",      description: "Frais de carburant" },
  { nom: "Parking",     description: "Frais de stationnement" },
  { nom: "Hébergement", description: "Frais d'hôtel ou de logement" },
];

// 2) Export an async function that just does the “findOrCreate” loops
async function seedInitialData() {
  // – Roles
  for (const roleObj of rolesToSeed) {
    await Role.findOrCreate({
      where: { nom: roleObj.nom },
      defaults: roleObj,
    });
  }

  // – Types de déplacement
  for (const typeObj of typesDeDeplacementToSeed) {
    await TypeDeDeplacement.findOrCreate({
      where: { nom: typeObj.nom },
      defaults: typeObj,
    });
  }

  // – Types de dépenses
  for (const depObj of typesDepensesToSeed) {
    await TypeDepense.findOrCreate({
      where: { nom: depObj.nom },
      defaults: depObj,
    });
  }
}

module.exports = {
  seedInitialData,
};
