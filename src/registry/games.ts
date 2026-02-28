import type { GameMeta } from '../types/game';
import type { ComponentType } from 'react';
import type { GameProps } from '../types/game';

// --- Import metas ---
import mathBlitzMeta from '../games/template/meta';

// --- Import components ---
import MathBlitz from '../games/template/index';

// --- Registry entry ---
export interface GameEntry {
  meta: GameMeta;
  component: ComponentType<GameProps>;
}

const registry: GameEntry[] = [
  {
    meta: mathBlitzMeta,
    component: MathBlitz,
  },
  // Add more games here following the same pattern:
  // { meta: myGameMeta, component: MyGame }
];

export default registry;

export function getGameBySlug(slug: string): GameEntry | undefined {
  return registry.find((entry) => entry.meta.slug === slug);
}
