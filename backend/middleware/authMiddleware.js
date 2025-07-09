const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "XDPhzwLeitK4Vvj7wWnSOXhhq9tfE3Tq";

module.exports = function (req, res, next) {
  // 1) Look for "Authorization" header
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token manquant ou invalide." });
  }

  const token = authHeader.split(" ")[1];
  try {
    // 2) Verify signature & decode
    const decoded = jwt.verify(token, JWT_SECRET);
    // 3) Attach decoded info (e.g. { userId, role }) to req.user
    req.user = decoded;
    return next();
  } catch (err) {
    return res.status(401).json({ error: "Token invalide." });
  }
};
