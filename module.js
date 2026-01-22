// Import the functions you need from the SDKs you need
  import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
  import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-analytics.js";
  import { getFirestore } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";
  // TODO: Add SDKs for Firebase products that you want to use
  // https://firebase.google.com/docs/web/setup#available-libraries

  // Your web app's Firebase configuration
  // For Firebase JS SDK v7.20.0 and later, measurementId is optional
  const firebaseConfig = {
    apiKey: "AIzaSyDSqsd9LnK6CX8vMV2vzkx5FbB6tg6PrDM",
    authDomain: "kumashika-5f5aa.firebaseapp.com",
    projectId: "kumashika-5f5aa",
    storageBucket: "kumashika-5f5aa.firebasestorage.app",
    messagingSenderId: "390122758489",
    appId: "1:390122758489:web:4dc111ac19cb4ff3182c48",
    measurementId: "G-Y5GND1BNLK"
  };

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  const analytics = getAnalytics(app);
  const db = getFirestore(app);
  window.db = db; // Make db globally accessible

  
