import { Link } from 'react-router-dom';
import registry from '../registry/games';

export default function HubHome() {
  return (
    <div className="hub-layout">
      <header className="hub-header">
        <span className="logo">🎮</span>
        <div className="brand">
          <span className="brand-name">Little Big Lab</span>
          <span className="brand-sub">Kids Games Hub</span>
        </div>
      </header>

      <main className="hub-main">
        <div className="hub-hero">
          <h1>Pick a Game!</h1>
          <p>Fun, fast-paced games for young learners 🚀</p>
        </div>

        <div className="games-grid">
          {registry.map(({ meta }) => (
            <Link
              key={meta.slug}
              to={`/play/${meta.slug}`}
              className="game-card"
            >
              <div className="game-card-emoji">{meta.emoji}</div>
              <div className="game-card-title">{meta.title}</div>
              <div className="game-card-desc">{meta.description}</div>
              <div className="game-card-tags">
                <span className="tag age">Ages {meta.ageRange}</span>
                {meta.tags.map((tag) => (
                  <span key={tag} className="tag">{tag}</span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
