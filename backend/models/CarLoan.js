module.exports = (sequelize, DataTypes) => {
  return sequelize.define("CarLoan", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    userId: { type: DataTypes.INTEGER, allowNull: false, field: "utilisateur_id" },
    libelle: { type: DataTypes.STRING, allowNull: false }, // city or company name
    tarifParKm: { type: DataTypes.DECIMAL(10, 3), allowNull: false, field: "tarif_par_km" }, // e.g. 100.100
    statut: { type: DataTypes.STRING, allowNull: false, defaultValue: "en_attente" },
    approuveParGestionnaireId: { type: DataTypes.INTEGER, allowNull: true, field: "approuve_par_gestionnaire_id" },
    dateCreation: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: "date_creation" },
    dateModification: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: "date_modification" },
  }, {
    tableName: "taux_kilometrique_utilisateur",
    timestamps: false,
    hooks: {
      beforeUpdate: (entry) => { entry.dateModification = new Date(); },
    },
  });
};