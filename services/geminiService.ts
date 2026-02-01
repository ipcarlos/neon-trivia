import { GoogleGenAI, Type, Schema } from "@google/genai";
import { GeneratedQuestionResponse } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const questionSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    question: {
      type: Type.STRING,
      description: "El texto de la pregunta.",
    },
    options: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Un array de exactamente 4 opciones de respuesta.",
    },
    correctAnswerIndex: {
      type: Type.INTEGER,
      description: "El índice (0-3) de la respuesta correcta en el array de opciones.",
    },
    explanation: {
      type: Type.STRING,
      description: "Una explicación breve (1-2 frases) de por qué la respuesta correcta es la correcta. Incluye algún dato curioso si es posible.",
    },
  },
  required: ["question", "options", "correctAnswerIndex", "explanation"],
};

const playerSetSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    questions: {
      type: Type.ARRAY,
      items: questionSchema,
      description: "Una lista de 15 preguntas ordenadas de dificultad 1 a 15.",
    }
  },
  required: ["questions"]
};

// Generates a single question for Race Mode
export const generateQuestion = async (
  topic: string,
  difficulty: number,
  previousQuestions: string[] = [],
  usedConcepts: string[] = [] // Track concepts/answers to avoid similar questions
): Promise<GeneratedQuestionResponse> => {
  try {
    // Build context for avoiding duplicates - include both questions and correct answers
    const avoidContext = previousQuestions.length > 0 
      ? `
      PREGUNTAS YA USADAS (NO repetir ni reformular):
      ${previousQuestions.slice(-10).join('\n')}
      
      CONCEPTOS/RESPUESTAS YA USADOS (NO preguntar sobre estos de ninguna forma):
      ${usedConcepts.slice(-15).join(', ')}
      `
      : '';

    const prompt = `
      Eres un motor de juego de trivia experto.
      Genera una pregunta COMPLETAMENTE NUEVA y ÚNICA de tipo test (4 opciones) sobre el tema: "${topic}".
      
      Nivel de Dificultad: ${difficulty} de 15.
      
      REGLAS IMPORTANTES PARA EVITAR REPETICIONES:
      1. La pregunta debe ser sobre un aspecto DIFERENTE del tema.
      2. NO preguntes sobre los mismos personajes, fechas, lugares o conceptos ya usados.
      3. Varía el tipo de pregunta: a veces sobre fechas, otras sobre personas, otras sobre lugares, definiciones, etc.
      4. La respuesta correcta NO debe ser igual ni similar a respuestas anteriores.
      
      ${avoidContext}

      Incluye una explicación educativa breve de por qué la respuesta es correcta.
      Devuelve estrictamente JSON.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: questionSchema,
        temperature: 0.9, // Increased for more variety
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");

    const result = JSON.parse(text) as GeneratedQuestionResponse;
    
    // Ensure explanation exists
    if (!result.explanation) {
      result.explanation = "La respuesta correcta es: " + result.options[result.correctAnswerIndex];
    }

    return result;
  } catch (error) {
    console.error("Error generating question:", error);
    return {
      question: "Hubo un error conectando con la IA. ¿Cuál es la respuesta correcta?",
      options: ["Opción A", "Opción B", "Esta es la correcta (Fallback)", "Opción D"],
      correctAnswerIndex: 2,
      explanation: "Error de conexión con la IA. Esta es una pregunta de respaldo."
    };
  }
};

// Helper function to generate 15 questions for a specific player
const generatePlayerQuestions = async (topic: string, playerNum: number, otherPlayerQuestions: GeneratedQuestionResponse[] = []): Promise<GeneratedQuestionResponse[]> => {
  // Build list of concepts to avoid from other player's questions
  const avoidConcepts = otherPlayerQuestions.length > 0
    ? `
    IMPORTANTE: El otro jugador ya tiene estas preguntas. NO repitas ningún concepto similar:
    ${otherPlayerQuestions.map(q => `- ${q.question} (Resp: ${q.options[q.correctAnswerIndex]})`).join('\n')}
    `
    : '';

  const prompt = `
    Genera 15 preguntas de trivia ÚNICAS Y VARIADAS sobre el tema: "${topic}".
    Estas preguntas son EXCLUSIVAMENTE para el Jugador ${playerNum}.
    
    Requisitos:
    1. Deben estar ordenadas por dificultad:
       - Pregunta 1: Muy Fácil (Nivel 1)
       - Pregunta 8: Media (Nivel 8)
       - Pregunta 15: Experto (Nivel 15)
    2. Las 15 preguntas deben cubrir aspectos MUY DIFERENTES del tema.
    3. NO pueden haber dos preguntas sobre el mismo personaje, fecha, lugar o concepto.
    4. Incluye explicaciones educativas para cada respuesta.
    5. Varía los tipos de preguntas: fechas, personas, lugares, definiciones, "quién dijo", "cuándo ocurrió", etc.
    
    ${avoidConcepts}
  `;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: playerSetSchema,
      temperature: 0.8,
    }
  });

  const text = response.text;
  if (!text) throw new Error("No response");
  
  const data = JSON.parse(text) as { questions: GeneratedQuestionResponse[] };
  
  // Ensure all questions have explanations
  const questions = (data.questions || []).map(q => ({
    ...q,
    explanation: q.explanation || "La respuesta correcta es: " + q.options[q.correctAnswerIndex]
  }));
  
  return questions;
};

// Main function for Tournament Mode: Generates unique questions for both players
export const generateTournamentQuestions = async (topic: string): Promise<{ p1: GeneratedQuestionResponse[], p2: GeneratedQuestionResponse[] }> => {
  try {
    // Generate P1 questions first
    const p1Questions = await generatePlayerQuestions(topic, 1, []);
    
    // Then generate P2 questions, avoiding P1's concepts
    const p2Questions = await generatePlayerQuestions(topic, 2, p1Questions);

    // Validate lengths
    if (p1Questions.length < 15 || p2Questions.length < 15) {
      throw new Error("Incomplete generation");
    }

    return {
      p1: p1Questions,
      p2: p2Questions
    };

  } catch (error) {
    console.error("Error generating tournament:", error);
    const fallback = Array(15).fill(null).map((_, i) => ({
        question: `Error generando torneo. Pregunta ${i + 1} de respaldo.`,
        options: ["Error", "Error", "Error", "Error"],
        correctAnswerIndex: 0,
        explanation: "Error de conexión. Reinicia el juego."
    }));
    return { p1: fallback, p2: fallback };
  }
};

export const generateAIHint = async (question: string, options: string[], correctAnswerIndex: number): Promise<string> => {
  try {
    const correctOption = options[correctAnswerIndex];
    const prompt = `
      Actúa como una IA auxiliar en un juego.
      Pregunta: "${question}"
      Respuesta Correcta: "${correctOption}"
      
      Genera una estimación corta (máximo 1 frase) de cuál crees que es la respuesta correcta y por qué.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    return response.text || "No puedo calcular una predicción en este momento.";
  } catch (error) {
    return "Error de sistema: predicción no disponible.";
  }
};