import { useNavigate } from 'react-router-dom';
import type { FinishPayload } from '../types/game';

import type { GameEntry } from '../registry/games';

type Props = {
  entry: GameEntry;
};
export default function GameShell({ entry }: Props) {
  if (!entry) {
    return <div style={{ color: 'white' }}>Game not found</div>;
  }

  const Game = entry.component;
  const navigate = useNavigate();

  const handleFinish = (result: FinishPayload) => {
    console.log('Game finished:', result);
  };

  const handleExit = () => {
    navigate('/');
  };

  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <Game
        difficulty={1}
        durationSec={120}
        onFinish={handleFinish}
        onExit={handleExit}
      />
    </div>
  );
}