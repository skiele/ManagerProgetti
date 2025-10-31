
import React, { useState } from 'react';
import * as firebaseService from '../services/firebaseService';

interface LoginScreenProps {
  onNavigateToRegister: () => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onNavigateToRegister }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await firebaseService.login(email, password);
      // L'aggiornamento dello stato avverrà nel componente App tramite onAuthStateChanged
    } catch (err: any) {
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Email o password non validi.');
      } else {
        setError('Si è verificato un errore durante l\'accesso.');
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
                Accesso a Progetta
            </h1>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Bentornato! Inserisci le tue credenziali.
            </p>
        </div>
        <form className="space-y-6" onSubmit={handleLogin}>
          <div>
            <label htmlFor="email" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Email
            </label>
            <input
              id="email"
              name="email"
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
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
              {loading ? 'Accesso in corso...' : 'Accedi'}
            </button>
          </div>
        </form>
        <p className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
            Non hai un account?{' '}
            <button onClick={onNavigateToRegister} className="font-semibold text-primary hover:underline focus:outline-none">
                Registrati
            </button>
        </p>
      </div>
    </div>
  );
};

export default LoginScreen;