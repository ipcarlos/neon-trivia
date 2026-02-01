import React, { useEffect, useState, useRef } from 'react';

export const BackgroundMusic: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<number | null>(null);
  
  // Music parameters
  const bpm = 110;
  const beatDuration = 60 / bpm;
  let beatCount = 0;

  const playNote = (ctx: AudioContext, time: number, freq: number, type: 'square' | 'sawtooth' | 'triangle', duration: number, vol: number) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = type;
    osc.frequency.value = freq;
    
    // Filter for synth feel
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, time);
    filter.frequency.exponentialRampToValueAtTime(200, time + duration);

    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(time);
    osc.stop(time + duration);
  };

  const playKick = (ctx: AudioContext, time: number) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.5);
    gain.gain.setValueAtTime(0.5, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.5);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(time);
    osc.stop(time + 0.5);
  };

  const playHiHat = (ctx: AudioContext, time: number) => {
    // Simple noise approximation using high freq oscillator
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    
    osc.type = 'square'; // poor man's noise
    // Randomize frequency slightly to simulate noise texture
    osc.frequency.setValueAtTime(8000 + Math.random() * 1000, time); 
    
    filter.type = 'highpass';
    filter.frequency.value = 7000;

    gain.gain.setValueAtTime(0.1, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.05);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    osc.start(time);
    osc.stop(time + 0.05);
  };

  const scheduleNextBeats = () => {
    if (!audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    
    // Look ahead logic would be better, but simple interval works for this simple loop
    const now = ctx.currentTime;
    
    // Bass Line (Cyberpunk Drone-ish Arp) - Root D (73.42Hz) scale
    const baseNote = 73.42; 
    const scale = [1, 1.2, 1.5, 1.2]; // Minor intervals approx
    const currentScaleNote = scale[beatCount % 4];

    // Kick on 1
    if (beatCount % 4 === 0) {
      playKick(ctx, now);
    }
    
    // Hi-hat on every off-beat
    if (beatCount % 2 !== 0) {
      playHiHat(ctx, now);
    }

    // Synth Bass
    playNote(ctx, now, baseNote * currentScaleNote, 'sawtooth', beatDuration, 0.15);

    // Occasional High Synth (every 8 beats)
    if (beatCount % 8 === 0) {
       playNote(ctx, now, baseNote * 4, 'triangle', beatDuration * 2, 0.1);
    }

    beatCount++;
  };

  const toggleMusic = () => {
    if (isPlaying) {
      // Stop
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
        audioCtxRef.current = null;
      }
      setIsPlaying(false);
    } else {
      // Start
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      audioCtxRef.current = new AudioContext();
      beatCount = 0;
      
      // Initial play
      scheduleNextBeats();
      
      // Schedule loop
      intervalRef.current = window.setInterval(() => {
        scheduleNextBeats();
      }, beatDuration * 1000);
      
      setIsPlaying(true);
    }
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (audioCtxRef.current) audioCtxRef.current.close();
    };
  }, []);

  return (
    <button 
      onClick={toggleMusic}
      className={`
        fixed bottom-4 right-4 z-50 flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all
        ${isPlaying 
          ? 'bg-cyan-900/80 border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.5)]' 
          : 'bg-gray-900/80 border-gray-600 grayscale'}
      `}
      title={isPlaying ? "Silenciar Música" : "Activar Música"}
    >
      {isPlaying ? (
        <div className="flex gap-1 items-end h-4">
          <div className="w-1 bg-cyan-400 h-2 animate-pulse"></div>
          <div className="w-1 bg-cyan-400 h-4 animate-pulse" style={{animationDelay: '0.1s'}}></div>
          <div className="w-1 bg-cyan-400 h-3 animate-pulse" style={{animationDelay: '0.2s'}}></div>
        </div>
      ) : (
        <span className="text-gray-400 text-xl">🔇</span>
      )}
    </button>
  );
};