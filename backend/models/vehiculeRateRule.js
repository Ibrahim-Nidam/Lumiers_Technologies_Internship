module.exports = (sequelize, DataTypes) => {
  return sequelize.define('VehiculeRateRule', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    userId: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'utilisateurs', key: 'id' } },
    name: { type: DataTypes.STRING, allowNull: true },
    conditionType: { type: DataTypes.ENUM('ALL', 'THRESHOLD'), allowNull: false, defaultValue: 'ALL' },
    rateBeforeThreshold: { type: DataTypes.FLOAT, allowNull: false },
    rateAfterThreshold: { type: DataTypes.FLOAT, allowNull: true },
    thresholdKm: { type: DataTypes.INTEGER, allowNull: true },
    active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    dateCreation: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: "date_creation" },
    dateModification: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: "date_modification" },
  }, {
    tableName: 'vehicule_rate_rules',
    underscored: true,
    timestamps: true
  });
};
