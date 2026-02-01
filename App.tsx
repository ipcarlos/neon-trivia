import React, { useState, useEffect, useCallback } from 'react';
import { GameState, Player, Question, GameContextType, GameMode, STORAGE_KEYS } from './types';
import { generateQuestion, generateAIHint, generateTournamentQuestions } from './services/geminiService';
import { GameSetup } from './components/GameSetup';
import { PlayerCard } from './components/PlayerCard';
import { Timer } from './components/Timer';
import { Button } from './components/Button';
import { BackgroundMusic } from './components/BackgroundMusic';
import confetti from 'canvas-confetti';

const WINNING_SCORE_RACE = 15;
const QUESTION_TIMER = 20; // Seconds

// --- SFX SYSTEM ---
const playSound = (type: 'correct' | 'wrong' | 'start') => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    const now = ctx.currentTime;
    
    if (type === 'correct') {
      // High pitch arpeggio
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.linearRampToValueAtTime(659.25, now + 0.1); // E5
      osc.frequency.linearRampToValueAtTime(783.99, now + 0.2); // G5
      
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
      
      osc.start(now);
      osc.stop(now + 0.6);
    } else if (type === 'wrong') {
      // Low buzz
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.linearRampToValueAtTime(80, now + 0.3);
      
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
      
      osc.start(now);
      osc.stop(now + 0.4);
    } else if (type === 'start') {
      // Computer beep
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    }
  } catch (e) {
    console.error("Audio play error", e);
  }
};

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.SETUP);
  const [context, setContext] = useState<GameContextType>({
    topic: '',
    turn: 1,
    winner: null,
    targetScore: WINNING_SCORE_RACE,
    mode: 'RACE'
  });

  // Session Stats (Persistent across restarts) - Load from localStorage
  const [sessionWins, setSessionWins] = useState<{ 1: number; 2: number }>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SESSION_WINS);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Error loading session wins:', e);
    }
    return { 1: 0, 2: 0 };
  });

  // Save session wins to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SESSION_WINS, JSON.stringify(sessionWins));
    } catch (e) {
      console.error('Error saving session wins:', e);
    }
  }, [sessionWins]);

  const [players, setPlayers] = useState<{ [key: number]: Player }>({
    1: { id: 1, name: 'P1', score: 0, correctAnswers: 0, streak: 0, lifelines: { fiftyFifty: true, aiHint: true } },
    2: { id: 2, name: 'P2', score: 0, correctAnswers: 0, streak: 0, lifelines: { fiftyFifty: true, aiHint: true } },
  });

  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string>('');
  
  // Dynamic Mode State - Track both questions and concepts/answers used
  const [usedQuestions, setUsedQuestions] = useState<string[]>([]);
  const [usedConcepts, setUsedConcepts] = useState<string[]>([]); // Track correct answers to avoid similar questions
  
  // Tournament Mode State
  const [tournamentQueues, setTournamentQueues] = useState<{ 1: Question[], 2: Question[] }>({ 1: [], 2: [] });
  const [tournamentRound, setTournamentRound] = useState<number>(0); // 0 to 14
  
  // UI States
  const [hiddenOptions, setHiddenOptions] = useState<number[]>([]);
  const [aiHintText, setAiHintText] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState<boolean>(false);

  const handleStartGame = (p1Name: string, p2Name: string, topic: string, mode: GameMode) => {
    setPlayers({
      1: { id: 1, name: p1Name, score: 0, correctAnswers: 0, streak: 0, lifelines: { fiftyFifty: true, aiHint: true } },
      2: { id: 2, name: p2Name, score: 0, correctAnswers: 0, streak: 0, lifelines: { fiftyFifty: true, aiHint: true } },
    });
    setContext(prev => ({ 
        ...prev, 
        topic, 
        turn: 1, 
        winner: null,
        mode,
        targetScore: mode === 'RACE' ? WINNING_SCORE_RACE : 15 // Target per player
    }));
    
    // Reset tournament state
    setTournamentQueues({ 1: [], 2: [] });
    setTournamentRound(0);
    setUsedQuestions([]);
    setUsedConcepts([]);

    setGameState(GameState.LOADING_QUESTION);
  };

  const handleReturnToSetup = () => {
    // Keeps current player names but resets game state
    setGameState(GameState.SETUP);
  };

  const fetchNextQuestion = useCallback(async () => {
    // Reset temporary states
    setHiddenOptions([]);
    setAiHintText(null);
    setSelectedOption(null);
    setFeedbackMessage('');

    try {
      if (context.mode === 'TOURNAMENT') {
          // --- TOURNAMENT MODE LOGIC ---
          // Check if queues are empty (First Load)
          if (tournamentQueues[1].length === 0) {
              const { p1, p2 } = await generateTournamentQuestions(context.topic);
              
              // Map API response to internal Question type with difficulty index and explanation
              const mapWithDifficulty = (qs: any[]) => qs.map((q, idx) => ({
                 text: q.question,
                 options: q.options,
                 correctAnswerIndex: q.correctAnswerIndex,
                 difficultyLevel: idx + 1,
                 explanation: q.explanation || ''
              }));

              const p1Qs = mapWithDifficulty(p1);
              const p2Qs = mapWithDifficulty(p2);
              
              setTournamentQueues({ 1: p1Qs, 2: p2Qs });
              
              // Set P1's first question
              setCurrentQuestion(p1Qs[0]);
              setGameState(GameState.READING_QUESTION);
          } else {
              // Get next question from the existing queue for the current player
              const playerQueue = tournamentQueues[context.turn];
              const nextQuestion = playerQueue[tournamentRound];
              
              if (!nextQuestion) {
                  console.warn("No question found for round", tournamentRound);
                  endGame();
                  return;
              }

              setCurrentQuestion(nextQuestion);
              setGameState(GameState.READING_QUESTION);
          }
      } else {
          // --- RACE MODE LOGIC (Original) ---
          const currentPlayer = players[context.turn];
          const difficulty = Math.min(15, currentPlayer.correctAnswers + 1);
          
          // Pass both questions and concepts to avoid duplicates
          const data = await generateQuestion(context.topic, difficulty, usedQuestions, usedConcepts);
          
          setCurrentQuestion({
            text: data.question,
            options: data.options,
            correctAnswerIndex: data.correctAnswerIndex,
            difficultyLevel: difficulty,
            explanation: data.explanation || ''
          });
          
          // Track both the question text and the correct answer concept
          setUsedQuestions(prev => [...prev, data.question]);
          setUsedConcepts(prev => [...prev, data.options[data.correctAnswerIndex]]);
          
          setGameState(GameState.READING_QUESTION);
      }
      
    } catch (error) {
      console.error("Failed to fetch question", error);
      if (context.mode === 'TOURNAMENT' && tournamentQueues[1].length === 0) {
          alert("Error generando el torneo. Intenta con otro tema.");
          setGameState(GameState.SETUP);
      } else {
          setGameState(GameState.PLAYING); 
      }
    }
  }, [context.topic, context.turn, context.mode, players, usedQuestions, usedConcepts, tournamentQueues, tournamentRound]);

  useEffect(() => {
    if (gameState === GameState.LOADING_QUESTION) {
      fetchNextQuestion();
    }
  }, [gameState, fetchNextQuestion]);

  const handleStartTimer = () => {
    playSound('start');
    setGameState(GameState.PLAYING);
  };

  const handleAnswer = (index: number | null) => {
    if (gameState !== GameState.PLAYING) return;
    
    setSelectedOption(index);
    const isCorrect = index === currentQuestion?.correctAnswerIndex;
    const currentPlayerId = context.turn;
    
    let pointsEarned = 0;
    if (isCorrect) {
      playSound('correct');
      // Points logic: Base 100 + Difficulty bonus
      pointsEarned = 100 + ((currentQuestion?.difficultyLevel || 1) * 10); 
      setFeedbackMessage('¡CORRECTO!');
    } else {
      playSound('wrong');
      setFeedbackMessage(index === null ? '¡TIEMPO AGOTADO!' : 'INCORRECTO');
    }

    setPlayers(prev => {
        const p = prev[currentPlayerId];
        return {
            ...prev,
            [currentPlayerId]: {
                ...p,
                score: p.score + pointsEarned,
                correctAnswers: isCorrect ? p.correctAnswers + 1 : p.correctAnswers,
                streak: isCorrect ? p.streak + 1 : 0
            }
        };
    });

    setGameState(GameState.FEEDBACK);
    setShowExplanation(true);
  };

  // Handler for continue button in feedback
  const handleContinueFromFeedback = () => {
    setShowExplanation(false);
    const currentPlayerId = context.turn;
    const wasCorrect = feedbackMessage === '¡CORRECTO!';

    // Check Win Conditions
    if (context.mode === 'RACE') {
        if (wasCorrect && players[currentPlayerId].correctAnswers >= WINNING_SCORE_RACE) {
           endGame(players[currentPlayerId]);
           return;
        }
    } else if (context.mode === 'TOURNAMENT') {
        if (currentPlayerId === 2 && tournamentRound >= 14) {
            endGame();
            return;
        }
        
        if (currentPlayerId === 2) {
            setTournamentRound(prev => prev + 1);
        }
    }

    setContext(prev => ({ ...prev, turn: prev.turn === 1 ? 2 : 1 }));
    setGameState(GameState.LOADING_QUESTION);
  };

  const endGame = (winnerOverride?: Player) => {
      let winner: Player | null = winnerOverride || null;

      if (!winner) {
          if (players[1].score > players[2].score) winner = players[1];
          else if (players[2].score > players[1].score) winner = players[2];
          else {
              if (players[1].correctAnswers > players[2].correctAnswers) winner = players[1];
              else if (players[2].correctAnswers > players[1].correctAnswers) winner = players[2];
          }
      }

      // Update Session Stats
      if (winner) {
          setSessionWins(prev => ({
              ...prev,
              [winner.id]: prev[winner.id] + 1
          }));
      }

      setContext(prev => ({ ...prev, winner }));
      setGameState(GameState.GAME_OVER);
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
  };


  // --- LIFELINE LOGIC ---
  const handleFiftyFifty = () => {
    if (!currentQuestion) return;
    const currentPlayerId = context.turn;
    
    setPlayers(prev => ({
        ...prev,
        [currentPlayerId]: {
            ...prev[currentPlayerId],
            lifelines: { ...prev[currentPlayerId].lifelines, fiftyFifty: false }
        }
    }));

    const wrongIndices = currentQuestion.options
        .map((_, idx) => idx)
        .filter(idx => idx !== currentQuestion.correctAnswerIndex);
    
    const shuffled = wrongIndices.sort(() => 0.5 - Math.random());
    setHiddenOptions(shuffled.slice(0, 2));
  };

  const handleAIHint = async () => {
    if (!currentQuestion) return;
    const currentPlayerId = context.turn;

    setPlayers(prev => ({
        ...prev,
        [currentPlayerId]: {
            ...prev[currentPlayerId],
            lifelines: { ...prev[currentPlayerId].lifelines, aiHint: false }
        }
    }));

    setAiHintText("Analizando...");
    const hint = await generateAIHint(currentQuestion.text, currentQuestion.options, currentQuestion.correctAnswerIndex);
    setAiHintText(hint);
  };


  // --- RENDERERS ---

  const renderLoading = () => (
    <div className="flex flex-col items-center justify-center h-64">
        <div className="w-20 h-20 border-8 border-cyan-500 border-t-transparent rounded-full animate-spin mb-6"></div>
        <p className="text-cyan-400 animate-pulse font-mono uppercase text-xl">
            {context.mode === 'TOURNAMENT' && tournamentQueues[1].length === 0 
                ? "GENERANDO TORNEO..." 
                : "PREPARANDO PREGUNTA..."}
        </p>
    </div>
  );

  const renderDifficultyMeter = (level: number) => {
    return (
        <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 mr-2 uppercase tracking-wider font-bold">Dificultad</span>
            <div className="flex gap-1">
                {Array.from({ length: 15 }).map((_, i) => {
                    let color = 'bg-gray-800';
                    if (i < level) {
                        if (i < 5) color = 'bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]';
                        else if (i < 10) color = 'bg-yellow-500 shadow-[0_0_5px_rgba(234,179,8,0.5)]';
                        else color = 'bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.5)]';
                    }
                    return <div key={i} className={`w-2 h-4 rounded-sm ${color} transition-colors duration-300`}></div>
                })}
            </div>
        </div>
    );
  };

  const renderGame = () => {
    const isReading = gameState === GameState.READING_QUESTION;
    const isPlaying = gameState === GameState.PLAYING;
    const isFeedback = gameState === GameState.FEEDBACK;
    const currentPlayer = players[context.turn];
    const progressLabel = context.mode === 'TOURNAMENT' 
        ? `${tournamentRound + 1} / 15`
        : `Meta: ${WINNING_SCORE_RACE}`;

    return (
    <div className="w-full max-w-7xl mx-auto px-4">
      {/* 3-Column Layout: Player 1 | Game Area | Player 2 */}
      <div className="flex flex-col lg:flex-row gap-4 lg:gap-5 items-start">
        
        {/* Player 1 Sidebar - Left */}
        <div className="w-full lg:w-72 flex-shrink-0 order-1 lg:order-1">
          <PlayerCard 
              player={players[1]} 
              isActive={context.turn === 1} 
              totalQuestions={context.mode === 'TOURNAMENT' ? 15 : WINNING_SCORE_RACE}
              layout="vertical"
          />
        </div>

        {/* Main Game Area - Center */}
        <div className="flex-1 order-3 lg:order-2 min-w-0">
          {/* Mode Badge */}
          <div className="text-center mb-4">
            <span className="bg-gray-800 text-gray-300 text-sm px-4 py-2 rounded font-mono border border-gray-600">
                {context.mode === 'TOURNAMENT' ? 'MODO TORNEO' : 'MODO CARRERA'} - PREGUNTA: {progressLabel}
            </span>
          </div>

          {/* QUESTION AREA */}
          <div className="bg-gray-900 border border-gray-700 p-6 md:p-8 rounded-xl shadow-2xl relative overflow-hidden min-h-[500px] flex flex-col justify-center">
        
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50"></div>
        
        {gameState === GameState.LOADING_QUESTION && renderLoading()}

        {(isReading || isPlaying || isFeedback) && currentQuestion && (
            <div className="animate-fade-in flex flex-col h-full w-full">
                <div className="flex justify-between items-center mb-6">
                    {renderDifficultyMeter(currentQuestion.difficultyLevel)}
                    <span className="text-sm font-bold text-cyan-500 uppercase tracking-wider bg-gray-950 px-3 py-1 rounded border border-cyan-900/50">
                        Turno de {players[context.turn].name}
                    </span>
                </div>

                <div className="flex-grow flex flex-col justify-center">
                    <h3 className={`text-3xl md:text-4xl text-white font-bold mb-8 text-center leading-snug ${isReading ? 'drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]' : ''}`}>
                        {currentQuestion.text}
                    </h3>
                    
                    {/* READY BUTTON STATE */}
                    {isReading && (
                        <div className="flex flex-col items-center justify-center animate-fade-in py-8">
                            <p className="text-gray-400 text-lg mb-6 animate-pulse">Lee la pregunta y prepárate...</p>
                            <Button 
                                onClick={handleStartTimer}
                                className="bg-green-600 hover:bg-green-500 border-green-800 shadow-[0_0_20px_rgba(34,197,94,0.4)] px-12 py-5 text-2xl font-black"
                            >
                                ESTOY LISTO
                            </Button>
                        </div>
                    )}
                </div>

                {/* AI Hint Display */}
                {aiHintText && (
                    <div className="mb-6 bg-blue-900/30 border border-blue-500/50 p-4 rounded text-base text-blue-200 animate-fade-in flex items-start gap-3">
                        <span className="text-2xl">🤖</span>
                        <i className="leading-relaxed">"{aiHintText}"</i>
                    </div>
                )}

                {/* PLAYING AREA (Options & Timer) */}
                <div className={`transition-all duration-300 ${isPlaying || isFeedback ? 'opacity-100 block' : 'opacity-0 hidden'}`}>
                    
                     <Timer 
                        duration={QUESTION_TIMER} 
                        isRunning={isPlaying} 
                        onTimeUp={() => handleAnswer(null)} 
                    />

                    <div className="grid grid-cols-1 gap-4 mt-4">
                        {currentQuestion.options.map((option, idx) => {
                            if (hiddenOptions.includes(idx)) {
                                return (
                                    <div key={idx} className="h-full border-2 border-gray-800 bg-gray-900/50 rounded p-4 flex items-center justify-center text-gray-700 font-mono text-base select-none">
                                        [OPCIÓN ELIMINADA]
                                    </div>
                                );
                            }

                            let btnVariant: 'primary' | 'secondary' | 'ghost' | 'danger' = 'ghost';
                            
                            if (isFeedback) {
                                if (idx === currentQuestion.correctAnswerIndex) btnVariant = 'primary';
                                else if (idx === selectedOption) btnVariant = 'danger';
                            }

                            return (
                                <Button
                                    key={idx}
                                    variant={btnVariant}
                                    onClick={() => handleAnswer(idx)}
                                    disabled={!isPlaying}
                                    className={`text-left w-full flex items-center p-4 md:p-5`}
                                >
                                    <span className="mr-4 text-gray-500 font-mono text-lg font-bold">[{String.fromCharCode(65 + idx)}]</span>
                                    <span className="flex-1 text-lg md:text-xl font-medium">{option}</span>
                                </Button>
                            )
                        })}
                    </div>

                    {/* Lifeline Controls */}
                    <div className="flex justify-center gap-6 mt-8 border-t border-gray-800 pt-6">
                        <button
                            onClick={handleFiftyFifty}
                            disabled={!isPlaying || !currentPlayer.lifelines.fiftyFifty}
                            className={`
                                flex items-center gap-2 px-6 py-3 rounded text-base font-bold uppercase tracking-wider transition-all
                                ${isPlaying && currentPlayer.lifelines.fiftyFifty 
                                    ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_10px_rgba(147,51,234,0.4)]' 
                                    : 'bg-gray-800 text-gray-500 cursor-not-allowed'}
                            `}
                        >
                            <span className="text-xl">✂️</span> 50:50
                        </button>
                        <button
                            onClick={handleAIHint}
                            disabled={!isPlaying || !currentPlayer.lifelines.aiHint || !!aiHintText}
                            className={`
                                flex items-center gap-2 px-6 py-3 rounded text-base font-bold uppercase tracking-wider transition-all
                                ${isPlaying && currentPlayer.lifelines.aiHint 
                                    ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_10px_rgba(37,99,235,0.4)]' 
                                    : 'bg-gray-800 text-gray-500 cursor-not-allowed'}
                            `}
                        >
                            <span className="text-xl">🧠</span> IA Hint
                        </button>
                    </div>
                </div>

                {isFeedback && showExplanation && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 backdrop-blur-sm z-20 p-6 md:p-8">
                        <h2 className={`text-4xl md:text-6xl font-black uppercase transform -rotate-2 tracking-tighter mb-8 ${feedbackMessage === '¡CORRECTO!' ? 'text-green-500 drop-shadow-[0_0_20px_rgba(34,197,94,1)]' : 'text-rose-500 drop-shadow-[0_0_20px_rgba(244,63,94,1)]'}`}>
                            {feedbackMessage}
                        </h2>
                        
                        {/* Explanation Box */}
                        {currentQuestion?.explanation && (
                            <div className="max-w-2xl w-full mx-auto bg-gray-900/95 border-2 border-gray-600 rounded-xl p-6 md:p-8 animate-fade-in shadow-2xl">
                                <div className="flex items-start gap-4">
                                    <span className="text-3xl md:text-4xl flex-shrink-0">💡</span>
                                    <div className="flex-1">
                                        <p className="text-gray-400 text-sm uppercase tracking-wider mb-2 font-bold">¿Por qué?</p>
                                        <p className="text-white text-lg md:text-xl leading-relaxed mb-4">{currentQuestion.explanation}</p>
                                        <p className="text-cyan-400 text-base md:text-lg font-medium">
                                            Respuesta correcta: <span className="text-white font-bold">{currentQuestion.options[currentQuestion.correctAnswerIndex]}</span>
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Continue Button */}
                        <button
                            onClick={handleContinueFromFeedback}
                            className="mt-8 px-10 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xl font-bold uppercase tracking-wider rounded-lg transition-all shadow-[0_0_20px_rgba(6,182,212,0.5)] hover:shadow-[0_0_30px_rgba(6,182,212,0.7)] hover:scale-105 active:scale-95"
                        >
                            Continuar →
                        </button>
                    </div>
                )}
            </div>
        )}
          </div>
        </div>

        {/* Player 2 Sidebar - Right */}
        <div className="w-full lg:w-72 flex-shrink-0 order-2 lg:order-3">
          <PlayerCard 
              player={players[2]} 
              isActive={context.turn === 2} 
              totalQuestions={context.mode === 'TOURNAMENT' ? 15 : WINNING_SCORE_RACE}
              layout="vertical"
          />
        </div>
      </div>
      
      <BackgroundMusic />
    </div>
  )};

  const renderGameOver = () => (
    <div className="text-center max-w-3xl mx-auto p-12 bg-gray-900 border-2 border-yellow-500 rounded-xl shadow-[0_0_50px_rgba(234,179,8,0.3)] animate-pop-in">
        <h1 className="text-7xl font-black text-yellow-400 mb-4 uppercase tracking-tight">Victoria</h1>
        <p className="text-gray-400 mb-10 text-2xl">
            {context.winner ? "¡Tenemos un ganador!" : "¡Ha sido un empate!"}
        </p>

        {context.winner ? (
            <div className="bg-gradient-to-b from-gray-800 to-gray-900 p-10 rounded-full w-64 h-64 mx-auto flex items-center justify-center border-4 border-yellow-400 shadow-xl mb-10">
                <div>
                    <span className="text-6xl">👑</span>
                    <h2 className="text-4xl font-bold text-white mt-4">{context.winner?.name}</h2>
                    <p className="text-yellow-500 font-mono text-2xl mt-2">{context.winner?.score} pts</p>
                </div>
            </div>
        ) : (
             <div className="mb-10 text-3xl text-white font-bold">EMPATE TÉCNICO</div>
        )}

        <div className="grid grid-cols-2 gap-10 text-left mb-12 max-w-lg mx-auto bg-gray-950 p-6 rounded-lg border border-gray-800">
             <div className="border-r border-gray-800 pr-4">
                <p className="text-gray-500 text-base uppercase mb-1">Jugador 1</p>
                <p className="text-white text-2xl font-bold truncate">{players[1].name}</p>
                <div className="flex flex-col mt-2">
                    <span className="text-cyan-400 font-mono text-xl">{players[1].score} pts</span>
                    <span className="text-gray-500 text-sm">({players[1].correctAnswers} aciertos)</span>
                </div>
             </div>
             <div className="pl-4">
                <p className="text-gray-500 text-base uppercase mb-1">Jugador 2</p>
                <p className="text-white text-2xl font-bold truncate">{players[2].name}</p>
                 <div className="flex flex-col mt-2">
                    <span className="text-purple-400 font-mono text-xl">{players[2].score} pts</span>
                    <span className="text-gray-500 text-sm">({players[2].correctAnswers} aciertos)</span>
                </div>
             </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
             <Button onClick={() => window.location.reload()} variant="ghost">
                Reiniciar Todo
            </Button>
            <Button onClick={handleReturnToSetup} variant="secondary">
                Volver al Menú
            </Button>
        </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-gray-200 font-sans selection:bg-cyan-500 selection:text-black flex flex-col">
      <div className="fixed inset-0 z-0 opacity-20 pointer-events-none" 
           style={{ 
             backgroundImage: 'linear-gradient(rgba(50, 50, 50, 1) 1px, transparent 1px), linear-gradient(90deg, rgba(50, 50, 50, 1) 1px, transparent 1px)', 
             backgroundSize: '40px 40px' 
           }}>
      </div>
      
      <div className="fixed inset-0 z-50 pointer-events-none opacity-[0.03] bg-scanlines"></div>

      <header className="relative z-10 p-5 border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-3">
                <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_red]"></div>
                <span className="font-bold tracking-widest text-gray-300 text-lg">NEON TRIVIA v2.1</span>
            </div>

            {/* Session Stats */}
            <div className="flex gap-6 items-center bg-gray-900 border border-gray-700 px-4 py-2 rounded-full shadow-lg">
                <div className="flex items-center gap-2">
                     <span className="text-gray-400 text-xs font-bold uppercase">Sesión</span>
                </div>
                <div className="flex items-center gap-4 text-sm font-mono">
                     <div className="flex items-center gap-2">
                         <span className="text-cyan-400 font-bold">{players[1].name || 'P1'}</span>
                         <span className="bg-gray-800 px-2 rounded text-white">{sessionWins[1]} 🏆</span>
                     </div>
                     <span className="text-gray-600">|</span>
                     <div className="flex items-center gap-2">
                         <span className="text-purple-400 font-bold">{players[2].name || 'P2'}</span>
                         <span className="bg-gray-800 px-2 rounded text-white">{sessionWins[2]} 🏆</span>
                     </div>
                </div>
            </div>

            {gameState !== GameState.SETUP && (
                <div className="hidden md:block text-sm font-mono text-cyan-500 border border-cyan-900 px-3 py-1 rounded bg-cyan-950/30">
                    TEMA: {context.topic.toUpperCase().substring(0, 20)}...
                </div>
            )}
        </div>
      </header>

      <main className="relative z-10 flex-grow flex items-center justify-center p-4 md:p-8">
        {gameState === GameState.SETUP && (
            <GameSetup 
                onStartGame={handleStartGame} 
                initialP1={players[1].name === 'P1' ? '' : players[1].name} 
                initialP2={players[2].name === 'P2' ? '' : players[2].name} 
            />
        )}
        {(gameState === GameState.LOADING_QUESTION || gameState === GameState.READING_QUESTION || gameState === GameState.PLAYING || gameState === GameState.FEEDBACK) && renderGame()}
        {gameState === GameState.GAME_OVER && renderGameOver()}
      </main>
    </div>
  );
};

export default App;