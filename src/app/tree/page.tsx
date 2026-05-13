"use client";

import { User } from "lucide-react";

// Mock data for the family tree
const familyData = {
  father: { name: "Mohammed Ali", role: "Father / വാപ്പ", status: "alive" },
  mother: { name: "Fathima", role: "Mother / ഉമ്മ", status: "alive" },
  children: [
    { name: "Abdul Rahman", role: "Son", spouse: "Aisha", status: "alive" },
    { name: "Khadija", role: "Daughter", spouse: "Ibrahim", status: "alive" },
    { name: "Umar", role: "Son", status: "alive" }
  ]
};

export default function FamilyTreePage() {
  return (
    <div className="min-h-screen bg-brand-sand py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="text-3xl font-bold text-gray-900">Puthan Veedu Family Tree</h1>
          <p className="text-brand-green mt-2 font-medium">Kozhikode Town Juma Masjid Mahal</p>
        </div>

        {/* Tree Layout */}
        <div className="flex flex-col items-center">
          
          {/* Parents Level */}
          <div className="flex justify-center items-center gap-16 relative">
            {/* Connecting line between parents */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-1 bg-brand-gold z-0"></div>
            
            {/* Father Node */}
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-24 h-24 bg-white rounded-full border-4 border-brand-green flex items-center justify-center shadow-lg mb-3">
                <User size={40} className="text-brand-green" />
              </div>
              <h3 className="font-bold text-gray-900">{familyData.father.name}</h3>
              <p className="text-sm text-gray-500 font-malayalam">{familyData.father.role}</p>
            </div>

            {/* Mother Node */}
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-24 h-24 bg-white rounded-full border-4 border-brand-green flex items-center justify-center shadow-lg mb-3">
                <User size={40} className="text-brand-green" />
              </div>
              <h3 className="font-bold text-gray-900">{familyData.mother.name}</h3>
              <p className="text-sm text-gray-500 font-malayalam">{familyData.mother.role}</p>
            </div>
          </div>

          {/* Vertical line connecting parents to children */}
          <div className="w-1 h-12 bg-brand-gold my-0"></div>
          {/* Horizontal line over children */}
          <div className="w-[600px] h-1 bg-brand-gold"></div>
          
          {/* Children lines down */}
          <div className="w-[600px] flex justify-between relative">
            <div className="w-1 h-8 bg-brand-gold"></div>
            <div className="w-1 h-8 bg-brand-gold absolute left-1/2 -translate-x-1/2"></div>
            <div className="w-1 h-8 bg-brand-gold"></div>
          </div>

          {/* Children Level */}
          <div className="flex justify-center gap-16 md:gap-32 w-full max-w-4xl mx-auto mt-0">
            {familyData.children.map((child, index) => (
              <div key={index} className="flex flex-col items-center relative">
                {child.spouse && (
                   <div className="absolute top-12 left-full w-12 h-1 bg-brand-gold-light z-0"></div>
                )}
                <div className="relative z-10 flex flex-col items-center">
                  <div className="w-20 h-20 bg-white rounded-full border-4 border-brand-green flex items-center justify-center shadow-lg mb-3">
                    <User size={32} className="text-brand-green" />
                  </div>
                  <h3 className="font-bold text-gray-900">{child.name}</h3>
                  <p className="text-sm text-gray-500">{child.role}</p>
                </div>
                
                {/* Connected Spouse representation */}
                {child.spouse && (
                  <div className="absolute top-0 left-[calc(100%+2rem)] flex flex-col items-center z-10">
                     <div className="w-16 h-16 bg-white rounded-full border-4 border-brand-gold-light flex items-center justify-center shadow-lg mb-3">
                        <User size={24} className="text-brand-gold" />
                     </div>
                     <h3 className="font-bold text-gray-700 text-sm">{child.spouse}</h3>
                     <p className="text-xs text-brand-gold-light">Spouse</p>
                  </div>
                )}
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}
