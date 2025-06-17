require("dotenv").config();
const { Sequelize, DataTypes } = require("sequelize");

// 1) Initialize Sequelize 
const sequelize = new Sequelize(
  process.env.PG_DATABASE  || "fiche_deplacement",
  process.env.PG_USERNAME  || "postgres",
  process.env.PG_PASSWORD  || "post",
  {
    host: process.env.PG_HOST || "localhost",
    port: process.env.PG_PORT || 5432,
    dialect: "postgres",
    logging: false,
  }
);

// 2) Import all model definitions
const Role                 = require("./Role")(sequelize, DataTypes);
const User                 = require("./User")(sequelize, DataTypes);
const CarLoan              = require("./CarLoan")(sequelize, DataTypes);
const Deplacement          = require("./Deplacement")(sequelize, DataTypes);
const TypeDepense          = require("./TypeDepense")(sequelize, DataTypes);
const Depense              = require("./Depense")(sequelize, DataTypes);
const TypeDeDeplacement    = require("./TypeDeDeplacement")(sequelize, DataTypes);
const TauxMissionUtilisateur = require("./TauxMissionUtilisateur")(sequelize, DataTypes);
const TauxKilometriqueRole = require("./TauxKilometriqueRole")(sequelize, DataTypes);
const TauxMissionRole = require("./TauxMissionRole")(sequelize, DataTypes);

// 3) Set up associations…

// ─── Roles ↔ Users
Role.hasMany(User, {
  foreignKey: "roleId",
  onDelete: "SET NULL"
});
User.belongsTo(Role, {
  foreignKey: "roleId"
});

// ─── Users ↔ CarLoans (TauxKilometriqueUtilisateur)
User.hasMany(CarLoan, {
  foreignKey: "userId",
  onDelete: "CASCADE",
  as: "carLoans"                  
});
CarLoan.belongsTo(User, {
  foreignKey: "userId",
  as: "user"                      
});

// ─── Users ↔ TauxMissionUtilisateur (daily mission rates)
User.hasMany(TauxMissionUtilisateur, {
  foreignKey: "userId",
  onDelete: "CASCADE",
  as: "missionRates"              
});
TauxMissionUtilisateur.belongsTo(User, {
  foreignKey: "userId",
  as: "user"                      
});

// ─── TypeDeDeplacement ↔ TauxMissionUtilisateur
TypeDeDeplacement.hasMany(TauxMissionUtilisateur, {
  foreignKey: "typeDeDeplacementId",
  as: "missionRatesByType"        
});
TauxMissionUtilisateur.belongsTo(TypeDeDeplacement, {
  foreignKey: "typeDeDeplacementId",
  as: "typeDeDeplacement"         
});

// ─── Users ↔ Deplacements
User.hasMany(Deplacement, {
  foreignKey: "userId",
  onDelete: "CASCADE",
  as: "deplacements"              
});
Deplacement.belongsTo(User, {
  foreignKey: "userId",
  as: "user"                     
});

// ─── CarLoans ↔ Deplacements (optional foreign key)
CarLoan.hasMany(Deplacement, {
  foreignKey: "carLoanId",
  onDelete: "SET NULL",
  as: "deplacementsByCarLoan"     
});
Deplacement.belongsTo(CarLoan, {
  foreignKey: "carLoanId",
  as: "carLoan"                   
});

// ─── Deplacements ↔ Depenses
Deplacement.hasMany(Depense, {
  foreignKey: "deplacementId",
  onDelete: "CASCADE",
  as: "depenses"                  
});
Depense.belongsTo(Deplacement, {
  foreignKey: "deplacementId",
  as: "deplacement"               
});

// ─── TypeDepense ↔ Depenses
TypeDepense.hasMany(Depense, {
  foreignKey: "typeDepenseId",
  onDelete: "SET NULL",
  as: "depensesByType"            
});
Depense.belongsTo(TypeDepense, {
  foreignKey: "typeDepenseId",
  as: "typeDepense"               
});

// ─── TypeDeDeplacement ↔ Deplacements
TypeDeDeplacement.hasMany(Deplacement, {
  foreignKey: "typeDeDeplacementId",
  onDelete: "SET NULL",
  as: "deplacementsByType"        
});
Deplacement.belongsTo(TypeDeDeplacement, {
  foreignKey: "typeDeDeplacementId",
  as: "typeDeDeplacement"         
});

// TauxMissionUtilisateur ↔ Deplacement (si Deplacement contient une FK)
TauxMissionUtilisateur.hasMany(Deplacement, {
  foreignKey: "tauxMissionUtilisateurId",
  as: "deplacementsWithRate"
});
Deplacement.belongsTo(TauxMissionUtilisateur, {
  foreignKey: "tauxMissionUtilisateurId",
  as: "missionRate"
});

Role.hasMany(TauxKilometriqueRole, { foreignKey: "roleId", onDelete: "CASCADE", as: "kilometriqueRates" });
TauxKilometriqueRole.belongsTo(Role, { foreignKey: "roleId", as: "role" });

Role.hasMany(TauxMissionRole, { foreignKey: "roleId", onDelete: "CASCADE", as: "missionRates" });
TauxMissionRole.belongsTo(Role, { foreignKey: "roleId", as: "role" });

TauxKilometriqueRole.hasMany(Deplacement, { foreignKey: "tauxKilometriqueRoleId", onDelete: "SET NULL", as: "deplacementsByKilometriqueRole" });
Deplacement.belongsTo(TauxKilometriqueRole, { foreignKey: "tauxKilometriqueRoleId", as: "kilometriqueRole" });

TauxMissionRole.hasMany(Deplacement, { foreignKey: "tauxMissionRoleId", onDelete: "SET NULL", as: "deplacementsByMissionRole" });
Deplacement.belongsTo(TauxMissionRole, { foreignKey: "tauxMissionRoleId", as: "missionRole" });

TypeDeDeplacement.hasMany(TauxMissionRole, { foreignKey: "typeDeDeplacementId", as: "missionRatesByType" });
TauxMissionRole.belongsTo(TypeDeDeplacement, { foreignKey: "typeDeDeplacementId", as: "typeDeDeplacement" });

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