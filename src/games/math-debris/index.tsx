import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

/**
 * Zero-G Lab: Math Debris
 * A high-end, 3D glassmorphism math game for kids.
 */

interface GameProps {
  difficulty: 1 | 2 | 3;
  durationSec?: number;
  onFinish: (result: { score: number; correct: number; total: number }) => void;
  onExit: () => void;
}


type OperationType = 'multiplication' | 'division' | 'squareRoot';
type GameState = 'start' | 'playing' | 'end';
type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

interface DebrisItem {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  expression: string;
  value: number;
  size: number;
  rotation: number;
  rotationSpeed: number;
  hue: number;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

interface FeedbackItem {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
}



export default function Game({
  difficulty = 1,
  durationSec = 120,
  onFinish = (res) => console.log('Game Finished:', res),
  onExit = () => {},
}: GameProps) {
  const [gameState, setGameState] = useState<GameState>('start');
  const [difficultyLocal, setDifficultyLocal] = useState<1 | 2 | 3>(difficulty);
  const [durationLocal, setDurationLocal] = useState(durationSec);
  const [score, setScore] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [incorrect, setIncorrect] = useState(0);
  const [total, setTotal] = useState(0);
  const [timeLeft, setTimeLeft] = useState(durationLocal);
  const [targetValue, setTargetValue] = useState(0);
  const [lastTargetTime, setLastTargetTime] = useState(0);
  const [gravityShift, setGravityShift] = useState<{ dir: Direction; active: boolean }>({
    dir: 'DOWN',
    active: false,
  });
  const [particles, setParticles] = useState<Particle[]>([]);
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [flash, setFlash] = useState<{ color: string; opacity: number }>({ color: '', opacity: 0 });

  const debrisRef = useRef<DebrisItem[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const feedbackRef = useRef<FeedbackItem[]>([]);
  const playAreaRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number>(null);
  const lastTimeRef = useRef<number>(0);
  const lastScoreRef = useRef(0);
  const [isInitialized, setIsInitialized] = useState(false);

  const config = useMemo(() => ({
    debrisCount: difficultyLocal === 1 ? 6 : difficultyLocal === 2 ? 9 : 12,
    speedMult: difficultyLocal === 1 ? 1.2 : difficultyLocal === 2 ? 1.8 : 2.5,
    maxVal: difficultyLocal === 1 ? 10 : difficultyLocal === 2 ? 15 : 25,
  }), [difficultyLocal]);

  const generateExpression = useCallback((type: OperationType, val: number) => {
    if (type === 'multiplication') {
      const factors: [number, number][] = [];
      for (let i = 1; i <= val; i++) if (val % i === 0) factors.push([i, val / i]);
      const [a, b] = factors[Math.floor(Math.random() * factors.length)];
      return { expr: `${a} × ${b}`, value: val };
    } else if (type === 'division') {
      const divisor = Math.floor(Math.random() * (difficultyLocal === 1 ? 5 : 10)) + 1;
      return { expr: `${val * divisor} ÷ ${divisor}`, value: val };
    } else {
      return { expr: `√${val * val}`, value: val };
    }
  }, [difficultyLocal]);

  const createDebris = useCallback((id: number, forcedValue?: number) => {
    const width = playAreaRef.current?.clientWidth || 800;
    const height = playAreaRef.current?.clientHeight || 600;
    
    const isTarget = forcedValue !== undefined;
    let val: number;
    
    if (isTarget) {
      val = forcedValue;
    } else {
      // Strictly ensure incorrect blocks never equal the target value
      do {
        val = Math.floor(Math.random() * config.maxVal) + 1;
      } while (val === targetValue);
    }
    
    const ops: OperationType[] = ['multiplication', 'division', 'squareRoot'];
    const opType = ops[Math.floor(Math.random() * ops.length)];
    
    const { expr, value } = generateExpression(opType, val);

    const angle = Math.random() * Math.PI * 2;
    const speed = (Math.random() * 0.4 + 0.6) * config.speedMult;
    const size = width < 600 ? 65 : 85;

    return {
      id,
      x: Math.random() * (width - size),
      y: Math.random() * (height - size),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      expression: expr,
      value: value,
      size: size,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 1.5,
      hue: 190, 
    };
  }, [config, generateExpression]);

  const spawnParticles = (x: number, y: number, color: string) => {
    const newParticles = Array.from({ length: 16 }).map((_, i) => ({
      id: Math.random() + i,
      x,
      y,
      vx: (Math.random() - 0.5) * 12,
      vy: (Math.random() - 0.5) * 12,
      life: 1.0,
      color,
    }));
    particlesRef.current = [...particlesRef.current, ...newParticles];
  };

  const spawnFeedback = (x: number, y: number, text: string, color: string) => {
    const newItem = { id: Date.now(), x, y, text, color, life: 1.0 };
    feedbackRef.current = [...feedbackRef.current, newItem];
  };

  const nextTarget = useCallback(() => {
    const newTarget = Math.floor(Math.random() * config.maxVal) + 1;
    setTargetValue(newTarget);
    setLastTargetTime(Date.now());
    const newDebris = Array.from({ length: config.debrisCount }).map((_, i) => 
      createDebris(i, i === 0 ? newTarget : undefined)
    );
    debrisRef.current = newDebris.sort(() => Math.random() - 0.5);
  }, [config, createDebris]);

  const triggerGravityShift = useCallback(() => {
    const dirs: Direction[] = ['UP', 'DOWN', 'LEFT', 'RIGHT'];
    const newDir = dirs[Math.floor(Math.random() * dirs.length)];
    setGravityShift({ dir: newDir, active: true });
    setFlash({ color: 'rgba(57, 255, 20, 0.15)', opacity: 0.3 });
    debrisRef.current = debrisRef.current.map(d => {
      let { vx, vy } = d;
      const boost = config.speedMult * 0.25;
      if (newDir === 'UP') vy -= boost;
      if (newDir === 'DOWN') vy += boost;
      if (newDir === 'LEFT') vx -= boost;
      if (newDir === 'RIGHT') vx += boost;
      return { ...d, vx, vy };
    });
    setTimeout(() => setGravityShift(prev => ({ ...prev, active: false })), 1800);
  }, [config.speedMult]);

  const [debrisState, setDebrisState] = useState<DebrisItem[]>([]);

  const animate = useCallback((time: number) => {
    if (gameState !== 'playing') return;
    if (!lastTimeRef.current) { lastTimeRef.current = time; requestRef.current = requestAnimationFrame(animate); return; }
    const deltaTime = Math.min((time - lastTimeRef.current) / 16.67, 2.0);
    lastTimeRef.current = time;

    const width = playAreaRef.current?.clientWidth || 800;
    const height = playAreaRef.current?.clientHeight || 600;

    debrisRef.current = debrisRef.current.map(d => {
      let nx = d.x + d.vx * deltaTime;
      let ny = d.y + d.vy * deltaTime;
      let { vx, vy } = d;
      if (nx < 0 || nx > width - d.size) { nx = nx < 0 ? 0 : width - d.size; vx *= -1; }
      if (ny < 0 || ny > height - d.size) { ny = ny < 0 ? 0 : height - d.size; vy *= -1; }
      return { ...d, x: nx, y: ny, vx, vy, rotation: d.rotation + d.rotationSpeed * deltaTime };
    });

    particlesRef.current = particlesRef.current
      .map(p => ({ ...p, x: p.x + p.vx, y: p.y + p.vy, life: p.life - 0.025 }))
      .filter(p => p.life > 0);

    feedbackRef.current = feedbackRef.current
      .map(f => ({ ...f, y: f.y - 1.5, life: f.life - 0.02 }))
      .filter(f => f.life > 0);

    setDebrisState([...debrisRef.current]);
    setParticles([...particlesRef.current]);
    setFeedback([...feedbackRef.current]);
    setFlash(prev => ({ ...prev, opacity: Math.max(0, prev.opacity - 0.05) }));
    requestRef.current = requestAnimationFrame(animate);
  }, [gameState]);

  const startGame = () => {
    setScore(0); setCorrect(0); setIncorrect(0); setTotal(0); setTimeLeft(durationLocal);
    lastScoreRef.current = 0; lastTimeRef.current = 0;
    setIsInitialized(false);
    setGameState('playing');
  };

  const exitGame = useCallback(() => {
    setGameState('end');

    setTimeout(() => {
        onFinish({ score, correct, total });
    }, 50);
    }, [score, correct, total, onFinish]);

  const handleDebrisClick = (item: DebrisItem) => {
    setTotal(prev => prev + 1);
    const centerX = item.x + item.size / 2;
    const centerY = item.y + item.size / 2;

    if (item.value === targetValue) {
      spawnParticles(centerX, centerY, '#39ff14');
      
      const timeTaken = (Date.now() - lastTargetTime) / 1000;
      const speedBonus = Math.max(0, Math.round(100 * (1 - timeTaken / 10)));
      const pointsEarned = 100 + speedBonus;
      
      spawnFeedback(centerX, centerY, `+${pointsEarned}`, '#39ff14');
      setFlash({ color: 'rgba(57, 255, 20, 0.2)', opacity: 0.4 });

      const newScore = score + pointsEarned;
      setScore(newScore);
      setCorrect(prev => prev + 1);
      
      if (Math.floor(newScore / 500) > Math.floor(lastScoreRef.current / 500)) triggerGravityShift();
      lastScoreRef.current = newScore;
      nextTarget();
    } else {
      spawnParticles(centerX, centerY, '#ff0055');
      spawnFeedback(centerX, centerY, '-50', '#ff0055');
      setFlash({ color: 'rgba(255, 0, 85, 0.2)', opacity: 0.4 });
      setIncorrect(prev => prev + 1);
      setScore(prev => Math.max(0, prev - 50));
    }
  };

  useEffect(() => {
    if (gameState === 'playing' && !isInitialized && playAreaRef.current) {
      const { clientWidth, clientHeight } = playAreaRef.current;
      if (clientWidth > 0 && clientHeight > 0) {
        nextTarget();
        setIsInitialized(true);
      }
    }
  }, [gameState, isInitialized, nextTarget]);

  useEffect(() => {
    if (gameState === 'playing' && isInitialized) {
      requestRef.current = requestAnimationFrame(animate);
    }
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [gameState, animate, isInitialized]);

  useEffect(() => {
    if (gameState !== 'playing') return;

    const timer = window.setInterval(() => {
        setTimeLeft(prev => {
        if (prev <= 1) {
            clearInterval(timer);
            exitGame();   // always triggers
            return 0;
        }
        return prev - 1;
        });
    }, 1000);

    return () => clearInterval(timer);
    }, [gameState, exitGame]);

  const styles = {
    container: {
      width: '100%', height: '100vh',
      background: 'radial-gradient(circle at 50% 50%, #0a0a1a 0%, #020205 100%)',
      color: '#fff', fontFamily: '"Inter", sans-serif',
      position: 'relative' as const, overflow: 'hidden',
      display: 'flex', flexDirection: 'column' as const, userSelect: 'none' as const,
    },
    glassPanel: {
      background: 'rgba(255, 255, 255, 0.03)',
      backdropFilter: 'blur(12px)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '16px',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
    },
    overlay: {
      position: 'absolute' as const, top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0, 0, 0, 0.85)',
      display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center',
      zIndex: 100, textAlign: 'center' as const, padding: '20px',
    },



    button: {
      padding: '20px 40px', fontSize: '1.2rem', background: 'rgba(0, 242, 255, 0.1)',
      color: '#00f2ff', border: '1px solid rgba(0, 242, 255, 0.5)', cursor: 'pointer',
      margin: '12px', textTransform: 'uppercase' as const, transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      fontWeight: '700' as const, borderRadius: '8px', letterSpacing: '2px',
    },

    selectorRow: {
      display: 'flex',
      gap: '8px',
      justifyContent: 'center',
      marginTop: '6px',
    },

    selectorButton: {
      padding: '6px 10px',
      fontSize: '0.65rem',
      background: 'rgba(255, 255, 255, 0.05)',
      color: '#888',
      border: '1px solid rgba(255, 255, 255, 0.15)',
      cursor: 'pointer',
      borderRadius: '4px',
      letterSpacing: '1px',
      textTransform: 'uppercase' as const,
    },

    selectorButtonActive: {
      background: 'rgba(0, 242, 255, 0.15)',
      color: '#00f2ff',
      border: '1px solid rgba(0, 242, 255, 0.6)',
    },


    hud: {
      padding: '15px 25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      background: 'rgba(0, 10, 20, 0.7)', backdropFilter: 'blur(8px)',
      borderBottom: '1px solid rgba(0, 242, 255, 0.2)', zIndex: 10,
    },
    targetCard: {
      padding: '10px 30px', borderRadius: '12px', background: 'rgba(0, 242, 255, 0.05)',
      border: '1px solid rgba(0, 242, 255, 0.3)', textAlign: 'center' as const,
    },
    debris: (d: DebrisItem) => ({
      position: 'absolute' as const, left: d.x, top: d.y, width: d.size, height: d.size,
      borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center',
      cursor: 'pointer', transform: `rotate(${d.rotation}deg) translateZ(0)`,
      background: 'rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(6px)',
      border: '1px solid rgba(255, 255, 255, 0.15)',
      boxShadow: 'inset 0 0 15px rgba(255, 255, 255, 0.05), 0 10px 25px rgba(0, 0, 0, 0.3)',
      fontSize: d.size * 0.24, fontWeight: '800' as const, color: '#00f2ff',
      textShadow: '0 0 8px rgba(0, 242, 255, 0.5)', transition: 'transform 0.1s ease-out',
      touchAction: 'none',
    }),
    particle: (p: Particle) => ({
      position: 'absolute' as const, left: p.x, top: p.y, width: '4px', height: '4px',
      background: p.color, borderRadius: '50%', opacity: p.life, pointerEvents: 'none' as const,
      boxShadow: `0 0 10px ${p.color}`,
    }),
    feedback: (f: FeedbackItem) => ({
      position: 'absolute' as const, left: f.x, top: f.y,
      color: f.color, fontSize: '1.5rem', fontWeight: '900',
      pointerEvents: 'none' as const, opacity: f.life,
      transform: 'translate(-50%, -50%)',
      textShadow: `0 0 10px ${f.color}`,
      zIndex: 60,
    }),
    flashOverlay: {
      position: 'absolute' as const, top: 0, left: 0, right: 0, bottom: 0,
      background: flash.color, opacity: flash.opacity,
      pointerEvents: 'none' as const, zIndex: 100,
      transition: 'opacity 0.05s linear',
    }
  };

  return (
    <div style={styles.container}>
      <div className="stars" />
      
      {gameState === 'start' && (
        <div style={styles.overlay}>
          <div style={{ ...styles.glassPanel, padding: '60px', maxWidth: '600px' }}>
            <h1 style={{ fontSize: '4rem', margin: 0, letterSpacing: '6px', color: '#00f2ff' }}>ZERO-G</h1>
            <h2 style={{ fontSize: '1.2rem', marginBottom: '50px', color: '#39ff14', opacity: 0.8 }}>UNIFIED QUANTUM SECTOR</h2>
            
            <div style={{ marginBottom: 20 }}>
  <div style={{ marginBottom: 6, color: '#777', fontSize: '0.7rem' }}>
    Difficulty
  </div>

  <div
    style={{
      display: 'flex',
      gap: '6px',
      justifyContent: 'center',
    }}
  >
    {[1, 2, 3].map((d) => (
      <button
        key={d}
        onClick={() => setDifficultyLocal(d as 1 | 2 | 3)}
        style={{
          padding: '6px 10px',
          fontSize: '0.65rem',
          background:
            difficultyLocal === d
              ? 'rgba(0, 242, 255, 0.15)'
              : 'rgba(255,255,255,0.05)',
          color: difficultyLocal === d ? '#00f2ff' : '#888',
          border:
            difficultyLocal === d
              ? '1px solid rgba(0, 242, 255, 0.6)'
              : '1px solid rgba(255,255,255,0.15)',
          cursor: 'pointer',
          borderRadius: '4px',
          letterSpacing: '1px',
          textTransform: 'uppercase',
        }}
      >
        {d === 1 ? 'Easy' : d === 2 ? 'Med' : 'Hard'}
      </button>
    ))}
  </div>
</div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ marginBottom: 6, color: '#777', fontSize: '0.7rem' }}>
                Duration
              </div>

              <div style={styles.selectorRow}>
                {[60, 90, 120].map((t) => (
                  <button
                    key={t}
                    onClick={() => setDurationLocal(t)}
                    style={{
                      ...styles.selectorButton,
                      ...(durationLocal === t ? styles.selectorButtonActive : {}),
                    }}
                  >
                    {t}s
                  </button>
                ))}
              </div>
            </div>

            <button style={styles.button} onClick={startGame}>START MISSION</button>
            <p style={{ marginTop: '30px', opacity: 0.5, fontSize: '0.8rem' }}>MIXED OPERATIONS: × | ÷ | √</p>
          </div>
        </div>
      )}

      {gameState === 'end' && (
        <div style={styles.overlay}>
          <div style={{ ...styles.glassPanel, padding: '40px', minWidth: '380px' }}>
            <h1 style={{ fontSize: '2.5rem', color: '#ff0055', marginBottom: '20px' }}>SESSION END</h1>
            <div style={{ fontSize: '1.1rem', marginBottom: '30px', textAlign: 'left', display: 'grid', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '5px' }}>
                <span>CORRECT DECODES:</span>
                <span style={{ color: '#39ff14' }}>+{correct}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '5px' }}>
                <span>INCORRECT CLICKS:</span>
                <span style={{ color: '#ff0055' }}>-{incorrect}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '5px' }}>
                <span>TIME ELAPSED:</span>
                <span style={{ color: '#00f2ff' }}>{durationSec - timeLeft}s</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', fontSize: '1.5rem', fontWeight: '900' }}>
                <span>FINAL SCORE:</span>
                <span style={{ color: '#00f2ff' }}>{score}</span>
              </div>
            </div>
            <button style={styles.button} onClick={() => setGameState('start')}>RE-INITIALIZE</button>
          </div>
        </div>
      )}

      {gameState === 'playing' && (
        <>
          <div style={styles.hud}>
            <div style={{ width: '100px' }}>
              <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>CHRONO</div>
              <div style={{ fontSize: '1.3rem', fontWeight: '700', color: timeLeft < 10 ? '#ff0055' : '#fff' }}>
                {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
              </div>
              <button onClick={() => window.location.reload()} style={{ background: 'none', border: 'none', color: '#ff0055', fontSize: '0.7rem', cursor: 'pointer', padding: 0, marginTop: '5px' }}>[ RESTART ]</button>
            </div>
            
            <div style={styles.targetCard}>
              <div style={{ fontSize: '0.7rem', opacity: 0.6, marginBottom: '4px' }}>DECODE TARGET</div>
              <div style={{ fontSize: '2.2rem', fontWeight: '900', color: '#00f2ff', textShadow: '0 0 15px rgba(0, 242, 255, 0.6)' }}>{targetValue}</div>
            </div>
            
            <div style={{ width: '100px', textAlign: 'right' }}>
              <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>CREDITS</div>
              <div style={{ fontSize: '1.3rem', fontWeight: '700', color: '#39ff14' }}>{score}</div>
            </div>
          </div>

          <div ref={playAreaRef} style={{ flex: 1, position: 'relative' }}>
            <div style={styles.flashOverlay} />
            {debrisState.map((d) => (
              <div key={d.id} style={styles.debris(d)} onClick={() => handleDebrisClick(d)}>
                {d.expression}
              </div>
            ))}
            {particles.map(p => (
              <div key={p.id} style={styles.particle(p)} />
            ))}
            {feedback.map(f => (
              <div key={f.id} style={styles.feedback(f)}>{f.text}</div>
            ))}
          </div>

          {gravityShift.active && (
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '4rem', fontWeight: '900', color: '#39ff14', textShadow: '0 0 30px #39ff14', zIndex: 50, textAlign: 'center' }}>
              LEVEL UP!
              <div style={{ fontSize: '1.2rem', opacity: 0.8, letterSpacing: '4px', marginTop: '10px' }}>QUANTUM SPEED INCREASED</div>
            </div>
          )}
        </>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
        .stars {
          position: absolute; top: 0; left: 0; width: 100%; height: 100%;
          background-image: radial-gradient(white, rgba(255,255,255,.2) 2px, transparent 40px);
          background-size: 100px 100px; opacity: 0.1; pointer-events: none;
        }
        button:hover {
          background: rgba(0, 242, 255, 0.2) !important;
          transform: translateY(-2px);
          box-shadow: 0 0 25px rgba(0, 242, 255, 0.4);
        }
        button:active { transform: translateY(0); }
      `}</style>
    </div>
  );
}

