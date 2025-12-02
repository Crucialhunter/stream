import React, { useState, useEffect } from 'react';
import Overlay from './components/Overlay';
import ControlDeck from './components/ControlDeck';

const App: React.FC = () => {
  const [route, setRoute] = useState<string>('control');

  useEffect(() => {
    // Check for query params error (Twitch redirect mismatch often returns as query params)
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get('error');
    if (error) {
        const errorDesc = urlParams.get('error_description');
        alert(`Twitch Auth Error: ${error}\n${errorDesc}`);
        // Clean the URL
        window.history.replaceState({}, '', window.location.pathname);
    }

    // Basic hash router
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#/', '').replace('#', '');
      
      // Handle OAuth redirect from Twitch
      if (window.location.hash.includes('access_token')) {
         // If we are the main window receiving the token (Scenario A), we could parse it here.
         // But usually, we rely on the user copying it in Scenario B, or the popup handling it.
      }

      setRoute(hash || 'control');
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // OBS TRANSPARENCY FIX
  // Dynamically set the body background based on the active route.
  useEffect(() => {
    if (route === 'overlay') {
      document.body.style.backgroundColor = 'transparent';
      document.documentElement.style.backgroundColor = 'transparent';
    } else {
      document.body.style.backgroundColor = '#111827'; // bg-gray-900
      document.documentElement.style.backgroundColor = '#111827';
    }
  }, [route]);

  if (route === 'overlay') {
    return <Overlay />;
  }

  return <ControlDeck />;
};

export default App;