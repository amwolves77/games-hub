export type Difficulty = 1 | 2 | 3;

export interface FinishPayload {
  score: number;
  correct: number;
  total: number;
}

export interface GameProps {
  difficulty: Difficulty;
  durationSec?: number;
  onFinish: (result: FinishPayload) => void;
  onExit: () => void;
}

export interface GameMeta {
  slug: string;
  title: string;
  description: string;
  tags: string[];
  ageRange: string;
}