import type { GameMeta } from '../types/game';
import type { ComponentType } from 'react';
import type { GameProps } from '../types/game';
import templateMeta from '../games/template/meta';
import TemplateGame from '../games/template';

// --- Import metas ---

import mathDebrisMeta from '../games/math-debris/meta';

// --- Import components ---

import MathDebris from '../games/math-debris/index';

// --- Registry entry ---
export interface GameEntry {
  meta: GameMeta;
  component: ComponentType<GameProps>;
}

const registry: GameEntry[] = [
  
  {
    meta: mathDebrisMeta,
    component: MathDebris,
  },

  {
    meta: templateMeta,
    component: TemplateGame,
  },


  // Add more games here following the same pattern:
  // { meta: myGameMeta, component: MyGame }
];

export default registry;

export function getGameBySlug(slug: string): GameEntry | undefined {
  return registry.find((entry) => entry.meta.slug === slug);
}
