"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { LogIn, UserPlus, User, Lock, Loader2 } from "lucide-react";
import { collection, addDoc, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (isRegister) {
        // 1. Check if username exists
        const q = query(collection(db, "users"), where("username", "==", username.toLowerCase()));
        const snap = await getDocs(q);
        if (!snap.empty) {
            setError("Username already taken");
            setLoading(false);
            return;
        }

        // 2. Create User
        await addDoc(collection(db, "users"), {
          username: username.toLowerCase(),
          password: password, // In a real app, hash this
          role: "user",
          createdAt: new Date().toISOString(),
        });
        
        // 3. Login
        await login(username, password);
      } else {
        await login(username, password);
      }
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl shadow-brand-green/10 border border-brand-green/5 p-10">
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-brand-green/10 rounded-3xl flex items-center justify-center mx-auto mb-6 text-brand-green">
            {isRegister ? <UserPlus size={40} /> : <LogIn size={40} />}
          </div>
          <h1 className="text-3xl font-black text-gray-900 mb-2 tracking-tight">
            {isRegister ? "Join MahalFamily" : "Heritage Login"}
          </h1>
          <p className="text-gray-500 font-bold">
            {isRegister ? "Create a simple username to join" : "Access your heritage dashboard"}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-sm font-bold flex items-center gap-3">
             <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="relative group">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand-green transition-colors" size={20} />
            <input
              type="text"
              placeholder="Username"
              className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-brand-green/10 focus:bg-white transition-all font-bold placeholder:text-gray-300"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="relative group">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand-green transition-colors" size={20} />
            <input
              type="password"
              placeholder="Secret Password"
              className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-brand-green/10 focus:bg-white transition-all font-bold placeholder:text-gray-300"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-brand-green text-white rounded-2xl font-black text-lg hover:bg-brand-green-light transition-all shadow-xl shadow-brand-green/20 flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" /> : (isRegister ? "Register Account" : "Sign In")}
          </button>
        </form>

        <div className="mt-8 text-center">
          <button
            onClick={() => setIsRegister(!isRegister)}
            className="text-brand-green font-black text-sm uppercase tracking-widest hover:opacity-70 transition-opacity"
          >
            {isRegister ? "Already have a username? Sign In" : "Need a new username? Register"}
          </button>
        </div>
      </div>
    </div>
  );
}
