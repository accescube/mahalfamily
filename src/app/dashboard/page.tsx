"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { collection, query, where, getDocs, doc, updateDoc, writeBatch, limit, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { 
  Users, FileText, CheckCircle, Clock, Search, LayoutDashboard, 
  Database, UserCheck, Trash2, Edit, Loader2, ShieldCheck, 
  RefreshCw, MapPin, ChevronRight, XCircle
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const { user, isAdmin, isApprover, loading: authLoading, logout } = useAuth();
  const [families, setFamilies] = useState<any[]>([]);
  const [pendingFamilies, setPendingFamilies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, pending: 0, members: 0 });
  const [activeTab, setActiveTab] = useState("overview");
  const [isSyncing, setIsSyncing] = useState(false);
  const router = useRouter();

  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [selectedFamilies, setSelectedFamilies] = useState<string[]>([]);
  const [migrationTarget, setMigrationTarget] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
        setLoading(false);
        return;
    }

    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        // 1. Fetch Families
        let familiesQ;
        if (isAdmin) {
          familiesQ = query(collection(db, "families"), limit(200));
        } else {
          familiesQ = query(collection(db, "families"), where("createdBy", "==", user.id));
        }
        const familiesSnap = await getDocs(familiesQ);
        const fetchedFamilies = familiesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setFamilies(fetchedFamilies);

        // 2. Fetch Users (if Admin)
        if (isAdmin) {
          const usersSnap = await getDocs(collection(db, "users"));
          setAllUsers(usersSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        }

        // 3. Pending Queue
        if (isApprover) {
          const pendingQ = query(collection(db, "families"), where("isApproved", "==", false));
          const pendingSnap = await getDocs(pendingQ);
          setPendingFamilies(pendingSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        }

        setStats({
          total: fetchedFamilies.length,
          pending: fetchedFamilies.filter((f: any) => !f.isApproved).length,
          members: 0,
        });

      } catch (err) {
        console.error("Dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user, authLoading, isAdmin, isApprover]);

  const handleApprove = async (familyId: string) => {
    try {
      await updateDoc(doc(db, "families", familyId), { isApproved: true });
      setPendingFamilies(prev => prev.filter(f => f.id !== familyId));
      setFamilies(prev => prev.map(f => f.id === familyId ? { ...f, isApproved: true } : f));
    } catch (err) {
      alert("Approval failed");
    }
  };

  const handleMigrationSubmit = async () => {
    if (!isAdmin || !migrationTarget || selectedFamilies.length === 0) {
      alert("Please select a target user and at least one family.");
      return;
    }

    const targetUser = allUsers.find(u => u.id === migrationTarget);
    if (!targetUser) return;

    try {
      setIsSyncing(true);
      const batch = writeBatch(db);
      selectedFamilies.forEach(fId => {
        batch.update(doc(db, "families", fId), {
          createdBy: targetUser.id,
          ownerEmail: targetUser.username,
          isApproved: true
        });
      });
      await batch.commit();
      alert(`Successfully assigned ${selectedFamilies.length} families to ${targetUser.username}.`);
      setSelectedFamilies([]);
      window.location.reload();
    } catch (err) {
      console.error("Migration error:", err);
      alert("Assignment failed.");
    } finally {
      setIsSyncing(false);
    }
  };

  if (authLoading || loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-brand-sand">
      <Loader2 className="animate-spin text-brand-green mb-4" size={48} />
      <p className="text-brand-green font-bold animate-pulse">Loading Dashboard...</p>
    </div>
  );

  if (!user) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-10">
        <div className="w-24 h-24 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6">
            <ShieldCheck size={48} />
        </div>
        <h1 className="text-3xl font-black text-gray-900 mb-2">Access Restricted</h1>
        <p className="mb-8 text-gray-500 font-medium text-center max-w-md">Please sign in with your administrative or user account to access the MahalFamily management console.</p>
        <Link href="/login" className="px-10 py-4 bg-brand-green text-white rounded-2xl font-black text-lg shadow-xl shadow-brand-green/20 hover:scale-105 transition-all">Go to Login</Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="bg-brand-green rounded-[3rem] p-10 mb-10 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-10 opacity-10"><LayoutDashboard size={200} /></div>
        <div className="relative z-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black tracking-tight">
                        Welcome, <span className="text-brand-gold">{user?.username}</span>
                    </h1>
                    <div className="flex items-center gap-3 mt-3">
                        <span className="px-4 py-1 bg-white/10 text-brand-gold rounded-full text-xs font-black uppercase tracking-widest border border-white/10">
                            {user?.role || 'Member'}
                        </span>
                        <span className="text-white/50 font-bold text-sm">| Heritage Management Console</span>
                    </div>
                </div>
                
                {isAdmin && (
                <div className="flex items-center gap-3 px-6 py-3 bg-white/10 text-brand-gold rounded-2xl border border-white/10 font-bold text-sm">
                    <ShieldCheck size={18} />
                    Administrative Mode Active
                </div>
                )}
            </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl shadow-brand-green/5 border border-brand-green/5">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-4 bg-brand-green/10 text-brand-green rounded-3xl"><Users size={28} /></div>
            <p className="font-black text-gray-400 uppercase tracking-widest text-xs">Total Records</p>
          </div>
          <p className="text-5xl font-black text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl shadow-brand-gold/5 border border-brand-gold/5">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-4 bg-brand-gold/10 text-brand-gold rounded-3xl"><Clock size={28} /></div>
            <p className="font-black text-gray-400 uppercase tracking-widest text-xs">Awaiting Approval</p>
          </div>
          <p className="text-5xl font-black text-gray-900">{stats.pending}</p>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl shadow-brand-green/5 border border-brand-green/5">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-4 bg-brand-green/10 text-brand-green rounded-3xl"><UserCheck size={28} /></div>
            <p className="font-black text-gray-400 uppercase tracking-widest text-xs">Verified Families</p>
          </div>
          <p className="text-5xl font-black text-gray-900">{stats.total - stats.pending}</p>
        </div>
      </div>

      {/* Control Tabs */}
      <div className="bg-white rounded-[3rem] shadow-2xl shadow-brand-green/5 border border-brand-green/5 overflow-hidden">
        <div className="flex bg-gray-50/50 p-2 border-b border-gray-100">
          <button 
            onClick={() => setActiveTab("overview")}
            className={`flex-1 md:flex-none px-10 py-5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'overview' ? 'bg-white text-brand-green shadow-xl shadow-brand-green/5 border border-brand-green/5' : 'text-gray-400 hover:text-gray-600'}`}
          >
            My Directory
          </button>
          {isApprover && (
            <button 
              onClick={() => setActiveTab("approvals")}
              className={`flex-1 md:flex-none px-10 py-5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'approvals' ? 'bg-white text-brand-green shadow-xl shadow-brand-green/5 border border-brand-green/5' : 'text-gray-400 hover:text-gray-600'}`}
            >
              Approval Queue ({pendingFamilies.length})
            </button>
          )}
          {isAdmin && (
            <button 
              onClick={() => setActiveTab("migration")}
              className={`flex-1 md:flex-none px-10 py-5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'migration' ? 'bg-white text-brand-green shadow-xl shadow-brand-green/5 border border-brand-green/5' : 'text-gray-400 hover:text-gray-600'}`}
            >
              Migration Console
            </button>
          )}
        </div>

        <div className="p-10">
          {activeTab === "overview" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {families.length === 0 ? (
                <div className="col-span-full text-center py-24 opacity-20">
                  <FileText size={80} className="mx-auto mb-6" />
                  <p className="text-2xl font-black">Directory is empty</p>
                  <Link href="/add-family" className="text-brand-green hover:underline mt-4 block">Register your first family</Link>
                </div>
              ) : (
                families.map((f) => (
                  <div key={f.id} className="group p-8 bg-gray-50/50 rounded-[2.5rem] border border-gray-100 hover:border-brand-green/20 hover:bg-white hover:shadow-2xl transition-all duration-500 flex flex-col sm:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-6">
                      <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center text-brand-green shadow-sm group-hover:bg-brand-green group-hover:text-white transition-all duration-500">
                        <Users size={36} />
                      </div>
                      <div>
                        <h3 className="text-2xl font-black text-gray-900 group-hover:text-brand-green transition-colors">{f.familyName}</h3>
                        <div className="flex flex-wrap items-center gap-3 mt-2">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${f.isApproved ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'}`}>
                            {f.isApproved ? 'Verified' : 'Pending Approval'}
                          </span>
                          <span className="flex items-center gap-1 text-gray-400 text-xs font-bold bg-white px-2 py-1 rounded-lg border border-gray-100">
                            <MapPin size={12} /> {f.mahalName}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                       <Link href={`/family/${f.id}`} className="p-4 bg-white text-brand-green rounded-2xl hover:bg-brand-green hover:text-white transition-all shadow-sm border border-gray-100 group-hover:border-transparent">
                         <Edit size={20} />
                       </Link>
                       <Link href={`/tree/${f.id}`} className="p-4 bg-white text-brand-gold rounded-2xl hover:bg-brand-gold hover:text-white transition-all shadow-sm border border-gray-100 group-hover:border-transparent">
                         <LayoutDashboard size={20} />
                       </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : activeTab === "approvals" ? (
            <div className="space-y-8">
              {pendingFamilies.length === 0 ? (
                <div className="text-center py-24 opacity-20">
                  <CheckCircle size={80} className="mx-auto mb-6" />
                  <p className="text-2xl font-black">All requests have been verified</p>
                </div>
              ) : (
                pendingFamilies.map((f) => (
                  <div key={f.id} className="p-8 bg-yellow-50/30 rounded-[3rem] border border-yellow-100/50 flex flex-col md:flex-row items-center justify-between gap-8">
                     <div className="flex items-center gap-8">
                        <div className="w-24 h-24 bg-white rounded-[2rem] flex items-center justify-center text-yellow-500 shadow-xl shadow-yellow-500/10 border border-yellow-50">
                          <Clock size={40} />
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-yellow-600 mb-2">New Verification Request</p>
                          <h3 className="text-3xl font-black text-gray-900">{f.familyName}</h3>
                          <div className="flex items-center gap-4 mt-2">
                             <span className="text-gray-500 font-bold flex items-center gap-2"><Users size={14} /> {f.ownerEmail || 'Legacy Entry'}</span>
                             <span className="text-gray-300">|</span>
                             <span className="text-gray-500 font-bold flex items-center gap-2"><MapPin size={14} /> {f.mahalName}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-4 w-full md:w-auto">
                        <button 
                            onClick={() => handleApprove(f.id)}
                            className="flex-1 md:flex-none px-12 py-5 bg-brand-green text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-brand-green-light transition-all shadow-2xl shadow-brand-green/20"
                        >
                            Approve
                        </button>
                        <button 
                            className="p-5 bg-white text-red-500 rounded-2xl border border-red-50 hover:bg-red-500 hover:text-white transition-all shadow-sm"
                        >
                            <Trash2 size={24} />
                        </button>
                      </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-10">
                <div className="bg-brand-green/5 p-8 rounded-[2.5rem] border border-brand-green/10">
                    <h3 className="text-xl font-black mb-6 flex items-center gap-3">
                        <UserCheck className="text-brand-green" /> 1. Select Destination User
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <select 
                            value={migrationTarget}
                            onChange={(e) => setMigrationTarget(e.target.value)}
                            className="w-full px-6 py-4 bg-white border border-gray-200 rounded-2xl font-bold focus:ring-4 focus:ring-brand-green/10"
                        >
                            <option value="">Select a User...</option>
                            {allUsers.map(u => (
                                <option key={u.id} value={u.id}>{u.username} ({u.role})</option>
                            ))}
                        </select>
                        <div className="flex items-center gap-3 text-sm font-bold text-gray-400 bg-white/50 px-6 py-4 rounded-2xl border border-dashed border-gray-200">
                            <ShieldCheck size={18} />
                            All selected data will be transferred to this user.
                        </div>
                    </div>
                </div>

                <div>
                    <h3 className="text-xl font-black mb-6 flex items-center gap-3">
                        <Database className="text-brand-gold" /> 2. Select Families to Assign
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {families.map(f => (
                            <label key={f.id} className={`flex items-center gap-4 p-5 rounded-2xl border transition-all cursor-pointer ${selectedFamilies.includes(f.id) ? 'bg-brand-green/5 border-brand-green ring-2 ring-brand-green/10' : 'bg-white border-gray-100 hover:border-gray-300'}`}>
                                <input 
                                    type="checkbox"
                                    checked={selectedFamilies.includes(f.id)}
                                    onChange={(e) => {
                                        if (e.target.checked) setSelectedFamilies([...selectedFamilies, f.id]);
                                        else setSelectedFamilies(selectedFamilies.filter(id => id !== f.id));
                                    }}
                                    className="w-6 h-6 rounded-lg accent-brand-green"
                                />
                                <div className="flex-1">
                                    <p className="font-black text-gray-900">{f.familyName}</p>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{f.mahalName} • Owned by: {f.ownerEmail || 'None'}</p>
                                </div>
                            </label>
                        ))}
                    </div>
                </div>

                <div className="pt-6 border-t border-gray-100">
                    <button 
                        onClick={handleMigrationSubmit}
                        disabled={isSyncing || !migrationTarget || selectedFamilies.length === 0}
                        className="w-full md:w-auto px-12 py-5 bg-brand-green text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:scale-105 transition-all shadow-2xl shadow-brand-green/20 disabled:opacity-30 disabled:hover:scale-100"
                    >
                        {isSyncing ? "Processing Transfer..." : `Transfer ${selectedFamilies.length} Families`}
                    </button>
                </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
