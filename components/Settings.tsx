

import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Check, Copy, ExternalLink, ArrowLeft, ShieldCheck, AlertCircle } from 'lucide-react';
import { TwitchConfig } from '../types';
import { TWITCH_AUTH_BASE, TWITCH_SCOPES } from '../constants';

interface SettingsProps {
  config: TwitchConfig;
  onSave: (cfg: TwitchConfig) => void;
  onBack: () => void;
}

const Settings: React.FC<SettingsProps> = ({ config, onSave, onBack }) => {
  const [clientId, setClientId] = useState(config.clientId);
  const [manualToken, setManualToken] = useState(config.accessToken);
  const [channel, setChannel] = useState(config.channel);
  const [redirectUri, setRedirectUri] = useState(window.location.origin);
  const [viewerInterval, setViewerInterval] = useState(config.viewerUpdateInterval || 30);
  
  // Validation State
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{valid: boolean; msg: string} | null>(null);

  useEffect(() => {
      // If we are on a blob url (preview), origin is null or strange, default to localhost for instructions
      if (window.location.protocol === 'blob:' || window.location.href.includes('googleusercontent')) {
         setRedirectUri('http://localhost');
      }
  }, []);

  const handleTwitchConnect = () => {
    if (!clientId) {
      alert('Please enter a Client ID first');
      return;
    }
    
    // Construct Auth URL
    const scopeStr = TWITCH_SCOPES.join('+');
    const url = `${TWITCH_AUTH_BASE}?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=${scopeStr}`;
    
    // Open popup
    window.open(url, 'Twitch Auth', 'width=500,height=700');
  };

  const validateToken = async () => {
    if (!manualToken) return;
    setIsValidating(true);
    setValidationResult(null);
    
    try {
      // Sanitize token just in case
      const token = manualToken.replace(/^oauth:/, '');
      const res = await fetch('https://id.twitch.tv/oauth2/validate', {
        headers: { 'Authorization': `OAuth ${token}` }
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setValidationResult({
          valid: true,
          msg: `Valid! User: ${data.login} | Expires: ${Math.floor(data.expires_in / 3600)}h`
        });
      } else {
        setValidationResult({
          valid: false,
          msg: `Invalid: ${data.message || 'Unknown error'}`
        });
      }
    } catch (e) {
      setValidationResult({ valid: false, msg: 'Network error checking token' });
    } finally {
      setIsValidating(false);
    }
  };

  const saveSettings = () => {
    // Basic sanitization on save
    const cleanToken = manualToken.replace(/^oauth:/, '').trim();
    // Sanitize channel: remove leading #, remove spaces, lowercase
    const cleanChannel = channel.replace(/^#/, '').trim().toLowerCase();
    
    onSave({
      clientId,
      accessToken: cleanToken,
      channel: cleanChannel,
      viewerUpdateInterval: Number(viewerInterval)
    });
    onBack();
  };

  return (
    <div className="fixed inset-0 bg-gray-900 text-white z-50 flex flex-col items-center">
      {/* Scrollable Container with max height for landscape tablets */}
      <div className="w-full max-w-2xl h-full overflow-y-auto p-6">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-8 sticky top-0 bg-gray-900/95 backdrop-blur-sm py-4 z-10 border-b border-gray-800">
             <div className="flex items-center">
                <SettingsIcon className="w-8 h-8 mr-3 text-purple-500" />
                <h1 className="text-3xl font-bold">Settings</h1>
             </div>
             <button onClick={onBack} className="flex items-center text-gray-400 hover:text-white transition px-3 py-2 rounded bg-gray-800">
                <ArrowLeft className="w-5 h-5 mr-2" /> Back
            </button>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-700 space-y-8 mb-20">
          
          {/* Section 1: Setup Redirect */}
          <div>
            <h2 className="text-xl font-semibold mb-2 text-purple-400">1. Register Redirect URI</h2>
            <p className="text-sm text-gray-400 mb-3">
              Go to the <a href="https://dev.twitch.tv/console" target="_blank" className="text-blue-400 hover:underline">Twitch Dev Console</a>, create an app, and add this OAuth Redirect URI. 
              <br/><span className="text-yellow-500 font-bold">Important:</span> The URI below must <b>exactly match</b> what you put in the Twitch Console.
            </p>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={redirectUri}
                onChange={(e) => setRedirectUri(e.target.value)}
                className="flex-1 bg-gray-900 border border-gray-700 rounded p-3 focus:border-purple-500 focus:outline-none font-mono text-sm text-green-400"
                placeholder="http://localhost"
              />
              <button 
                onClick={() => navigator.clipboard.writeText(redirectUri)}
                className="px-4 bg-gray-800 hover:bg-gray-700 rounded border border-gray-700 transition"
                title="Copy to Clipboard"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Section 2: Client ID */}
          <div>
            <h2 className="text-xl font-semibold mb-2 text-purple-400">2. Client ID & Channel</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Client ID</label>
                <input 
                  type="text" 
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded p-3 focus:border-purple-500 focus:outline-none"
                  placeholder="e.g. gp762nuuoq..."
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Target Channel (Username)</label>
                <input 
                  type="text" 
                  value={channel}
                  onChange={(e) => setChannel(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded p-3 focus:border-purple-500 focus:outline-none"
                  placeholder="e.g. ninja"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Connect */}
          <div>
            <h2 className="text-xl font-semibold mb-2 text-purple-400">3. Connect</h2>
            <p className="text-sm text-gray-400 mb-4">
              Scenario A: If running locally, click Connect. <br/>
              Scenario B: If in Preview, click Connect, let it fail (Connection Refused), then copy the <code>access_token</code> from the failed URL bar into the box below.
            </p>
            
            <div className="flex gap-4 mb-4">
              <button 
                onClick={handleTwitchConnect}
                className="flex items-center px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-bold transition"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Connect with Twitch
              </button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-700"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-gray-800 text-gray-500">OR MANUAL ENTRY</span>
              </div>
            </div>

            <div className="mt-4">
               <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Access Token</label>
               <div className="flex gap-2">
                  <input 
                    type="password" 
                    value={manualToken}
                    onChange={(e) => {
                      setManualToken(e.target.value);
                      setValidationResult(null); // Clear previous validation
                    }}
                    className="flex-1 bg-gray-900 border border-gray-700 rounded p-3 focus:border-purple-500 focus:outline-none font-mono text-sm"
                    placeholder="oauth:..."
                  />
                  <button 
                    onClick={validateToken}
                    disabled={!manualToken || isValidating}
                    className="px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 rounded font-bold transition text-sm flex items-center min-w-[120px] justify-center"
                  >
                    {isValidating ? 'Checking...' : (
                      <>
                        <ShieldCheck className="w-4 h-4 mr-2" /> Check Token
                      </>
                    )}
                  </button>
               </div>
               
               {/* Validation Result Message */}
               {validationResult && (
                 <div className={`mt-2 text-sm p-2 rounded flex items-center ${validationResult.valid ? 'bg-green-900/30 text-green-400 border border-green-800' : 'bg-red-900/30 text-red-400 border border-red-800'}`}>
                   {validationResult.valid ? <Check className="w-4 h-4 mr-2" /> : <AlertCircle className="w-4 h-4 mr-2" />}
                   {validationResult.msg}
                 </div>
               )}
            </div>
          </div>

          {/* Section 4: Preferences */}
          <div>
            <h2 className="text-xl font-semibold mb-2 text-purple-400">4. Preferences</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Viewer Count Update Interval (Seconds)</label>
                <input 
                  type="number" 
                  min="5"
                  max="300"
                  value={viewerInterval}
                  onChange={(e) => setViewerInterval(Number(e.target.value))}
                  className="w-full bg-gray-900 border border-gray-700 rounded p-3 focus:border-purple-500 focus:outline-none"
                />
                <p className="text-xs text-gray-500 mt-1">Lower values update faster but use more API quota. Default: 30s.</p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-700 flex justify-end">
            <button 
              onClick={saveSettings}
              className="flex items-center px-8 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-bold transition shadow-lg shadow-green-900/50"
            >
              <Check className="w-5 h-5 mr-2" />
              Save & Exit
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Settings;
