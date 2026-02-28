import { useState, useEffect, useCallback } from 'react';
import type { GameProps } from '../../types/game';

interface Question {
  text: string;
  options: number[];
  answer: number;
}

function generateQuestion(difficulty: 1 | 2 | 3): Question {
  const rand = (min: number, max: number) =>
    Math.floor(Math.random() * (max - min + 1)) + min;

  let a: number, b: number, text: string, answer: number;

  if (difficulty === 1) {
    a = rand(1, 10);
    b = rand(1, 10);
    text = `${a} + ${b} = ?`;
    answer = a + b;
  } else if (difficulty === 2) {
    const useMultiply = Math.random() > 0.5;
    if (useMultiply) {
      a = rand(2, 9);
      b = rand(2, 9);
      text = `${a} × ${b} = ?`;
      answer = a * b;
    } else {
      a = rand(10, 50);
      b = rand(1, 20);
      text = `${a} + ${b} = ?`;
      answer = a + b;
    }
  } else {
    const useMultiply = Math.random() > 0.4;
    if (useMultiply) {
      a = rand(6, 12);
      b = rand(6, 12);
      text = `${a} × ${b} = ?`;
      answer = a * b;
    } else {
      a = rand(20, 99);
      b = rand(10, 50);
      text = `${a} + ${b} = ?`;
      answer = a + b;
    }
  }

  const wrongSet = new Set<number>();
  while (wrongSet.size < 3) {
    const offset = rand(-10, 10);
    const candidate = answer + offset;
    if (candidate !== answer && candidate > 0) wrongSet.add(candidate);
  }
  const options = [answer, ...Array.from(wrongSet)].sort(
    () => Math.random() - 0.5
  );

  return { text, options, answer };
}

export default function MathBlitz({ difficulty, durationSec, onFinish }: GameProps) {
  const [question, setQuestion] = useState<Question>(() => generateQuestion(difficulty));
  const [selected, setSelected] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [score, setScore] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [total, setTotal] = useState(0);
  const [finished, setFinished] = useState(false);

  const handleFinish = useCallback(() => {
    if (finished) return;
    setFinished(true);
    onFinish({ score, correct, total });
  }, [finished, onFinish, score, correct, total]);

  const handleAnswer = (option: number) => {
    if (selected !== null || finished) return;

    const isCorrect = option === question.answer;
    setSelected(option);
    setFeedback(isCorrect ? 'correct' : 'wrong');
    setTotal((t) => t + 1);

    if (isCorrect) {
      setCorrect((c) => c + 1);
      setScore((s) => s + 10);
    }

    setTimeout(() => {
      setQuestion(generateQuestion(difficulty));
      setSelected(null);
      setFeedback(null);
    }, 600);
  };

  useEffect(() => {
    const handler = () => handleFinish();
    window.addEventListener('game:timeup', handler);
    return () => window.removeEventListener('game:timeup', handler);
  }, [handleFinish]);

  return (
    <div className="template-game">
      <div className="question">{question.text}</div>
      <div className="answer-grid">
        {question.options.map((opt) => {
          let cls = 'answer-btn';
          if (selected !== null) {
            if (opt === question.answer) cls += ' correct';
            else if (opt === selected) cls += ' wrong';
          }
          return (
            <button
              key={opt}
              className={cls}
              onClick={() => handleAnswer(opt)}
              disabled={selected !== null}
            >
              {opt}
            </button>
          );
        })}
      </div>
      <div className={`feedback ${feedback ?? ''}`}>
        {feedback === 'correct' ? '✓ Correct!' : feedback === 'wrong' ? '✗ Wrong' : ''}
      </div>
      <div style={{ fontSize: '0.9rem', color: 'var(--color-muted)' }}>
        Score: <strong>{score}</strong> &nbsp;|&nbsp; {correct}/{total} correct
      </div>
    </div>
  );
}
