"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, MapPin, Users, ChevronRight, Home, KeyRound, Sparkles } from "lucide-react";
import DirectoryTree from "@/components/DirectoryTree";

export default function HomePage() {
  const router = useRouter();
  const [district, setDistrict] = useState("");
  const [mahal, setMahal] = useState("");
  const [familyName, setFamilyName] = useState("");

  const districts = [
    "Alappuzha", "Ernakulam", "Idukki", "Kannur", "Kasaragod", "Kollam", 
    "Kottayam", "Kozhikode", "Malappuram", "Palakkad", "Pathanamthitta", 
    "Thiruvananthapuram", "Thrissur", "Wayanad"
  ];

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const params = new URLSearchParams();
    if (district) params.append("district", district);
    if (mahal || familyName) {
        const queryStr = [mahal, familyName].filter(Boolean).join(" ");
        params.append("q", queryStr);
    }
    router.push(`/search?${params.toString()}`);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero Section */}
      <section className="relative pt-20 pb-32 lg:pt-32 lg:pb-48 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <Image
            src="/hero-bg.png"
            alt="Kerala pattern background"
            fill
            className="object-cover opacity-20 mix-blend-multiply"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-brand-sand/40 via-brand-sand to-brand-sand"></div>
        </div>
        
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-green/10 text-brand-green font-medium mb-8 border border-brand-green/20">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-green opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-green"></span>
            </span>
            Connecting Generations
          </div>
          <h1 className="text-5xl md:text-7xl font-bold text-gray-900 tracking-tight mb-6">
            Your Family Roots,<br className="hidden md:block" />
            <span className="text-brand-green">Beautifully Preserved.</span>
          </h1>
          <p className="mt-4 text-xl text-gray-600 max-w-3xl mx-auto mb-10 leading-relaxed font-malayalam">
            Discover, connect, and build your family tree within the Kerala Mahal structure. Preserve your <span className="font-bold text-brand-green">Veettu Peru</span> (Family Name) for generations to come.
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/search" className="inline-flex justify-center items-center gap-2 px-8 py-4 bg-brand-green text-white rounded-full font-semibold hover:bg-brand-green-light transition-all shadow-xl shadow-brand-green/20 text-lg group">
              <Search size={20} className="group-hover:scale-110 transition-transform" />
              Search Directory
            </Link>
            <Link href="/add-family" className="inline-flex justify-center items-center gap-2 px-8 py-4 bg-white text-brand-green border-2 border-brand-green/20 rounded-full font-semibold hover:border-brand-green transition-all shadow-lg shadow-gray-100 text-lg group">
              <Users size={20} className="group-hover:scale-110 transition-transform" />
              Add Your Family
            </Link>
          </div>
        </div>
      </section>

      {/* Directory Explorer - The NEW highlight */}
      <section className="relative z-20 -mt-24 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-12 text-center">
                <h2 className="text-3xl font-black text-gray-900 flex items-center justify-center gap-3">
                    <Sparkles className="text-brand-gold" />
                    Browse Community Directory
                </h2>
                <p className="text-gray-500 font-bold mt-2">Explore the lineage of your community by district and mahal</p>
            </div>
            <DirectoryTree />
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Join MahalFamily?</h2>
            <p className="text-gray-600 max-w-2xl mx-auto text-lg">Our platform ensures the privacy and authenticity of your family heritage while allowing you to connect with your community.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-brand-sand rounded-3xl p-8 border border-brand-green/10 hover:shadow-xl hover:border-brand-green/30 transition-all group">
              <div className="w-14 h-14 bg-brand-green/10 text-brand-green rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Users size={28} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Recursive Connections</h3>
              <p className="text-gray-600 leading-relaxed">
                Connect your family tree to others through marriage relationships. See how different families in your Mahal are interconnected.
              </p>
            </div>
            
            <div className="bg-brand-sand rounded-3xl p-8 border border-brand-green/10 hover:shadow-xl hover:border-brand-green/30 transition-all group">
              <div className="w-14 h-14 bg-brand-gold/20 text-brand-gold rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <KeyRound size={28} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Privacy First</h3>
              <p className="text-gray-600 leading-relaxed">
                You control what's visible. Keep specific member details private to your family or visible only to approved Mahal members.
              </p>
            </div>
            
            <div className="bg-brand-sand rounded-3xl p-8 border border-brand-green/10 hover:shadow-xl hover:border-brand-green/30 transition-all group">
              <div className="w-14 h-14 bg-brand-green/10 text-brand-green rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <MapPin size={28} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Mahal Administration</h3>
              <p className="text-gray-600 leading-relaxed">
                All entries are reviewed and verified by an authorized Mahal Admin to maintain the platform's reliability and trust.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
