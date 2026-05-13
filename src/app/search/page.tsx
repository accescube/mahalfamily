"use client";

import { useEffect, useState, Suspense } from "react";
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Search, MapPin, Users, Loader2, Home, ArrowRight, ShieldCheck, User, ExternalLink, Edit } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

interface Family {
  id: string;
  mahalName: string;
  familyName: string;
  placeName: string;
  pincode: string;
  district?: string;
  createdBy?: string;
}

interface Member {
  id: string;
  firstName: string;
  lastName: string;
  gender: string;
  district: string;
  mahalName: string;
  familyId: string;
  relation: string;
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-brand-sand"><Loader2 className="animate-spin text-brand-green" size={48} /></div>}>
      <SearchContent />
    </Suspense>
  );
}

function SearchContent() {
  const { user, isAdmin } = useAuth();
  const searchParams = useSearchParams();
  const [families, setFamilies] = useState<Family[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchMode, setSearchMode] = useState<"families" | "members">("families");

  // Search Filters State
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [selectedDistrict, setSelectedDistrict] = useState(searchParams.get("district") || "");
  const [showMahalSuggestions, setShowMahalSuggestions] = useState(false);
  const [allMahals, setAllMahals] = useState<string[]>([]);

  const districts = [
    "Alappuzha", "Ernakulam", "Idukki", "Kannur", "Kasaragod", "Kollam", 
    "Kottayam", "Kozhikode", "Malappuram", "Palakkad", "Pathanamthitta", 
    "Thiruvananthapuram", "Thrissur", "Wayanad"
  ];

  const fetchData = async () => {
    try {
      setLoading(true);
      if (searchMode === "families") {
        const q = query(
          collection(db, "families"), 
          where("isApproved", "==", true),
          limit(100)
        );
        const querySnapshot = await getDocs(q);
        const fetchedFamilies: Family[] = [];
        querySnapshot.forEach((doc) => {
          const { id: _, ...dataWithoutId } = doc.data() as Family;
          fetchedFamilies.push({ id: doc.id, ...dataWithoutId });
        });
        setFamilies(fetchedFamilies);
      } else {
        // Fetch members - limited to 100 for performance
        const q = query(collection(db, "members"), limit(100));
        const querySnapshot = await getDocs(q);
        const fetchedMembers: Member[] = [];
        querySnapshot.forEach((doc) => {
          const { id: _, ...dataWithoutId } = doc.data() as Member;
          fetchedMembers.push({ id: doc.id, ...dataWithoutId });
        });
        setMembers(fetchedMembers);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [searchMode]);

  useEffect(() => {
    const fetchMahals = async () => {
      if (selectedDistrict) {
        const q = query(collection(db, "families"), where("district", "==", selectedDistrict));
        const snap = await getDocs(q);
        const mahals = new Set<string>();
        snap.forEach(doc => {
          const data = doc.data();
          if (data.mahalName) mahals.add(data.mahalName);
        });
        setAllMahals(Array.from(mahals));
      } else {
        setAllMahals([]);
      }
    };
    fetchMahals();
  }, [selectedDistrict]);

  const filteredMahalSuggestions = allMahals.filter(m => 
    m.toLowerCase().includes(searchQuery.toLowerCase()) && m.toLowerCase() !== searchQuery.toLowerCase()
  );

  const filteredFamilies = families.filter((family) => {
    const matchesSearch = 
      (family.familyName || "").toLowerCase().includes(searchQuery.toLowerCase()) || 
      (family.placeName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (family.mahalName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (family.pincode || "").includes(searchQuery);
      
    const matchesDistrict = selectedDistrict === "" || family.district === selectedDistrict;

    return matchesSearch && matchesDistrict;
  });

  const filteredMembers = members.filter((member) => {
    const fullName = `${member.firstName || ""} ${member.lastName || ""}`.toLowerCase();
    const matchesSearch = fullName.includes(searchQuery.toLowerCase()) || 
                         (member.mahalName || "").toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesDistrict = selectedDistrict === "" || member.district === selectedDistrict;
    
    return matchesSearch && matchesDistrict;
  });

  return (
    <div className="min-h-screen bg-brand-sand py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4 tracking-tight">Community Directory</h1>
          <p className="text-gray-600 max-w-2xl mx-auto text-lg">
            Search across all 14 districts of Kerala to find connected families and community members.
          </p>
        </div>

        {/* Mode Toggle */}
        <div className="flex justify-center mb-8">
          <div className="bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100 flex gap-2">
            <button 
              onClick={() => setSearchMode("families")}
              className={`px-8 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${searchMode === 'families' ? 'bg-brand-green text-white shadow-lg shadow-brand-green/20' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <Home size={18} />
              FAMILIES
            </button>
            <button 
              onClick={() => setSearchMode("members")}
              className={`px-8 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${searchMode === 'members' ? 'bg-brand-green text-white shadow-lg shadow-brand-green/20' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <User size={18} />
              MEMBERS
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-white rounded-3xl shadow-2xl p-6 mb-10 border border-brand-green/5 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-4 text-brand-green/50" size={20} />
            <input 
              type="text" 
              placeholder={searchMode === "families" ? "Search by Family Name, Mahal, or Place..." : "Search by Member Name or Mahal..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setShowMahalSuggestions(true)}
              onBlur={() => setTimeout(() => setShowMahalSuggestions(false), 200)}
              className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-brand-green focus:border-transparent text-gray-900 font-medium"
            />
            {showMahalSuggestions && filteredMahalSuggestions.length > 0 && selectedDistrict && (
              <div className="absolute z-10 w-full mt-2 bg-white border border-gray-100 rounded-2xl shadow-xl max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-2">
                <div className="p-3 border-b border-gray-50 bg-gray-50/50">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <MapPin size={12} /> Mahals in {selectedDistrict}
                  </p>
                </div>
                {filteredMahalSuggestions.map((mahal) => (
                  <button
                    key={mahal}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setSearchQuery(mahal);
                      setShowMahalSuggestions(false);
                    }}
                    className="w-full text-left px-5 py-3 hover:bg-brand-green hover:text-white transition-all flex items-center gap-3 group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-gray-100 group-hover:bg-white/20 flex items-center justify-center text-gray-400 group-hover:text-white transition-colors">
                      <Home size={16} />
                    </div>
                    <span className="font-bold text-sm">{mahal}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          
          <div className="md:w-1/3">
            <select 
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-brand-green appearance-none text-gray-900 font-bold"
            >
              <option value="">All Districts (Kerala)</option>
              {districts.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <Loader2 className="animate-spin text-brand-green mb-4" size={48} />
            <p className="text-gray-500 font-bold tracking-widest uppercase text-xs">Accessing Directory...</p>
          </div>
        ) : (searchMode === "families" ? filteredFamilies : filteredMembers).length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-brand-sand text-brand-green/30 rounded-full mb-4">
              <Search size={40} />
            </div>
            <h3 className="text-2xl font-bold text-gray-900">No results found</h3>
            <p className="text-gray-500 mt-2">Try adjusting your filters or check the spelling.</p>
          </div>
        ) : searchMode === "families" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredFamilies.map((family) => (
              <div key={family.id} className="bg-white rounded-[2rem] p-8 shadow-sm border border-brand-green/5 hover:shadow-2xl hover:-translate-y-1 transition-all group flex flex-col h-full">
                <div className="flex items-start justify-between mb-6">
                  <div className="w-14 h-14 bg-brand-green/10 rounded-2xl flex items-center justify-center text-brand-green">
                    <Users size={28} />
                  </div>
                  <div className="flex items-center gap-1.5 bg-green-50 text-green-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter border border-green-100">
                    <ShieldCheck size={12} />
                    Verified
                  </div>
                </div>
                
                <h3 className="text-2xl font-black text-gray-900 mb-1 leading-tight">{family.familyName}</h3>
                <div className="flex items-center gap-1 text-sm font-bold text-brand-gold mb-6">
                   {family.mahalName}
                </div>
                
                <div className="mt-auto space-y-4 mb-8">
                  <div className="flex items-center gap-3 text-gray-600">
                    <div className="w-8 h-8 bg-brand-sand rounded-lg flex items-center justify-center shrink-0">
                      <MapPin size={16} className="text-brand-green" />
                    </div>
                    <div className="text-sm">
                      <p className="font-bold text-gray-900">{family.placeName}</p>
                      <p className="text-gray-400">{family.district} • {family.pincode}</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2 mt-auto">
                  <Link 
                    href={`/tree/${family.id}`} 
                    className="w-full flex items-center justify-center gap-2 py-4 bg-brand-green text-white font-bold rounded-2xl shadow-lg shadow-brand-green/20 hover:bg-brand-green/90 transition-all"
                  >
                    View Family Tree
                    <ArrowRight size={18} />
                  </Link>
                  
                  {(isAdmin || (user && family.createdBy === user.username)) && (
                    <Link 
                      href={`/family/${family.id}`} 
                      className="w-full flex items-center justify-center gap-2 py-3 bg-brand-gold/10 text-brand-gold font-bold rounded-xl border border-brand-gold/20 hover:bg-brand-gold hover:text-white transition-all text-xs tracking-widest uppercase"
                    >
                      <Edit size={14} />
                      Manage Family Data
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMembers.map((member) => (
              <div key={member.id} className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-xl transition-all flex items-center gap-4 group">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 ${member.gender === 'Male' ? 'bg-blue-50 text-blue-500' : 'bg-pink-50 text-pink-500'}`}>
                  <User size={32} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-black text-gray-900 truncate">{member.firstName} {member.lastName}</h3>
                  <p className="text-xs font-bold text-brand-gold uppercase tracking-wider mb-1">{member.mahalName || "Independent"}</p>
                  <p className="text-[10px] text-gray-400 font-bold">{member.district} • {member.relation}</p>
                </div>
                <Link 
                  href={`/family/${member.familyId}`}
                  className="p-3 bg-gray-50 text-brand-green rounded-xl hover:bg-brand-green hover:text-white transition-all shadow-sm"
                >
                  <ExternalLink size={20} />
                </Link>
              </div>
            ))}
          </div>
        )}
        
      </div>
    </div>
  );
}
