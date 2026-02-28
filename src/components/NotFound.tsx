import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="not-found">
      <div className="emoji">🙈</div>
      <h1>Page Not Found</h1>
      <p>Oops! That page doesn't exist.</p>
      <Link to="/">← Back to Games</Link>
    </div>
  );
}
