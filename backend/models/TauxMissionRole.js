module.exports = (sequelize, DataTypes) => {
  return sequelize.define("TauxMissionRole", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    roleId: { type: DataTypes.INTEGER, allowNull: false, field: "role_id" },
    typeDeDeplacementId: { type: DataTypes.INTEGER, allowNull: false, field: "type_de_deplacement_id" },
    libelle: { type: DataTypes.STRING(100), allowNull: false, field: "libelle" },
    tarifParJour: { type: DataTypes.DECIMAL(10, 3), allowNull: false, field: "tarif_par_jour" },
    dateCreation: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: "date_creation" },
    dateModification: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: "date_modification" },
  }, {
    tableName: "taux_mission_role",
    timestamps: false,
    hooks: {
      beforeUpdate: (entry) => { entry.dateModification = new Date(); },
    },
    indexes: [
      {
        unique: true,
        name: 'unique_role_type_active',
        fields: ['role_id', 'type_de_deplacement_id']
      }
    ]
  });
};