import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, where, getDocs, updateDoc, doc } from "firebase/firestore";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

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

async function makeAdmin() {
  const q = query(collection(db, "users"), where("username", "in", ["admin", "sameerhassan"]));
  const snap = await getDocs(q);
  
  if (snap.empty) {
    console.log("No matching user found. Checking all users...");
    const all = await getDocs(collection(db, "users"));
    all.docs.forEach(d => console.log(`- ${d.data().username} (Role: ${d.data().role})`));
    return;
  }

  for (const userDoc of snap.docs) {
    await updateDoc(doc(db, "users", userDoc.id), { role: "admin" });
    console.log(`Successfully promoted ${userDoc.data().username} to ADMIN.`);
  }
}

makeAdmin().catch(console.error);
