import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import Home from './pages/Home';
import Read from './pages/Read';
import Contemplate from './pages/Contemplate';
import Explore from './pages/Explore';
import Journey from './pages/Journey';

// Import design system
import './styles/tokens.css';
import './styles/typography.css';
import './styles/base.css';

function App() {
  // Respect system color scheme preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => {
      document.documentElement.setAttribute(
        'data-theme',
        e.matches ? 'dark' : 'light'
      );
    };

    // Set initial theme
    handleChange(mediaQuery);

    // Listen for changes
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        {/* Entry Experience - Question-first */}
        <Route path="/" element={<Home />} />

        {/* Reading Mode - Deep verse engagement */}
        <Route path="/read/:verseId" element={<Read />} />

        {/* Contemplation Mode - Meditation focus */}
        <Route path="/contemplate/:verseId" element={<Contemplate />} />

        {/* Exploration Mode - 3D semantic space */}
        <Route path="/explore" element={<Explore />} />

        {/* Guided Journeys - Curated paths */}
        <Route path="/journey/:journeyId" element={<Journey />} />

        {/* Fallback to home */}
        <Route path="*" element={<Home />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
