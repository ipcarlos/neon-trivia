import React, { useEffect, useState } from 'react';

interface TimerProps {
  duration: number; // seconds
  onTimeUp: () => void;
  isRunning: boolean;
}

export const Timer: React.FC<TimerProps> = ({ duration, onTimeUp, isRunning }) => {
  const [timeLeft, setTimeLeft] = useState(duration);

  useEffect(() => {
    // Reset timer when active state or duration changes
    if (isRunning) {
        setTimeLeft(duration);
    }
  }, [duration, isRunning]);

  useEffect(() => {
    if (!isRunning) return;

    if (timeLeft <= 0) {
      onTimeUp();
      return;
    }

    const intervalId = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(intervalId);
  }, [isRunning, timeLeft, onTimeUp]);

  const percentage = (timeLeft / duration) * 100;
  
  // Color changes based on urgency
  let colorClass = "bg-cyan-500";
  if (percentage < 60) colorClass = "bg-yellow-500";
  if (percentage < 30) colorClass = "bg-red-500";

  return (
    <div className="w-full mb-6">
      <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">
        <span>Tiempo Restante</span>
        <span className={percentage < 30 ? "text-red-500 animate-pulse" : "text-white"}>
            {Math.ceil(timeLeft)}s
        </span>
      </div>
      <div className="h-4 bg-gray-800 rounded-full overflow-hidden border border-gray-700">
        <div 
          className={`h-full ${colorClass} transition-all duration-1000 ease-linear shadow-[0_0_10px_currentColor]`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
