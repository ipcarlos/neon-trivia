import React from 'react';
import { Player } from '../types';

interface PlayerCardProps {
  player: Player;
  isActive: boolean;
  totalQuestions: number;
  layout?: 'horizontal' | 'vertical';
}

export const PlayerCard: React.FC<PlayerCardProps> = ({ player, isActive, totalQuestions, layout = 'horizontal' }) => {
  const isVertical = layout === 'vertical';
  const progressPercent = Math.round((player.correctAnswers / totalQuestions) * 100);
  
  return (
    <div 
      className={`
        relative rounded-xl border-2 transition-all duration-300
        ${isActive 
          ? 'bg-gradient-to-b from-gray-800 to-gray-900 border-cyan-500 shadow-[0_0_25px_rgba(6,182,212,0.4)]' 
          : 'bg-gray-900/80 border-gray-700 opacity-60'
        }
      `}
    >
      {/* Active indicator bar */}
      {isActive && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-cyan-400 to-cyan-500 rounded-t-lg"></div>
      )}
      
      {/* Header with name */}
      <div className={`px-4 pt-4 pb-2 text-center border-b border-gray-700/50 ${isActive ? 'bg-cyan-950/30' : ''}`}>
        {isActive && (
          <span className="text-[10px] text-cyan-400 uppercase tracking-widest font-bold mb-1 block">▶ Tu turno</span>
        )}
        <h2 className="text-xl font-black text-white truncate" title={player.name}>
          {player.name}
        </h2>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 divide-x divide-gray-700/50">
        <div className={`p-3 text-center ${isActive ? 'bg-yellow-950/20' : ''}`}>
          <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Puntos</p>
          <p className="text-2xl font-mono font-black text-yellow-400">{player.score}</p>
        </div>
        <div className={`p-3 text-center ${isActive ? 'bg-green-950/20' : ''}`}>
          <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Aciertos</p>
          <p className="text-2xl font-mono font-black text-green-400">{player.correctAnswers}<span className="text-base text-gray-500">/{totalQuestions}</span></p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-3 py-2 border-t border-gray-700/50">
        <div className="h-1.5 bg-gray-950 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-500 rounded-full ${isActive ? 'bg-gradient-to-r from-cyan-500 to-cyan-300' : 'bg-gradient-to-r from-gray-600 to-gray-500'}`}
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>
        <p className="text-[10px] text-gray-500 text-center mt-1">{progressPercent}% completado</p>
      </div>

      {/* Lifelines + Streak */}
      <div className="px-3 pb-3 flex items-center justify-between gap-2">
        <div className="flex gap-1.5">
          <div className={`text-xs px-2 py-1 rounded ${player.lifelines.fiftyFifty ? 'bg-purple-600/30 text-purple-300 border border-purple-500/50' : 'bg-gray-800/50 text-gray-600 line-through'}`}>
            ✂️
          </div>
          <div className={`text-xs px-2 py-1 rounded ${player.lifelines.aiHint ? 'bg-blue-600/30 text-blue-300 border border-blue-500/50' : 'bg-gray-800/50 text-gray-600 line-through'}`}>
            🧠
          </div>
        </div>
        {player.streak > 1 && (
          <div className="text-xs bg-orange-500/20 text-orange-400 px-2 py-1 rounded border border-orange-500/30 font-bold">
            🔥 {player.streak}
          </div>
        )}
      </div>
    </div>
  );
};