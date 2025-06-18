require("dotenv").config();
const { sequelize, Role, TypeDeDeplacement, TypeDepense } = require("./models");

// 1) Static arrays for “roles”, “types_de_deplacement” and “types_depenses”
const rolesToSeed = [
  { nom: "agent" },
  { nom: "manager" },
  { nom: "supermanager" },
  { nom: "directeur" },
  { nom: "ingénieurs senior" },
  { nom: "conducteur de travaux" },
  { nom: "chef chantier" },
  { nom: "ingénieurs junior" },
  { nom: "chef d'equipe" },
  { nom: "Anapec débutant" },
  { nom: "Anapec apres 6 mois au 1 an" },
  { nom: "techniciens" }
];


const typesDeDeplacementToSeed = [
  { nom: "Repas",   description: "Déplacement dans le cadre du travail" },
  { nom: "< 500 KM", description: "Déplacement de moins de 500 km" },
  { nom: "> 500 KM",   description: "Déplacement de plus de 500 km" },
  { nom: "Étranger",    description: "Déplacement effectué à l'international" },
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
