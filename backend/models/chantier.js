module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Chantier', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    typeDeDeplacementId: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'types_de_deplacement', key: 'id' } },
    codeChantier: { type: DataTypes.STRING, allowNull: false, unique: true },
    designation: { type: DataTypes.STRING, allowNull: false },
    ville: { type: DataTypes.STRING, allowNull: false },
    dateCreation: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: "date_creation" },
    dateModification: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: "date_modification" },
  }, {
    tableName: 'chantiers',
    underscored: true,
    timestamps: true
  });
};
