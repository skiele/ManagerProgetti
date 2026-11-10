
import React, { useState } from 'react';
import * as firebaseService from '../services/firebaseService';
import Wordmark from './Wordmark';

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
    <div className="flex items-center justify-center h-screen bg-background">
      <div className="w-full max-w-md p-8 space-y-8 bg-card border-4 border-foreground">
        <div className="text-center">
            <Wordmark className="text-4xl" />
            <h1 className="mt-6 text-2xl font-extrabold tracking-[-0.02em] text-foreground">
                Accesso a Progetta
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
                Bentornato! Inserisci le tue credenziali.
            </p>
        </div>
        <form className="space-y-6" onSubmit={handleLogin}>
          <div>
            <label htmlFor="email" className="text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground">
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
              className="w-full p-3 mt-1 !border-2 !border-foreground"
              disabled={loading}
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground"
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
              className="w-full p-3 mt-1 !border-2 !border-foreground"
              disabled={loading}
            />
          </div>
          {error && <p className="text-sm text-red-500 text-center">{error}</p>}
          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-3 font-semibold text-primary-foreground bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-signal disabled:opacity-50"
            >
              {loading ? 'Accesso in corso...' : 'Accedi'}
            </button>
          </div>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
            Non hai un account?{' '}
            <button onClick={onNavigateToRegister} className="font-semibold underline underline-offset-[3px] hover:text-muted-foreground">
                Registrati
            </button>
        </p>
      </div>
    </div>
  );
};

export default LoginScreen;