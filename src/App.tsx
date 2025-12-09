import React, { useState, useEffect } from 'react';
import Overlay from './components/Overlay';
import ControlDeck from './components/ControlDeck';
import { loadConfigFromStorage, saveConfigToStorage } from './services/configService';

const App: React.FC = () => {
  const [route, setRoute] = useState<string>('control');

  useEffect(() => {
    // --- TWITCH OAUTH HANDLER ---
    // Handle implicit grant redirect (token in hash)
    if (window.location.hash.includes('access_token')) {
        const hash = window.location.hash.substring(1); // Remove '#'
        const params = new URLSearchParams(hash);
        const accessToken = params.get('access_token');
        
        if (accessToken) {
             // Scenario A: Popup Mode (We are the popup)
             if (window.opener) {
                 window.opener.postMessage({ type: 'TWITCH_AUTH_SUCCESS', token: accessToken }, window.location.origin);
                 window.close();
                 return;
             }
             
             // Scenario B: Redirect Mode (Main Window)
             // We try to save it to persistent storage immediately
             const config = loadConfigFromStorage();
             if (config) {
                 config.twitchConfig.accessToken = accessToken;
                 saveConfigToStorage(config);
                 // Clean URL
                 window.history.replaceState(null, '', window.location.pathname);
                 // Reload to ensure state picks up the new config from storage
                 window.location.reload();
                 return;
             }
        }
    }

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
      
      // Ignore if it's an auth token (handled above)
      if (hash.includes('access_token')) return;

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