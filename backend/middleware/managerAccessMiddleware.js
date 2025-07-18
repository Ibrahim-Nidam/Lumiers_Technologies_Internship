const { User } = require("../models");

const managerAccessMiddleware = async (req, res, next) => {
  try {
    const currentUserId = req.user?.userId;
    const targetUserId = req.headers['x-target-user-id'] || req.params.userId;
    
    if (!currentUserId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    if (!targetUserId || parseInt(targetUserId) === parseInt(currentUserId)) {
      return next();
    }

    const currentUser = await User.findByPk(currentUserId, {
      include: [
        {
          model: require("../models").Role,
          as: "role",
          attributes: ["id", "nom"]
        }
      ]
    });

    if (!currentUser) {
      return res.status(404).json({ error: "Current user not found" });
    }

    const isManager = currentUser.role?.nom === "manager" || 
                      currentUser.role?.nom === "Admin" ||
                      currentUser.role?.nom === "Gestionnaire";

    if (!isManager) {
      return res.status(403).json({ 
        error: "Access denied. Manager privileges required to access other users' data" 
      });
    }

    const targetUser = await User.findByPk(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ error: "Target user not found" });
    }

    req.targetUserId = parseInt(targetUserId);
    req.isManagerAccess = true;
    
    next();
  } catch (error) {
    console.error("Manager access middleware error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = managerAccessMiddleware;