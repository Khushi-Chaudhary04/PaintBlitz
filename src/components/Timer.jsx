import { useEffect, useState, useRef } from 'react';
import { Clock } from 'lucide-react';

export const Timer = ({ startTime, gameDuration, onTimeUp }) => {
  const [timeRemaining, setTimeRemaining] = useState(gameDuration);
  const hasFiredRef = useRef(false);
  const onTimeUpRef = useRef(onTimeUp);

  useEffect(() => { onTimeUpRef.current = onTimeUp; }, [onTimeUp]);

  useEffect(() => {
    if (!startTime || !gameDuration) return;
    hasFiredRef.current = false;

    const interval = setInterval(() => {
      const now = Math.floor(Date.now() / 1000);
      const elapsed = now - Number(startTime);
      const remaining = Math.max(0, gameDuration - elapsed);
      setTimeRemaining(remaining);

      if (remaining === 0 && !hasFiredRef.current) {
        hasFiredRef.current = true;
        clearInterval(interval);
        onTimeUpRef.current?.();
      }
    }, 100);

    return () => clearInterval(interval);
  }, [startTime, gameDuration]);

  const percentage = (timeRemaining / gameDuration) * 100;
  const isLowTime = timeRemaining <= 10;

  const formatTime = (secs) => {
    if (secs >= 60) {
      const m = Math.floor(secs / 60);
      const s = secs % 60;
      return `${m}:${s.toString().padStart(2, '0')}`;
    }
    return `${secs}s`;
  };

  return (
    <div className="bg-gradient-to-br from-purple-900/30 to-cyan-900/30 border border-purple-500/30 rounded-2xl p-6 backdrop-blur-sm">
      <div className="flex items-center gap-2 mb-4">
        <Clock className={`w-6 h-6 ${isLowTime ? 'text-red-400' : 'text-cyan-400'}`} />
        <h2 className="text-xl font-bold text-white">Time Remaining</h2>
      </div>
      <div className={`text-5xl font-bold text-center mb-4 ${isLowTime ? 'text-red-400 animate-pulse' : 'text-cyan-400'}`}>
        {formatTime(timeRemaining)}
      </div>
      <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${isLowTime ? 'bg-gradient-to-r from-red-600 to-red-400' : 'bg-gradient-to-r from-cyan-600 to-purple-600'}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {isLowTime && timeRemaining > 0 && (
        <p className="text-center text-red-400 font-bold mt-2 text-sm animate-pulse">HURRY UP!</p>
      )}
      {timeRemaining === 0 && (
        <p className="text-center text-yellow-400 font-bold mt-2 text-sm">⏳ Finalizing game...</p>
      )}
    </div>
  );
};
