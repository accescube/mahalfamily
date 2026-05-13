"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { 
  Users, MapPin, ArrowLeft, User, Heart, ChevronRight, 
  ShieldCheck, Share2, Download, Printer, Settings, ExternalLink,
  Loader2, Edit, Plus, X, Baby, Check
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { addDoc, serverTimestamp, updateDoc } from "firebase/firestore";

interface Family {
  id: string;
  familyName: string;
  mahalName: string;
  district: string;
  createdBy?: string;
  isGrandFamily?: boolean;
  grandFamilyId?: string;
}

interface Member {
  id: string;
  firstName: string;
  lastName: string;
  relation: string;
  gender: string;
  parentId?: string;
  familyId: string;
  dob?: string;
  maritalStatus?: string;
}

interface Marriage {
  id: string;
  husbandId: string;
  wifeId: string;
}

export default function FamilyTreePage() {
  const { id: familyId } = useParams() as { id: string };
  const { user, isAdmin } = useAuth();
  const router = useRouter();
  const [family, setFamily] = useState<Family | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [marriages, setMarriages] = useState<Marriage[]>([]);
  const [rootFather, setRootFather] = useState<Member | null>(null);
  const [rootMother, setRootMother] = useState<Member | null>(null);
  const [allMembersMap, setAllMembersMap] = useState<Map<string, Member>>(new Map());

  // Graphical Builder State
  const [isBuilderMode, setIsBuilderMode] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalType, setModalType] = useState<"child" | "spouse" | null>(null);
  const [modalTarget, setModalTarget] = useState<Member | null>(null);
  const [formData, setFormData] = useState({ firstName: "", lastName: "", gender: "Male", dob: "" });

  const fetchData = async () => {
    try {
      setLoading(true);
      // 1. Fetch Family
      const familyDoc = await getDoc(doc(db, "families", familyId));
      if (!familyDoc.exists()) return;
      const familyData = { id: familyDoc.id, ...familyDoc.data() } as Family;
      setFamily(familyData);

      // 2. Cluster Fetching (Exhaustive)
      const fetchClusterMembers = async (targetFam: Family) => {
        let familyIds = [targetFam.id];
        
        if (targetFam.grandFamilyId) {
           familyIds.push(targetFam.grandFamilyId);
           const subQ = query(collection(db, "families"), where("grandFamilyId", "==", targetFam.grandFamilyId));
           const subSnap = await getDocs(subQ);
           subSnap.forEach(d => { if(!familyIds.includes(d.id)) familyIds.push(d.id); });
        } 
        else if (targetFam.isGrandFamily) {
           const subQ = query(collection(db, "families"), where("grandFamilyId", "==", targetFam.id));
           const subSnap = await getDocs(subQ);
           subSnap.forEach(d => { if(!familyIds.includes(d.id)) familyIds.push(d.id); });
        }

        let clusterMembers: Member[] = [];
        for (let i = 0; i < familyIds.length; i += 10) {
          const chunk = familyIds.slice(i, i + 10);
          const q = query(collection(db, "members"), where("familyId", "in", chunk));
          const snap = await getDocs(q);
          snap.forEach(d => {
            const m = { id: d.id, ...d.data() } as Member;
            if (!clusterMembers.find(ex => ex.id === m.id)) {
                clusterMembers.push(m);
            }
          });
        }

        const knownParentIds = clusterMembers.filter(m => m.parentId).map(m => m.parentId!);
        const missingParentIds = knownParentIds.filter(id => !clusterMembers.find(m => m.id === id));
        
        if (missingParentIds.length > 0) {
          for (let i = 0; i < missingParentIds.length; i += 30) {
              const chunk = missingParentIds.slice(i, i + 30);
              const pq = query(collection(db, "members"), where("__name__", "in", chunk));
              const pSnap = await getDocs(pq);
              pSnap.forEach(d => {
                const m = { id: d.id, ...d.data() } as Member;
                if (!clusterMembers.find(ex => ex.id === m.id)) {
                    clusterMembers.push(m);
                }
              });
          }
        }

        return clusterMembers;
      };

      const allFetchedMembers = await fetchClusterMembers(familyData);
      
      const primaryFamilyRoots = allFetchedMembers.filter(m => m.familyId === familyId && (m.relation === 'Father/Head' || m.relation === 'Mother'));
      
      let rootFatherNode = primaryFamilyRoots.find(m => m.relation === 'Father/Head');
      let rootMotherNode = primaryFamilyRoots.find(m => m.relation === 'Mother');

      if (!rootFatherNode && !rootMotherNode) {
          rootFatherNode = allFetchedMembers.find(m => m.relation === 'Father/Head');
          rootMotherNode = allFetchedMembers.find(m => m.relation === 'Mother');
      }
      
      let primaryRoot = rootFatherNode || rootMotherNode;

      if (!primaryRoot) {
        const roots = allFetchedMembers.filter(m => !m.parentId);
        let maxDescendants = -1;
        roots.forEach(r => {
          const count = allFetchedMembers.filter(m => m.parentId === r.id).length;
          if (count > maxDescendants) {
              maxDescendants = count;
              primaryRoot = r;
          }
        });
      }

      const rootId = rootFatherNode?.id || rootMotherNode?.id || primaryRoot?.id;

      const fixedMembers = allFetchedMembers.map(m => {
         if (m.id !== rootId && !m.parentId) {
             const isHead = m.relation === 'Father/Head' || m.relation === 'Mother';
             const localHead = !isHead && allFetchedMembers.find(lh => 
               lh.familyId === m.familyId && 
               lh.id !== m.id && 
               (lh.relation === 'Father/Head' || lh.relation === 'Mother')
             );

             if (localHead) {
               return { ...m, parentId: localHead.id };
             }

             const isDescendant = m.relation === 'Son/Daughter' || 
                                 m.relation === 'Grandchild' || 
                                 m.relation === 'Great-Grandchild' || 
                                 m.relation === 'Great-Great-Grandchild';

             if (rootId && isDescendant) {
                 return { ...m, parentId: rootId };
             }
         }
         return m;
      });

      setMembers(fixedMembers);

      const allIds = fixedMembers.map(m => m.id);
      const marriagesList: Marriage[] = [];
      const fullMembersList: Member[] = [...allFetchedMembers];

      if (allIds.length > 0) {
        for (let i = 0; i < allIds.length; i += 30) {
          const chunk = allIds.slice(i, i + 30);
          const m1 = query(collection(db, "marriages"), where("husbandId", "in", chunk));
          const m2 = query(collection(db, "marriages"), where("wifeId", "in", chunk));
          const [s1, s2] = await Promise.all([getDocs(m1), getDocs(m2)]);
          
          s1.docs.forEach(d => {
            const data = d.data() as Marriage;
            if (data.husbandId !== data.wifeId) marriagesList.push({ id: d.id, ...data });
          });
          s2.docs.forEach(d => {
            const data = d.data() as Marriage;
            if (data.husbandId !== data.wifeId && !marriagesList.find(m => m.id === d.id)) {
                marriagesList.push({ id: d.id, ...data });
            }
          });
        }
      }

      const uniqueMarriages: Marriage[] = [];
      const seenCouples = new Set();
      marriagesList.forEach(m => {
        const coupleId = [m.husbandId, m.wifeId].sort().join("-");
        if (!seenCouples.has(coupleId)) {
          seenCouples.add(coupleId);
          uniqueMarriages.push(m);
        }
      });
      setMarriages(uniqueMarriages);

      let finalRootFather = rootFatherNode;
      let finalRootMother = rootMotherNode;

      const findSpouseInList = (id: string) => {
        const m = uniqueMarriages.find(x => x.husbandId === id || x.wifeId === id);
        if (!m) return null;
        const spouseId = m.husbandId === id ? m.wifeId : m.husbandId;
        return allFetchedMembers.find(fm => fm.id === spouseId) || null;
      };

      if (finalRootMother && !finalRootFather) {
         finalRootFather = findSpouseInList(finalRootMother.id);
      } else if (finalRootFather && !finalRootMother) {
         finalRootMother = findSpouseInList(finalRootFather.id);
      }

      setRootFather(finalRootFather || (primaryRoot?.relation !== 'Mother' ? primaryRoot || null : null));
      setRootMother(finalRootMother || (primaryRoot?.relation === 'Mother' ? primaryRoot || null : null));

      const spouseIds = new Set<string>();
      marriagesList.forEach(m => {
        if (!allIds.includes(m.husbandId)) spouseIds.add(m.husbandId);
        if (!allIds.includes(m.wifeId)) spouseIds.add(m.wifeId);
      });

      if (spouseIds.size > 0) {
        const spouseArray = Array.from(spouseIds);
        for (let i = 0; i < spouseArray.length; i += 30) {
          const chunk = spouseArray.slice(i, i + 30);
          const sq = query(collection(db, "members"), where("__name__", "in", chunk));
          const sSnap = await getDocs(sq);
          sSnap.docs.forEach(d => fullMembersList.push({ id: d.id, ...d.data() } as Member));
        }
      }

      const finalMap = new Map();
      fixedMembers.forEach(m => finalMap.set(m.id, m));
      fullMembersList.forEach(m => {
        if (!finalMap.has(m.id)) finalMap.set(m.id, m);
      });
      setAllMembersMap(finalMap);

    } catch (err) {
      console.error("Error fetching family tree:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [familyId]);

  const handleAddMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!family || !modalTarget || !modalType) return;
    setIsSubmitting(true);
    try {
      if (modalType === "spouse") {
        const spouseGender = modalTarget.gender === "Male" ? "Female" : "Male";
        const spouseDoc = await addDoc(collection(db, "members"), {
          ...formData,
          gender: spouseGender,
          relation: "Spouse",
          familyId: modalTarget.familyId,
          district: family.district,
          mahalName: family.mahalName,
          maritalStatus: "Married",
          createdAt: serverTimestamp(),
        });
        
        await addDoc(collection(db, "marriages"), {
          husbandId: modalTarget.gender === "Male" ? modalTarget.id : spouseDoc.id,
          wifeId: modalTarget.gender === "Female" ? modalTarget.id : spouseDoc.id,
          isApproved: true,
          createdAt: serverTimestamp(),
        });
        
        await updateDoc(doc(db, "members", modalTarget.id), { maritalStatus: "Married" });
      } else {
        let childRelation = "Son/Daughter";
        if (modalTarget.relation === "Son/Daughter") childRelation = "Grandchild";
        else if (modalTarget.relation === "Grandchild") childRelation = "Great-Grandchild";

        await addDoc(collection(db, "members"), {
          ...formData,
          relation: childRelation,
          parentId: modalTarget.id,
          familyId: family.id,
          district: family.district,
          mahalName: family.mahalName,
          maritalStatus: "Single",
          createdAt: serverTimestamp(),
        });
      }
      
      setModalType(null);
      setModalTarget(null);
      setFormData({ firstName: "", lastName: "", gender: "Male", dob: "" });
      fetchData();
    } catch (err) {
      console.error("Add member error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#FDFCF7]">
      <Loader2 className="animate-spin text-brand-green mb-4" size={48} />
      <p className="text-brand-green font-bold animate-pulse tracking-widest uppercase text-xs">Inspecting Heritage Data...</p>
    </div>
  );
  
  if (!family) return <div className="min-h-screen flex items-center justify-center bg-brand-sand"><h1>Record Not Found</h1></div>;

  const getSpouse = (id: string) => {
    const m = marriages.find(x => x.husbandId === id || x.wifeId === id);
    if (!m) return null;
    return allMembersMap.get(m.husbandId === id ? m.wifeId : m.husbandId);
  };

  const renderMember = (m: Member, role: string, color: string) => {
    const isSubFamily = m.familyId && m.familyId !== familyId;
    const canManage = isAdmin || (user && family.createdBy === user.username);
    
    return (
      <div 
        className="flex flex-col items-center group cursor-pointer relative" 
        onClick={() => {
            if (canManage && isBuilderMode) {
                setActiveMenuId(activeMenuId === m.id ? null : m.id);
            } else {
                router.push(`/family/${familyId}`);
            }
        }}
      >
        <div className={`w-20 h-20 bg-white rounded-3xl border-2 ${color} flex items-center justify-center shadow-lg group-hover:scale-105 transition-all duration-500 overflow-hidden relative ${activeMenuId === m.id ? 'ring-4 ring-brand-gold ring-offset-4' : ''}`}>
          <div className={`absolute inset-0 opacity-5 ${color.includes('green') ? 'bg-brand-green' : 'bg-brand-gold'}`}></div>
          <User size={32} className={color.includes('green') ? 'text-brand-green' : 'text-brand-gold'} />
          
          {isBuilderMode && canManage && (
            <div className="absolute inset-0 bg-brand-green/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Plus size={24} className="text-white" />
            </div>
          )}

          {isSubFamily && (m.relation === 'Father/Head' || m.relation === 'Mother') && (
            <div 
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/tree/${m.familyId}`);
              }}
              className="absolute top-2 right-2 p-1.5 bg-brand-gold text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-brand-green z-20 shadow-sm"
              title="View Sub-Family Tree"
            >
              <ExternalLink size={14} />
            </div>
          )}
        </div>

        {/* Graphical Builder Menu */}
        {activeMenuId === m.id && (
            <div className="absolute top-full mt-4 bg-white rounded-2xl shadow-2xl border border-gray-100 p-2 z-[100] flex gap-2 animate-in fade-in zoom-in-95 duration-200">
                <button 
                    onClick={(e) => { e.stopPropagation(); setModalType('spouse'); setModalTarget(m); setActiveMenuId(null); }}
                    className="flex items-center gap-2 px-4 py-2 bg-pink-50 text-pink-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-pink-600 hover:text-white transition-all"
                >
                    <Heart size={14} /> Spouse
                </button>
                <button 
                    onClick={(e) => { e.stopPropagation(); setModalType('child'); setModalTarget(m); setActiveMenuId(null); }}
                    className="flex items-center gap-2 px-4 py-2 bg-brand-gold/10 text-brand-gold rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-brand-gold hover:text-white transition-all"
                >
                    <Baby size={14} /> Child
                </button>
                <button 
                    onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); }}
                    className="p-2 text-gray-400 hover:bg-gray-100 rounded-xl"
                >
                    <X size={14} />
                </button>
            </div>
        )}

        <div className="mt-3 text-center">
          <h3 className="font-black text-gray-900 text-sm leading-tight">{m.firstName}<br/>{m.lastName}</h3>
          <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mt-1">{role}</p>
        </div>
      </div>
    );
  };

  const renderedIds = new Set<string>();

  const renderNode = (parent: Member, isRoot = false) => {
    if (renderedIds.has(parent.id)) return null;
    
    const spouseObj = isRoot ? rootMother : getSpouse(parent.id);
    const childrenList = members.filter(m => 
      m.parentId === parent.id || (spouseObj && m.parentId === spouseObj.id)
    );

    renderedIds.add(parent.id);
    if (spouseObj) renderedIds.add(spouseObj.id);

    return (
      <li key={parent.id} className={`${isRoot ? 'root-node' : 'tree-node'} px-6`}>
        <div className="flex flex-col items-center">
          <div className="flex items-center justify-center gap-10 relative pb-12">
            {spouseObj && (
              <div className="absolute top-[40px] left-1/2 -translate-x-1/2 w-16 h-px bg-brand-gold/30 z-0"></div>
            )}
            
            {renderMember(parent, parent.relation, isRoot ? 'border-brand-green' : 'border-brand-gold/30')}
            {spouseObj && renderMember(spouseObj, spouseObj.relation === 'Mother' ? 'MOTHER' : 'SPOUSE', 'border-brand-gold/30')}
          </div>

          {childrenList.length > 0 && (
            <ul className="flex justify-center pt-10 relative">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-10 bg-brand-gold/40"></div>
              {childrenList
                .filter(child => !renderedIds.has(child.id))
                .map(child => renderNode(child))}
            </ul>
          )}
        </div>
      </li>
    );
  };

  return (
    <div className="min-h-screen bg-[#FDFCF7] py-12 px-4 overflow-x-auto relative">
      {/* Graphical Builder Overlay Modal */}
      {modalType && modalTarget && (
        <div className="fixed inset-0 bg-brand-green/20 backdrop-blur-md z-[1000] flex items-center justify-center p-4">
            <div className="bg-white rounded-[3rem] shadow-2xl border border-gray-100 p-10 max-w-lg w-full animate-in zoom-in-95 duration-300">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h2 className="text-2xl font-black text-gray-900 flex items-center gap-3">
                            {modalType === 'spouse' ? <Heart className="text-pink-500" /> : <Baby className="text-brand-gold" />}
                            Add {modalType === 'spouse' ? 'Spouse' : 'Child'}
                        </h2>
                        <p className="text-xs font-bold text-gray-400 mt-1 uppercase tracking-widest">To: {modalTarget.firstName} {modalTarget.lastName}</p>
                    </div>
                    <button onClick={() => setModalType(null)} className="p-3 bg-gray-50 text-gray-400 rounded-2xl hover:bg-red-50 hover:text-red-500 transition-all"><X size={24} /></button>
                </div>

                <form onSubmit={handleAddMemberSubmit} className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">First Name</label>
                            <input 
                                type="text" 
                                required 
                                className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl font-bold"
                                value={formData.firstName}
                                onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Last Name</label>
                            <input 
                                type="text" 
                                className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl font-bold"
                                value={formData.lastName}
                                onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                            />
                        </div>
                    </div>
                    
                    {modalType === 'child' && (
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Gender</label>
                                <select 
                                    className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl font-bold"
                                    value={formData.gender}
                                    onChange={(e) => setFormData({...formData, gender: e.target.value})}
                                >
                                    <option>Male</option>
                                    <option>Female</option>
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Date of Birth</label>
                                <input 
                                    type="date" 
                                    className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl font-bold"
                                    value={formData.dob}
                                    onChange={(e) => setFormData({...formData, dob: e.target.value})}
                                />
                            </div>
                        </div>
                    )}

                    <button 
                        type="submit" 
                        disabled={isSubmitting}
                        className={`w-full py-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl transition-all flex items-center justify-center gap-3 ${modalType === 'spouse' ? 'bg-pink-500 text-white shadow-pink-500/20' : 'bg-brand-gold text-brand-green shadow-brand-gold/20'}`}
                    >
                        {isSubmitting ? <Loader2 size={24} className="animate-spin" /> : <Check size={24} />}
                        Save Member
                    </button>
                </form>
            </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto min-w-max">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-10 mb-24 px-10">
            <div className="flex items-center gap-6">
                <button onClick={() => router.back()} className="p-3 bg-white rounded-2xl shadow-sm text-brand-green hover:bg-brand-green hover:text-white transition-all border border-brand-green/5"><ArrowLeft size={24} /></button>
                <div>
                    <h1 className="text-5xl font-black text-gray-900 tracking-tight">{family.familyName} <span className="text-brand-gold">Heritage</span></h1>
                    <div className="flex items-center gap-4 mt-2">
                        <span className="flex items-center gap-1.5 text-brand-green font-bold bg-brand-green/5 px-3 py-1 rounded-full text-sm">
                            <MapPin size={14} /> {family.mahalName}
                        </span>
                        <span className="text-gray-300">|</span>
                        <span className="text-gray-500 font-bold text-sm tracking-wide uppercase">{family.district} DISTRICT</span>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-4">
                {(isAdmin || (user && family.createdBy === user.username)) && (
                    <button 
                        onClick={() => setIsBuilderMode(!isBuilderMode)}
                        className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-xl ${isBuilderMode ? 'bg-brand-green text-white shadow-brand-green/20' : 'bg-white text-brand-green border border-brand-green/10 shadow-brand-green/5 hover:border-brand-green'}`}
                    >
                        {isBuilderMode ? <Check size={20} /> : <Plus size={20} />}
                        {isBuilderMode ? 'Finish Building' : 'Graphical Builder'}
                    </button>
                )}
                
                <Link 
                    href={`/family/${familyId}`}
                    className="flex items-center gap-3 px-8 py-4 bg-brand-gold text-brand-green rounded-2xl font-black text-sm uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-brand-gold/10"
                >
                    <Edit size={20} />
                    Edit Data
                </Link>
            </div>
        </div>

        <div className="tree-container">
          <ul className="flex justify-center">
             {rootFather ? renderNode(rootFather, true) : (rootMother ? renderNode(rootMother, true) : null)}
          </ul>

          {members.length === 0 && (
            <div className="flex flex-col items-center justify-center py-32 opacity-50">
                <Users size={48} className="text-gray-300 mb-6" />
                <p className="text-gray-400 font-bold text-xl">No lineage data discovered.</p>
                <Link href={`/family/${familyId}`} className="mt-6 text-brand-green font-bold hover:underline">Add Members</Link>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .tree-container {
          padding: 2rem;
          display: inline-block;
          min-width: 100%;
        }
        
        ul {
          position: relative;
          list-style-type: none;
          margin: 0;
          padding: 0;
          display: flex;
        }

        .tree-node {
          position: relative;
          padding-top: 20px;
        }

        .tree-node::before, .tree-node::after {
          content: '';
          position: absolute;
          top: 0;
          right: 50%;
          border-top: 1px solid rgba(212, 175, 55, 0.4);
          width: 50%;
          height: 20px;
        }
        .tree-node::after {
          right: auto;
          left: 50%;
          border-left: 1px solid rgba(212, 175, 55, 0.4);
        }

        .tree-node:only-child::after, .tree-node:only-child::before {
          display: none;
        }
        .tree-node:only-child { 
          padding-top: 0; 
        }
        .tree-node:first-child::before, .tree-node:last-child::after {
          border: 0 none;
        }
        .tree-node:last-child::before {
          border-right: 1px solid rgba(212, 175, 55, 0.4);
          border-radius: 0 10px 0 0;
        }
        .tree-node:first-child::after {
          border-radius: 10px 0 0 0;
        }

        .root-node {
          padding-top: 0;
        }
      `}</style>
    </div>
  );
}

