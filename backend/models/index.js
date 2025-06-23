require("dotenv").config();
const { Sequelize, DataTypes } = require("sequelize");

const sequelize = new Sequelize(
  process.env.PG_DATABASE || "fiche_deplacement",
  process.env.PG_USERNAME || "postgres",
  process.env.PG_PASSWORD || "post",
  {
    host: process.env.PG_HOST || "localhost",
    port: process.env.PG_PORT || 5432,
    dialect: "postgres",
    logging: false,
  }
);

// ─── Import All Models ────────────────────────────────────────────────
const Role = require("./Role")(sequelize, DataTypes);
const User = require("./User")(sequelize, DataTypes);
const Deplacement = require("./Deplacement")(sequelize, DataTypes);
const TypeDepense = require("./TypeDepense")(sequelize, DataTypes);
const Depense = require("./Depense")(sequelize, DataTypes);
const TypeDeDeplacement = require("./TypeDeDeplacement")(sequelize, DataTypes);
const TauxKilometriqueRole = require("./TauxKilometriqueRole")(sequelize, DataTypes);
const TauxMissionRole = require("./TauxMissionRole")(sequelize, DataTypes);
const VehiculeRateRule = require("./VehiculeRateRule")(sequelize, DataTypes);
const Chantier = require("./Chantier")(sequelize, DataTypes);

// ─── Role ↔ User
Role.hasMany(User, { foreignKey: "roleId", onDelete: "SET NULL", as: "users" });
User.belongsTo(Role, { foreignKey: "roleId", as: "role" });

// ─── User ↔ Deplacement
User.hasMany(Deplacement, { foreignKey: "userId", onDelete: "CASCADE", as: "deplacements" });
Deplacement.belongsTo(User, { foreignKey: "userId", as: "user" });

// ─── Deplacement ↔ Depense
Deplacement.hasMany(Depense, { foreignKey: "deplacementId", onDelete: "CASCADE", as: "depenses" });
Depense.belongsTo(Deplacement, { foreignKey: "deplacementId", as: "deplacement" });

// ─── TypeDepense ↔ Depense
TypeDepense.hasMany(Depense, { foreignKey: "typeDepenseId", onDelete: "SET NULL", as: "depensesByType" });
Depense.belongsTo(TypeDepense, { foreignKey: "typeDepenseId", as: "typeDepense" });

// ─── TypeDeDeplacement ↔ Deplacement
TypeDeDeplacement.hasMany(Deplacement, { foreignKey: "typeDeDeplacementId", onDelete: "SET NULL", as: "deplacementsByType" });
Deplacement.belongsTo(TypeDeDeplacement, { foreignKey: "typeDeDeplacementId", as: "typeDeDeplacement" });

// ─── Role ↔ TauxKilometriqueRole (Legacy)
// Role.hasMany(TauxKilometriqueRole, { foreignKey: "roleId", onDelete: "CASCADE", as: "kilometriqueRates" });
// TauxKilometriqueRole.belongsTo(Role, { foreignKey: "roleId", as: "role" });

// ─── Role ↔ TauxMissionRole
Role.hasMany(TauxMissionRole, { foreignKey: "roleId", onDelete: "CASCADE", as: "missionRates" });
TauxMissionRole.belongsTo(Role, { foreignKey: "roleId", as: "role" });

// ─── Deplacement ↔ TauxKilometriqueRole (Legacy)
// TauxKilometriqueRole.hasMany(Deplacement, { foreignKey: "tauxKilometriqueRoleId", onDelete: "SET NULL", as: "deplacementsByKilometriqueRole" });
// Deplacement.belongsTo(TauxKilometriqueRole, { foreignKey: "tauxKilometriqueRoleId", as: "kilometriqueRole" });

// ─── Deplacement ↔ TauxMissionRole
// TauxMissionRole.hasMany(Deplacement, { foreignKey: "tauxMissionRoleId", onDelete: "SET NULL", as: "deplacementsByMissionRole" });
// Deplacement.belongsTo(TauxMissionRole, { foreignKey: "tauxMissionRoleId", as: "missionRole" });

// ─── TypeDeDeplacement ↔ TauxMissionRole
TypeDeDeplacement.hasMany(TauxMissionRole, { foreignKey: "typeDeDeplacementId", as: "missionRatesByTypeRole" });
TauxMissionRole.belongsTo(TypeDeDeplacement, { foreignKey: "typeDeDeplacementId", as: "typeDeDeplacement" });

// ─── User ↔ VehiculeRateRule (New)
User.hasMany(VehiculeRateRule, { foreignKey: "userId", onDelete: "CASCADE", as: "vehiculeRateRules" });
VehiculeRateRule.belongsTo(User, { foreignKey: "userId", as: "user" });

// ─── Deplacement ↔ VehiculeRateRule (New)
VehiculeRateRule.hasMany(Deplacement, { foreignKey: "vehiculeRateRuleId", onDelete: "SET NULL", as: "deplacements" });
Deplacement.belongsTo(VehiculeRateRule, { foreignKey: "vehiculeRateRuleId", as: "vehiculeRateRule" });

// ─── Chantier ↔ Deplacement (New)
Chantier.hasMany(Deplacement, { foreignKey: "chantierId", onDelete: "SET NULL", as: "deplacements" });
Deplacement.belongsTo(Chantier, { foreignKey: "chantierId", as: "chantier" });

// ─── TypeDeDeplacement ↔ Chantier
TypeDeDeplacement.hasMany(Chantier, { foreignKey: "typeDeDeplacementId", onDelete: "SET NULL", as: "chantiers" });
Chantier.belongsTo(TypeDeDeplacement, { foreignKey: "typeDeDeplacementId", as: "typeDeDeplacement" });

// ─── Export All
module.exports = {
  sequelize,
  Sequelize,
  Role,
  User,
  Deplacement,
  TypeDepense,
  Depense,
  TypeDeDeplacement,
  TauxKilometriqueRole,
  TauxMissionRole,
  VehiculeRateRule,
  Chantier
};