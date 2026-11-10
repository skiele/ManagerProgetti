import React, { useState } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import { SparklesIcon } from './icons';

export interface AiProjectResult {
  projectName: string;
  projectValue: number;
  projectNotes: string;
  todos: { task: string; income: number }[];
}

interface AiProjectFormProps {
  onGenerated: (result: AiProjectResult) => Promise<void>;
  onComplete: () => void;
}

// NB: la chiave Gemini nel browser è visibile a chiunque usi l'app.
// Da spostare su una Cloud Function (vedi roadmap).
const AiProjectForm: React.FC<AiProjectFormProps> = ({ onGenerated, onComplete }) => {
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description) return;
    setLoading(true);
    setError('');

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
      const schema = {
        type: Type.OBJECT,
        properties: {
          projectName: { type: Type.STRING }, projectValue: { type: Type.NUMBER }, projectNotes: { type: Type.STRING },
          todos: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { task: { type: Type.STRING }, income: { type: Type.NUMBER } }, required: ["task", "income"] } }
        },
        required: ["projectName", "projectValue", "projectNotes", "todos"]
      };

      const prompt = `Dato il brief di progetto: "${description}", genera un nome, valore, nota e 3-5 to-do comuni. Rispondi solo in JSON.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash', contents: prompt,
        config: { responseMimeType: "application/json", responseSchema: schema }
      });

      const result = JSON.parse(response.text ?? '') as AiProjectResult;
      await onGenerated(result);
      onComplete();
    } catch (err) {
      console.error(err);
      setError('Generazione fallita. Riprova.');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <textarea placeholder="Descrivi brevemente il progetto (es. 'Sito e-commerce per un negozio di abbigliamento')" value={description} onChange={e => setDescription(e.target.value)} rows={4} required disabled={loading} />
      {error && <p className="text-sm text-red-500 text-center">{error}</p>}
      <button type="submit" className="w-full bg-accent text-white py-2 rounded-lg font-semibold hover:bg-opacity-80 transition-opacity flex items-center justify-center disabled:bg-gray-400" disabled={loading}>
        {loading ? 'Generazione...' : <><SparklesIcon className="w-5 h-5 mr-2" /> Genera Progetto</>}
      </button>
    </form>
  );
};

export default AiProjectForm;
