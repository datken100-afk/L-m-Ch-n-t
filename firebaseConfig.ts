import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAsI1eypEzj2cvASyJxLvpP22t4iT2qXsc",
  authDomain: "anatomyotter.firebaseapp.com",
  projectId: "anatomyotter",
  storageBucket: "anatomyotter.firebasestorage.app",
  messagingSenderId: "250292060010",
  appId: "1:250292060010:web:0034949b96876cb378af13",
  measurementId: "G-Z4TC7LHGMY"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Initialize Services
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };
