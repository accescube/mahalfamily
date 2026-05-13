"use client";

import Link from "next/link";
import { Search, UserPlus, Menu, X, Users } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

import { useAuth } from "@/context/AuthContext";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const { user, isAdmin, logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  return (
    <nav className="fixed w-full z-50 bg-white/80 backdrop-blur-md border-b border-brand-green/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20 items-center">
          <div className="flex items-center gap-2">
            <div className="bg-brand-green p-2 rounded-lg text-brand-gold">
              <Users size={28} />
            </div>
            <Link href="/" className="text-2xl font-bold text-brand-green tracking-tight">
              Mahal<span className="text-brand-gold">Family</span>
            </Link>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-8">
            <Link href="/search" className="text-gray-700 hover:text-brand-green transition-colors font-medium flex items-center gap-2">
              <Search size={18} />
              Search
            </Link>
            <Link href="/add-family" className="text-gray-700 hover:text-brand-green transition-colors font-medium flex items-center gap-2">
              <UserPlus size={18} />
              Add Family
            </Link>
            {user ? (
              <div className="flex items-center gap-4">
                <Link href="/dashboard" className="text-gray-700 hover:text-brand-green transition-colors font-medium">
                  {isAdmin ? "Admin Panel" : "My Dashboard"}
                </Link>
                <button 
                  onClick={handleLogout}
                  className="px-6 py-2.5 bg-red-500 text-white rounded-full font-medium hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
                >
                  Logout
                </button>
              </div>
            ) : (
              <Link href="/login" className="px-6 py-2.5 bg-brand-green text-white rounded-full font-medium hover:bg-brand-green-light transition-all shadow-lg shadow-brand-green/20">
                Login
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-brand-green p-2"
            >
              {isOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-t border-brand-green/10"
          >
            <div className="px-4 pt-2 pb-6 space-y-2">
              <Link href="/search" className="block px-4 py-3 text-gray-700 hover:bg-brand-sand rounded-xl font-medium">
                Search Directory
              </Link>
              <Link href="/add-family" className="block px-4 py-3 text-gray-700 hover:bg-brand-sand rounded-xl font-medium">
                Add Family
              </Link>
              <div className="pt-4">
                <Link href="/dashboard" className="block text-center px-4 py-3 bg-brand-green text-white rounded-xl font-medium shadow-md">
                  Admin Login
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
