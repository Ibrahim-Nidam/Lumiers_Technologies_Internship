module.exports = (sequelize, DataTypes) => {
  return sequelize.define("TauxMissionUtilisateur", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    userId: { type: DataTypes.INTEGER, allowNull: false, field: "utilisateur_id" },
    typeDeDeplacementId: { type: DataTypes.INTEGER, allowNull: false, field: "type_de_deplacement_id" },
    tarifParJour: { type: DataTypes.DECIMAL(10, 3), allowNull: false, field: "tarif_par_jour" },
    statut: { type: DataTypes.STRING, allowNull: false, defaultValue: "en_attente" },
    approuveParGestionnaireId: { type: DataTypes.INTEGER, allowNull: true, field: "approuve_par_gestionnaire_id" },
    dateCreation: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: "date_creation" },
    dateModification: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: "date_modification" },
  }, {
    tableName: "taux_mission_utilisateur",
    timestamps: false,
    hooks: {
      beforeUpdate: (entry) => { entry.dateModification = new Date(); },
    },
    indexes: [
      {
        unique: true,
        name: 'unique_user_type_active',
        fields: ['utilisateur_id', 'type_de_deplacement_id'],
        where: {
          statut: ['en_attente', 'approuve']
        }
      }
    ]
  });
};