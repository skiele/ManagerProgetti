import { useState, Dispatch, SetStateAction } from 'react';

function useLocalStorage<T>(key: string, initialValue: T, migrator?: (data: any) => T): [T, Dispatch<SetStateAction<T>>] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);

      // Caso 1: Nessun dato in memoria. Usa il valore iniziale e salvalo.
      if (item === null) {
        window.localStorage.setItem(key, JSON.stringify(initialValue));
        return initialValue;
      }

      const data = JSON.parse(item);

      // Caso 2: I dati esistono, ma non c'è una funzione di migrazione. Restituisci i dati.
      if (!migrator) {
        return data;
      }
      
      // Caso 3: I dati esistono e c'è una funzione di migrazione.
      const migratedData = migrator(data);
      
      // Confronta i dati originali con quelli migrati. Se sono diversi, aggiorna localStorage.
      // Questo impedisce scritture non necessarie se i dati sono già nel nuovo formato.
      if (JSON.stringify(data) !== JSON.stringify(migratedData)) {
        console.log(`Eseguo la migrazione dei dati per la chiave: ${key}`);
        window.localStorage.setItem(key, JSON.stringify(migratedData));
      }

      return migratedData;

    } catch (error) {
      console.error(`Errore con la chiave localStorage "${key}":`, error);
      // In caso di errore (es. parsing), torna al valore iniziale e salvalo per sicurezza.
      window.localStorage.setItem(key, JSON.stringify(initialValue));
      return initialValue;
    }
  });

  const setValue: Dispatch<SetStateAction<T>> = (value) => {
    try {
      // Utilizzare la forma di aggiornamento funzionale del setter di useState per garantire di avere sempre lo stato più recente.
      // Questo previene problemi con le "stale closures".
      setStoredValue(currentState => {
        const valueToStore = value instanceof Function ? value(currentState) : value;
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
        return valueToStore;
      });
    } catch (error) {
      console.error(error);
    }
  };

  return [storedValue, setValue];
}

export default useLocalStorage;