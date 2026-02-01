export enum GameState {
  SETUP = 'SETUP',
  LOADING_QUESTION = 'LOADING_QUESTION',
  READING_QUESTION = 'READING_QUESTION',
  PLAYING = 'PLAYING',
  FEEDBACK = 'FEEDBACK',
  GAME_OVER = 'GAME_OVER'
}

export type GameMode = 'RACE' | 'TOURNAMENT'; // RACE = Original (First to 15), TOURNAMENT = Fixed 30 questions

export interface Player {
  id: 1 | 2;
  name: string;
  score: number;
  correctAnswers: number;
  streak: number;
  lifelines: {
    fiftyFifty: boolean; // true if available
    aiHint: boolean;     // true if available
  };
}

export interface Question {
  text: string;
  options: string[];
  correctAnswerIndex: number;
  difficultyLevel: number; // 1 to 15
  explanation?: string; // Why the correct answer is correct
}

export interface GameContextType {
  topic: string;
  turn: 1 | 2;
  winner: Player | null;
  targetScore: number;
  mode: GameMode;
}

export interface GeneratedQuestionResponse {
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

// localStorage keys
export const STORAGE_KEYS = {
  PLAYER_NAMES: 'neon_trivia_players',
  SESSION_WINS: 'neon_trivia_session_wins',
  LAST_TOPIC: 'neon_trivia_last_topic',
} as const;

// Random topics for "Surprise me" button
export const RANDOM_TOPICS = [
  'Cine de los 80 y 90',
  'Historia del Antiguo Egipto',
  'Videojuegos retro',
  'Astronomía y el sistema solar',
  'Geografía mundial',
  'Música rock y pop',
  'Mitología griega',
  'Inventos que cambiaron el mundo',
  'Animales salvajes',
  'Deportes olímpicos',
  'Ciencia ficción',
  'Gastronomía internacional',
  'Series de televisión',
  'Literatura clásica',
  'Tecnología e internet',
  'Marvel y DC Comics',
  'Historia medieval',
  'Curiosidades científicas',
  'Cultura japonesa',
  'Grandes exploradores',
];

export interface TournamentResponse {
  questions: GeneratedQuestionResponse[];
}