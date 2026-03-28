const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const userModel = require("../models/userModel");
const teamModel = require("../models/teamModel");

const JWT_SECRET = process.env.JWT_SECRET || "your_super_secret_jwt_key_here_change_this_in_production";

function signToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET || JWT_SECRET,
    { expiresIn: "30d" }
  );
}

function respondWithLogin(res, user, message = "Logged in successfully") {
  const token = signToken(user);
  return res.json({ message, token, user });
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeRole(value) {
  return String(value || "").trim().toUpperCase();
}

function normalizeText(value) {
  return value ? String(value).trim() : null;
}

function handleDuplicateRegister(res, { email, role, password, team_name, slot }) {
  userModel.findUserByEmailAndRole(email, role, (findErr, existingRows) => {
    if (findErr) {
      console.error("Error checking duplicate user:", findErr);
      return res.status(500).json({ message: "Register failed", error: findErr.message });
    }

    if (!existingRows.length) {
      return res.status(409).json({ message: "Email already registered. Please login." });
    }

    const loginCandidate = existingRows.find((u) => {
      if (role === "DEBATER") {
        return normalizeText(u.team_name)?.toLowerCase() === normalizeText(team_name)?.toLowerCase();
      }

      if (role === "AUDIENCE") {
        return normalizeText(u.slot)?.toLowerCase() === normalizeText(slot)?.toLowerCase();
      }

      return true;
    });

    if (!loginCandidate) {
      return res.status(409).json({
        message: role === "DEBATER"
          ? "This email is already registered for another debater team. Use the matching team at login."
          : "Email already registered. Please login."
      });
    }

    const valid = bcrypt.compareSync(password, loginCandidate.password);
    if (!valid) {
      return res.status(401).json({ message: "Account already exists. Please login with correct password." });
    }

    return respondWithLogin(res, loginCandidate, "User already registered. Logged in successfully");
  });
}

exports.register = (req, res) => {
  console.log("Register request body:", req.body);

  const name = normalizeText(req.body.name);
  const email = normalizeEmail(req.body.email);
  const password = req.body.password;
  const role = normalizeRole(req.body.role);
  const team_name = normalizeText(req.body.team_name);
  const slot = normalizeText(req.body.slot);

  if (!name || !email || !password || !role) {
    return res.status(400).json({ message: "Name, email, password and role are required" });
  }

  if (password.length < 8) {
    return res.status(400).json({ message: "Password must be at least 8 characters long" });
  }

  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/;
  if (!passwordRegex.test(password)) {
    return res.status(400).json({
      message: "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
    });
  }

  const validRoles = ["ADMIN", "DEBATER", "AUDIENCE"];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ message: "Invalid role" });
  }

  userModel.findUserByEmail(email, (err, rows) => {
    if (err) {
      console.error("Error checking user by email:", err);
      return res.status(500).json({ message: "Error checking user", error: err.message });
    }

    if (rows.length > 0) {
      // Check if user exists with the SAME email AND SAME team
      const sameTeamUser = rows.find((u) => 
        normalizeRole(u.role) === role && 
        normalizeText(u.team_name) === normalizeText(team_name)
      );
      
      if (sameTeamUser) {
        const valid = bcrypt.compareSync(password, sameTeamUser.password);
        if (!valid) return res.status(401).json({ message: "Invalid password" });
        return respondWithLogin(res, sameTeamUser, "User already registered. Logged in successfully");
      }
      
      // Different team with same email - allow registration for the new team
      // Continue to create new user
    }

    const hashed = bcrypt.hashSync(password, 8);

    if (role === "DEBATER") {
      if (!team_name) {
        return res.status(400).json({ message: "Team name is required for debaters" });
      }

      teamModel.getAllTeams((teamErr, teams) => {
        if (teamErr) {
          console.error("Error validating team:", teamErr);
          return res.status(500).json({ message: "Error validating team", error: teamErr.message });
        }

        const requestedTeam = normalizeText(team_name).toLowerCase();
        const teamExists = teams.some((team) => normalizeText(team.name).toLowerCase() === requestedTeam);
        if (!teamExists) {
          return res.status(400).json({ message: "Invalid team selected" });
        }

        userModel.createUser(
          { name, email, password: hashed, role, team_name, slot },
          (createErr) => {
            if (createErr) {
              console.error("Register failed:", createErr);
              if (createErr.code === "ER_DUP_ENTRY") {
                return handleDuplicateRegister(res, { email, role, password, team_name, slot });
              }
              return res.status(500).json({ message: "Register failed", error: createErr.message });
            }
            return res.json({ message: "Registered successfully" });
          }
        );
      });
      return;
    }

    if (role === "AUDIENCE") {
      if (!slot) {
        return res.status(400).json({ message: "Slot is required for audience registration" });
      }

      userModel.createUser(
        { name, email, password: hashed, role, team_name: null, slot },
        (createErr) => {
          if (createErr) {
            console.error("Register failed:", createErr);
            if (createErr.code === "ER_DUP_ENTRY") {
              return handleDuplicateRegister(res, { email, role, password, team_name, slot });
            }
            return res.status(500).json({ message: "Register failed", error: createErr.message });
          }
          return res.json({ message: "Registered successfully" });
        }
      );
      return;
    }

    userModel.createUser(
      { name, email, password: hashed, role, team_name: null, slot: null },
      (createErr) => {
        if (createErr) {
          console.error("Register failed:", createErr);
          if (createErr.code === "ER_DUP_ENTRY") {
            return handleDuplicateRegister(res, { email, role, password, team_name, slot });
          }
          return res.status(500).json({ message: "Register failed", error: createErr.message });
        }
        return res.json({ message: "Registered successfully" });
      }
    );
  });
};

exports.login = (req, res) => {
  const email = normalizeEmail(req.body.email);
  const password = req.body.password;
  const role = normalizeRole(req.body.role);
  const team_name = normalizeText(req.body.team_name);
  const slot = normalizeText(req.body.slot);

  console.log("Login attempt:", { email, role, team_name: team_name || "N/A", slot: slot || "N/A" });

  if (role === "DEBATER" && !team_name) {
    return res.status(400).json({ message: "Team name is required for debater login" });
  }

  if (role === "AUDIENCE" && !slot) {
    return res.status(400).json({ message: "Slot is required for audience login" });
  }

  userModel.findUser(email, role, { team_name, slot }, (err, rows) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ message: "Database error" });
    }

    if (!rows.length) return res.status(401).json({ message: "User not found" });

    const valid = bcrypt.compareSync(password, rows[0].password);
    if (!valid) return res.status(401).json({ message: "Invalid password" });

    if (role === "AUDIENCE" && rows[0].slot !== slot) {
      return res.status(401).json({ message: "Invalid slot for this user" });
    }

    return respondWithLogin(res, rows[0]);
  });
};
