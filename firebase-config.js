/* firebase-config.js — نجوم */

import { initializeApp }     from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore,
         collection, getDocs,
         addDoc, query,
         where, orderBy,
         limit, doc,
         setDoc }             from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey:            "AIzaSyDsAGqoUl88QHZXSq2VtcTtWDDp34xpHjE",
  authDomain:        "nojoom-a6f55.firebaseapp.com",
  projectId:         "nojoom-a6f55",
  storageBucket:     "nojoom-a6f55.firebasestorage.app",
  messagingSenderId: "171830438333",
  appId:             "1:171830438333:web:8ffdb8f4e004f68b20cad4"
};

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

export { db, collection, getDocs, addDoc, query, where, orderBy, limit, doc, setDoc };
