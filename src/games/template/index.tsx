import { useState, useEffect } from 'react';
import type { GameProps } from '../../types/game';

export default function TemplateGame({
  difficulty,
  durationSec,
  onFinish,
  onExit,
}: GameProps) {
  const [started, setStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(durationSec || 60);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  // Timer
  useEffect(() => {
    if (!started || finished || !durationSec) return;

    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(interval);
          setFinished(true);
          onFinish({ score, correct: score, total: score });
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [started, finished, durationSec, score, onFinish]);

  // Start screen
  if (!started) {
    return (
      <div style={{ color: 'white', textAlign: 'center', padding: 20 }}>
        <h2>Template Game</h2>
        <p>Difficulty: {difficulty}</p>
        <button onClick={() => setStarted(true)}>Start</button>
        <button onClick={onExit} style={{ marginLeft: 10 }}>
          Exit
        </button>
      </div>
    );
  }

  // End screen
  if (finished) {
    return (
      <div style={{ color: 'white', textAlign: 'center', padding: 20 }}>
        <h2>Game Over</h2>
        <p>Score: {score}</p>
        <button onClick={onExit}>Exit</button>
      </div>
    );
  }

  // Game screen
  return (
    <div style={{ color: 'white', textAlign: 'center', padding: 20 }}>
      <h2>Playing...</h2>
      <p>Time left: {timeLeft}</p>
      <p>Score: {score}</p>

      <button onClick={() => setScore((s) => s + difficulty)}>
        Increase Score
      </button>

      <div style={{ marginTop: 20 }}>
        <button
          onClick={() => {
            setFinished(true);
            onFinish({ score, correct: score, total: score });
          }}
        >
          Finish
        </button>

        <button onClick={onExit} style={{ marginLeft: 10 }}>
          Exit
        </button>
      </div>
    </div>
  );
}