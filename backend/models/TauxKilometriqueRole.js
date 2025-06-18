module.exports = (sequelize, DataTypes) => {
  return sequelize.define("TauxKilometriqueRole", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    roleId: { type: DataTypes.INTEGER, allowNull: false, field: "role_id" },
    libelle: { type: DataTypes.STRING, allowNull: false },
    tarifParKm: { type: DataTypes.DECIMAL(10, 3), allowNull: false, field: "tarif_par_km" },
    dateCreation: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: "date_creation" },
    dateModification: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: "date_modification" },
  }, {
    tableName: "taux_kilometrique_role",
    timestamps: false,
    hooks: {
      beforeUpdate: (entry) => { entry.dateModification = new Date(); },
    },
    indexes: [
      {
        unique: true,
        name: 'unique_role_libelle_active',
        fields: ['role_id', 'libelle']
      }
    ]
  });
};