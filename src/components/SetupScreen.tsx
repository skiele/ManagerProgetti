
import React, { useState } from 'react';
import * as firebaseService from '../services/firebaseService';

interface SetupScreenProps {
  onNavigateToLogin: () => void;
}

const SetupScreen: React.FC<SetupScreenProps> = ({ onNavigateToLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
        setError('La password deve essere di almeno 6 caratteri.');
        return;
    }
    
    if (password !== confirmPassword) {
      setError('Le password non coincidono.');
      return;
    }

    setLoading(true);
    try {
      await firebaseService.register(email, password);
      // L'aggiornamento dello stato avverrà nel componente App tramite onAuthStateChanged
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setError('Questo indirizzo email è già in uso.');
      } else {
        setError('Si è verificato un errore durante la registrazione.');
        console.error(err);
      }
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-light dark:bg-gray-900">
      <div className="w-full max-w-md p-8 space-y-8 bg-white dark:bg-gray-800 rounded-lg shadow-2xl">
        <div className="text-center">
            <img src="/logo.svg" alt="Progetta Logo" className="w-12 h-12 mx-auto"/>
            <h1 className="mt-4 text-3xl font-bold text-gray-800 dark:text-gray-100">
                Benvenuto in Progetta
            </h1>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Crea il tuo account per iniziare.
            </p>
        </div>
        <form className="space-y-6" onSubmit={handleSetup}>
          <div>
            <label htmlFor="email" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 mt-1 border rounded-md dark:bg-gray-700 dark:border-gray-600 focus:ring-primary focus:border-primary"
              disabled={loading}
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="text-sm font-semibold text-gray-700 dark:text-gray-300"
            >
              Crea Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 mt-1 border rounded-md dark:bg-gray-700 dark:border-gray-600 focus:ring-primary focus:border-primary"
              disabled={loading}
            />
          </div>
           <div>
            <label
              htmlFor="confirm-password"
              className="text-sm font-semibold text-gray-700 dark:text-gray-300"
            >
              Conferma Password
            </label>
            <input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full p-3 mt-1 border rounded-md dark:bg-gray-700 dark:border-gray-600 focus:ring-primary focus:border-primary"
              disabled={loading}
            />
          </div>
          {error && <p className="text-sm text-red-500 text-center">{error}</p>}
          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-3 font-semibold text-white bg-primary rounded-md hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors disabled:bg-gray-400"
            >
              {loading ? 'Creazione account...' : 'Crea Account e Accedi'}
            </button>
          </div>
        </form>
         <p className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
            Hai già un account?{' '}
            <button onClick={onNavigateToLogin} className="font-semibold text-primary hover:underline focus:outline-none">
                Accedi
            </button>
        </p>
      </div>
    </div>
  );
};

export default SetupScreen;