module.exports = (sequelize, DataTypes) => {
  return sequelize.define("Depense", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    deplacementId: { type: DataTypes.INTEGER, allowNull: false, field: "deplacement_id" },
    typeDepenseId: { type: DataTypes.INTEGER, allowNull: true, field: "type_depense_id" },
    montant: { type: DataTypes.DECIMAL, allowNull: false },
    date: { type: DataTypes.DATEONLY, allowNull: false },
    statut: { type: DataTypes.ENUM("en_attente", "approuve", "rejete"), allowNull: false },
    cheminJustificatif: { type: DataTypes.STRING, allowNull: true, field: "chemin_justificatif" },
    dateCreation: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: "date_creation" },
    dateModification: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: "date_modification" },
  }, {
    tableName: "depenses",
    timestamps: false,
    hooks: {
      beforeUpdate: (d) => { d.dateModification = new Date(); },
    },
  });
};