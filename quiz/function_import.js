import { db } from "../module.js";

import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp, 
  updateDoc,
  arrayUnion
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

window.db = db;
window.doc = doc;
window.getDoc = getDoc;
window.setDoc = setDoc;