require("dotenv").config();
const { sequelize, Role, TypeDeDeplacement, TypeDepense } = require("./models");

// 1) Static arrays for “roles”, “types_de_deplacement” and “types_depenses”
const rolesToSeed = [
  { nom: "agent", description: "Niveau d'accès de base" },
  { nom: "manager", description: "Accès à la gestion d'équipe" },
  { nom: "supermanager", description: "Accès à la gestion étendue de plusieurs équipes" },
  { nom: "admin", description: "Accès complet au système avec gestion des utilisateurs" },
  { nom: "superadmin", description: "Contrôle total du système et des paramètres critiques" },

  { nom: "directeur", description: "Responsable de la direction globale des opérations" },
  { nom: "ingénieurs senior", description: "Ingénieurs expérimentés supervisant les projets complexes" },
  { nom: "conducteur de travaux", description: "Supervise la réalisation des travaux sur le terrain" },
  { nom: "chef chantier", description: "Responsable de la coordination quotidienne sur le chantier" },
  { nom: "ingénieurs junior", description: "Ingénieurs débutants participant à la conception et au suivi" },
  { nom: "chef d'equipe", description: "Encadre une équipe d’exécution sur le terrain" },
  { nom: "Anapec débutant", description: "Nouveau collaborateur en contrat Anapec (début de parcours)" },
  { nom: "Anapec apres 6 mois au 1 an", description: "Collaborateur Anapec avec expérience de 6 mois à 1 an" },
  { nom: "techniciens", description: "Personnel technique intervenant sur les tâches spécialisées" }
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
