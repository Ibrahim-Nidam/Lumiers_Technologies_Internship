module.exports = (sequelize, DataTypes) => {
  return sequelize.define("Deplacement", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    userId: { type: DataTypes.INTEGER, allowNull: false, field: "utilisateur_id" },
    typeDeDeplacementId: { type: DataTypes.INTEGER, allowNull: false, field: "type_de_deplacement_id" },
    vehiculeRateRuleId: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'vehicule_rate_rules', key: 'id' }, field: "vehicule_rate_rule_id" },
    date: { type: DataTypes.DATEONLY, allowNull: false },
    chantierId: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'chantiers', key: 'id' }, field: "chantier_id" },
    distanceKm: { type: DataTypes.DECIMAL, allowNull: false, field: "distance_km" },
    createdBy: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'utilisateurs', key: 'id' }, field: "created_by", comment: "ID of user who created this record (could be manager creating for employee)" },
    modifiedBy: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'utilisateurs', key: 'id' }, field: "modified_by", comment: "ID of user who last modified this record" },
    dateCreation: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: "date_creation" },
    dateModification: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: "date_modification" }
  }, {
    tableName: "deplacements",
    timestamps: false,
    hooks: {
      beforeUpdate: (deplacement) => { deplacement.dateModification = new Date(); }
    }
  });
};
