module.exports = (sequelize, DataTypes) => {
  return sequelize.define("User", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    nomComplete: { type: DataTypes.STRING, allowNull: false, field: "nom_complete" },
    courriel: { type: DataTypes.STRING, allowNull: false, unique: true },
    motDePasseHache: { type: DataTypes.STRING, allowNull: false, field: "mot_de_passe_hache" },
    possedeVoiturePersonnelle: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: "possede_voiture_personnelle" },
    estActif: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: "est_actif" },
    dateCreation: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: "date_creation" },
    dateModification: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: "date_modification" },
  }, {
    tableName: "utilisateurs",
    timestamps: false,
    hooks: {
      beforeUpdate: (user) => { user.dateModification = new Date(); },
    },
  });
};