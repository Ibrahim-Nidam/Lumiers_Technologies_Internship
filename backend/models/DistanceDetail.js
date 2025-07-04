module.exports = (sequelize, DataTypes) => {
  const DistanceDetail = sequelize.define('DistanceDetail', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'utilisateurs', key: 'id' }
    },
    dateSegment: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: 'date_segment'
    },
    lieuDepart: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'lieu_depart'
    },
    lieuArrivee: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'lieu_arrivee'
    },
    distanceKm: {
      type: DataTypes.DECIMAL(10,2),
      allowNull: false,
      field: 'distance_km'
    },
    vehiculeRateRuleId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'vehicule_rate_rules', key: 'id' },
      field: 'vehicule_rate_rule_id'
    },
    dateCreation: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'date_creation'
    },
    dateModification: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'date_modification'
    }
  }, {
    tableName: 'distance_details',
    underscored: true,
    timestamps: false,
    hooks: {
      beforeUpdate: detail => { detail.dateModification = new Date(); }
    }
  });

  return DistanceDetail;
};
