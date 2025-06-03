module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    "CarLoan",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "utilisateur_id",
      },
      libelle: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      tarifParKm: {
        type: DataTypes.DECIMAL,
        allowNull: false,
        field: "tarif_par_km",
      },
      statut: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "en_attente",
      },
      approuveParGestionnaireId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "approuve_par_gestionnaire_id",
      },
      dateApprobation: {
        type: DataTypes.DATE,
        allowNull: true,
        field: "date_approbation",
      },
      dateCreation: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: "date_creation",
      },
      dateModification: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: "date_modification",
      },
    },
    {
      tableName: "taux_de_deplacement_utilisateur",
      timestamps: false,
      hooks: {
        beforeUpdate: (entry) => {
          entry.dateModification = new Date();
        },
      },
    }
  );
};
