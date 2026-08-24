import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, QrCode, Smartphone, ShieldCheck, Mail, Phone, CheckCircle2, Shield, Scan, MessageSquare, ShieldAlert } from "lucide-react";
import { Button, Input } from "../components/ui";
import OTPInput from "../components/OTPInput";
import PhoneInput from "../components/PhoneInput";

type RegistrationStep = "details" | "email-otp" | "sms-otp" | "mfa-setup" | "authenticator-qr" | "mfa-verify" | "success";

export default function Register() {
  const navigate = useNavigate();
  const [step, setStep] = useState<RegistrationStep>("details");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [hasAgreed, setHasAgreed] = useState(false);

  // Form Data
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    mobile: "",
    password: ""
  });
  
  // OTP Data
  const [userId, setUserId] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [otp, setOtp] = useState("");
  const [attemptsLeft, setAttemptsLeft] = useState(3);
  const [timer, setTimer] = useState(0);
  const [selectedMfaMethod, setSelectedMfaMethod] = useState("authenticator");
  const [mfaError, setMfaError] = useState(false);

  useEffect(() => {
    if (timer > 0) {
      const t = setTimeout(() => setTimer(timer - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [timer]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!hasAgreed) {
      setError("You must agree to the Terms & Conditions and Privacy Policy.");
      return;
    }

    const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;
    if (!passwordRegex.test(formData.password)) {
      setError("Password must contain at least 8 characters, 1 uppercase letter, 1 number, and 1 special character.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Registration failed");
      
      setChallengeId(data.challengeId);
      setUserId(data.userId);
      setStep("email-otp");
      setTimer(5 * 60); // 5 minutes
      setOtp(data.demoOtp || "");
      setAttemptsLeft(3);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyEmail = async () => {
    if (otp.length < 6) return;
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch("/api/verify-email-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId, code: otp })
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.attemptsLeft !== undefined) setAttemptsLeft(data.attemptsLeft);
        throw new Error(data.error || "Verification failed");
      }
      
      setChallengeId(data.challengeId);
      setUserId(data.userId);
      setStep("sms-otp");
      setTimer(5 * 60);
      setOtp(data.demoOtp || "");
      setAttemptsLeft(3);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendEmail = async () => {
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch("/api/send-email-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, type: "registration" })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to resend");
      
      setChallengeId(data.challengeId);
      setTimer(5 * 60);
      setOtp(data.demoOtp || "");
      setAttemptsLeft(3);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendSMS = async () => {
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch("/api/send-sms-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, type: "registration" })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to resend");
      
      setChallengeId(data.challengeId);
      setTimer(5 * 60);
      setOtp(data.demoOtp || "");
      setAttemptsLeft(3);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  
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

  const handleVerifySMS = async () => {
    if (otp.length < 6) return;
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch("/api/verify-sms-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId, code: otp })
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.attemptsLeft !== undefined) setAttemptsLeft(data.attemptsLeft);
        throw new Error(data.error || "Verification failed");
      }
      
      setStep("mfa-setup");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
      <div className="flex items-center justify-center mb-8 text-blue-600">
        <ShieldCheck className="w-10 h-10" />
        <span className="text-xl font-bold ml-2 text-slate-900">SecureID</span>
      </div>

      {step === "details" && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-semibold mb-2">Create your account</h1>
            <p className="text-slate-500">Let's get you started</p>
          </div>
          
          <form onSubmit={handleRegister} className="space-y-4">
            <Input
              label="Full Name"
              placeholder="John Doe"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <Input
              label="Email"
              type="email"
              placeholder="john@example.com"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
            <PhoneInput
              required
              value={formData.mobile}
              onChange={(value) => setFormData({ ...formData, mobile: value })}
            />
            <div className="relative">
              <Input
                label="Password"
                type={showPassword ? "text" : "password"}
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
              <button
                type="button"
                className="absolute right-3 top-8 text-slate-400 hover:text-slate-600"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            
            <div className="space-y-2 mt-4">
              <p className="text-sm text-slate-600 font-medium">Password must contain:</p>
              <ul className="text-sm space-y-1">
                <li className={`flex items-center gap-2 ${formData.password.length >= 8 ? 'text-green-600' : 'text-slate-500'}`}>
                  <CheckCircle2 className="w-4 h-4" /> At least 8 characters
                </li>
                <li className={`flex items-center gap-2 ${/[A-Z]/.test(formData.password) ? 'text-green-600' : 'text-slate-500'}`}>
                  <CheckCircle2 className="w-4 h-4" /> 1 uppercase letter
                </li>
                <li className={`flex items-center gap-2 ${/\d/.test(formData.password) ? 'text-green-600' : 'text-slate-500'}`}>
                  <CheckCircle2 className="w-4 h-4" /> 1 number
                </li>
                <li className={`flex items-center gap-2 ${/[!@#$%^&*(),.?":{}|<>]/.test(formData.password) ? 'text-green-600' : 'text-slate-500'}`}>
                  <CheckCircle2 className="w-4 h-4" /> 1 special character
                </li>
              </ul>
            </div>

            <div className="flex items-start gap-2 mt-4">
              <input
                type="checkbox"
                id="terms"
                checked={hasAgreed}
                onChange={(e) => setHasAgreed(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
              />
              <label htmlFor="terms" className="text-sm text-slate-600 leading-tight">
                I agree to the <Link to="#" className="text-blue-600 hover:underline font-medium">Terms & Conditions</Link> and <Link to="#" className="text-blue-600 hover:underline font-medium">Privacy Policy</Link>
              </label>
            </div>

            {error && <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg mt-2">{error}</div>}

            <Button type="submit" className="w-full mt-4" isLoading={isLoading}>
              Create Account
            </Button>
            
            <p className="text-center text-sm text-slate-500 mt-6">
              Already have an account? <Link to="/login" className="text-blue-600 font-medium hover:underline">Login</Link>
            </p>
          </form>
        </div>
      )}

      {step === "email-otp" && (
        <div className="animate-in fade-in slide-in-from-right-8 duration-500 text-center">
          <div className="mx-auto w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-6 text-blue-600">
            <Mail className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-semibold mb-2">Verify your email</h2>
          <p className="text-slate-500 mb-8">
            We have sent a 6-digit code to <br/><span className="font-medium text-slate-900">{formData.email}</span>
          </p>
          
          <OTPInput value={otp} onChange={setOtp} error={!!error} />
          
          <div className="mt-6 min-h-[40px]">
            {error && (
              <p className="text-sm text-red-600 mb-2">
                {error}. {attemptsLeft > 0 ? `You have ${attemptsLeft} attempts left.` : ""}
              </p>
            )}
            <p className="text-sm font-medium text-slate-600">
              Code expires in <span className={timer < 60 ? "text-red-600" : "text-blue-600"}>{formatTime(timer)}</span>
            </p>
          </div>

          <Button 
            onClick={handleVerifyEmail} 
            className="w-full mt-6" 
            isLoading={isLoading}
            disabled={otp.length < 6 || timer === 0}
          >
            Verify Email
          </Button>
          
          <div className="mt-6">
            <button onClick={handleResendEmail} className="text-sm font-medium text-blue-600 hover:underline">
              Resend code
            </button>
          </div>
        </div>
      )}

      {step === "sms-otp" && (
        <div className="animate-in fade-in slide-in-from-right-8 duration-500 text-center">
          <div className="mx-auto w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mb-6 text-emerald-600">
            <Phone className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-semibold mb-2">Verify your mobile</h2>
          <p className="text-slate-500 mb-8">
            We have sent a 6-digit code to <br/><span className="font-medium text-slate-900">{formData.mobile}</span>
          </p>
          
          <OTPInput value={otp} onChange={setOtp} error={!!error} />
          
          {attemptsLeft === 0 ? (
            <>
              <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm mb-6 mt-6">
                Maximum attempts reached.<br/>Please request a new code.
              </div>
              <Button 
                onClick={handleResendSMS} 
                className="w-full mt-2"
                isLoading={isLoading}
              >
                Resend New Code
              </Button>
              <div className="mt-6">
                <button className="text-sm font-medium text-slate-500 hover:text-slate-800">
                  Wrong number? <span className="text-blue-600 font-semibold hover:underline">Change</span>
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="mt-6 min-h-[40px]">
                {error && (
                  <p className="text-sm text-red-600 mb-2">
                    Invalid code. Please try again.
                  </p>
                )}
                <p className="text-sm font-medium text-slate-600">
                  Code expires in <span className={timer < 60 ? "text-red-600" : "text-emerald-600"}>{formatTime(timer)}</span>
                </p>
              </div>

              <Button 
                onClick={handleVerifySMS} 
                className="w-full mt-6" 
                isLoading={isLoading}
                disabled={otp.length < 6 || timer === 0}
              >
                Verify Mobile
              </Button>
              
              <div className="mt-6">
                <button onClick={handleResendSMS} className="text-sm font-medium text-blue-600 hover:underline">
                  Resend code
                </button>
              </div>
            </>
          )}
        </div>
      )}

      
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
              className={`flex items-center p-4 border rounded-xl cursor-pointer transition-colors ${selectedMfaMethod === 'authenticator' ? 'border-blue-600 bg-blue-50/30 ring-1 ring-blue-600' : 'border-slate-200'}`}
              onClick={() => setSelectedMfaMethod('authenticator')}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-4 shrink-0 ${selectedMfaMethod === 'authenticator' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                <Scan className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className={`font-medium ${selectedMfaMethod === 'authenticator' ? 'text-blue-900' : 'text-slate-700'}`}>Authenticator App</div>
                <div className="text-xs text-slate-500">(Google Authenticator / Authy)</div>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${selectedMfaMethod === 'authenticator' ? 'border-blue-600' : 'border-slate-300'}`}>
                {selectedMfaMethod === 'authenticator' && <div className="w-2.5 h-2.5 bg-blue-600 rounded-full" />}
              </div>
            </div>

            <div
              className={`flex items-center p-4 border rounded-xl cursor-pointer transition-colors ${selectedMfaMethod === 'sms' ? 'border-blue-600 bg-blue-50/30 ring-1 ring-blue-600' : 'border-slate-200'}`}
              onClick={() => setSelectedMfaMethod('sms')}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-4 shrink-0 ${selectedMfaMethod === 'sms' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                <MessageSquare className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className={`font-medium ${selectedMfaMethod === 'sms' ? 'text-blue-900' : 'text-slate-700'}`}>SMS Authentication</div>
                <div className="text-xs text-slate-500">Receive codes on your mobile</div>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${selectedMfaMethod === 'sms' ? 'border-blue-600' : 'border-slate-300'}`}>
                {selectedMfaMethod === 'sms' && <div className="w-2.5 h-2.5 bg-blue-600 rounded-full" />}
              </div>
            </div>

            <div
              className={`flex items-center p-4 border rounded-xl cursor-pointer transition-colors ${selectedMfaMethod === 'email' ? 'border-blue-600 bg-blue-50/30 ring-1 ring-blue-600' : 'border-slate-200'}`}
              onClick={() => setSelectedMfaMethod('email')}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-4 shrink-0 ${selectedMfaMethod === 'email' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                <Mail className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className={`font-medium ${selectedMfaMethod === 'email' ? 'text-blue-900' : 'text-slate-700'}`}>Email Authentication</div>
                <div className="text-xs text-slate-500">Receive codes on your email</div>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${selectedMfaMethod === 'email' ? 'border-blue-600' : 'border-slate-300'}`}>
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
          
          <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-6 ${error ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
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

      {step === "success" && (
        <div className="animate-in zoom-in-95 duration-500 text-center py-6">
          <div className="mx-auto w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mb-6 text-green-500">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold mb-4">Account created!</h2>
          <p className="text-slate-500 mb-8">
            Your account has been created successfully and MFA is enabled.
          </p>
          
          <div className="space-y-3 mb-8 text-sm text-slate-600 text-left w-max mx-auto">
            <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500"/> Email verified</div>
            <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500"/> Mobile verified</div>
            <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500"/> MFA enabled</div>
          </div>

          <Button onClick={() => navigate("/login")} className="w-full">
            Continue to Login
          </Button>
        </div>
      )}
    </div>
  );
}
