"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface AuthContextType {
  user: any | null; // This will store the user document data
  loading: boolean;
  isAdmin: boolean;
  isApprover: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAdmin: false,
  isApprover: false,
  login: async () => {},
  logout: () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      const savedUser = localStorage.getItem("mahal_user");
      if (savedUser) {
        const userData = JSON.parse(savedUser);
        // Verify session still exists in DB
        const userDoc = await getDoc(doc(db, "users", userData.id));
        if (userDoc.exists()) {
          setUser({ id: userDoc.id, ...userDoc.data() });
        } else {
          localStorage.removeItem("mahal_user");
        }
      }
      setLoading(false);
    };
    checkSession();
  }, []);

  const login = async (username: string, password: string) => {
    const q = query(collection(db, "users"), where("username", "==", username.toLowerCase()));
    const snap = await getDocs(q);
    
    if (snap.empty) throw new Error("User not found");
    
    const userData = { id: snap.docs[0].id, ...snap.docs[0].data() } as any;
    
    if (userData.password !== password) throw new Error("Incorrect password");
    
    setUser(userData);
    localStorage.setItem("mahal_user", JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("mahal_user");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAdmin: user?.role === "admin",
        isApprover: user?.role === "approver" || user?.role === "admin",
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
