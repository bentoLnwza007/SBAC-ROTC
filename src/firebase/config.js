// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDEDYrb3vhcfmW5cY7Nm2GPbsEGaBPb7SQ",
  authDomain: "sbsc-rotc-checkin.firebaseapp.com",
  projectId: "sbsc-rotc-checkin",
  storageBucket: "sbsc-rotc-checkin.firebasestorage.app",
  messagingSenderId: "129009368866",
  appId: "1:129009368866:web:973feeb0bda3042d18af7b",
  measurementId: "G-JEJLB9NS7Q"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app); 