require("dotenv").config();
const { Sequelize, DataTypes } = require("sequelize");

// 1) Initialize Sequelize 
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

// 2) Import all model definitions
const Role = require("./Role")(sequelize, DataTypes);
const User = require("./User")(sequelize, DataTypes);
const CarLoan = require("./CarLoan")(sequelize, DataTypes);
const Deplacement = require("./Deplacement")(sequelize, DataTypes);
const TypeDepense = require("./TypeDepense")(sequelize, DataTypes);
const Depense = require("./Depense")(sequelize, DataTypes);
const TypeDeDeplacement = require("./TypeDeDeplacement")(sequelize, DataTypes);
const TauxMissionUtilisateur = require("./TauxMissionUtilisateur")(sequelize, DataTypes); // new model

// 3) Set up associations…

// ─── Roles ↔ Users
Role.hasMany(User, { foreignKey: "roleId", onDelete: "SET NULL" });
User.belongsTo(Role, { foreignKey: "roleId" });

// ─── Users ↔ CarLoans (TauxKilometriqueUtilisateur)
User.hasMany(CarLoan, { foreignKey: "userId", onDelete: "CASCADE" });
CarLoan.belongsTo(User, { foreignKey: "userId" });

// ─── Users ↔ TauxMissionUtilisateur (daily mission rates)
User.hasMany(TauxMissionUtilisateur, { foreignKey: "userId", onDelete: "CASCADE" });
TauxMissionUtilisateur.belongsTo(User, { foreignKey: "userId" });

// ─── TypeDeDeplacement ↔ TauxMissionUtilisateur
TypeDeDeplacement.hasMany(TauxMissionUtilisateur, { foreignKey: "typeDeDeplacementId" });
TauxMissionUtilisateur.belongsTo(TypeDeDeplacement, { foreignKey: "typeDeDeplacementId" });

// ─── Users ↔ Deplacements
User.hasMany(Deplacement, { foreignKey: "userId", onDelete: "CASCADE" });
Deplacement.belongsTo(User, { foreignKey: "userId" });

// ─── CarLoans ↔ Deplacements (optional foreign key)
CarLoan.hasMany(Deplacement, {
  foreignKey: "carLoanId",
  onDelete: "SET NULL",
});
Deplacement.belongsTo(CarLoan, { foreignKey: "carLoanId" });

// ─── Deplacements ↔ Depenses
Deplacement.hasMany(Depense, {
  foreignKey: "deplacementId",
  onDelete: "CASCADE",
});
Depense.belongsTo(Deplacement, { foreignKey: "deplacementId" });

// ─── TypeDepense ↔ Depenses
TypeDepense.hasMany(Depense, {
  foreignKey: "typeDepenseId",
  onDelete: "SET NULL",
});
Depense.belongsTo(TypeDepense, { foreignKey: "typeDepenseId" });

// ─── TypeDeDeplacement ↔ Deplacements
TypeDeDeplacement.hasMany(Deplacement, {
  foreignKey: "typeDeDeplacementId",
  onDelete: "SET NULL",
});
Deplacement.belongsTo(TypeDeDeplacement, {
  foreignKey: "typeDeDeplacementId",
});

// 4) Export everything
module.exports = {
  sequelize,
  Sequelize,
  Role,
  User,
  CarLoan,
  Deplacement,
  TypeDepense,
  Depense,
  TypeDeDeplacement,
  TauxMissionUtilisateur,
};