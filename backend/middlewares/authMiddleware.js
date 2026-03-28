const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_jwt_key_here_change_this_in_production';

/* Verify JWT token */
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(403).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, role, email }
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

/* Role-based authorization */
const authorize = (...roles) => {
  return (req, res, next) => {
    const userRole = req.user && typeof req.user.role === "string"
      ? req.user.role.trim().toUpperCase()
      : "";
    const allowedRoles = roles.map((r) => (typeof r === "string" ? r.trim().toUpperCase() : r));

    if (!req.user || !allowedRoles.includes(userRole)) {
      return res.status(403).json({ message: "Access denied" });
    }
    next();
  };
};

module.exports = {
  verifyToken,
  authorize
};
