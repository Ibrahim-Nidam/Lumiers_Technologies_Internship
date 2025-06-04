module.exports = (sequelize, DataTypes) => {
  return sequelize.define("TypeDepense", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    nom: { type: DataTypes.STRING, allowNull: false, unique: true },
    description: { type: DataTypes.STRING, allowNull: true },
  }, {
    tableName: "types_depenses",
    timestamps: false,
  });
};