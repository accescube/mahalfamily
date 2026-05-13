"use client";

import { useEffect, useState, use } from "react";
import { collection, query, where, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc, serverTimestamp, limit, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Users, UserPlus, Calendar, ShieldCheck, Loader2, ArrowLeft, ChevronRight, Edit2, Save, X, Trash2, Heart, Search, Link as LinkIcon, ExternalLink, MapPin, Home } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useAuth } from "@/context/AuthContext";

interface Family {
  id: string;
  mahalName: string;
  familyName: string;
  placeName: string;
  pincode: string;
  district?: string;
  isGrandFamily?: boolean;
  grandFamilyId?: string;
  createdBy?: string;
}

interface Member {
  id: string;
  firstName: string;
  lastName: string;
  gender: string;
  dob: string;
  maritalStatus: string;
  relation: string;
  familyId: string;
  parentId?: string;
  mahalName?: string;
  district?: string;
}

interface Marriage {
  id: string;
  husbandId: string;
  wifeId: string;
  isApproved: boolean;
}

export default function FamilyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-brand-sand"><Loader2 className="animate-spin text-brand-green" size={48} /></div>}>
      <FamilyDetailContent params={params} />
    </Suspense>
  );
}

function FamilyDetailContent({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const familyId = resolvedParams.id;
  const router = useRouter();
  const { user, isAdmin } = useAuth();

  const [family, setFamily] = useState<Family | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [marriages, setMarriages] = useState<Marriage[]>([]);
  const [grandFamilyMembers, setGrandFamilyMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editMemberData, setEditMemberData] = useState<Partial<Member>>({});
  
  // Spouse Connection State
  const [addingSpouseFor, setAddingSpouseFor] = useState<Member | null>(null);
  const [spouseMode, setSpouseMode] = useState<"new" | "existing">("new");
  const [spouseFormData, setSpouseFormData] = useState({ firstName: "", lastName: "" });
  
  // Child Connection State
  const [addingChildFor, setAddingChildFor] = useState<Member | null>(null);
  const [childFormData, setChildFormData] = useState({ firstName: "", lastName: "", gender: "Male", dob: "" });
  
  // Advanced Search State
  const [searchSpouseTerm, setSearchSpouseTerm] = useState("");
  const [searchSpouseDistrict, setSearchSpouseDistrict] = useState("");
  const [searchSpouseMahal, setSearchSpouseMahal] = useState("");
  const [searchSpouseResults, setSearchSpouseResults] = useState<Member[]>([]);
  const [isSearchingSpouse, setIsSearchingSpouse] = useState(false);
  const [districtMahals, setDistrictMahals] = useState<string[]>([]);
  const [showMahalSuggestions, setShowMahalSuggestions] = useState(false);

  // Fetch unique Mahals when District changes
  useEffect(() => {
    const fetchMahals = async () => {
      if (!searchSpouseDistrict) {
        setDistrictMahals([]);
        return;
      }
      const q = query(collection(db, "families"), where("district", "==", searchSpouseDistrict), where("isApproved", "==", true));
      const snap = await getDocs(q);
      const mahals = new Set<string>();
      snap.docs.forEach(doc => {
        const mName = doc.data().mahalName;
        if (mName) mahals.add(mName);
      });
      setDistrictMahals(Array.from(mahals));
    };
    fetchMahals();
  }, [searchSpouseDistrict]);

  const districts = ["Alappuzha", "Ernakulam", "Idukki", "Kannur", "Kasaragod", "Kollam", "Kottayam", "Kozhikode", "Malappuram", "Palakkad", "Pathanamthitta", "Thiruvananthapuram", "Thrissur", "Wayanad"];

  const fetchData = async () => {
    try {
      setLoading(true);
      const familyDoc = await getDoc(doc(db, "families", familyId));
      let isGrandFam = false;
      if (familyDoc.exists()) {
          const famData = { id: familyDoc.id, ...familyDoc.data() } as Family;
          setFamily(famData);
          isGrandFam = famData.isGrandFamily === true;
          
          if (famData.grandFamilyId) {
             const gfQ = query(collection(db, "members"), where("familyId", "==", famData.grandFamilyId));
             const gfSnap = await getDocs(gfQ);
             const gfMembers: Member[] = [];
             gfSnap.forEach(d => gfMembers.push({ id: d.id, ...d.data() } as Member));
             setGrandFamilyMembers(gfMembers);
          }
      }

      let familyIdsToFetch = [familyId];
      if (isGrandFam) {
          const subFamQ = query(collection(db, "families"), where("grandFamilyId", "==", familyId));
          const subFamSnap = await getDocs(subFamQ);
          subFamSnap.forEach(d => familyIdsToFetch.push(d.id));
      }

      const fetchedMembers: Member[] = [];
      for (let i = 0; i < familyIdsToFetch.length; i += 10) {
          const chunk = familyIdsToFetch.slice(i, i + 10);
          if (chunk.length === 0) continue;
          const q = query(collection(db, "members"), where("familyId", "in", chunk));
          const querySnapshot = await getDocs(q);
          querySnapshot.forEach((doc) => {
            const { id: _, ...dataWithoutId } = doc.data() as Member;
            fetchedMembers.push({ id: doc.id, ...dataWithoutId });
          });
      }
      const mSnap = await getDocs(collection(db, "marriages"));
      const fetchedMarriages: Marriage[] = [];
      mSnap.forEach((doc) => {
        const { id: _, ...dataWithoutId } = doc.data() as Marriage;
        fetchedMarriages.push({ id: doc.id, ...dataWithoutId });
      });
      setMarriages(fetchedMarriages);

      // Fetch spouses that belong to other families but are connected to members of this family
      const memberIds = new Set(fetchedMembers.map(m => m.id));
      const missingSpouseIds = new Set<string>();

      fetchedMarriages.forEach(m => {
         if (memberIds.has(m.husbandId) && !memberIds.has(m.wifeId)) missingSpouseIds.add(m.wifeId);
         if (memberIds.has(m.wifeId) && !memberIds.has(m.husbandId)) missingSpouseIds.add(m.husbandId);
      });

      for (const sId of missingSpouseIds) {
          const sDoc = await getDoc(doc(db, "members", sId));
          if (sDoc.exists()) {
             const spouseData = sDoc.data() as Member;
             const { id: _, ...spouseDataWithoutId } = spouseData;
             fetchedMembers.push({ id: sDoc.id, ...spouseDataWithoutId, relation: "Connected Spouse" });
          }
      }

      // Fetch children who belong to other families but have a parent in this family (or a connected spouse)
      const parentIdsArray = fetchedMembers.map(m => m.id);
      for (let i = 0; i < parentIdsArray.length; i += 10) {
          const chunk = parentIdsArray.slice(i, i + 10);
          if (chunk.length === 0) continue;
          
          const childQ = query(collection(db, "members"), where("parentId", "in", chunk));
          const childSnap = await getDocs(childQ);
          childSnap.forEach(doc => {
             // If not already in fetchedMembers (because they belong to another family)
             if (!fetchedMembers.find(m => m.id === doc.id)) {
                 const childData = doc.data() as Member;
                 const parentInThisFamily = fetchedMembers.find(m => m.id === childData.parentId);
                 
                 let displayRelation = childData.relation; // Fallback
                 if (parentInThisFamily) {
                     // Determine generational relation based on the parent's status in THIS family
                     let pRel = parentInThisFamily.relation;
                     
                     if (pRel === "Connected Spouse") {
                         // Find the bloodline member they are married to
                         const marriage = fetchedMarriages.find(m => m.husbandId === parentInThisFamily.id || m.wifeId === parentInThisFamily.id);
                         if (marriage) {
                             const bloodId = marriage.husbandId === parentInThisFamily.id ? marriage.wifeId : marriage.husbandId;
                             const bloodMember = fetchedMembers.find(m => m.id === bloodId);
                             if (bloodMember) pRel = bloodMember.relation;
                         }
                     }

                     if (pRel === "Father/Head" || pRel === "Mother") displayRelation = "Son/Daughter";
                     else if (pRel === "Son/Daughter") displayRelation = "Grandchild";
                     else if (pRel === "Grandchild") displayRelation = "Great-Grandchild";
                 }
                 
                 const { id: _, ...childDataWithoutId } = childData;
                 fetchedMembers.push({ id: doc.id, ...childDataWithoutId, relation: displayRelation });
             }
          });
      }

      setMembers(fetchedMembers);

    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [familyId]);

  const [formData, setFormData] = useState({
    firstName: "", lastName: "", gender: "Male", dob: "", maritalStatus: "Single", relation: "Father/Head", grandFamilyParentId: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditMemberChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditMemberData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!family) return;
    setIsSubmitting(true);
    try {
      const { grandFamilyParentId, ...dataToSave } = formData;
      // Denormalize family metadata into member for better search
      await addDoc(collection(db, "members"), { 
        ...dataToSave, 
        familyId, 
        district: family.district,
        mahalName: family.mahalName,
        parentId: grandFamilyParentId || null,
        createdAt: serverTimestamp() 
      });
      setFormData({ firstName: "", lastName: "", gender: "Male", dob: "", maritalStatus: "Single", relation: members.some(m => m.relation === "Father/Head") ? "Mother" : "Father/Head", grandFamilyParentId: "" });
      fetchData();
    } catch (error) {
      console.error("Error adding:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEditingMember = (member: Member) => {
    setEditingMemberId(member.id);
    setEditMemberData({ ...member });
  };

  const saveMemberEdit = async (id: string) => {
    try {
      setIsSubmitting(true);
      const { id: _, ...updateData } = editMemberData; 
      await updateDoc(doc(db, "members", id), updateData);
      setMembers((prev) => prev.map((m) => m.id === id ? { ...m, ...editMemberData } : m));
      setEditingMemberId(null);
    } catch (error) {
      console.error("Error updating:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteMember = async (id: string) => {
    if (typeof window !== "undefined" && !window.confirm("Are you sure?")) return;
    try {
      await deleteDoc(doc(db, "members", id));
      setMembers((prev) => prev.filter((m) => m.id !== id));
    } catch (error) {
      console.error("Error deleting:", error);
    }
  };

  const handleAddSpouse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addingSpouseFor || !family) return;
    setIsSubmitting(true);
    try {
      const spouseGender = addingSpouseFor.gender === "Male" ? "Female" : "Male";
      let spouseId = "";

      if (spouseMode === "new") {
        const spouseDoc = await addDoc(collection(db, "members"), {
          firstName: spouseFormData.firstName,
          lastName: spouseFormData.lastName,
          gender: spouseGender,
          relation: "Spouse",
          familyId: addingSpouseFor.familyId,
          district: family.district,
          mahalName: family.mahalName,
          maritalStatus: "Married",
          createdAt: serverTimestamp(),
        });
        spouseId = spouseDoc.id;
      }

      await addDoc(collection(db, "marriages"), {
        husbandId: addingSpouseFor.gender === "Male" ? addingSpouseFor.id : spouseId,
        wifeId: addingSpouseFor.gender === "Female" ? addingSpouseFor.id : spouseId,
        isApproved: true, 
        createdAt: serverTimestamp(),
      });

      // Update current member's marital status
      await updateDoc(doc(db, "members", addingSpouseFor.id), {
        maritalStatus: "Married"
      });

      setAddingSpouseFor(null);
      fetchData();
      alert("Spouse added successfully!");
    } catch (error) {
      console.error("Error adding spouse:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const connectExistingSpouse = async (targetMember: Member) => {
    if (!addingSpouseFor) return;
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, "marriages"), {
        husbandId: addingSpouseFor.gender === "Male" ? addingSpouseFor.id : targetMember.id,
        wifeId: addingSpouseFor.gender === "Female" ? addingSpouseFor.id : targetMember.id,
        isApproved: true, 
        createdAt: serverTimestamp(),
      });

      // Update both members to married
      await updateDoc(doc(db, "members", addingSpouseFor.id), { maritalStatus: "Married" });
      await updateDoc(doc(db, "members", targetMember.id), { maritalStatus: "Married" });

      setAddingSpouseFor(null);
      setSearchSpouseTerm("");
      setSearchSpouseResults([]);
      fetchData();
      alert("Spouse connected successfully!");
    } catch (error) {
      console.error("Error connecting spouse:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddChild = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addingChildFor || !family) return;
    setIsSubmitting(true);
    try {
      let childRelation = "Grandchild";
      let actualParentId = addingChildFor.id;
      let parentRel = addingChildFor.relation;

      // If added to a spouse, link the child to the bloodline member instead
      if (parentRel === "Spouse") {
          const marriage = marriages.find(m => m.husbandId === addingChildFor.id || m.wifeId === addingChildFor.id);
          if (marriage) {
              const bloodSpouseId = marriage.husbandId === addingChildFor.id ? marriage.wifeId : marriage.husbandId;
              const bloodSpouse = members.find(m => m.id === bloodSpouseId);
              if (bloodSpouse) {
                  actualParentId = bloodSpouse.id;
                  parentRel = bloodSpouse.relation;
              }
          }
      }

      if (parentRel === "Father/Head" || parentRel === "Mother") {
          childRelation = "Son/Daughter";
      } else if (parentRel === "Son/Daughter") {
          childRelation = "Grandchild";
      } else if (parentRel === "Grandchild") {
          childRelation = "Great-Grandchild";
      }

      await addDoc(collection(db, "members"), {
        firstName: childFormData.firstName,
        lastName: childFormData.lastName,
        gender: childFormData.gender,
        relation: childRelation,
        parentId: actualParentId,
        familyId: family.id,
        district: family.district,
        mahalName: family.mahalName,
        maritalStatus: "Single",
        dob: childFormData.dob,
        createdAt: serverTimestamp(),
      });
      setAddingChildFor(null);
      setChildFormData({ firstName: "", lastName: "", gender: "Male", dob: "" });
      fetchData();
      alert("Child added successfully!");
    } catch (error) {
      console.error("Error adding child:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSearchSpouse = async () => {
    if (!addingSpouseFor) return;
    setIsSearchingSpouse(true);
    try {
      // Query recent members, we will filter by name client-side
      const mCol = collection(db, "members");
      const q = query(
          mCol, 
          limit(1000) // Increased limit to ensure we find them
      );

      const snap = await getDocs(q);
      const results: Member[] = [];
      snap.forEach(doc => {
        const data = doc.data() as Member;
        
        // Client-side filtering
        if (searchSpouseDistrict && data.district !== searchSpouseDistrict) return;
        
        // Client-side refined filtering for Name and Mahal
        const matchesName = !searchSpouseTerm || 
          (data.firstName || "").toLowerCase().includes(searchSpouseTerm.toLowerCase()) || 
          (data.lastName || "").toLowerCase().includes(searchSpouseTerm.toLowerCase());
          
        const matchesMahal = !searchSpouseMahal || 
          data.mahalName?.toLowerCase().includes(searchSpouseMahal.toLowerCase());

        if (matchesName && matchesMahal) {
          const { id: _, ...dataWithoutId } = data;
          results.push({ id: doc.id, ...dataWithoutId });
        }
      });
      
      // If still no results, it might be because the old data doesn't have district/mahal fields.
      // We fall back to a broader name search if possible (though limited in Firestore)
      
      setSearchSpouseResults(results);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsSearchingSpouse(false);
    }
  };

  const getMarriageStatus = (memberId: string) => {
    const marriage = marriages.find(m => m.husbandId === memberId || m.wifeId === memberId);
    if (!marriage) return null;
    
    const spouseId = marriage.husbandId === memberId ? marriage.wifeId : marriage.husbandId;
    const spouse = members.find(m => m.id === spouseId);
    const name = spouse ? `${spouse.firstName} ${spouse.lastName}` : "Connected Spouse";
    
    return { name, isApproved: marriage.isApproved };
  };

  const sortedMembers = [...members].sort((a, b) => {
      if (!a.dob && !b.dob) return 0;
      if (!a.dob) return 1;
      if (!b.dob) return -1;
      return new Date(a.dob).getTime() - new Date(b.dob).getTime();
  });

  const canEdit = isAdmin || (user && family?.createdBy === user.username);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-brand-sand"><Loader2 className="animate-spin text-brand-green" size={48} /></div>;
  if (!family) return <div className="min-h-screen flex flex-col items-center justify-center bg-brand-sand px-4"><h1 className="text-2xl font-bold mb-4">Family Not Found</h1><Link href="/search" className="text-brand-green hover:underline">Back to Search</Link></div>;

  return (
    <div className="min-h-screen bg-brand-sand py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="p-2 bg-white rounded-full shadow-sm text-brand-green hover:bg-brand-green hover:text-white transition-all"><ArrowLeft size={24} /></button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{family.familyName}</h1>
              <p className="text-brand-green font-bold flex items-center gap-2">
                <MapPin size={16} /> {family.mahalName} • {family.district}
              </p>
            </div>
          </div>
          <Link 
            href={`/tree/${family.id}`} 
            className="inline-flex items-center gap-2 px-6 py-3 bg-brand-gold text-brand-green font-black rounded-2xl shadow-lg shadow-brand-gold/10 hover:scale-105 transition-all text-sm"
          >
            <Users size={18} />
            VIEW VISUAL TREE
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-[2rem] shadow-xl p-8 border border-gray-100">
              <h2 className="text-2xl font-black text-gray-900 mb-8 flex items-center gap-3">
                <div className="p-2 bg-brand-gold/20 rounded-xl text-brand-gold"><Users size={28} /></div>
                Family Members
              </h2>
              
              <div className="space-y-4">
                {sortedMembers.map((member) => (
                  <div key={member.id} className="p-6 bg-gray-50 border border-gray-100 rounded-[1.5rem] hover:border-brand-green/20 transition-all">
                    {editingMemberId === member.id ? (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="font-bold text-gray-700">Edit Member Details</h4>
                          <button onClick={() => setEditingMemberId(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">First Name</label>
                            <input type="text" name="firstName" value={editMemberData.firstName} onChange={handleEditMemberChange} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Last Name</label>
                            <input type="text" name="lastName" value={editMemberData.lastName} onChange={handleEditMemberChange} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Relation</label>
                            <select name="relation" value={editMemberData.relation} onChange={handleEditMemberChange} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm">
                              <option>Father/Head</option><option>Mother</option><option>Son/Daughter</option><option>Wife</option><option>Grandparent</option><option>Other</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Gender</label>
                            <select name="gender" value={editMemberData.gender} onChange={handleEditMemberChange} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"><option>Male</option><option>Female</option></select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Date of Birth</label>
                            <input type="date" name="dob" value={editMemberData.dob} onChange={handleEditMemberChange} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Marital Status</label>
                            <select name="maritalStatus" value={editMemberData.maritalStatus} onChange={handleEditMemberChange} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm">
                              <option>Single</option><option>Married</option><option>Widowed</option><option>Divorced</option>
                            </select>
                          </div>
                          {family.grandFamilyId && (editMemberData.relation === "Father/Head" || editMemberData.relation === "Mother") && (
                            <div className="lg:col-span-3">
                              <label className="text-[10px] font-black text-brand-gold uppercase tracking-widest ml-1">Parent in Grand Family</label>
                              <select name="parentId" value={editMemberData.parentId || ""} onChange={handleEditMemberChange} className="w-full px-3 py-2 bg-brand-gold/10 border border-brand-gold/30 rounded-lg text-sm font-bold text-brand-gold focus:ring-2 focus:ring-brand-gold">
                                <option value="">Do not link to Grand Family</option>
                                <optgroup label="Fathers & Mothers">
                                  {grandFamilyMembers.filter(m => m.relation === "Father/Head" || m.relation === "Mother").map(m => (
                                    <option key={m.id} value={m.id}>Link to: {m.firstName} {m.lastName} ({m.relation})</option>
                                  ))}
                                </optgroup>
                                <optgroup label="Other Members">
                                  {grandFamilyMembers.filter(m => m.relation !== "Father/Head" && m.relation !== "Mother").map(m => (
                                    <option key={m.id} value={m.id}>Link to: {m.firstName} {m.lastName} ({m.relation})</option>
                                  ))}
                                </optgroup>
                              </select>
                            </div>
                          )}
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                          <button onClick={() => saveMemberEdit(member.id)} className="px-6 py-2 bg-brand-gold text-brand-green rounded-lg font-bold text-sm shadow-sm flex items-center gap-2 hover:scale-105 transition-all">
                            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Changes
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-4">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-5">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner ${member.gender === 'Male' ? 'bg-blue-50 text-blue-500' : 'bg-pink-50 text-pink-500'}`}><Users size={28} /></div>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="text-lg font-black text-gray-900">{member.firstName} {member.lastName}</h3>
                                <span className="bg-brand-green/10 text-brand-green px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider">{member.relation}</span>
                                {member.familyId !== familyId && (
                                  <span className="bg-brand-gold/10 text-brand-gold px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider">Sub-Family</span>
                                )}
                              </div>
                              <p className="text-xs font-bold text-gray-400 uppercase tracking-tighter">{member.gender} • {member.maritalStatus} • {member.dob ? new Date(member.dob).toLocaleDateString() : 'No DOB'}</p>
                              {getMarriageStatus(member.id) && (
                                <div className="mt-2">
                                  <p className="text-xs text-brand-green font-black flex items-center gap-1">
                                    <Heart size={12} className="text-pink-500 fill-pink-500" /> Married to: {getMarriageStatus(member.id)?.name}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {canEdit && (
                              <>
                                <button onClick={() => { setAddingSpouseFor(member); setSpouseMode("new"); setAddingChildFor(null); }} className="flex items-center gap-1 px-4 py-2 bg-white text-brand-green border border-brand-green/20 rounded-xl text-xs font-black hover:bg-brand-green hover:text-white transition-all shadow-sm">
                                  <Heart size={14} /> Add Spouse
                                </button>
                                {member.maritalStatus === "Married" && (
                                  <button onClick={() => { setAddingChildFor(member); setAddingSpouseFor(null); }} className="flex items-center gap-1 px-4 py-2 bg-white text-brand-gold border border-brand-gold/20 rounded-xl text-xs font-black hover:bg-brand-gold hover:text-brand-green transition-all shadow-sm">
                                    <Users size={14} /> Add Child
                                  </button>
                                )}
                                <button onClick={() => startEditingMember(member)} className="p-2.5 text-gray-400 hover:text-brand-green hover:bg-white rounded-xl transition-all"><Edit2 size={20} /></button>
                                <button onClick={() => deleteMember(member.id)} className="p-2.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={20} /></button>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Spouse Search Sub-form */}
                        {addingSpouseFor?.id === member.id && (
                          <div className="mt-2 p-6 bg-white rounded-[2rem] border border-pink-100 shadow-2xl animate-in fade-in zoom-in-95 duration-300">
                            <div className="flex justify-between items-center mb-6">
                              <h4 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
                                <Heart size={20} className="text-pink-500" /> Connect Spouse for {member.firstName}
                              </h4>
                              <button onClick={() => setAddingSpouseFor(null)} className="p-2 hover:bg-gray-50 rounded-full transition-colors"><X size={20} className="text-gray-400" /></button>
                            </div>
                            
                            <div className="flex bg-gray-50 p-1.5 rounded-2xl mb-6 border border-gray-100">
                              <button onClick={() => setSpouseMode("new")} className={`flex-1 py-3 text-xs font-black rounded-xl transition-all ${spouseMode === 'new' ? 'bg-white shadow-md text-brand-green' : 'text-gray-400 hover:text-gray-600'}`}>CREATE NEW PROFILE</button>
                              <button onClick={() => setSpouseMode("existing")} className={`flex-1 py-3 text-xs font-black rounded-xl transition-all ${spouseMode === 'existing' ? 'bg-white shadow-md text-brand-green' : 'text-gray-400 hover:text-gray-600'}`}>SEARCH DIRECTORY</button>
                            </div>

                            {spouseMode === "new" ? (
                              <form onSubmit={handleAddSpouse} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <input type="text" placeholder="Spouse First Name" required value={spouseFormData.firstName} onChange={(e) => setSpouseFormData({...spouseFormData, firstName: e.target.value})} className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-brand-green" />
                                <input type="text" placeholder="Spouse Last Name" value={spouseFormData.lastName} onChange={(e) => setSpouseFormData({...spouseFormData, lastName: e.target.value})} className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-brand-green" />
                                <button type="submit" className="md:col-span-2 w-full py-4 bg-brand-green text-white font-black rounded-2xl text-sm shadow-xl shadow-brand-green/20 hover:bg-brand-green-light transition-all">ADD SPOUSE</button>
                              </form>
                            ) : (
                              <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  <div className="relative">
                                    <Search className="absolute left-4 top-3.5 text-gray-400" size={16} />
                                    <input type="text" placeholder="Search Name..." value={searchSpouseTerm} onChange={(e) => setSearchSpouseTerm(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold" />
                                  </div>
                                  <select value={searchSpouseDistrict} onChange={(e) => setSearchSpouseDistrict(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold">
                                    <option value="">All Districts</option>
                                    {districts.map(d => <option key={d} value={d}>{d}</option>)}
                                  </select>
                                  <div className="relative">
                                    <Home className="absolute left-4 top-3.5 text-gray-400" size={16} />
                                    <input 
                                        type="text" 
                                        placeholder="Mahal Name..." 
                                        value={searchSpouseMahal} 
                                        onChange={(e) => setSearchSpouseMahal(e.target.value)} 
                                        onFocus={() => setShowMahalSuggestions(true)}
                                        onBlur={() => setTimeout(() => setShowMahalSuggestions(false), 200)}
                                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold" 
                                    />
                                    {showMahalSuggestions && searchSpouseDistrict && (
                                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                                          {districtMahals
                                            .filter(m => m.toLowerCase().includes(searchSpouseMahal.toLowerCase()))
                                            .map((mahal, i) => (
                                              <div 
                                                key={i} 
                                                className="px-4 py-3 hover:bg-brand-green/10 cursor-pointer text-sm font-bold text-gray-700 border-b border-gray-50 last:border-0"
                                                onMouseDown={(e) => {
                                                    e.preventDefault();
                                                    setSearchSpouseMahal(mahal);
                                                    setShowMahalSuggestions(false);
                                                }}
                                              >
                                                {mahal}
                                              </div>
                                          ))}
                                        </div>
                                    )}
                                  </div>
                                </div>
                                <button onClick={handleSearchSpouse} disabled={isSearchingSpouse} className="w-full py-4 bg-brand-gold text-brand-green rounded-2xl text-sm font-black flex justify-center items-center gap-3 shadow-lg shadow-brand-gold/10">
                                  {isSearchingSpouse ? <Loader2 size={20} className="animate-spin" /> : <Search size={20} />} RUN GLOBAL SEARCH
                                </button>
                                
                                <div className="max-h-60 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-gray-200">
                                  {searchSpouseResults.length === 0 && searchSpouseTerm && !isSearchingSpouse && (
                                    <div className="text-center py-8">
                                      <p className="text-sm font-bold text-gray-400 italic">No eligible members found in this region.</p>
                                    </div>
                                  )}
                                  {searchSpouseResults.map(result => (
                                    <div key={result.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl border border-gray-100 group hover:border-brand-green/30 transition-all">
                                      <div>
                                        <p className="text-base font-black text-gray-900 leading-tight">{result.firstName} {result.lastName}</p>
                                        <p className="text-[10px] font-black text-brand-gold uppercase tracking-widest mt-1">{result.district} • {result.mahalName}</p>
                                      </div>
                                      <button onClick={() => connectExistingSpouse(result)} className="px-5 py-2.5 bg-brand-green text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-lg shadow-brand-green/10 hover:scale-105 transition-all"><LinkIcon size={14} /> CONNECT</button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Child Sub-form */}
                        {addingChildFor?.id === member.id && (
                          <div className="mt-2 p-6 bg-white rounded-[2rem] border border-brand-gold/30 shadow-2xl animate-in fade-in zoom-in-95 duration-300">
                            <div className="flex justify-between items-center mb-6">
                              <h4 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
                                <Users size={20} className="text-brand-gold" /> Add Child for {member.firstName}
                              </h4>
                              <button onClick={() => setAddingChildFor(null)} className="p-2 hover:bg-gray-50 rounded-full transition-colors"><X size={20} className="text-gray-400" /></button>
                            </div>
                            <form onSubmit={handleAddChild} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                              <input type="text" placeholder="First Name" required value={childFormData.firstName} onChange={(e) => setChildFormData({...childFormData, firstName: e.target.value})} className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-brand-gold" />
                              <input type="text" placeholder="Last Name" value={childFormData.lastName} onChange={(e) => setChildFormData({...childFormData, lastName: e.target.value})} className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-brand-gold" />
                              <select value={childFormData.gender} onChange={(e) => setChildFormData({...childFormData, gender: e.target.value})} className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-brand-gold">
                                <option>Male</option><option>Female</option>
                              </select>
                              <input type="date" required value={childFormData.dob} onChange={(e) => setChildFormData({...childFormData, dob: e.target.value})} className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-brand-gold" />
                              <button type="submit" className="md:col-span-2 lg:col-span-4 w-full py-4 bg-brand-gold text-brand-green font-black rounded-2xl text-sm shadow-xl shadow-brand-gold/20 hover:scale-[1.02] transition-all">ADD CHILD</button>
                            </form>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Add Member Form */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-[2.5rem] shadow-xl p-8 border border-gray-100 sticky top-24">
              <h2 className="text-2xl font-black text-gray-900 mb-8 flex items-center gap-3">
                <div className="p-2 bg-brand-green/10 rounded-xl text-brand-green"><UserPlus size={28} /></div>
                New Member
              </h2>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Relation</label>
                  <select name="relation" value={formData.relation} onChange={handleChange} className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-brand-green">
                    {canEdit ? (
                      <>
                        <option>Father/Head</option>
                        <option>Mother</option>
                        <option>Son/Daughter</option>
                        <option>Wife</option>
                        <option>Grandparent</option>
                        <option>Other</option>
                      </>
                    ) : (
                      <option>Other</option>
                    )}
                  </select>
                </div>
                <input type="text" name="firstName" required value={formData.firstName} onChange={handleChange} placeholder="First Name" className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold" />
                <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} placeholder="Last Name" className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold" />
                <div className="grid grid-cols-2 gap-4">
                  <select name="gender" value={formData.gender} onChange={handleChange} className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold"><option>Male</option><option>Female</option></select>
                  <select name="maritalStatus" value={formData.maritalStatus} onChange={handleChange} className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold"><option>Single</option><option>Married</option><option>Widowed</option><option>Divorced</option></select>
                </div>
                <input type="date" name="dob" value={formData.dob} onChange={handleChange} className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold" />
                
                {family.grandFamilyId && (formData.relation === "Father/Head" || formData.relation === "Mother") && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-brand-gold uppercase tracking-widest ml-1">Link to Parent in Grand Family (Optional)</label>
                    <select name="grandFamilyParentId" value={formData.grandFamilyParentId} onChange={handleChange} className="w-full px-5 py-4 bg-brand-gold/10 border border-brand-gold/30 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-brand-gold">
                      <option value="">Do not link</option>
                      <optgroup label="Fathers & Mothers">
                        {grandFamilyMembers.filter(m => m.relation === "Father/Head" || m.relation === "Mother").map(m => (
                          <option key={m.id} value={m.id}>{m.firstName} {m.lastName} ({m.relation})</option>
                        ))}
                      </optgroup>
                      <optgroup label="Other Members">
                        {grandFamilyMembers.filter(m => m.relation !== "Father/Head" && m.relation !== "Mother").map(m => (
                          <option key={m.id} value={m.id}>{m.firstName} {m.lastName} ({m.relation})</option>
                        ))}
                      </optgroup>
                    </select>
                  </div>
                )}
                
                <button type="submit" disabled={isSubmitting} className="w-full py-4 px-6 bg-brand-gold text-brand-green font-black rounded-2xl shadow-xl shadow-brand-gold/20 flex justify-center items-center gap-3 hover:scale-[1.02] transition-all">
                  {isSubmitting ? <Loader2 size={24} className="animate-spin" /> : <UserPlus size={24} />} REGISTER MEMBER
                </button>
              </form>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
