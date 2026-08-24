import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Shield, Mail, MessageSquare, Lock, User, MoreHorizontal, ShieldCheck } from "lucide-react";
import { useGoogleLogin } from "@react-oauth/google";
import { Button, Input } from "../components/ui";
import OTPInput from "../components/OTPInput";

type LoginStep = "credentials" | "choose-mfa" | "otp";

export default function Login() {
  const navigate = useNavigate();
  const [step, setStep] = useState<LoginStep>("credentials");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const loginWithGoogle = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        const res = await fetch("/api/auth/google", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accessToken: tokenResponse.access_token }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Google login failed");
        sessionStorage.setItem("justLoggedIn", "true");
        navigate("/dashboard");
      } catch (err: any) {
        setError(err.message);
      }
    },
    onError: () => setError("Google Login Failed"),
    prompt: "select_account" // Forces the user to select an account, ignoring cached session
  });

  // Form Data
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });
  
  // OTP Data
  const [challengeId, setChallengeId] = useState("");
  const [otp, setOtp] = useState("");
  const [attemptsLeft, setAttemptsLeft] = useState(3);
  const [timer, setTimer] = useState(0);
  const [selectedMfaMethod, setSelectedMfaMethod] = useState("email");
  const [mfaError, setMfaError] = useState(false);
  const [hasExpired, setHasExpired] = useState(false);

  useEffect(() => {
    if (timer > 0) {
      const t = setTimeout(() => setTimer(timer - 1), 1000);
      return () => clearTimeout(t);
    } else if (timer === 0 && step === "otp") {
      setHasExpired(true);
    }
  }, [timer, step]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");
      
      if (data.mfaRequired) {
        setChallengeId(data.challengeId);
        
        // Auto-skip choice for demo and prefill
        setSelectedMfaMethod("email");
        setStep("otp");
        setTimer(5 * 60);
        setOtp(data.demoOtp || "");
        setAttemptsLeft(3);
        setMfaError(false);
        setHasExpired(false);

      } else {
        sessionStorage.setItem("justLoggedIn", "true");
        navigate("/dashboard");
      }
    } catch (err: any) {
      setError(err.message || "Invalid email or password. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleMfaContinue = async (e?: any) => {
    if (e && e.preventDefault) e.preventDefault();
    handleLogin(e || new Event('submit') as any);
  };

  const handleVerifyOTP = async () => {
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch("/api/verify-login-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId, code: otp })
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.attemptsLeft !== undefined) setAttemptsLeft(data.attemptsLeft);
        throw new Error(data.error || "Verification failed");
      }
      
      sessionStorage.setItem("justLoggedIn", "true");
      navigate("/dashboard");
    } catch (err: any) {
      setMfaError(true);
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
    <div className="w-full max-w-[1000px] bg-white md:rounded-2xl md:shadow-xl md:border md:border-slate-100 flex overflow-hidden min-h-[100dvh] md:min-h-[650px] relative">
      {/* Left Blue Sidebar (Web Only) */}
      <div className="hidden md:flex md:w-5/12 bg-blue-600 flex-col items-center justify-center p-12 text-white text-center relative">
        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-6">
           <Shield className="w-8 h-8 text-blue-600" />
        </div>
        <h1 className="text-2xl font-semibold mb-2">SecureID</h1>
        <p className="text-blue-100 mb-8 text-sm">Secure access<br/>to your account.</p>
        <div className="absolute bottom-8 text-xs text-blue-200">
          © 2026 SecureID. All rights reserved.
        </div>
      </div>

      {/* Right Side Form Container */}
      <div className="w-full md:w-7/12 p-6 sm:p-12 flex flex-col justify-center relative">
        <div className="max-w-[400px] w-full mx-auto">
          
          {step === "credentials" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="text-center mb-8">
                {/* Mobile-only logo */}
                <div className="md:hidden flex flex-col items-center justify-center mb-6">
                  <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center">
                    <Shield className="w-8 h-8 text-blue-600" />
                  </div>
                </div>
                <h1 className="text-2xl font-semibold mb-2 text-slate-900">Welcome back!</h1>
                <p className="text-slate-500 text-sm">Login to your account</p>
              </div>
              
              <form onSubmit={handleLogin} className="space-y-5">
                <div className="relative">
                  <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
                    <User className="w-5 h-5" />
                  </div>
                  <input
                    type="email"
                    placeholder="Email or Username"
                    required
                    className={`w-full pl-10 pr-4 py-3 rounded-xl border ${error ? 'border-red-500 bg-red-50' : 'border-slate-200'} focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-colors placeholder:text-slate-400`}
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                  {error && (
                    <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-red-500">
                      <div className="w-4 h-4 rounded-full border border-red-500 flex items-center justify-center text-[10px] font-bold">!</div>
                    </div>
                  )}
                </div>

                <div className="relative">
                  <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
                    <MoreHorizontal className="w-5 h-5" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    required
                    className={`w-full pl-10 pr-12 py-3 rounded-xl border ${error ? 'border-red-500 bg-red-50' : 'border-slate-200'} focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-colors placeholder:text-slate-400`}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>                
                {error && (
                  <p className="text-xs text-red-500 text-center">{error}</p>
                )}

                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="rounded border-slate-300 text-blue-600 focus:ring-blue-600" />
                    <span className="text-slate-600">Remember me</span>
                  </label>
                  <Link to="/forgot-password" className="text-blue-600 font-medium hover:underline">Forgot password?</Link>
                </div>

                <Button type="submit" className="w-full h-12 text-base rounded-xl" isLoading={isLoading}>
                  Login
                </Button>
                
                <div className="flex items-center my-6">
                  <div className="flex-1 border-t border-slate-200"></div>
                  <span className="px-3 text-slate-400 text-sm">or</span>
                  <div className="flex-1 border-t border-slate-200"></div>
                </div>

                <div className="flex flex-col gap-2 w-full">
                  <Button 
                    type="button"
                    variant="outline"
                    className="w-full flex items-center justify-center gap-2 h-11"
                    onClick={() => loginWithGoogle()}
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    Continue with Google
                  </Button>
                </div>
                
                <p className="text-center text-sm text-slate-500 mt-6">
                  New here? <Link to="/register" className="text-blue-600 font-medium hover:underline">Create an account</Link>
                </p>
              </form>
            </div>
          )}

          {step === "choose-mfa" && (
            <div className="animate-in fade-in slide-in-from-right-8 duration-500">
              <div className="text-center mb-8">
                {/* Mobile-only logo */}
                <div className="md:hidden flex flex-col items-center justify-center mb-6">
                  <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center">
                    <Shield className="w-8 h-8 text-blue-600" />
                  </div>
                </div>
                <h2 className="text-2xl font-semibold mb-2">Verify your identity</h2>
                <p className="text-slate-500 text-sm">Choose a method to continue</p>
              </div>

              <div className="space-y-4">
                <div
                  className={`flex items-center p-4 border rounded-xl cursor-pointer transition-colors ${selectedMfaMethod === 'email' ? 'border-blue-600 bg-blue-50/30 ring-1 ring-blue-600' : 'border-slate-200'}`}
                  onClick={() => setSelectedMfaMethod('email')}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-4 shrink-0 ${selectedMfaMethod === 'email' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                    <Mail className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className={`font-medium ${selectedMfaMethod === 'email' ? 'text-blue-900' : 'text-slate-700'}`}>Email OTP</div>
                    <div className="text-xs text-slate-500">Receive a code on your email</div>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${selectedMfaMethod === 'email' ? 'border-blue-600' : 'border-slate-300'}`}>
                    {selectedMfaMethod === 'email' && <div className="w-2.5 h-2.5 bg-blue-600 rounded-full" />}
                  </div>
                </div>

                <div
                  className={`flex items-center p-4 border rounded-xl cursor-pointer transition-colors ${selectedMfaMethod === 'sms' ? 'border-blue-600 bg-blue-50/30 ring-1 ring-blue-600' : 'border-slate-200'}`}
                  onClick={() => setSelectedMfaMethod('sms')}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-4 shrink-0 ${selectedMfaMethod === 'sms' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className={`font-medium ${selectedMfaMethod === 'sms' ? 'text-blue-900' : 'text-slate-700'}`}>SMS OTP</div>
                    <div className="text-xs text-slate-500">Receive a code on your mobile</div>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${selectedMfaMethod === 'sms' ? 'border-blue-600' : 'border-slate-300'}`}>
                    {selectedMfaMethod === 'sms' && <div className="w-2.5 h-2.5 bg-blue-600 rounded-full" />}
                  </div>
                </div>

                <div
                  className={`flex items-center p-4 border rounded-xl cursor-pointer transition-colors ${selectedMfaMethod === 'authenticator' ? 'border-blue-600 bg-blue-50/30 ring-1 ring-blue-600' : 'border-slate-200'}`}
                  onClick={() => setSelectedMfaMethod('authenticator')}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-4 shrink-0 ${selectedMfaMethod === 'authenticator' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                    <Lock className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className={`font-medium ${selectedMfaMethod === 'authenticator' ? 'text-blue-900' : 'text-slate-700'}`}>Authenticator App</div>
                    <div className="text-xs text-slate-500">Use code from authenticator app</div>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${selectedMfaMethod === 'authenticator' ? 'border-blue-600' : 'border-slate-300'}`}>
                    {selectedMfaMethod === 'authenticator' && <div className="w-2.5 h-2.5 bg-blue-600 rounded-full" />}
                  </div>
                </div>
              </div>

              <Button 
                onClick={handleMfaContinue} 
                className="w-full h-12 text-base rounded-xl mt-8"
              >
                Continue
              </Button>
            </div>
          )}

          {step === "otp" && (
            <div className="animate-in fade-in slide-in-from-right-8 duration-500 text-center">
              <button 
                onClick={() => setStep("choose-mfa")} 
                className="absolute top-0 left-0 p-2 text-slate-400 hover:text-slate-600"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
              </button>
              
              <div className="mx-auto w-16 h-16 bg-blue-50 border border-blue-100 rounded-2xl flex items-center justify-center mb-6 text-blue-600">
                {selectedMfaMethod === 'email' ? <Mail className="w-8 h-8" /> : 
                 selectedMfaMethod === 'sms' ? <MessageSquare className="w-8 h-8" /> :
                 <Lock className="w-8 h-8" />}
              </div>
              <h2 className="text-2xl font-semibold mb-2">
                {selectedMfaMethod === 'authenticator' ? 'Enter 6-digit code' : 
                 selectedMfaMethod === 'email' ? 'Email Verification' : 'SMS Verification'}
              </h2>
              <p className="text-slate-500 text-sm mb-8 whitespace-pre-line">
                {selectedMfaMethod === 'authenticator' ? 'Enter the code from your\nauthenticator app' :
                 selectedMfaMethod === 'email' ? `Enter the 6-digit code sent to\n${formData.email}` :
                 `Enter the 6-digit code sent to\nyour mobile number`}
              </p>
              
              <OTPInput value={otp} onChange={(val) => { setOtp(val); setMfaError(false); }} error={mfaError || hasExpired} />
              
              <div className="mt-8 mb-6 min-h-[40px] flex flex-col items-center justify-center">
                {hasExpired ? (
                  <>
                    <p className="text-sm font-medium text-red-600 mb-2">Code expired.</p>
                    <Button 
                      variant="primary" 
                      className="w-full h-12 text-base rounded-xl mb-4" 
                      onClick={handleMfaContinue}
                      disabled={isLoading}
                    >
                      Resend code
                    </Button>
                  </>
                ) : (
                  <>
                    {mfaError && attemptsLeft > 0 ? (
                      <p className="text-sm text-red-600 mb-4">
                        Incorrect code. Please try again.<br/>
                        You have {attemptsLeft} attempts left.
                      </p>
                    ) : attemptsLeft === 0 ? (
                      <p className="text-sm text-red-600 mb-4">
                        Maximum attempts reached.
                      </p>
                    ) : null}
                    
                    <p className="text-sm font-medium text-slate-600 mb-4">
                      Code expires in <span className="text-blue-600">{formatTime(timer)}</span>
                    </p>
                    
                    <button 
                      onClick={handleMfaContinue}
                      disabled={isLoading}
                      className="text-sm font-medium text-blue-600 hover:underline mb-8 disabled:opacity-50"
                    >
                      Didn't receive the code? Resend
                    </button>
                    
                    <Button 
                      onClick={handleVerifyOTP} 
                      className="w-full h-12 text-base rounded-xl" 
                      isLoading={isLoading}
                      disabled={otp.length < 6 || hasExpired || attemptsLeft === 0}
                    >
                      Verify
                    </Button>
                  </>
                )}
              </div>
              
              <div className="mt-2">
                <button className="text-sm font-medium text-blue-600 hover:underline">
                  Didn't receive the code?
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

