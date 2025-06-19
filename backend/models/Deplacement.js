module.exports = (sequelize, DataTypes) => {
  return sequelize.define("Deplacement", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    userId: { type: DataTypes.INTEGER, allowNull: false, field: "utilisateur_id" },
    typeDeDeplacementId: { type: DataTypes.INTEGER, allowNull: false, field: "type_de_deplacement_id" },

    // ⚠️ Legacy field (will be replaced by vehiculeRateRuleId)
    // tauxKilometriqueRoleId: { type: DataTypes.INTEGER, allowNull: true, field: "taux_kilometrique_role_id" },

    // ✅ New: link to vehicule rate rule
    vehiculeRateRuleId: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'vehicule_rate_rules', key: 'id' }, field: "vehicule_rate_rule_id" },

    date: { type: DataTypes.DATEONLY, allowNull: false },

    // ⚠️ Legacy fields (will be replaced by chantierId)
    // libelleDestination: { type: DataTypes.STRING, allowNull: false, field: "libelle_destination" },
    // codeChantier: { type: DataTypes.STRING, allowNull: true, field: "code_chantier" },

    // ✅ New: link to chantier
    chantierId: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'chantiers', key: 'id' }, field: "chantier_id" },

    distanceKm: { type: DataTypes.DECIMAL, allowNull: false, field: "distance_km" },
    dateCreation: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: "date_creation" },
    dateModification: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: "date_modification" },
  }, {
    tableName: "deplacements",
    timestamps: false,
    hooks: {
      beforeUpdate: (deplacement) => {
        deplacement.dateModification = new Date();
      },
    },
  });
};
