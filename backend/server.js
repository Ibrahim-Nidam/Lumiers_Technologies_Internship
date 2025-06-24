require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const os = require("os");

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

// ─── Helper Function to Get Local IP ───────────────────────────────────
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const interface of interfaces[name]) {
      if (interface.family === 'IPv4' && !interface.internal) {
        return interface.address;
      }
    }
  }
  return '127.0.0.1';
}

// ─── Middleware ─────────────────────────────────────────────────────────
const corsOptions = {
  origin: true, // Allow all origins
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
    await sequelize.sync({ alter: true });
    console.log("✅ Database synchronized.");

    // 3) Seed roles, types, etc.
    await seedInitialData();

    // 4) Register API Routes
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

    // 5) Serve Static Files
    const isPkg = typeof process.pkg !== 'undefined';
    let frontendPath;

    if (isPkg) {
      frontendPath = path.join(path.dirname(process.execPath), "dist");
    } else {
      frontendPath = path.join(__dirname, "..", "frontend", "dist");
    }

    console.log(`📁 Serving static files from: ${frontendPath}`);
    
    // Check if the dist folder exists
    if (fs.existsSync(frontendPath)) {
      // Serve static files
      app.use(express.static(frontendPath));
      
      // Handle React Router - catch all non-API routes and serve index.html
      app.use((req, res, next) => {
        // Skip API routes
        if (req.path.startsWith('/api/')) {
          return next();
        }
        
        // For all other routes, serve index.html
        const indexPath = path.join(frontendPath, "index.html");
        if (fs.existsSync(indexPath)) {
          res.sendFile(indexPath);
        } else {
          res.status(404).send('Frontend not found');
        }
      });
      
      console.log("✅ Static file serving configured");
    } else {
      console.log(`⚠️  Frontend dist folder not found at: ${frontendPath}`);
    }

    // 6) Start server
    const PORT = process.env.PORT || 3001;
    const HOST = '0.0.0.0'; // Listen on all network interfaces
    const localIP = getLocalIP();

    app.listen(PORT, HOST, () => {
      console.log(`🚀 Backend running on port ${PORT}`);
      console.log(`🌐 Local access: http://localhost:${PORT}`);
      console.log(`🌐 Network access: http://${localIP}:${PORT}`);
      console.log(`📱 Other devices can access: http://${localIP}:${PORT}`);
      console.log(`\n📋 Share this URL with other users on your network:`);
      console.log(`   http://${localIP}:${PORT}`);
    });

  } catch (err) {
    console.error("❌ Server startup failed:", err);
    process.exit(1);
  }
})();