
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Configurazione del tuo progetto Firebase
const firebaseConfig = {
    apiKey: "AIzaSyCwDgh9cVb-i839qHzXluDjAaiAnH-xAig",
    authDomain: "progetta-800ca.firebaseapp.com",
    projectId: "progetta-800ca",
    storageBucket: "progetta-800ca.firebasestorage.app",
    messagingSenderId: "133471320539",
    appId: "1:133471320539:web:5ffdfbaf074d5c58decffe",
    measurementId: "G-P05L8ZWLRC"
};

// Inizializza Firebase
const app = initializeApp(firebaseConfig);

// Esporta le istanze dei servizi Firebase che verranno usate nell'app
export const auth = getAuth(app);
export const db = getFirestore(app);