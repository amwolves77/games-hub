import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { GameEntry } from '../registry/games';
import type { Difficulty, FinishPayload } from '../types/game';

interface Props {
  entry: GameEntry;
}

type Phase = 'config' | 'playing' | 'finished';

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  1: '⭐ Easy',
  2: '⭐⭐ Medium',
  3: '⭐⭐⭐ Hard',
};

const DURATION_OPTIONS = [30, 60, 90, 120];

function bestScoreKey(slug: string, difficulty: Difficulty, duration: number) {
  return `lbl:${slug}:d${difficulty}:t${duration}:best`;
}

function loadBest(slug: string, difficulty: Difficulty, duration: number): number | null {
  const raw = localStorage.getItem(bestScoreKey(slug, difficulty, duration));
  if (raw === null) return null;
  const val = parseInt(raw, 10);
  return isNaN(val) ? null : val;
}

function saveBest(slug: string, difficulty: Difficulty, duration: number, score: number) {
  const key = bestScoreKey(slug, difficulty, duration);
  const prev = loadBest(slug, difficulty, duration);
  if (prev === null || score > prev) {
    localStorage.setItem(key, String(score));
    return true;
  }
  return false;
}

export default function GameShell({ entry }: Props) {
  const { meta, component: GameComponent } = entry;
  const navigate = useNavigate();

  const [difficulty, setDifficulty] = useState<Difficulty>(meta.defaultDifficulty);
  const [durationSec, setDurationSec] = useState(meta.defaultDurationSec);
  const [phase, setPhase] = useState<Phase>('config');
  const [timeLeft, setTimeLeft] = useState(durationSec);
  const [result, setResult] = useState<FinishPayload | null>(null);
  const [isNewBest, setIsNewBest] = useState(false);

  const finishedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const bestScore = loadBest(meta.slug, difficulty, durationSec);

  const stopTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const handleFinish = useCallback(
    (payload: FinishPayload) => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      stopTimer();
      const newBest = saveBest(meta.slug, difficulty, durationSec, payload.score);
      setIsNewBest(newBest);
      setResult(payload);
      setPhase('finished');
    },
    [stopTimer, meta.slug, difficulty, durationSec]
  );

  useEffect(() => {
    if (phase !== 'playing') return;
    setTimeLeft(durationSec);
    finishedRef.current = false;
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          window.dispatchEvent(new Event('game:timeup'));
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => stopTimer();
  }, [phase, durationSec, stopTimer]);

  useEffect(() => {
    if (phase === 'playing' && timeLeft === 0) {
      const timeout = setTimeout(() => {
        handleFinish({ score: 0, correct: 0, total: 0 });
      }, 700);
      return () => clearTimeout(timeout);
    }
  }, [timeLeft, phase, handleFinish]);

  const startGame = () => {
    setResult(null);
    setIsNewBest(false);
    setPhase('playing');
  };

  const playAgain = () => {
    stopTimer();
    setPhase('config');
  };

  const timerPct = durationSec > 0 ? (timeLeft / durationSec) * 100 : 0;
  const timerLow = timerPct <= 25;

  return (
    <div className="shell-layout">
      <header className="shell-header">
        <button className="back-btn" onClick={() => navigate('/')}>
          ← Home
        </button>
        <span className="shell-title">
          {meta.emoji} {meta.title}
        </span>
      </header>

      <div className="shell-body">
        {phase === 'config' && (
          <div className="config-panel">
            <div>
              <h2>{meta.emoji} {meta.title}</h2>
              <p className="game-desc">{meta.description}</p>
            </div>
            <div className="config-field">
              <label>Difficulty</label>
              <div className="btn-group">
                {([1, 2, 3] as Difficulty[]).map((d) => (
                  <button
                    key={d}
                    className={`btn-option${difficulty === d ? ' selected' : ''}`}
                    onClick={() => setDifficulty(d)}
                  >
                    {DIFFICULTY_LABELS[d]}
                  </button>
                ))}
              </div>
            </div>
            <div className="config-field">
              <label>Duration</label>
              <div className="btn-group">
                {DURATION_OPTIONS.map((sec) => (
                  <button
                    key={sec}
                    className={`btn-option${durationSec === sec ? ' selected' : ''}`}
                    onClick={() => setDurationSec(sec)}
                  >
                    {sec}s
                  </button>
                ))}
              </div>
            </div>
            {bestScore !== null && (
              <div className="best-score">
                🏆 Best score:{' '}
                <span className="value">{bestScore}</span>
              </div>
            )}
            <button className="start-btn" onClick={startGame}>
              Start Game 🚀
            </button>
          </div>
        )}

        {phase === 'playing' && (
          <div className="game-area">
            <div className="game-hud">
              <div className="hud-item">
                <span className="hud-label">Difficulty</span>
                <span className="hud-value">{DIFFICULTY_LABELS[difficulty]}</span>
              </div>
              <div className="hud-item">
                <span className="hud-label">Time</span>
                <span className={`hud-value${timerLow ? ' danger' : ''}`}>
                  {timeLeft}s
                </span>
              </div>
            </div>
            <div className="timer-bar-wrap">
              <div
                className={`timer-bar${timerLow ? ' low' : ''}`}
                style={{ width: `${timerPct}%` }}
              />
            </div>
            <div className="game-content">
              <GameComponent
                key={`${difficulty}-${durationSec}`}
                difficulty={difficulty}
                durationSec={durationSec}
                onFinish={handleFinish}
              />
            </div>
          </div>
        )}

        {phase === 'finished' && result && (
          <div className="end-screen">
            <div className="trophy">
              {result.score > 0 ? '🏆' : '😅'}
            </div>
            <h2>
              {result.score >= 100 ? 'Amazing!' : result.score >= 50 ? 'Great job!' : 'Good try!'}
            </h2>
            {isNewBest && (
              <div className="new-best">🌟 New Best Score!</div>
            )}
            <div className="end-stats">
              <div className="end-stat">
                <span className="val">{result.score}</span>
                <span className="lbl">Score</span>
              </div>
              <div className="end-stat">
                <span className="val">{result.correct}</span>
                <span className="lbl">Correct</span>
              </div>
              <div className="end-stat">
                <span className="val">{result.total}</span>
                <span className="lbl">Total</span>
              </div>
            </div>
            {loadBest(meta.slug, difficulty, durationSec) !== null && (
              <div className="best-score">
                🏆 All-time best:{' '}
                <span className="value">
                  {loadBest(meta.slug, difficulty, durationSec)}
                </span>
              </div>
            )}
            <div className="end-actions">
              <button className="play-again-btn" onClick={playAgain}>
                Play Again
              </button>
              <button className="home-btn" onClick={() => navigate('/')}>
                Home
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
