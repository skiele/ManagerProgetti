
import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import {
    initializeFirestore,
    connectFirestoreEmulator,
    persistentLocalCache,
    persistentMultipleTabManager,
} from "firebase/firestore";

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

// - ignoreUndefinedProperties: Firestore rifiuta i campi `undefined`; così vengono semplicemente omessi.
// - persistentLocalCache: cache su IndexedDB, l'app resta usabile offline e sincronizza al ritorno della rete.
export const db = initializeFirestore(app, {
    ignoreUndefinedProperties: true,
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});

// Solo per lo sviluppo locale: `VITE_USE_EMULATOR=true npm run dev`
if (import.meta.env.VITE_USE_EMULATOR === 'true') {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
}
