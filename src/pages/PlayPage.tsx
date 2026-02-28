import { useParams } from 'react-router-dom';
import { getGameBySlug } from '../registry/games';
import GameShell from '../components/GameShell';
import NotFound from '../components/NotFound';

export default function PlayPage() {
  const { slug } = useParams<{ slug: string }>();
  const entry = slug ? getGameBySlug(slug) : undefined;

  if (!entry) {
    return <NotFound />;
  }

  return <GameShell entry={entry} />;
}
