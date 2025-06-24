require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

const { sequelize } = require("./models");
const { seedInitialData } = require("./seed-initial-data");

// ─── Routes ─────────────────────────────────────────────────────────────
const authRoutes = require("./routes/auth");
const profileRoutes = require("./routes/profile");
const authMiddleware = require("./middleware/authMiddleware");
const expenseTypesRoutes = require("./routes/expenseTypes");
const travelTypesRouter = require("./routes/travelTypes");
const usersRoutes = require("./routes/users");
const deplacementRouter = require("./routes/deplacements");
const reportRouter = require('./routes/report');
const zipRouter = require('./routes/zip');
const TauxMissionRole = require("./routes/tauxMissionRoutes");
const roleRoutes = require("./routes/roleRoutes");
const chantierRoutes = require("./routes/chantierRoutes");
const vehiculeRateRules = require("./routes/vehiculeRateRules");

const app = express();

// ─── Middleware ─────────────────────────────────────────────────────────
const corsOptions = {
  origin: "http://localhost:5173",
  credentials: true,
};
app.use(cors(corsOptions));
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ─── Bootstrap Function ─────────────────────────────────────────────────
(async () => {
  try {
    // 1) Authenticate DB connection
    await sequelize.authenticate();
    console.log("✅ Connected to database.");

    // 2) Sync models
    await sequelize.sync({ alter: true }); // Use { force: true } if rebuilding everything
    console.log("✅ Database synchronized.");

    // 3) Seed roles, types, etc.
    await seedInitialData();

    // 4) Register Routes
    app.use("/api/auth", authRoutes);
    app.use("/api", profileRoutes);
    app.use("/api/expense-types", expenseTypesRoutes);
    app.use("/api/travel-types", travelTypesRouter);
    app.use("/api/taux-deplacement", TauxMissionRole);
    app.use("/api/roles", roleRoutes);
    app.use("/api/users", usersRoutes);
    app.use("/api/deplacements", deplacementRouter);
    app.use("/api/report", reportRouter);
    app.use("/api/zip", zipRouter);
    app.use("/api/chantiers", chantierRoutes);
    app.use("/api/vehicule-rates", vehiculeRateRules);
    // Protected test route
    app.get("/api/dashboard-data", authMiddleware, async (req, res) => {
      const userId = req.user.userId;
      return res.json({ message: "Protected data", userId });
    });

    // 5) Start server
    const PORT = process.env.PORT || 3001;
    app.listen(PORT, () => {
      console.log(`🚀 Backend running on port ${PORT}`);
    });

  } catch (err) {
    console.error("❌ DB sync or seed failed:", err);
    process.exit(1); // Exit cleanly if DB fails
  }
})();
