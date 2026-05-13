/*
  Firestore NoSQL Data Structure for MahalFamily

  Since we are using Firebase Firestore (NoSQL), we need to structure data in Collections and Documents. 
  Here is the recommended schema to handle the Mahal hierarchy, Family Units, and recursive Member relations.

  1. Collection: 'mahals'
     Document ID: auto-generated string
     Fields:
       - name: string (e.g., "Kozhikode Town Juma Masjid")
       - district: string
       - taluk: string
       - createdAt: timestamp

  2. Collection: 'families'
     Document ID: auto-generated string
     Fields:
       - mahalId: string (reference to 'mahals' document ID)
       - familyName: string (Veettu Peru)
       - placeName: string
       - pincode: string
       - district: string
       - isGrandFamily: boolean (default: false)
       - grandFamilyId: string (reference to 'families' document ID, if joining one)
       - isApproved: boolean (default: false, pending Mahal Admin approval)
       - createdAt: timestamp

  3. Collection: 'members'
     Document ID: auto-generated string
     Fields:
       - familyId: string (reference to 'families' document ID)
       - firstName: string
       - lastName: string
       - gender: string ("Male" or "Female")
       - dob: string (or timestamp)
       - maritalStatus: string
       - relation: string (e.g., "Head", "Spouse", "Son", "Daughter")
       - photoUrl: string
       - isPrivate: boolean
       - isAlive: boolean
       - fatherId: string (reference to 'members' document ID, can be null)
       - motherId: string (reference to 'members' document ID, can be null)
       - createdAt: timestamp

  4. Collection: 'marriages'
     (This links two members from potentially different families to form cross-family trees)
     Document ID: auto-generated string
     Fields:
       - husbandId: string (reference to 'members' document ID)
       - wifeId: string (reference to 'members' document ID)
       - marriageDate: string (or timestamp)
       - createdAt: timestamp

  5. Collection: 'userRoles'
     (Used for Access Control / Admin Dashboard)
     Document ID: Firebase Auth User UID
     Fields:
       - role: string ("super_admin", "mahal_admin", "user")
       - mahalId: string (if role is "mahal_admin", reference to 'mahals' ID)
       - createdAt: timestamp
*/
