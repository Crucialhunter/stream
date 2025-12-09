import React, { useState, useEffect, useRef } from 'react';
import { Peer, DataConnection } from 'peerjs';
import { Settings as SettingsIcon, Check, Copy, ExternalLink, ArrowLeft, ShieldCheck, AlertCircle, Zap, Maximize, Minimize, Share2, Download, Upload, Smartphone, Monitor } from 'lucide-react';
import { TwitchConfig, SoundItem, DeckConfig, SyncPayload } from '../types';
import { TWITCH_AUTH_BASE, TWITCH_SCOPES, SYNC_PEER_PREFIX } from '../constants';
import { exportConfigToJson, validateConfig } from '../services/configService';

interface SettingsProps {
  config: TwitchConfig;
  soundButtons: SoundItem[];
  setTwitchConfig: (cfg: TwitchConfig) => void;
  setSoundButtons: (btns: SoundItem[]) => void;
  onBack: () => void;
  isFullscreen: boolean;
  toggleFullscreen: () => void;
}

const Settings: React.FC<SettingsProps> = ({ 
  config, soundButtons, setTwitchConfig, setSoundButtons, 
  onBack, isFullscreen, toggleFullscreen 
}) => {
  // Tab State
  const [activeTab, setActiveTab] = useState<'general' | 'sync'>('general');

  // --- GENERAL SETTINGS STATE ---
  const [clientId, setClientId] = useState(config.clientId);
  const [manualToken, setManualToken] = useState(config.accessToken);
  const [channel, setChannel] = useState(config.channel);
  const [redirectUri, setRedirectUri] = useState(window.location.origin);
  const [viewerInterval, setViewerInterval] = useState(config.viewerUpdateInterval || 30);
  const [preventSleep, setPreventSleep] = useState(config.preventSleep || false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{valid: boolean; msg: string} | null>(null);

  // --- SYNC STATE ---
  const [syncCode, setSyncCode] = useState(''); // User input for receiver
  const [generatedCode, setGeneratedCode] = useState(''); // Generated for sender
  const [syncStatus, setSyncStatus] = useState<'IDLE' | 'WAITING' | 'CONNECTING' | 'SENT' | 'RECEIVED' | 'ERROR'>('IDLE');
  const [incomingConfig, setIncomingConfig] = useState<DeckConfig | null>(null);
  
  // Refs for cleanup
  const peerRef = useRef<Peer | null>(null);
  const connRef = useRef<DataConnection | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Determine Redirect URI
    if (window.location.protocol === 'blob:' || window.location.href.includes('googleusercontent')) {
       setRedirectUri('http://localhost');
    }

    // Listen for Twitch Auth Popup Message
    const handleMessage = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        if (event.data?.type === 'TWITCH_AUTH_SUCCESS' && event.data.token) {
            setManualToken(event.data.token);
            setValidationResult({ valid: true, msg: 'Token received! Click Save.' });
        }
    };
    window.addEventListener('message', handleMessage);
    
    // Cleanup Peer on unmount
    return () => {
        cleanupPeer();
        window.removeEventListener('message', handleMessage);
    };
  }, []);

  const cleanupPeer = () => {
      if (connRef.current) {
          connRef.current.close();
          connRef.current = null;
      }
      if (peerRef.current) {
          peerRef.current.destroy();
          peerRef.current = null;
      }
  };

  // --- GENERAL FUNCTIONS ---

  const handleTwitchConnect = () => {
    if (!clientId) {
      alert('Please enter a Client ID first');
      return;
    }
    const scopeStr = TWITCH_SCOPES.join('+');
    const url = `${TWITCH_AUTH_BASE}?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=${scopeStr}`;
    window.open(url, 'Twitch Auth', 'width=500,height=700');
  };

  const validateToken = async () => {
    if (!manualToken) return;
    setIsValidating(true);
    setValidationResult(null);
    try {
      const token = manualToken.replace(/^oauth:/, '');
      const res = await fetch('https://id.twitch.tv/oauth2/validate', {
        headers: { 'Authorization': `OAuth ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setValidationResult({ valid: true, msg: `Valid! User: ${data.login}` });
      } else {
        setValidationResult({ valid: false, msg: `Invalid: ${data.message}` });
      }
    } catch (e) {
      setValidationResult({ valid: false, msg: 'Network error' });
    } finally {
      setIsValidating(false);
    }
  };

  const saveGeneralSettings = () => {
    const cleanToken = manualToken.replace(/^oauth:/, '').trim();
    const cleanChannel = channel.replace(/^#/, '').trim().toLowerCase();
    
    setTwitchConfig({
      clientId,
      accessToken: cleanToken,
      channel: cleanChannel,
      viewerUpdateInterval: Number(viewerInterval),
      preventSleep
    });
    // Note: ControlDeck effects will handle persisting to localStorage/ConfigService
    onBack();
  };

  // --- SYNC & BACKUP FUNCTIONS ---

  // 1. Sender (Host)
  const startSender = () => {
      cleanupPeer();
      const code = Math.floor(1000 + Math.random() * 9000).toString();
      setGeneratedCode(code);
      setSyncStatus('WAITING');
      
      const peer = new Peer(`${SYNC_PEER_PREFIX}${code}`);
      peerRef.current = peer;
      
      peer.on('connection', (conn) => {
          connRef.current = conn;
          conn.on('open', () => {
              // Build Payload
              const payload: SyncPayload = {
                  type: 'SYNC_CONFIG_PUSH',
                  config: {
                      soundButtons,
                      twitchConfig: {
                          clientId,
                          accessToken: manualToken,
                          channel,
                          viewerUpdateInterval: Number(viewerInterval),
                          preventSleep
                      }
                  }
              };
              conn.send(payload);
              setSyncStatus('SENT');
              setTimeout(() => {
                  cleanupPeer();
                  setSyncStatus('IDLE');
                  setGeneratedCode('');
              }, 5000);
          });
      });

      peer.on('error', (err) => {
          console.error(err);
          setSyncStatus('ERROR');
      });
  };

  // 2. Receiver (Client)
  const connectReceiver = () => {
      if (syncCode.length !== 4) return;
      cleanupPeer();
      setSyncStatus('CONNECTING');

      const peer = new Peer();
      peerRef.current = peer;

      peer.on('open', () => {
          const conn = peer.connect(`${SYNC_PEER_PREFIX}${syncCode}`);
          connRef.current = conn;

          conn.on('open', () => {
              console.log("Connected to Sender");
          });

          conn.on('data', (data: any) => {
              const payload = data as SyncPayload;
              if (payload.type === 'SYNC_CONFIG_PUSH' && validateConfig(payload.config)) {
                  setIncomingConfig(payload.config);
                  setSyncStatus('RECEIVED');
              }
          });
          
          conn.on('error', () => setSyncStatus('ERROR'));
      });
      
      peer.on('error', () => setSyncStatus('ERROR'));
  };

  const applyIncomingConfig = () => {
      if (incomingConfig) {
          setSoundButtons(incomingConfig.soundButtons);
          setTwitchConfig(incomingConfig.twitchConfig);
          // Update local state to reflect new config immediately in UI inputs
          setClientId(incomingConfig.twitchConfig.clientId);
          setManualToken(incomingConfig.twitchConfig.accessToken);
          setChannel(incomingConfig.twitchConfig.channel);
          setPreventSleep(incomingConfig.twitchConfig.preventSleep || false);
          
          setIncomingConfig(null);
          setSyncStatus('IDLE');
          setSyncCode('');
          cleanupPeer();
          alert('Profile imported successfully!');
      }
  };

  // 3. Backup (JSON)
  const handleExport = () => {
      const currentConfig: DeckConfig = {
          soundButtons,
          twitchConfig: { 
            clientId, 
            accessToken: manualToken, 
            channel, 
            viewerUpdateInterval: Number(viewerInterval), 
            preventSleep 
          }
      };
      exportConfigToJson(currentConfig);
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
          try {
              const json = JSON.parse(ev.target?.result as string);
              if (validateConfig(json)) {
                  setIncomingConfig(json as DeckConfig);
                  setSyncStatus('RECEIVED'); // Re-use the modal logic
              } else {
                  alert('Invalid profile file.');
              }
          } catch (err) {
              alert('Failed to parse JSON.');
          }
      };
      reader.readAsText(file);
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
  };


  return (
    <div className="fixed inset-0 bg-gray-900 text-white z-50 flex flex-col items-center">
      <div className="w-full max-w-2xl h-full flex flex-col">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 bg-gray-900/95 backdrop-blur-sm z-20 border-b border-gray-800 flex-shrink-0">
             <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-800 rounded-lg">
                  <SettingsIcon className="w-6 h-6 text-purple-500" />
                </div>
                <h1 className="text-2xl font-bold">Settings</h1>
             </div>
             <button onClick={onBack} className="flex items-center text-gray-400 hover:text-white transition px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 font-medium">
                <ArrowLeft className="w-5 h-5 mr-2" /> Back
            </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-800 bg-gray-900">
            <button 
                onClick={() => setActiveTab('general')}
                className={`flex-1 py-4 font-bold text-sm uppercase tracking-widest border-b-2 transition ${activeTab === 'general' ? 'border-purple-500 text-purple-400 bg-gray-800' : 'border-transparent text-gray-500 hover:text-white'}`}
            >
                General
            </button>
            <button 
                onClick={() => setActiveTab('sync')}
                className={`flex-1 py-4 font-bold text-sm uppercase tracking-widest border-b-2 transition ${activeTab === 'sync' ? 'border-purple-500 text-purple-400 bg-gray-800' : 'border-transparent text-gray-500 hover:text-white'}`}
            >
                Profile & Sync
            </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* === GENERAL TAB === */}
          {activeTab === 'general' && (
              <>
                 {/* Device Controls */}
                 <div className="bg-gray-800 rounded-2xl p-2 border border-gray-700 shadow-xl overflow-hidden">
                    <div className="flex flex-col sm:flex-row gap-2">
                        <button 
                            onClick={toggleFullscreen}
                            className={`flex-1 flex flex-col items-center justify-center p-6 rounded-xl border-2 transition-all group ${isFullscreen ? 'bg-purple-900/20 border-purple-500 text-purple-300' : 'bg-gray-900/50 border-gray-700 hover:bg-gray-700 hover:border-gray-500 text-gray-400 hover:text-white'}`}
                        >
                            {isFullscreen ? <Minimize className="w-8 h-8 mb-2" /> : <Maximize className="w-8 h-8 mb-2" />}
                            <span className="font-bold uppercase tracking-widest text-xs">{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
                        </button>
                        <button
                            onClick={() => setPreventSleep(!preventSleep)}
                            className={`flex-1 flex flex-col items-center justify-center p-6 rounded-xl border-2 transition-all group ${preventSleep ? 'bg-yellow-900/20 border-yellow-500 text-yellow-500' : 'bg-gray-900/50 border-gray-700 hover:bg-gray-700 hover:border-gray-500 text-gray-400 hover:text-white'}`}
                        >
                            <Zap className={`w-8 h-8 mb-2 ${preventSleep ? 'fill-current' : ''}`} />
                            <span className="font-bold uppercase tracking-widest text-xs">Wake Lock: {preventSleep ? 'ON' : 'OFF'}</span>
                        </button>
                    </div>
                 </div>

                 {/* Twitch Auth Form */}
                 <div className="bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-700 space-y-6">
                    <div>
                        <h2 className="text-lg font-semibold mb-1 text-purple-400">Twitch Connection</h2>
                        <p className="text-xs text-gray-400 mb-4">Set up your credentials to enable chat and alerts.</p>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Redirect URI</label>
                                <div className="flex gap-2">
                                    <input readOnly value={redirectUri} className="flex-1 bg-gray-900 border border-gray-700 rounded p-3 text-xs text-green-400 font-mono" />
                                    <button onClick={() => navigator.clipboard.writeText(redirectUri)} className="px-3 bg-gray-700 rounded hover:bg-gray-600"><Copy className="w-4 h-4"/></button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Client ID</label>
                                <input value={clientId} onChange={(e) => setClientId(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded p-3 focus:border-purple-500 outline-none" placeholder="Required" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Channel Name</label>
                                <input value={channel} onChange={(e) => setChannel(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded p-3 focus:border-purple-500 outline-none" placeholder="Required" />
                            </div>
                            
                            <div className="pt-2">
                                <button onClick={handleTwitchConnect} className="w-full py-3 bg-purple-600 hover:bg-purple-700 rounded font-bold flex justify-center items-center"><ExternalLink className="w-4 h-4 mr-2"/> Connect via Twitch</button>
                                <div className="text-center text-xs text-gray-500 my-2">- OR -</div>
                                <div className="flex gap-2">
                                    <input type="password" value={manualToken} onChange={(e) => setManualToken(e.target.value)} className="flex-1 bg-gray-900 border border-gray-700 rounded p-3 text-xs font-mono" placeholder="Paste Access Token (oauth:...)" />
                                    <button onClick={validateToken} disabled={!manualToken || isValidating} className="px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 rounded font-bold text-xs">Check</button>
                                </div>
                                {validationResult && (
                                    <div className={`mt-2 text-xs p-2 rounded flex items-center ${validationResult.valid ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
                                        {validationResult.valid ? <Check className="w-3 h-3 mr-2" /> : <AlertCircle className="w-3 h-3 mr-2" />}
                                        {validationResult.msg}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                 </div>

                 <div className="flex justify-end pt-4">
                    <button onClick={saveGeneralSettings} className="px-8 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-bold shadow-lg flex items-center"><Check className="w-5 h-5 mr-2"/> Save Changes</button>
                 </div>
              </>
          )}

          {/* === PROFILE & SYNC TAB === */}
          {activeTab === 'sync' && (
              <div className="space-y-6">
                  {/* Sender Card */}
                  <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
                      <div className="p-4 bg-purple-900/20 border-b border-gray-700 flex items-center gap-3">
                          <div className="p-2 bg-purple-600 rounded-lg"><Monitor className="w-5 h-5 text-white"/></div>
                          <div>
                              <h3 className="font-bold text-lg">Send profile to another device</h3>
                              <p className="text-xs text-gray-400">Copy this deck to your tablet or phone.</p>
                          </div>
                      </div>
                      <div className="p-6 flex flex-col items-center text-center">
                          {syncStatus === 'IDLE' || syncStatus === 'RECEIVED' || syncStatus === 'ERROR' ? (
                              <button onClick={startSender} className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl font-bold border border-gray-600 w-full md:w-auto">
                                  Start as Sender
                              </button>
                          ) : (
                              <div className="animate-in fade-in zoom-in w-full flex flex-col items-center">
                                  {syncStatus === 'SENT' ? (
                                      <div className="text-green-400 font-bold text-xl mb-4 flex items-center gap-2"><Check className="w-6 h-6"/> Profile Sent!</div>
                                  ) : (
                                      <>
                                          <div className="text-xs font-bold uppercase text-gray-500 mb-2">Sync Code</div>
                                          <div className="text-5xl font-mono font-bold text-purple-400 tracking-widest mb-4">{generatedCode}</div>
                                          <div className="flex items-center gap-2 text-sm text-yellow-500 animate-pulse"><Share2 className="w-4 h-4"/> Waiting for receiver...</div>
                                      </>
                                  )}
                                  <button onClick={() => { cleanupPeer(); setSyncStatus('IDLE'); setGeneratedCode(''); }} className="mt-6 text-xs text-gray-500 underline">Cancel</button>
                              </div>
                          )}
                      </div>
                  </div>

                  {/* Receiver Card */}
                  <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
                      <div className="p-4 bg-blue-900/20 border-b border-gray-700 flex items-center gap-3">
                          <div className="p-2 bg-blue-600 rounded-lg"><Smartphone className="w-5 h-5 text-white"/></div>
                          <div>
                              <h3 className="font-bold text-lg">Receive profile from device</h3>
                              <p className="text-xs text-gray-400">Enter the code displayed on the sender.</p>
                          </div>
                      </div>
                      <div className="p-6">
                           <div className="flex gap-2 max-w-sm mx-auto">
                               <input 
                                   type="text" 
                                   value={syncCode} 
                                   onChange={(e) => setSyncCode(e.target.value.slice(0, 4))} 
                                   placeholder="0000"
                                   className="flex-1 bg-gray-900 border border-gray-700 rounded-xl text-center text-2xl font-mono tracking-widest p-3 focus:border-blue-500 outline-none"
                               />
                               <button 
                                   onClick={connectReceiver}
                                   disabled={syncCode.length !== 4 || syncStatus === 'CONNECTING'}
                                   className="px-6 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 rounded-xl font-bold transition"
                               >
                                   {syncStatus === 'CONNECTING' ? '...' : 'Connect'}
                               </button>
                           </div>
                           {syncStatus === 'ERROR' && <p className="text-red-400 text-xs text-center mt-3">Connection failed. Check code.</p>}
                      </div>
                  </div>

                  {/* Backup Card */}
                  <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
                      <div className="p-4 bg-gray-750 border-b border-gray-700">
                          <h3 className="font-bold text-sm uppercase text-gray-500">Backup & Restore</h3>
                      </div>
                      <div className="p-6 grid grid-cols-2 gap-4">
                          <button onClick={handleExport} className="flex flex-col items-center justify-center p-4 bg-gray-900 border border-gray-700 hover:border-green-500 rounded-xl transition gap-2">
                              <Download className="w-6 h-6 text-green-500"/>
                              <span className="font-bold text-sm">Download Backup</span>
                          </button>
                          <button onClick={handleImportClick} className="flex flex-col items-center justify-center p-4 bg-gray-900 border border-gray-700 hover:border-blue-500 rounded-xl transition gap-2">
                              <Upload className="w-6 h-6 text-blue-500"/>
                              <span className="font-bold text-sm">Import Backup</span>
                          </button>
                          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
                      </div>
                  </div>
              </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal for Import (Sync or File) */}
      {incomingConfig && (
          <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
              <div className="bg-gray-800 rounded-2xl border-2 border-yellow-500 p-6 max-w-sm w-full shadow-2xl animate-bounce-in">
                  <div className="flex justify-center mb-4"><AlertCircle className="w-12 h-12 text-yellow-500"/></div>
                  <h3 className="text-xl font-bold text-center mb-2">Replace Profile?</h3>
                  <p className="text-gray-400 text-center text-sm mb-6">
                      This will overwrite your current buttons and Twitch settings with the incoming profile.
                  </p>
                  <div className="bg-gray-900 p-3 rounded mb-6 text-xs text-gray-300">
                      <div className="flex justify-between mb-1"><span>Channel:</span> <span className="text-white">{incomingConfig.twitchConfig.channel || 'None'}</span></div>
                      <div className="flex justify-between"><span>Buttons:</span> <span className="text-white">{incomingConfig.soundButtons.length}</span></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                      <button onClick={() => { setIncomingConfig(null); setSyncStatus('IDLE'); }} className="py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-bold">Cancel</button>
                      <button onClick={applyIncomingConfig} className="py-3 bg-yellow-600 hover:bg-yellow-500 rounded-lg font-bold text-black">Yes, Replace</button>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};

export default Settings;