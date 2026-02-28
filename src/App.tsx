import { Routes, Route } from 'react-router-dom';
import HubHome from './components/HubHome';
import PlayPage from './pages/PlayPage';
import NotFound from './components/NotFound';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HubHome />} />
      <Route path="/play/:slug" element={<PlayPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
