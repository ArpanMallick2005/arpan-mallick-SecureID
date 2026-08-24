import { useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ShieldCheck, Lock, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { Button, Input } from "../components/ui";

export default function ResetPassword() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    
    const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;
    if (!passwordRegex.test(password)) {
      setError("Password must contain at least 8 characters, 1 uppercase letter, 1 number, and 1 special character.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reset password");
      
      setIsSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
      <div className="flex items-center justify-center mb-8 text-blue-600">
        <ShieldCheck className="w-10 h-10" />
        <span className="text-xl font-bold ml-2 text-slate-900">SecureID</span>
      </div>

      {isSuccess ? (
        <div className="animate-in zoom-in-95 duration-500 text-center py-6">
          <div className="mx-auto w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mb-6 text-green-500">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold mb-4">Password Reset Successful!</h2>
          <p className="text-slate-500 mb-8">
            Your password has been securely updated. You can now log in with your new credentials.
          </p>
          <Button onClick={() => navigate("/login")} className="w-full">
            Continue to Login
          </Button>
        </div>
      ) : (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-6 text-blue-600">
              <Lock className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-semibold mb-2">Set New Password</h1>
            <p className="text-slate-500 text-sm px-4">
              At least 8 characters, 1 uppercase, 1 number, and 1 special character.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Input
                label="New Password"
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="absolute right-3 top-8 text-slate-400 hover:text-slate-600"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            
            <div className="relative">
              <Input
                label="Confirm Password"
                type={showPassword ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            
            {error && <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</div>}
            
            <Button type="submit" className="w-full mt-4" isLoading={isLoading}>
              Reset Password
            </Button>
            
            <p className="text-center text-sm text-slate-500 mt-6">
              <Link to="/login" className="text-blue-600 font-medium hover:underline">
                Back to Login
              </Link>
            </p>
          </form>
        </div>
      )}
    </div>
  );
}
