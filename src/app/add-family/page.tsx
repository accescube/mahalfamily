"use client";

import { useState, useEffect } from "react";
import { collection, addDoc, serverTimestamp, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Users, MapPin, ShieldCheck, Loader2, Crown, ArrowLeft } from "lucide-react";

export default function AddFamilyPage() {
  const router = useRouter();
  const { user, isAdmin } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [grandFamilies, setGrandFamilies] = useState<{id: string, familyName: string}[]>([]);

  // Form State
  const [formData, setFormData] = useState({
    mahalName: "",
    familyName: "",
    placeName: "",
    pincode: "",
    district: "",
    isGrandFamily: false,
    grandFamilyId: "",
  });

  const [districtMahals, setDistrictMahals] = useState<string[]>([]);
  const [showMahalSuggestions, setShowMahalSuggestions] = useState(false);

  // Fetch existing Grand Families for selection
  useEffect(() => {
    const fetchGrandFamilies = async () => {
      const q = query(collection(db, "families"), where("isGrandFamily", "==", true), where("isApproved", "==", true));
      const snap = await getDocs(q);
      const list = snap.docs.map(doc => ({ id: doc.id, familyName: doc.data().familyName }));
      setGrandFamilies(list);
    };
    fetchGrandFamilies();
  }, []);

  // Fetch unique Mahals when District changes
  useEffect(() => {
    const fetchMahals = async () => {
      if (!formData.district) {
        setDistrictMahals([]);
        return;
      }
      const q = query(collection(db, "families"), where("district", "==", formData.district), where("isApproved", "==", true));
      const snap = await getDocs(q);
      const mahals = new Set<string>();
      snap.docs.forEach(doc => {
        const mName = doc.data().mahalName;
        if (mName) mahals.add(mName);
      });
      setDistrictMahals(Array.from(mahals));
    };
    fetchMahals();
  }, [formData.district]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setFormData((prev) => ({ ...prev, [name]: val }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert("Please sign in to add a family.");
      router.push("/login");
      return;
    }
    
    setIsSubmitting(true);
    setError("");
    
    try {
      const docRef = await addDoc(collection(db, "families"), {
        ...formData,
        isApproved: isAdmin,
        createdBy: user.id,
        ownerEmail: user.username, // Using username as the owner identifier
        createdAt: serverTimestamp(),
      });
      router.push(`/family/${docRef.id}`);
    } catch (err: any) {
      setError(err.message || "An error occurred while saving.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-sand py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-green/10 text-brand-green rounded-full mb-4">
            <Users size={32} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Register a New Family</h1>
          <p className="text-gray-600 mt-2">Join the community directory or establish a Grand Family heritage.</p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
          {success ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 text-green-600 rounded-full mb-6"><ShieldCheck size={40} /></div>
              <h2 className="text-2xl font-bold mb-2">Submission Successful!</h2>
              <p className="text-gray-600 mb-8">Your request is pending Mahal Admin approval.</p>
              <button onClick={() => setSuccess(false)} className="px-6 py-3 bg-brand-green text-white font-medium rounded-full">Submit Another</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700">District</label>
                  <select name="district" required value={formData.district} onChange={handleChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl">
                      <option value="">Select District...</option>
                      <option value="Alappuzha">Alappuzha</option>
                      <option value="Ernakulam">Ernakulam</option>
                      <option value="Idukki">Idukki</option>
                      <option value="Kannur">Kannur</option>
                      <option value="Kasaragod">Kasaragod</option>
                      <option value="Kollam">Kollam</option>
                      <option value="Kottayam">Kottayam</option>
                      <option value="Kozhikode">Kozhikode</option>
                      <option value="Malappuram">Malappuram</option>
                      <option value="Palakkad">Palakkad</option>
                      <option value="Pathanamthitta">Pathanamthitta</option>
                      <option value="Thiruvananthapuram">Thiruvananthapuram</option>
                      <option value="Thrissur">Thrissur</option>
                      <option value="Wayanad">Wayanad</option>
                  </select>
                </div>
                <div className="relative">
                  <label className="block text-sm font-semibold text-gray-700">Mahal Name</label>
                  <input 
                    type="text" 
                    name="mahalName" 
                    required 
                    value={formData.mahalName} 
                    onChange={handleChange} 
                    onFocus={() => setShowMahalSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowMahalSuggestions(false), 200)}
                    placeholder="e.g. Town Juma Masjid" 
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl" 
                  />
                  {showMahalSuggestions && formData.district && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                      {districtMahals
                        .filter(m => m.toLowerCase().includes(formData.mahalName.toLowerCase()))
                        .map((mahal, i) => (
                          <div 
                            key={i} 
                            className="px-4 py-3 hover:bg-brand-green/10 cursor-pointer text-sm font-bold text-gray-700 border-b border-gray-50 last:border-0"
                            onMouseDown={(e) => {
                                e.preventDefault();
                                setFormData(prev => ({...prev, mahalName: mahal}));
                                setShowMahalSuggestions(false);
                            }}
                          >
                            {mahal}
                          </div>
                      ))}
                      {formData.mahalName && !districtMahals.some(m => m.toLowerCase() === formData.mahalName.toLowerCase()) && (
                          <div className="px-4 py-3 text-xs font-bold text-brand-gold bg-brand-sand/30">
                              + Create new Mahal "{formData.mahalName}" in {formData.district}
                          </div>
                      )}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700">Veettu Peru (Family Name)</label>
                  <input type="text" name="familyName" required value={formData.familyName} onChange={handleChange} placeholder="e.g. Puthan Veedu" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700">Pincode</label>
                  <input type="text" name="pincode" required value={formData.pincode} onChange={handleChange} placeholder="673001" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl" />
                </div>
              </div>

              {/* Grand Family Logic */}
              <div className="bg-brand-sand/50 p-6 rounded-2xl border border-brand-green/10 space-y-4">
                <div className="flex items-center gap-3">
                  <input type="checkbox" id="isGrandFamily" name="isGrandFamily" checked={formData.isGrandFamily} onChange={handleChange} className="w-5 h-5 accent-brand-green" />
                  <label htmlFor="isGrandFamily" className="text-sm font-bold text-gray-700 flex items-center gap-2">
                    <Crown size={18} className="text-brand-gold" />
                    Designate as a Grand Family
                  </label>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Join an existing Grand Family (Optional)</label>
                  <select name="grandFamilyId" value={formData.grandFamilyId} onChange={handleChange} className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl">
                    <option value="">None / Independent Family</option>
                    {grandFamilies.map(gf => (
                      <option key={gf.id} value={gf.id}>{gf.familyName}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button type="submit" disabled={isSubmitting} className="w-full py-4 bg-brand-green text-white font-bold rounded-xl shadow-lg flex justify-center items-center gap-2">
                {isSubmitting ? <Loader2 className="animate-spin" /> : "Submit for Approval"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
