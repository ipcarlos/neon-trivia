import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { Input } from './Input';
import { GameMode, RANDOM_TOPICS, STORAGE_KEYS } from '../types';

interface GameSetupProps {
  onStartGame: (p1Name: string, p2Name: string, topic: string, mode: GameMode) => void;
  initialP1?: string;
  initialP2?: string;
}

export const GameSetup: React.FC<GameSetupProps> = ({ onStartGame, initialP1 = '', initialP2 = '' }) => {
  const [p1, setP1] = useState(initialP1);
  const [p2, setP2] = useState(initialP2);
  const [topic, setTopic] = useState('');
  const [mode, setMode] = useState<GameMode>('RACE');

  // Load saved data from localStorage on mount
  useEffect(() => {
    try {
      const savedPlayers = localStorage.getItem(STORAGE_KEYS.PLAYER_NAMES);
      const savedTopic = localStorage.getItem(STORAGE_KEYS.LAST_TOPIC);
      
      if (savedPlayers) {
        const { p1: savedP1, p2: savedP2 } = JSON.parse(savedPlayers);
        if (!initialP1 && savedP1) setP1(savedP1);
        if (!initialP2 && savedP2) setP2(savedP2);
      }
      
      if (savedTopic && !topic) {
        setTopic(savedTopic);
      }
    } catch (e) {
      console.error('Error loading from localStorage:', e);
    }
  }, []);

  useEffect(() => {
    if (initialP1) setP1(initialP1);
    if (initialP2) setP2(initialP2);
  }, [initialP1, initialP2]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (p1.trim() && p2.trim() && topic.trim()) {
      // Save to localStorage before starting
      try {
        localStorage.setItem(STORAGE_KEYS.PLAYER_NAMES, JSON.stringify({ p1: p1.trim(), p2: p2.trim() }));
        localStorage.setItem(STORAGE_KEYS.LAST_TOPIC, topic.trim());
      } catch (e) {
        console.error('Error saving to localStorage:', e);
      }
      onStartGame(p1, p2, topic, mode);
    }
  };

  const handleRandomTopic = () => {
    const randomIndex = Math.floor(Math.random() * RANDOM_TOPICS.length);
    setTopic(RANDOM_TOPICS[randomIndex]);
  };

  return (
    <div className="max-w-2xl w-full mx-auto bg-gray-900/90 backdrop-blur-lg p-10 rounded-xl border border-gray-700 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
      <div className="text-center mb-10">
        <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 uppercase tracking-tighter mb-3">
          Neon Trivia
        </h1>
        <p className="text-gray-400 text-lg">Configura tu batalla de conocimiento</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="space-y-6">
            <Input 
                label="Jugador 1" 
                placeholder="Nombre del Jugador 1" 
                value={p1}
                onChange={(e) => setP1(e.target.value)}
                maxLength={12}
                autoFocus
            />
            <Input 
                label="Jugador 2" 
                placeholder="Nombre del Jugador 2" 
                value={p2}
                onChange={(e) => setP2(e.target.value)}
                maxLength={12}
            />
        </div>
        
        <div className="pt-6 border-t border-gray-700">
            <label className="block text-cyan-400 text-base font-bold mb-3 uppercase tracking-wide">
              Tema de la Trivia
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <input 
                    type="text"
                    placeholder="Ej: Star Wars, Historia Romana, Química..." 
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="w-full bg-gray-800 border-2 border-gray-600 rounded px-4 py-3 text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none transition-colors"
                />
              </div>
              <button
                type="button"
                onClick={handleRandomTopic}
                className="px-5 py-3 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold rounded transition-all shadow-[0_0_15px_rgba(219,39,119,0.4)] hover:shadow-[0_0_20px_rgba(219,39,119,0.6)] flex items-center justify-center gap-2 whitespace-nowrap"
                title="Tema aleatorio"
              >
                <span className="text-xl">🎲</span>
                <span>Sorpréndeme</span>
              </button>
            </div>
        </div>

        <div className="pt-2">
          <label className="block text-cyan-400 text-base font-bold mb-3 uppercase tracking-wide">
            Modo de Juego
          </label>
          <div className="grid grid-cols-2 gap-6">
            <div 
              onClick={() => setMode('RACE')}
              className={`cursor-pointer p-6 rounded border-2 transition-all ${mode === 'RACE' ? 'bg-cyan-900/40 border-cyan-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-500 hover:border-gray-600'}`}
            >
              <div className="font-bold text-lg uppercase mb-2">Carrera (Clásico)</div>
              <div className="text-sm opacity-80 leading-relaxed">Gana el primero en llegar a 15 aciertos. Dificultad dinámica.</div>
            </div>

            <div 
              onClick={() => setMode('TOURNAMENT')}
              className={`cursor-pointer p-6 rounded border-2 transition-all ${mode === 'TOURNAMENT' ? 'bg-purple-900/40 border-purple-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-500 hover:border-gray-600'}`}
            >
              <div className="font-bold text-lg uppercase mb-2">Torneo (30 Preg)</div>
              <div className="text-sm opacity-80 leading-relaxed">30 preguntas fijas. Gana quien tenga más puntos al final.</div>
            </div>
          </div>
        </div>

        <Button 
            type="submit" 
            fullWidth 
            disabled={!p1.trim() || !p2.trim() || !topic.trim()}
            className="mt-4"
        >
          Iniciar Partida
        </Button>
      </form>
    </div>
  );
};