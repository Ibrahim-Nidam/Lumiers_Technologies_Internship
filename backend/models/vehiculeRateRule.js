module.exports = (sequelize, DataTypes) => {
  return sequelize.define('VehiculeRateRule', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    userId: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'utilisateurs', key: 'id' } },
    typeDeDeplacementId: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'types_de_deplacement', key: 'id' } },
    name: { type: DataTypes.STRING, allowNull: true },
    description: { type: DataTypes.TEXT, allowNull: true },
    conditionType: { type: DataTypes.ENUM('ALL', 'THRESHOLD'), allowNull: false, defaultValue: 'ALL' },
    rateBeforeThreshold: { type: DataTypes.FLOAT, allowNull: false },
    rateAfterThreshold: { type: DataTypes.FLOAT, allowNull: true },
    thresholdKm: { type: DataTypes.INTEGER, allowNull: true },
    zone: { type: DataTypes.STRING, allowNull: true },
    priority: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    dateCreation: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: "date_creation" },
    dateModification: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: "date_modification" },
  }, {
    tableName: 'vehicule_rate_rules',
    underscored: true,
    timestamps: true
  });
};
