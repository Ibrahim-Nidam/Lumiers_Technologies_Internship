require("dotenv").config();
const express = require("express");
const cors = require("cors");

const {
  sequelize,
  Role,
  User,
  CarLoan,
  Deplacement,
  TypeDepense,
  Depense,
  TypeDeDeplacement,
} = require("./models");

const { seedInitialData } = require("./seed-initial-data");

const authRoutes = require("./routes/auth");
const authMiddleware = require("./middleware/authMiddleware");

const app = express();
app.use(cors());
app.use(express.json());

(async () => {
  try {
    // 1) Sync your models → this will create or alter tables in the DB
    await sequelize.sync({ alter: true });
    console.log("✅ Database synchronized.");

    // 2) Immediately seed roles/types_de_deplacement/types_depenses
    await seedInitialData();

    // 3) Register routes, middleware, etc.
    app.use("/api/auth", authRoutes);

    app.get("/api/dashboard-data", authMiddleware, async (req, res) => {
      const userId = req.user.userId;
      return res.json({ message: "Protected data", userId });
    });

    // 4) Finally, start listening
    app.listen(3001, () => {
      console.log("Backend running on port 3001");
    });
  } catch (err) {
    console.error("❌ DB sync or seed failed:", err);
    process.exit(1);
  }
})();