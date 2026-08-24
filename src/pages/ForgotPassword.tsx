import { useState } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, Mail } from "lucide-react";
import { Button, Input } from "../components/ui";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [demoLink, setDemoLink] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccessMsg("");
    setDemoLink("");

    try {
      const res = await fetch("/api/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to process request");
      
      setSuccessMsg(data.message || "A password reset link has been sent to your email.");
      
      // For demo purposes, we will display the link if a token is returned
      if (data.resetToken) {
        setDemoLink(`/reset-password/${data.resetToken}`);
      }
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

      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-6 text-blue-600">
            <Mail className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-semibold mb-2">Forgot Password?</h1>
          <p className="text-slate-500 text-sm px-4">
            No worries, we'll send you reset instructions.
          </p>
        </div>

        {successMsg ? (
          <div className="text-center">
            <div className="bg-green-50 text-green-700 p-4 rounded-xl text-sm mb-6">
              {successMsg}
            </div>
            {demoLink && (
              <div className="mb-6 p-4 border border-blue-200 bg-blue-50 rounded-xl text-left">
                <p className="text-xs text-blue-800 font-semibold mb-2 uppercase tracking-wider">Demo Link (Simulated Email)</p>
                <Link to={demoLink} className="text-blue-600 hover:underline break-all text-sm font-medium">
                  {window.location.origin}{demoLink}
                </Link>
              </div>
            )}
            <Link to="/login">
              <Button className="w-full">Back to Login</Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email"
              type="email"
              placeholder="john@example.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
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
        )}
      </div>
    </div>
  );
}
