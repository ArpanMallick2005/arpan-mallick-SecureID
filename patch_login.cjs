const fs = require('fs');
let code = fs.readFileSync('src/pages/Login.tsx', 'utf8');

code = code.replace(/setStep\("choose-mfa"\);/, `
        // Auto-skip choice for demo and prefill
        setSelectedMfaMethod("email");
        setStep("otp");
        setTimer(5 * 60);
        setOtp(data.demoOtp || "");
        setAttemptsLeft(3);
        setMfaError(false);
        setHasExpired(false);
`);

code = code.replace(/const handleMfaContinue = async \(\) => {[\s\S]*?};\n/, `const handleMfaContinue = async (e?: any) => {
    if (e && e.preventDefault) e.preventDefault();
    handleLogin(e || new Event('submit') as any);
  };
`);

fs.writeFileSync('src/pages/Login.tsx', code);
