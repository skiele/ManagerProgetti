import React, { useState } from 'react';
import { BriefcaseIcon } from './icons';
import { hashPassword } from '../utils/auth';

interface SetupScreenProps {
  onSetupComplete: () => void;
}

const SetupScreen: React.FC<SetupScreenProps> = ({ onSetupComplete }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

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

    const passwordHash = await hashPassword(password);
    const credentials = { username, passwordHash };
    
    localStorage.setItem('userCredentials', JSON.stringify(credentials));
    onSetupComplete();
  };

  return (
    <div className="flex items-center justify-center h-screen bg-light dark:bg-gray-900">
      <div className="w-full max-w-md p-8 space-y-8 bg-white dark:bg-gray-800 rounded-lg shadow-2xl">
        <div className="text-center">
            <BriefcaseIcon className="w-12 h-12 mx-auto text-primary" />
            <h1 className="mt-4 text-3xl font-bold text-gray-800 dark:text-gray-100">
                Benvenuto in Gestione Lavori
            </h1>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Configura il tuo account per iniziare.
            </p>
        </div>
        <form className="space-y-6" onSubmit={handleSetup}>
          <div>
            <label htmlFor="username" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Crea Nome Utente
            </label>
            <input
              id="username"
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
              Crea Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 mt-1 border rounded-md dark:bg-gray-700 dark:border-gray-600 focus:ring-primary focus:border-primary"
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
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full p-3 mt-1 border rounded-md dark:bg-gray-700 dark:border-gray-600 focus:ring-primary focus:border-primary"
            />
          </div>
          {error && <p className="text-sm text-red-500 text-center">{error}</p>}
          <div>
            <button
              type="submit"
              className="w-full px-4 py-3 font-semibold text-white bg-primary rounded-md hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
            >
              Salva e Accedi
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SetupScreen;