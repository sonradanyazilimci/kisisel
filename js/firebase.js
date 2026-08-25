// Firebase başlatma ve paylaşılan referanslar.
// site.js ve admin.js bu dosyadan import eder.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, doc, getDoc, setDoc, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, updatePassword
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { firebaseConfig } from "./firebase-config.js";

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

export {
  doc, getDoc, setDoc, onSnapshot,
  signInWithEmailAndPassword, signOut, onAuthStateChanged, updatePassword
};

// Site verisinin tamamı tek bir Firestore dokümanında tutulur: site/data
export const SITE_DOC = doc(db, "site", "data");
