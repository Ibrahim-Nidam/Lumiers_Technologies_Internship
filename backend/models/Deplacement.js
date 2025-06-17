module.exports = (sequelize, DataTypes) => {
  return sequelize.define("Deplacement", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    userId: { type: DataTypes.INTEGER, allowNull: false, field: "utilisateur_id" },
    carLoanId: { type: DataTypes.INTEGER, allowNull: true, field: "car_loan_id" },
    typeDeDeplacementId: { type: DataTypes.INTEGER, allowNull: false, field: "type_de_deplacement_id" },
    date: { type: DataTypes.DATEONLY, allowNull: false },
    intitule: { type: DataTypes.STRING, allowNull: false },
    libelleDestination: { type: DataTypes.STRING, allowNull: false, field: "libelle_destination" },
    codeChantier: { type: DataTypes.STRING, allowNull: true, field: "code_chantier" },
    distanceKm: { type: DataTypes.DECIMAL, allowNull: false, field: "distance_km" },
    tauxMissionUtilisateurId: { type: DataTypes.INTEGER, allowNull: true, field: "taux_mission_utilisateur_id" },
    tauxKilometriqueRoleId: { type: DataTypes.INTEGER, allowNull: true, field: "taux_kilometrique_role_id" },
    tauxMissionRoleId: { type: DataTypes.INTEGER, allowNull: true, field: "taux_mission_role_id" },
    dateCreation: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: "date_creation" },
    dateModification: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: "date_modification" },
  }, {
    tableName: "deplacements",
    timestamps: false,
    hooks: {
      beforeUpdate: (d) => { d.dateModification = new Date(); },
    }
  });
};