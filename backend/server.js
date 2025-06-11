require("dotenv").config()
const express = require("express")
const cors = require("cors")

const {
  sequelize,
  Role,
  User,
  CarLoan,
  Deplacement,
  TypeDepense,
  Depense,
  TypeDeDeplacement,
  TauxMissionUtilisateur,
} = require("./models")

const { seedInitialData } = require("./seed-initial-data")

const authRoutes = require("./routes/auth")
const profileRoutes = require("./routes/profile")
const authMiddleware = require("./middleware/authMiddleware")
const expenseTypesRoutes = require("./routes/expenseTypes")
const travelTypesRouter = require("./routes/travelTypes")
const usersRoutes = require("./routes/users")
const missionRatesRouter = require("./routes/missionRates")
const carLoanRatesRouter = require("./routes/carLoanRates")
const deplacementRouter = require("./routes/deplacements")
const dailyReturnRoutes = require("./routes/dailyReturnRoutes")

const app = express()
const corsOptions = {
  origin: "http://localhost:5173", // Vite default
  credentials: true,
}
app.use(cors(corsOptions))
app.use(express.json())
;(async () => {
  try {
    // 1) Sync models → create/alter tables
    await sequelize.sync({ alter: true })
    console.log("✅ Database synchronized.")

    // 2) Seed initial data (roles, travel types, expense types, etc.)
    await seedInitialData()

    // 3) Register routes
    app.use("/api/auth", authRoutes)
    app.use("/api", profileRoutes)
    app.use("/api/expense-types", expenseTypesRoutes)
    app.use("/api/travel-types", travelTypesRouter)
    app.use("/api/users", usersRoutes)
    app.use("/api/mission-rates", missionRatesRouter)

    // Fix the car loan routes - mount at /api/car-loans instead of /api/car-loan-rates
    app.use("/api/car-loans", carLoanRatesRouter)

    app.use("/api/deplacements", deplacementRouter)

    // Fix the daily returns routes - mount at /api/user-daily-returns instead of nested under users
    app.use("/api/user-daily-returns", dailyReturnRoutes)

    app.get("/api/dashboard-data", authMiddleware, async (req, res) => {
      const userId = req.user.userId
      return res.json({ message: "Protected data", userId })
    })

    // 4) Start listening
    app.listen(3001, () => {
      console.log("Backend running on port 3001")
    })
  } catch (err) {
    console.error("❌ DB sync or seed failed:", err)
    process.exit(1)
  }
})()
