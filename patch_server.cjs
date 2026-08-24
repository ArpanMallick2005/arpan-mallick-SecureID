const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// 1. Update Schema
code = code.replace(/mfaEnabled: \{ type: Boolean, default: false \}\n\}\);/, `mfaEnabled: { type: Boolean, default: false },
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Number }
});`);

// 2. Add endpoints
const endpoints = `
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
    const user = await User.findOne({ 
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() } 
    });

    if (!user) {
      return res.status(400).json({ error: "Password reset token is invalid or has expired." });
    }

    user.passwordHash = hashPassword(newPassword);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ success: true, message: "Password has been updated." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});
`;

code = code.replace(/app\.get\("\/api\/me",/, endpoints + '\napp.get("/api/me",');

fs.writeFileSync('server.ts', code);
