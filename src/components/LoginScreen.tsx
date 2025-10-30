
import React, { useState } from 'react';
import { hashPassword } from '../utils/auth';

interface LoginScreenProps {
  onLoginSuccess: () => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const storedCredentialsJSON = localStorage.getItem('userCredentials');
    if (!storedCredentialsJSON) {
      setError('Nessuna credenziale trovata. Contattare supporto.');
      return;
    }

    const storedCredentials = JSON.parse(storedCredentialsJSON);
    const hashedPassword = await hashPassword(password);

    if (username === storedCredentials.username && hashedPassword === storedCredentials.passwordHash) {
      onLoginSuccess();
    } else {
      setError('Nome utente o password non validi.');
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
            <label htmlFor="username" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Nome Utente
            </label>
            <input
              id="username"
              name="username"
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-3 mt-1 border rounded-md dark:bg-gray-700 dark:border-gray-600 focus:ring-primary focus:border-primary"
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
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 mt-1 border rounded-md dark:bg-gray-700 dark:border-gray-600 focus:ring-primary focus:border-primary"
            />
          </div>
          {error && <p className="text-sm text-red-500 text-center">{error}</p>}
          <div>
            <button
              type="submit"
              className="w-full px-4 py-3 font-semibold text-white bg-primary rounded-md hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
            >
              Accedi
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginScreen;