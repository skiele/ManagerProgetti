import { useState, Dispatch, SetStateAction } from 'react';

function useLocalStorage<T>(key: string, initialValue: T, migrator?: (data: any) => T): [T, Dispatch<SetStateAction<T>>] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (!item) {
        return initialValue;
      }
      
      let data = JSON.parse(item);
      
      // Se viene fornita una funzione di migrazione, la eseguiamo sui dati caricati.
      if (migrator) {
        data = migrator(data);
      }
      
      return data;

    } catch (error) {
      console.error(error);
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