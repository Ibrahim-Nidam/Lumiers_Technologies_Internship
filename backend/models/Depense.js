module.exports = (sequelize, DataTypes) => {
  return sequelize.define("Depense", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    deplacementId: { type: DataTypes.INTEGER, allowNull: false, field: "deplacement_id" },
    typeDepenseId: { type: DataTypes.INTEGER, allowNull: true, field: "type_depense_id" },
    montant: { type: DataTypes.DECIMAL, allowNull: false },
    cheminJustificatif: { type: DataTypes.STRING, allowNull: true, field: "chemin_justificatif" },
    createdBy: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'utilisateurs', key: 'id' }, field: "created_by", comment: "ID of user who created this expense record" },
    modifiedBy: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'utilisateurs', key: 'id' }, field: "modified_by", comment: "ID of user who last modified this expense record" },
    dateCreation: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: "date_creation" },
    dateModification: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: "date_modification" }
  }, {
    tableName: "depenses",
    timestamps: false,
    hooks: {
      beforeUpdate: (depense) => { depense.dateModification = new Date(); }
    }
  });
};
