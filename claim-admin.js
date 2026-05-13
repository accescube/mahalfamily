const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, updateDoc, doc, query, where } = require('firebase/firestore');
require('dotenv').config({ path: '.env.local' });

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  const q = query(collection(db, 'users'), where('username', 'in', ['admin', 'sameerhassan']));
  const snap = await getDocs(q);
  
  if (snap.empty) {
    console.log("No 'admin' or 'sameerhassan' found. Searching all users...");
    const all = await getDocs(collection(db, 'users'));
    all.forEach(d => console.log(`User: ${d.data().username}, ID: ${d.id}`));
    return;
  }

  for (const d of snap.docs) {
    await updateDoc(doc(db, 'users', d.id), { role: 'admin' });
    console.log(`Updated ${d.data().username} to admin role.`);
  }
}

run().catch(console.error);
