"use client";

import { useState, useEffect } from "react";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { 
  MapPin, ChevronRight, ChevronDown, Users, Home, 
  Search, Loader2, Sparkles, PlusCircle
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

const districts = [
  "Alappuzha", "Ernakulam", "Idukki", "Kannur", "Kasaragod", "Kollam", 
  "Kottayam", "Kozhikode", "Malappuram", "Palakkad", "Pathanamthitta", 
  "Thiruvananthapuram", "Thrissur", "Wayanad"
];

export default function DirectoryTree() {
  const [expandedDistricts, setExpandedDistricts] = useState<Set<string>>(new Set());
  const [expandedMahals, setExpandedMahals] = useState<Set<string>>(new Set());
  const [data, setData] = useState<Record<string, Record<string, any[]>>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState("");

  const toggleDistrict = async (district: string) => {
    const newExpanded = new Set(expandedDistricts);
    if (newExpanded.has(district)) {
      newExpanded.delete(district);
    } else {
      newExpanded.add(district);
      if (!data[district]) {
        fetchMahals(district);
      }
    }
    setExpandedDistricts(newExpanded);
  };

  const toggleMahal = (district: string, mahal: string) => {
    const key = `${district}-${mahal}`;
    const newExpanded = new Set(expandedMahals);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedMahals(newExpanded);
  };

  const fetchMahals = async (district: string) => {
    setLoading(prev => ({ ...prev, [district]: true }));
    try {
      const q = query(
        collection(db, "families"), 
        where("district", "==", district),
        where("isApproved", "==", true)
      );
      const snap = await getDocs(q);
      const mahals: Record<string, any[]> = {};
      
      snap.docs.forEach(doc => {
        const familyData = doc.data() as { mahalName: string; familyName: string };
        const family = { id: doc.id, ...familyData };
        const mName = family.mahalName || "Unknown Mahal";
        if (!mahals[mName]) mahals[mName] = [];
        mahals[mName].push(family);
      });

      setData(prev => ({ ...prev, [district]: mahals }));
    } catch (err) {
      console.error("Error fetching mahals:", err);
    } finally {
      setLoading(prev => ({ ...prev, [district]: false }));
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="bg-white rounded-[3rem] shadow-2xl border border-brand-green/5 overflow-hidden">
        {/* Header */}
        <div className="bg-brand-green p-10 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-10 rotate-12">
                <Users size={180} />
            </div>
            <div className="relative z-10">
                <h2 className="text-3xl font-black mb-2 flex items-center gap-3">
                    <Sparkles className="text-brand-gold animate-pulse" />
                    Heritage Explorer
                </h2>
                <p className="text-white/70 font-bold max-w-md">
                    Navigate through Kerala's district and mahal heritage to find your family roots.
                </p>
                
                <div className="mt-8 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50" size={20} />
                    <input 
                        type="text" 
                        placeholder="Search for a family or mahal..."
                        className="w-full pl-12 pr-4 py-4 bg-white/10 border border-white/20 rounded-2xl focus:outline-none focus:ring-4 focus:ring-brand-gold/30 placeholder:text-white/30 font-bold transition-all"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>
        </div>

        {/* Tree Content */}
        <div className="p-8 max-h-[600px] overflow-y-auto custom-scrollbar">
            {districts.map(district => (
                <div key={district} className="mb-4 last:mb-0">
                    <button 
                        onClick={() => toggleDistrict(district)}
                        className={`w-full flex items-center justify-between p-5 rounded-2xl transition-all duration-300 ${expandedDistricts.has(district) ? 'bg-brand-sand/50 text-brand-green border border-brand-green/10' : 'hover:bg-gray-50 text-gray-700'}`}
                    >
                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-xl ${expandedDistricts.has(district) ? 'bg-brand-green text-white' : 'bg-gray-100 text-gray-400'}`}>
                                <MapPin size={20} />
                            </div>
                            <span className="text-lg font-black tracking-tight">{district}</span>
                        </div>
                        {loading[district] ? (
                            <Loader2 className="animate-spin text-brand-green" size={20} />
                        ) : (
                            expandedDistricts.has(district) ? <ChevronDown size={20} /> : <ChevronRight size={20} />
                        )}
                    </button>

                    <AnimatePresence>
                        {expandedDistricts.has(district) && data[district] && (
                            <motion.div 
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="ml-8 mt-2 space-y-2 border-l-2 border-brand-green/5 pl-4"
                            >
                                {Object.keys(data[district]).length === 0 ? (
                                    <p className="text-gray-400 font-bold text-sm py-4 italic">No verified records found in this district.</p>
                                ) : (
                                    Object.entries(data[district]).map(([mahal, families]) => (
                                        <div key={mahal} className="rounded-xl overflow-hidden">
                                            <button 
                                                onClick={() => toggleMahal(district, mahal)}
                                                className={`w-full flex items-center justify-between p-4 rounded-xl transition-all ${expandedMahals.has(`${district}-${mahal}`) ? 'bg-brand-gold/10 text-brand-gold' : 'hover:bg-gray-50 text-gray-500'}`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <Home size={18} />
                                                    <span className="font-bold text-sm uppercase tracking-widest">{mahal}</span>
                                                    <span className="text-[10px] bg-white px-2 py-0.5 rounded-full border border-gray-100 shadow-sm">{families.length}</span>
                                                </div>
                                                {expandedMahals.has(`${district}-${mahal}`) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                            </button>

                                            <AnimatePresence>
                                                {expandedMahals.has(`${district}-${mahal}`) && (
                                                    <motion.div 
                                                        initial={{ opacity: 0, x: -10 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        exit={{ opacity: 0, x: -10 }}
                                                        className="ml-6 mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2"
                                                    >
                                                        {families.map(family => (
                                                            <Link 
                                                                key={family.id}
                                                                href={`/tree/${family.id}`}
                                                                className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl hover:border-brand-green hover:shadow-xl hover:-translate-y-1 transition-all group"
                                                            >
                                                                <div>
                                                                    <p className="font-black text-gray-900 group-hover:text-brand-green">{family.familyName}</p>
                                                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">View Heritage Tree</p>
                                                                </div>
                                                                <ChevronRight size={16} className="text-gray-300 group-hover:text-brand-green" />
                                                            </Link>
                                                        ))}
                                                        <Link 
                                                            href="/add-family"
                                                            className="flex items-center gap-2 p-4 border-2 border-dashed border-gray-100 rounded-2xl text-gray-400 hover:border-brand-gold hover:text-brand-gold transition-all"
                                                        >
                                                            <PlusCircle size={18} />
                                                            <span className="text-xs font-bold uppercase">Add New Family</span>
                                                        </Link>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    ))
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            ))}
        </div>

        {/* Footer */}
        <div className="p-8 bg-gray-50/50 border-t border-gray-100 text-center">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                Data is verified by local mahal administrators
            </p>
        </div>
      </div>
    </div>
  );
}
