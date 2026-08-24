import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import cookieParser from "cookie-parser";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";
import nodemailer from "nodemailer";
import mongoose from "mongoose";
import { OAuth2Client } from "google-auth-library";

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(cookieParser());

const MONGODB_URI = process.env.MONGODB_URL || process.env.MONGODB_URI || "mongodb+srv://mallickarpan53_db_user:ArpanMallick@cluster0.oz2z2zq.mongodb.net/iam_demo?retryWrites=true&w=majority&appName=Cluster0";

mongoose.connect(MONGODB_URI, { 
  serverSelectionTimeoutMS: 5000,
})
  .then(() => console.log("Connected to MongoDB successfully!"))
  .catch(err => console.error("MongoDB connection FATAL error:", err.message));

// --- MongoDB Schemas ---
const userSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  mobile: { type: String },
  passwordHash: { type: String },
  mfaEnabled: { type: Boolean, default: false },
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Number },
  googleId: { type: String }
});
const User = mongoose.model("User", userSchema);

const challengeSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  channel: { type: String, required: true }, // "email" | "sms"
  type: { type: String, required: true }, // "registration" | "login"
  otpHash: { type: String, required: true },
  expiresAt: { type: Number, required: true },
  attempts: { type: Number, default: 0 }
});
const Challenge = mongoose.model("Challenge", challengeSchema);

const sessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  expiresAt: { type: Number, required: true }
});
const Session = mongoose.model("Session", sessionSchema);

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-jwt-key";
const SESSION_SECRET = process.env.SESSION_SECRET || "super-secret-session-key";

// --- Helpers ---
const generateOTP = () => crypto.randomInt(100000, 1000000).toString(); // Cryptographically secure 6-digit OTP
const hashOTP = (otp: string) => crypto.createHash("sha256").update(otp).digest("hex");

async function sendOTPEmail(toEmail: string, otp: string) {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_APP_PASSWORD;

  if (!user || !pass) {
    console.log(`\n[SIMULATED EMAIL]\nTo: ${toEmail}\nOTP: ${otp}\n`);
    return;
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: user,
      pass: pass,
    },
  });

  try {
    await transporter.sendMail({
      from: `"SecureID Verification" <${user}>`,
      to: toEmail,
      subject: "Your OTP Verification Code",
      text: `Your OTP is: ${otp}. It expires in 5 minutes.`,
      html: `<p>Your OTP is: <strong>${otp}</strong></p><p>It expires in 5 minutes.</p>`,
    });
  } catch (err: any) {
    // console.warn("Nodemailer failed to send email. Falling back to simulated email.", err.message);
    console.log(`\n[SIMULATED EMAIL FALLBACK]\nTo: ${toEmail}\nOTP: ${otp}\n`);
  }
}

// --- API Routes ---

const googleClient = new OAuth2Client("645377655602-tnnm96msr1m7rcfgdc77fim2snpvp180.apps.googleusercontent.com");

app.post("/api/auth/google", async (req, res) => {
  try {
    const { credential, accessToken } = req.body;
    if (!credential && !accessToken) return res.status(400).json({ error: "Missing credential or access token" });

    let payload;
    
    if (credential) {
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: "645377655602-tnnm96msr1m7rcfgdc77fim2snpvp180.apps.googleusercontent.com",
      });
      payload = ticket.getPayload();
    } else if (accessToken) {
      const userRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!userRes.ok) {
        return res.status(400).json({ error: "Invalid Google access token" });
      }
      payload = await userRes.json();
    }
    
    if (!payload || !payload.email) return res.status(400).json({ error: "Invalid Google token" });

    let user = await User.findOne({ 
      $or: [{ googleId: payload.sub }, { email: payload.email }] 
    });

    if (!user) {
      // Create new user for OAuth
      const userId = uuidv4();
      user = await User.create({
        id: userId,
        name: payload.name || "Google User",
        email: payload.email,
        googleId: payload.sub,
        mfaEnabled: false
      });
    } else if (!user.googleId) {
      // Link Google account to existing email
      user.googleId = payload.sub;
      await user.save();
    }

    const sessionId = crypto.randomBytes(32).toString("hex");
    await Session.create({
      sessionId: sessionId,
      userId: user.id,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
    });

    res.cookie("sessionId", sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000
    });

    const token = jwt.sign(
      { userId: user.id, email: user.email, name: user.name, mfaEnabled: user.mfaEnabled },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.json({ success: true, token, user: { name: user.name, email: user.email, id: user.id } });
  } catch (err: any) {
    console.error("Google auth error:", err);
    res.status(500).json({ error: "Failed to authenticate with Google." });
  }
});

app.post("/api/register", async (req, res) => {
  try {
    const { name, email, mobile, password } = req.body;
    if (!name || !email || !mobile || !password) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({ error: "Password must contain at least 8 characters, 1 uppercase letter, 1 number, and 1 special character." });
    }

    if (!email.toLowerCase().endsWith("@gmail.com")) {
      return res.status(400).json({ error: "Only @gmail.com email addresses are allowed." });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "Email already in use" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = uuidv4();
    
    await User.create({
      id: userId,
      name,
      email,
      mobile,
      passwordHash,
      mfaEnabled: false
    });

    const otp = generateOTP();
    try {
      await sendOTPEmail(email, otp);
    } catch (err) {
      console.error("Failed to send email:", err);
      return res.status(500).json({ error: "Failed to send OTP email. Please check server credentials." });
    }

    const challengeId = uuidv4();
    await Challenge.create({
      id: challengeId,
      userId,
      channel: "email",
      type: "registration",
      otpHash: hashOTP(otp),
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
      attempts: 0
    });

    res.json({
      demoOtp: otp,
      challengeId,
      userId,
      method: "email",
      mfaRequired: true
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/verify-email-otp", async (req, res) => {
  try {
    const { challengeId, code } = req.body;
    const challenge = await Challenge.findOne({ id: challengeId });

    if (!challenge || challenge.channel !== "email" || challenge.type !== "registration") {
      return res.status(400).json({ error: "Invalid challenge" });
    }

    if (Date.now() > challenge.expiresAt) {
      return res.status(400).json({ error: "Code expired" });
    }

    if (challenge.attempts >= 3) {
      return res.status(400).json({ error: "Maximum attempts reached" });
    }

    challenge.attempts++;
    await challenge.save();

    if (challenge.otpHash !== hashOTP(code)) {
      return res.status(400).json({ error: "Incorrect code", attemptsLeft: 3 - challenge.attempts });
    }

    await Challenge.deleteOne({ id: challengeId });
    
    const user = await User.findOne({ id: challenge.userId });
    if (!user) return res.status(404).json({ error: "User not found" });

    const otp = generateOTP();
    console.log(`\n[SIMULATED SMS]\nTo: ${user.mobile}\nOTP: ${otp}\n`);

    const newChallengeId = uuidv4();
    await Challenge.create({
      id: newChallengeId,
      userId: user.id,
      channel: "sms",
      type: "registration",
      otpHash: hashOTP(otp),
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
      attempts: 0
    });

    res.json({
      demoOtp: otp,
      challengeId: newChallengeId,
      userId: user.id,
      method: "sms",
      mfaRequired: true
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/send-email-otp", async (req, res) => {
  try {
    const { userId, type } = req.body;
    const user = await User.findOne({ id: userId });
    if (!user) return res.status(400).json({ error: "User not found" });

    const otp = generateOTP();
    try {
      await sendOTPEmail(user.email, otp);
    } catch (err) {
      return res.status(500).json({ error: "Failed to send OTP email." });
    }

    const challengeId = uuidv4();
    await Challenge.create({
      id: challengeId,
      userId: user.id,
      channel: "email",
      type: type || "login",
      otpHash: hashOTP(otp),
      expiresAt: Date.now() + 5 * 60 * 1000,
      attempts: 0
    });

    res.json({
      demoOtp: otp, challengeId, method: "email", mfaRequired: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/send-sms-otp", async (req, res) => {
  try {
    const { userId, type } = req.body;
    const user = await User.findOne({ id: userId });
    if (!user) return res.status(400).json({ error: "User not found" });

    const otp = generateOTP();
    console.log(`\n[SIMULATED SMS]\nTo: ${user.mobile}\nOTP: ${otp}\n`);

    const challengeId = uuidv4();
    await Challenge.create({
      id: challengeId,
      userId: user.id,
      channel: "sms",
      type: type || "registration",
      otpHash: hashOTP(otp),
      expiresAt: Date.now() + 5 * 60 * 1000,
      attempts: 0
    });

    res.json({
      demoOtp: otp, challengeId, method: "sms", mfaRequired: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/verify-sms-otp", async (req, res) => {
  try {
    const { challengeId, code } = req.body;
    const challenge = await Challenge.findOne({ id: challengeId });

    if (!challenge || challenge.channel !== "sms" || challenge.type !== "registration") {
      return res.status(400).json({ error: "Invalid challenge" });
    }

    if (Date.now() > challenge.expiresAt) {
      return res.status(400).json({ error: "Code expired" });
    }

    if (challenge.attempts >= 3) {
      return res.status(400).json({ error: "Maximum attempts reached" });
    }

    challenge.attempts++;
    await challenge.save();

    if (challenge.otpHash !== hashOTP(code)) {
      return res.status(400).json({ error: "Incorrect code", attemptsLeft: 3 - challenge.attempts });
    }

    await Challenge.deleteOne({ id: challengeId });
    
    const user = await User.findOne({ id: challenge.userId });
    if (user) {
      user.mfaEnabled = true;
      await user.save();
    }

    res.json({
      success: true,
      message: "Registration completed successfully"
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    if (!email.toLowerCase().endsWith("@gmail.com")) {
      return res.status(400).json({ error: "Only @gmail.com email addresses are allowed." });
    }

    const user = await User.findOne({ email });

    if (!user || !user.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    if (!user.mfaEnabled) {
      return res.status(401).json({ error: "MFA not setup for this user." });
    }

    const otp = generateOTP();
    try {
      await sendOTPEmail(user.email, otp);
    } catch (err) {
      console.error("Failed to send email:", err);
      return res.status(500).json({ error: "Failed to send OTP email. Please check server credentials." });
    }

    const challengeId = uuidv4();
    await Challenge.create({
      id: challengeId,
      userId: user.id,
      channel: "email",
      type: "login",
      otpHash: hashOTP(otp),
      expiresAt: Date.now() + 5 * 60 * 1000,
      attempts: 0
    });

    res.json({
      demoOtp: otp,
      challengeId,
      method: "email",
      mfaRequired: true
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/verify-login-otp", async (req, res) => {
  try {
    const { challengeId, code } = req.body;
    const challenge = await Challenge.findOne({ id: challengeId });

    if (!challenge || challenge.type !== "login") {
      return res.status(400).json({ error: "Invalid challenge" });
    }

    if (Date.now() > challenge.expiresAt) {
      return res.status(400).json({ error: "Code expired" });
    }

    if (challenge.attempts >= 3) {
      return res.status(400).json({ error: "Maximum attempts reached" });
    }

    challenge.attempts++;
    await challenge.save();

    if (challenge.otpHash !== hashOTP(code)) {
      return res.status(400).json({ error: "Incorrect code", attemptsLeft: 3 - challenge.attempts });
    }

    await Challenge.deleteOne({ id: challengeId });
    
    const sessionId = uuidv4();
    await Session.create({
      sessionId: sessionId,
      userId: challenge.userId,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
    });

    res.cookie("sessionId", sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000
    });

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});


app.post("/api/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      // For security, don't reveal if user exists, just return success
      return res.json({ success: true, message: "If that email is in our database, we will send a password reset link." });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    // In a real app, send email here. For demo, we return the token to auto-redirect or show a link
    res.json({ success: true, resetToken });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/reset-password", async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    
    const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({ error: "Password must contain at least 8 characters, 1 uppercase letter, 1 number, and 1 special character." });
    }

    const user = await User.findOne({ 
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() } 
    });

    if (!user) {
      return res.status(400).json({ error: "Password reset token is invalid or has expired." });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ success: true, message: "Password has been updated." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/me", async (req, res) => {
  try {
    const sessionId = req.cookies.sessionId;
    const session = await Session.findOne({ sessionId });

    if (!session || Date.now() > session.expiresAt) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const user = await User.findOne({ id: session.userId });
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      mobile: user.mobile
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/logout", async (req, res) => {
  try {
    const sessionId = req.cookies.sessionId;
    if (sessionId) {
      await Session.deleteOne({ sessionId });
    }
    res.clearCookie("sessionId", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/token", async (req, res) => {
  try {
    const sessionId = req.cookies.sessionId;
    const session = await Session.findOne({ sessionId });

    if (!session || Date.now() > session.expiresAt) {
      return res.status(401).json({ error: "Unauthorized session" });
    }

    const token = jwt.sign({ userId: session.userId }, JWT_SECRET, { expiresIn: '15m' });
    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/protected", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing or invalid token" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    
    const user = await User.findOne({ id: decoded.userId });
    if (!user) return res.status(404).json({ error: "User not found" });

    res.json({
      message: "You have accessed a protected route with JWT!",
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    });
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
});

// --- Vite Middleware & Fallback ---
async function startServer() {
  if (process.env.VERCEL) return;
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // Since express 5, use *all or *
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
export default app;