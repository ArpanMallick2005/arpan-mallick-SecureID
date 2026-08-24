import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, User as UserIcon, ShieldAlert, ShieldCheck } from "lucide-react";
import { googleLogout } from "@react-oauth/google";
import { Button } from "../components/ui";

interface User {
  id: string;
  name: string;
  email: string;
  mobile: string;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [jwtData, setJwtData] = useState<any>(null);
  const [jwtError, setJwtError] = useState("");
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    fetchUser();
    
    if (sessionStorage.getItem("justLoggedIn") === "true") {
      setShowWelcome(true);
      sessionStorage.removeItem("justLoggedIn");
    }
  }, []);

  const fetchUser = async () => {
    try {
      const res = await fetch("/api/me");
      if (!res.ok) throw new Error("Not authenticated");
      const data = await res.json();
      setUser(data);
    } catch (err) {
      navigate("/login");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/logout", { method: "POST" });
    googleLogout();
    setUser(null);
    setJwtData(null);
    navigate("/login");
  };

  const testJWTFlow = async () => {
    setJwtError("");
    setJwtData(null);
    try {
      // 1. Get Token
      const tokenRes = await fetch("/api/token", { method: "POST" });
      if (!tokenRes.ok) throw new Error("Failed to get JWT");
      const { token } = await tokenRes.json();

      // 2. Fetch Protected Data
      const protectedRes = await fetch("/api/protected", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (!protectedRes.ok) throw new Error("Failed to access protected route");
      const data = await protectedRes.json();
      setJwtData(data);
    } catch (err: any) {
      setJwtError(err.message);
    }
  };

  if (loading) {
    return <div className="animate-pulse flex space-x-4">Loading...</div>;
  }

  return (
    <div className="w-full max-w-2xl bg-white p-8 rounded-2xl shadow-sm border border-slate-100 animate-in fade-in zoom-in-95 duration-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Button variant="outline" onClick={handleLogout} className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 w-full sm:w-auto">
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </Button>
      </div>

      {showWelcome && user && (
        <div className="mb-8 p-4 bg-green-50 border border-green-200 text-green-800 rounded-xl flex items-center justify-between animate-in fade-in slide-in-from-top-4 duration-500">
          <span className="font-medium">Welcome back {user.name} !</span>
          <button onClick={() => setShowWelcome(false)} className="text-green-600 hover:text-green-900 focus:outline-none">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
      )}

      {user && (
        <div className="bg-slate-50 rounded-xl p-6 mb-8 border border-slate-100 flex items-start gap-4">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center shrink-0">
            <UserIcon className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-semibold mb-1">{user.name}</h2>
            <p className="text-slate-500 text-sm mb-1">{user.email}</p>
            <p className="text-slate-500 text-sm">{user.mobile}</p>
            <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              MFA Enabled
            </div>
          </div>
        </div>
      )}

      <div className="border-t border-slate-100 pt-8">
        <h3 className="text-lg font-semibold mb-2">JWT Authentication Test</h3>
        <p className="text-sm text-slate-500 mb-4">
          Click the button below to exchange your session cookie for a short-lived JWT and access a protected API route.
        </p>
        <Button onClick={testJWTFlow} variant="secondary">
          Test Protected Route
        </Button>

        {jwtData && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-800">
            <div className="font-semibold mb-1 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-600" /> Success!
            </div>
            <p>{jwtData.message}</p>
            <pre className="mt-2 text-xs bg-white p-2 rounded border border-blue-100 overflow-x-auto">
              {JSON.stringify(jwtData.user, null, 2)}
            </pre>
          </div>
        )}

        {jwtError && (
          <div className="mt-4 p-4 bg-red-50 border border-red-100 rounded-lg text-sm text-red-800">
             <div className="font-semibold mb-1 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-600" /> Error
            </div>
            <p>{jwtError}</p>
          </div>
        )}
      </div>
    </div>
  );
}
