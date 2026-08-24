const fs = require('fs');
let code = fs.readFileSync('src/pages/Register.tsx', 'utf8');

// 1. Replace handleVerifySMS success step
code = code.replace(/setStep\("success"\);/, 'setStep("mfa-setup");');

// 2. Add new MFA state handlers
const newHandlers = `
  const handleMfaContinue = () => {
    if (selectedMfaMethod === "authenticator") {
      setStep("authenticator-qr");
    } else {
      setStep("success");
    }
  };

  const handleVerifyAuthenticator = () => {
    if (otp.length < 6) return;
    if (otp !== "123456") {
      setError("Invalid code. Please try again.");
      setMfaError(true);
    } else {
      setError("");
      setMfaError(false);
      setStep("success");
    }
  };
`;
code = code.replace(/const handleVerifySMS = async \(\) => {/, newHandlers + '\n  const handleVerifySMS = async () => {');

// 3. Add imports if needed
code = code.replace(/import \{ Eye, EyeOff, /, 'import { Eye, EyeOff, QrCode, Smartphone, ');

// 4. Update the render UI with the new steps
const mfaSteps = `
      {step === "mfa-setup" && (
        <div className="animate-in fade-in slide-in-from-right-8 duration-500">
          <button onClick={() => setStep("sms-otp")} className="absolute top-8 left-8 p-2 text-slate-400 hover:text-slate-600">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>
          
          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 bg-blue-50 border border-blue-100 rounded-2xl flex items-center justify-center mb-6 text-blue-600">
              <Shield className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-semibold mb-2">Set up Multi-Factor Auth</h2>
            <p className="text-slate-500">Add an extra layer of security<br/>to protect your account.</p>
          </div>

          <div className="space-y-3">
            <div
              className={\`flex items-center p-4 border rounded-xl cursor-pointer transition-colors \${selectedMfaMethod === 'authenticator' ? 'border-blue-600 bg-blue-50/30 ring-1 ring-blue-600' : 'border-slate-200'}\`}
              onClick={() => setSelectedMfaMethod('authenticator')}
            >
              <div className={\`w-10 h-10 rounded-full flex items-center justify-center mr-4 shrink-0 \${selectedMfaMethod === 'authenticator' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}\`}>
                <Scan className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className={\`font-medium \${selectedMfaMethod === 'authenticator' ? 'text-blue-900' : 'text-slate-700'}\`}>Authenticator App</div>
                <div className="text-xs text-slate-500">(Google Authenticator / Authy)</div>
              </div>
              <div className={\`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 \${selectedMfaMethod === 'authenticator' ? 'border-blue-600' : 'border-slate-300'}\`}>
                {selectedMfaMethod === 'authenticator' && <div className="w-2.5 h-2.5 bg-blue-600 rounded-full" />}
              </div>
            </div>

            <div
              className={\`flex items-center p-4 border rounded-xl cursor-pointer transition-colors \${selectedMfaMethod === 'sms' ? 'border-blue-600 bg-blue-50/30 ring-1 ring-blue-600' : 'border-slate-200'}\`}
              onClick={() => setSelectedMfaMethod('sms')}
            >
              <div className={\`w-10 h-10 rounded-full flex items-center justify-center mr-4 shrink-0 \${selectedMfaMethod === 'sms' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}\`}>
                <MessageSquare className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className={\`font-medium \${selectedMfaMethod === 'sms' ? 'text-blue-900' : 'text-slate-700'}\`}>SMS Authentication</div>
                <div className="text-xs text-slate-500">Receive codes on your mobile</div>
              </div>
              <div className={\`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 \${selectedMfaMethod === 'sms' ? 'border-blue-600' : 'border-slate-300'}\`}>
                {selectedMfaMethod === 'sms' && <div className="w-2.5 h-2.5 bg-blue-600 rounded-full" />}
              </div>
            </div>

            <div
              className={\`flex items-center p-4 border rounded-xl cursor-pointer transition-colors \${selectedMfaMethod === 'email' ? 'border-blue-600 bg-blue-50/30 ring-1 ring-blue-600' : 'border-slate-200'}\`}
              onClick={() => setSelectedMfaMethod('email')}
            >
              <div className={\`w-10 h-10 rounded-full flex items-center justify-center mr-4 shrink-0 \${selectedMfaMethod === 'email' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}\`}>
                <Mail className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className={\`font-medium \${selectedMfaMethod === 'email' ? 'text-blue-900' : 'text-slate-700'}\`}>Email Authentication</div>
                <div className="text-xs text-slate-500">Receive codes on your email</div>
              </div>
              <div className={\`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 \${selectedMfaMethod === 'email' ? 'border-blue-600' : 'border-slate-300'}\`}>
                {selectedMfaMethod === 'email' && <div className="w-2.5 h-2.5 bg-blue-600 rounded-full" />}
              </div>
            </div>
          </div>

          <Button onClick={handleMfaContinue} className="w-full h-12 text-base rounded-xl mt-8">
            Continue
          </Button>
        </div>
      )}

      {step === "authenticator-qr" && (
        <div className="animate-in fade-in slide-in-from-right-8 duration-500 text-center">
          <button onClick={() => setStep("mfa-setup")} className="absolute top-8 left-8 p-2 text-slate-400 hover:text-slate-600">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>
          
          <h2 className="text-2xl font-semibold mb-2">Scan QR Code</h2>
          <p className="text-slate-500 mb-8">Open your authenticator app and<br/>scan this QR code</p>
          
          <div className="bg-white p-4 inline-block rounded-2xl shadow-sm border border-slate-100 mb-8">
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=secureid-demo-key" alt="QR Code" className="w-48 h-48 mx-auto" />
          </div>
          
          <div>
            <button onClick={() => { setStep("mfa-verify"); setOtp(""); setError(""); setTimer(30); }} className="text-blue-600 font-medium hover:underline">
              Can't scan? Enter setup key
            </button>
          </div>
        </div>
      )}

      {step === "mfa-verify" && (
        <div className="animate-in fade-in slide-in-from-right-8 duration-500 text-center">
          <button onClick={() => setStep("authenticator-qr")} className="absolute top-8 left-8 p-2 text-slate-400 hover:text-slate-600">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>
          
          <div className={\`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-6 \${error ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}\`}>
            {error ? <ShieldAlert className="w-8 h-8" /> : <Shield className="w-8 h-8" />}
          </div>
          
          <h2 className="text-2xl font-semibold mb-2">Enter the 6-digit code</h2>
          <p className="text-slate-500 mb-8">Enter the code from your<br/>authenticator app</p>
          
          <OTPInput value={otp} onChange={(val) => { setOtp(val); setError(""); }} error={!!error} />
          
          <div className="mt-6 min-h-[40px]">
            {error && (
              <p className="text-sm text-red-600 mb-2">
                {error}
              </p>
            )}
            <p className="text-sm font-medium text-slate-600">
              Code expires in <span className="text-blue-600">{formatTime(timer)}</span>
            </p>
          </div>

          <Button 
            onClick={handleVerifyAuthenticator}
            className="w-full mt-6"
            disabled={otp.length < 6}
          >
            Verify Code
          </Button>
          
          <div className="mt-6">
            <button className="text-sm font-medium text-blue-600 hover:underline">
              Can't access your app?
            </button>
          </div>
        </div>
      )}
`;

code = code.replace(/\{step === "success" && \(/, mfaSteps + '\n      {step === "success" && (');

fs.writeFileSync('src/pages/Register.tsx', code);
