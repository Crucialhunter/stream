
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Peer, DataConnection } from 'peerjs';
import { Wifi, Settings as SettingsIcon, Radio, Volume2, Monitor, RefreshCw, Send, Terminal, X, Edit2, Plus, Trash2, Heart, Gift, BarChart2, MessageSquare, Music, Type, Image as ImageIcon, Play, Save, WifiOff, Maximize, Minimize } from 'lucide-react';
import * as Icons from 'lucide-react';
import { PEER_ID_PREFIX, DEFAULT_SOUND_BOARD, SOUND_LIBRARY, FONT_STYLES, ANIMATION_STYLES } from '../constants';
import { PeerPayload, ChatMessage, TwitchConfig, SoundItem, StreamEvent, PollState } from '../types';
import { TwitchIRC } from '../services/twitchIRC';
import { playSynthSound } from '../services/audioService';
import ChatMonitor from './ChatMonitor';
import ViewerCounter from './ViewerCounter';
import Settings from './Settings';

// --- NEW COMPONENT: EVENTS PANEL ---
const EventsPanel: React.FC<{ events: StreamEvent[], onDismiss: (id: string) => void }> = ({ events, onDismiss }) => (
    <div className="flex-1 bg-gray-800 rounded-xl overflow-hidden flex flex-col border border-gray-700">
        <div className="p-3 bg-gray-750 font-bold border-b border-gray-700 flex items-center gap-2">
            <Heart className="w-4 h-4 text-pink-500" /> Recent Events
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {events.length === 0 && <div className="text-center text-gray-500 mt-10 text-xs">No new events</div>}
            {events.map(evt => (
                <div key={evt.id} className={`p-3 rounded-lg border flex items-center gap-3 transition-all ${evt.seen ? 'bg-gray-800/50 border-gray-700 opacity-60' : 'bg-gray-700 border-purple-500/50'}`}>
                    <div className={`p-2 rounded-full ${evt.type === 'SUB' ? 'bg-purple-500' : 'bg-pink-500'}`}>
                        {evt.type === 'SUB' ? <Gift className="w-4 h-4 text-white" /> : <Heart className="w-4 h-4 text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm truncate">{evt.username}</div>
                        <div className="text-xs text-gray-300">{evt.details}</div>
                    </div>
                    {!evt.seen && (
                        <button onClick={() => onDismiss(evt.id)} className="text-xs bg-gray-600 hover:bg-gray-500 px-2 py-1 rounded">OK</button>
                    )}
                </div>
            ))}
        </div>
    </div>
);

// --- NEW COMPONENT: POLL TOOL ---
const PollTool: React.FC<{ activePoll: PollState | null, onCreate: (q: string, opts: string[]) => void, onEnd: () => void }> = ({ activePoll, onCreate, onEnd }) => {
    const [question, setQuestion] = useState('');
    const [options, setOptions] = useState(['Yes', 'No']);

    if (activePoll && activePoll.isActive) {
        return (
            <div className="flex-1 bg-gray-800 rounded-xl p-4 flex flex-col border border-purple-500 relative overflow-hidden">
                <div className="absolute inset-0 bg-purple-900/10 animate-pulse pointer-events-none" />
                <h3 className="font-bold text-lg mb-4 text-white z-10">Active Poll</h3>
                <div className="text-sm text-gray-300 mb-4 z-10">{activePoll.question}</div>
                <div className="flex-1 space-y-2 z-10">
                    {activePoll.options.map(opt => (
                        <div key={opt.id} className="flex justify-between text-xs bg-gray-900 p-2 rounded border border-gray-700">
                            <span>{opt.label} ({opt.trigger})</span>
                            <span className="font-bold text-purple-400">{opt.votes}</span>
                        </div>
                    ))}
                </div>
                <button onClick={onEnd} className="mt-4 w-full py-3 bg-red-600 hover:bg-red-500 rounded font-bold z-10">End Poll</button>
            </div>
        );
    }

    return (
        <div className="flex-1 bg-gray-800 rounded-xl p-4 flex flex-col border border-gray-700 overflow-y-auto">
            <h3 className="font-bold mb-4 flex items-center gap-2"><BarChart2 className="w-4 h-4"/> Create Poll</h3>
            <div className="space-y-3">
                <div>
                    <label className="text-xs text-gray-500 uppercase font-bold">Question</label>
                    <input className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-sm" value={question} onChange={e => setQuestion(e.target.value)} placeholder="Who wins?" />
                </div>
                <div>
                    <label className="text-xs text-gray-500 uppercase font-bold">Options</label>
                    {options.map((opt, idx) => (
                        <div key={idx} className="flex gap-2 mb-2">
                             <span className="bg-gray-700 p-2 rounded text-xs font-mono w-8 text-center pt-2.5">{idx + 1}</span>
                             <input 
                                className="flex-1 bg-gray-900 border border-gray-700 rounded p-2 text-sm" 
                                value={opt} 
                                onChange={e => {
                                    const newOpts = [...options];
                                    newOpts[idx] = e.target.value;
                                    setOptions(newOpts);
                                }}
                             />
                             {options.length > 2 && <button onClick={() => setOptions(options.filter((_, i) => i !== idx))} className="text-red-400"><Trash2 className="w-4 h-4" /></button>}
                        </div>
                    ))}
                    {options.length < 4 && (
                        <button onClick={() => setOptions([...options, ''])} className="text-xs text-purple-400 flex items-center gap-1 hover:underline"><Plus className="w-3 h-3"/> Add Option</button>
                    )}
                </div>
                <button 
                    onClick={() => onCreate(question, options)}
                    disabled={!question || options.some(o => !o)}
                    className="w-full py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 rounded font-bold mt-2"
                >
                    Start Poll
                </button>
            </div>
        </div>
    );
};

// --- COMPONENT: BUTTON EDITOR ---
const ButtonEditor: React.FC<{ 
    button: SoundItem, 
    onSave: (btn: SoundItem) => void, 
    onCancel: () => void,
    onTest: (btn: SoundItem) => void
}> = ({ button, onSave, onCancel, onTest }) => {
    const [edited, setEdited] = useState<SoundItem>(button);
    const [tab, setTab] = useState<'style' | 'audio' | 'visual'>('style');

    return (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-gray-900 rounded-2xl w-full max-w-2xl border border-gray-700 shadow-2xl flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-800 rounded-t-2xl">
                    <h3 className="text-xl font-bold flex items-center gap-2"><Edit2 className="w-5 h-5 text-yellow-500"/> Edit "{edited.label}"</h3>
                    <div className="flex gap-2">
                        <button onClick={onCancel} className="text-gray-400 hover:text-white"><X className="w-6 h-6"/></button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-700 bg-gray-850">
                    <button onClick={() => setTab('style')} className={`flex-1 py-4 font-bold flex items-center justify-center gap-2 border-b-2 transition ${tab === 'style' ? 'border-yellow-500 text-yellow-400 bg-gray-800' : 'border-transparent text-gray-500 hover:text-white'}`}>
                        <Type className="w-4 h-4"/> Style
                    </button>
                    <button onClick={() => setTab('audio')} className={`flex-1 py-4 font-bold flex items-center justify-center gap-2 border-b-2 transition ${tab === 'audio' ? 'border-yellow-500 text-yellow-400 bg-gray-800' : 'border-transparent text-gray-500 hover:text-white'}`}>
                        <Music className="w-4 h-4"/> Audio
                    </button>
                    <button onClick={() => setTab('visual')} className={`flex-1 py-4 font-bold flex items-center justify-center gap-2 border-b-2 transition ${tab === 'visual' ? 'border-yellow-500 text-yellow-400 bg-gray-800' : 'border-transparent text-gray-500 hover:text-white'}`}>
                        <ImageIcon className="w-4 h-4"/> Visuals
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-900">
                    {/* STYLE TAB */}
                    {tab === 'style' && (
                        <div className="space-y-6">
                             <div>
                                <label className="text-xs uppercase text-gray-500 font-bold mb-2 block">Button Label</label>
                                <input className="w-full bg-gray-800 border border-gray-700 rounded p-3 text-lg font-bold" value={edited.label} onChange={e => setEdited({...edited, label: e.target.value})} />
                             </div>
                             
                             <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="text-xs uppercase text-gray-500 font-bold mb-2 block">Icon</label>
                                    <select 
                                        className="w-full bg-gray-800 border border-gray-700 rounded p-3 text-sm" 
                                        value={edited.iconName} 
                                        onChange={e => setEdited({...edited, iconName: e.target.value})}
                                    >
                                        {Object.keys(Icons).slice(0, 100).map(icon => <option key={icon} value={icon}>{icon}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs uppercase text-gray-500 font-bold mb-2 block">Tailwind Color Class</label>
                                    <input className="w-full bg-gray-800 border border-gray-700 rounded p-3 text-sm" value={edited.color} onChange={e => setEdited({...edited, color: e.target.value})} />
                                </div>
                             </div>

                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-800">
                                 <div>
                                     <label className="text-xs uppercase text-gray-500 font-bold mb-2 block">Alert Text Color</label>
                                     <div className="flex items-center gap-3 bg-gray-800 p-2 rounded border border-gray-700">
                                         <input 
                                            type="color" 
                                            className="w-10 h-10 rounded cursor-pointer bg-transparent border-none"
                                            value={edited.textColor || '#ffffff'}
                                            onChange={e => setEdited({...edited, textColor: e.target.value})}
                                         />
                                         <span className="text-sm font-mono text-gray-400">{edited.textColor || '#ffffff'}</span>
                                     </div>
                                 </div>
                                 <div>
                                     <label className="text-xs uppercase text-gray-500 font-bold mb-2 block">Font Style</label>
                                     <div className="grid grid-cols-2 gap-2">
                                         {FONT_STYLES.map(fs => (
                                             <button 
                                                key={fs.id}
                                                onClick={() => setEdited({...edited, fontStyle: fs.id as any})}
                                                className={`text-xs p-2 rounded border ${edited.fontStyle === fs.id ? 'bg-yellow-600/20 border-yellow-500 text-yellow-400' : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'}`}
                                             >
                                                 {fs.label}
                                             </button>
                                         ))}
                                     </div>
                                 </div>
                             </div>
                        </div>
                    )}

                    {/* AUDIO TAB */}
                    {tab === 'audio' && (
                        <div className="space-y-6">
                            <p className="text-sm text-gray-400 mb-4 bg-gray-800 p-3 rounded border border-gray-700">
                                Choose a built-in game sound or paste a custom URL (MP3/WAV). Built-in sounds are generated instantly on the overlay.
                            </p>

                            <div>
                                <label className="text-xs uppercase text-gray-500 font-bold mb-2 block">Built-in Sound Library</label>
                                <div className="space-y-4 max-h-60 overflow-y-auto pr-2">
                                    {Object.entries(SOUND_LIBRARY).map(([category, items]) => (
                                        <div key={category}>
                                            <h4 className="text-xs font-bold text-purple-400 uppercase mb-2 sticky top-0 bg-gray-900 py-1">{category}</h4>
                                            <div className="grid grid-cols-2 gap-2">
                                                {items.map(item => (
                                                    <button 
                                                        key={item.id}
                                                        onClick={() => {
                                                            setEdited({...edited, soundPreset: item.id});
                                                            playSynthSound(item.id); // Preview
                                                        }}
                                                        className={`flex items-center justify-between p-3 rounded border text-sm text-left group ${edited.soundPreset === item.id ? 'bg-green-600/20 border-green-500 text-green-400' : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'}`}
                                                    >
                                                        <span>{item.label}</span>
                                                        <Play className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="relative">
                                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-700"></div></div>
                                <div className="relative flex justify-center text-xs font-bold uppercase"><span className="px-2 bg-gray-900 text-gray-500">OR Custom</span></div>
                            </div>

                            <div>
                                <label className="text-xs uppercase text-gray-500 font-bold mb-2 block">Custom Audio URL</label>
                                <input 
                                    className="w-full bg-gray-800 border border-gray-700 rounded p-3 text-sm font-mono text-blue-400" 
                                    placeholder="https://example.com/sound.mp3" 
                                    value={edited.soundUrl || ''} 
                                    onChange={e => setEdited({...edited, soundUrl: e.target.value})} 
                                />
                            </div>
                        </div>
                    )}

                    {/* VISUAL TAB */}
                    {tab === 'visual' && (
                        <div className="space-y-6">
                             <div>
                                 <label className="text-xs uppercase text-gray-500 font-bold mb-2 block">Animation Style</label>
                                 <div className="grid grid-cols-3 gap-2">
                                     {ANIMATION_STYLES.map(anim => (
                                         <button 
                                            key={anim.id}
                                            onClick={() => setEdited({...edited, animation: anim.id as any})}
                                            className={`text-sm p-3 rounded border font-medium ${edited.animation === anim.id ? 'bg-pink-600/20 border-pink-500 text-pink-400' : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'}`}
                                         >
                                             {anim.label}
                                         </button>
                                     ))}
                                 </div>
                             </div>

                             <div>
                                <label className="text-xs uppercase text-gray-500 font-bold mb-2 block">Custom Image / GIF URL</label>
                                <input 
                                    className="w-full bg-gray-800 border border-gray-700 rounded p-3 text-sm font-mono text-blue-400" 
                                    placeholder="https://media.giphy.com/..." 
                                    value={edited.imageUrl || ''} 
                                    onChange={e => setEdited({...edited, imageUrl: e.target.value})} 
                                />
                                {edited.imageUrl && (
                                    <div className="mt-4 p-4 bg-gray-800 rounded border border-gray-700 flex justify-center">
                                        <img src={edited.imageUrl} alt="Preview" className="max-h-32 object-contain" />
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-700 bg-gray-800 rounded-b-2xl flex gap-3">
                    <button onClick={() => onSave(edited)} className="flex-1 bg-green-600 hover:bg-green-500 py-3 rounded-lg font-bold text-lg flex items-center justify-center gap-2 shadow-lg shadow-green-900/50">
                        <Save className="w-5 h-5"/> Save Changes
                    </button>
                    
                    <button onClick={() => onTest(edited)} className="px-6 bg-purple-600 hover:bg-purple-500 rounded-lg font-bold text-white flex items-center justify-center gap-2 shadow-lg shadow-purple-900/50">
                        <Monitor className="w-5 h-5"/> Test
                    </button>

                    <button onClick={onCancel} className="px-6 bg-gray-700 hover:bg-gray-600 rounded-lg font-bold text-gray-300">
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};


// --- MAIN CONTROL DECK ---
const ControlDeck: React.FC = () => {
  const [showSettings, setShowSettings] = useState(false);
  const [twitchConfig, setTwitchConfig] = useState<TwitchConfig>(() => {
    const saved = localStorage.getItem('twitch_config');
    return saved ? JSON.parse(saved) : { clientId: '', accessToken: '', channel: '', preventSleep: false };
  });

  // Sidebar Tab State
  const [activeTab, setActiveTab] = useState<'chat' | 'events' | 'tools'>('chat');

  // App Data State
  const [soundButtons, setSoundButtons] = useState<SoundItem[]>(() => {
      const saved = localStorage.getItem('sound_buttons');
      return saved ? JSON.parse(saved) : DEFAULT_SOUND_BOARD;
  });
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [poll, setPoll] = useState<PollState | null>(null);

  // Edit Mode State
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingButton, setEditingButton] = useState<SoundItem | null>(null);

  // Connection State
  const [peer, setPeer] = useState<Peer | null>(null);
  const [conn, setConn] = useState<DataConnection | null>(null);
  const [inputCode, setInputCode] = useState('');
  const [status, setStatus] = useState<'DISCONNECTED' | 'CONNECTING' | 'CONNECTED'>('DISCONNECTED');
  const [autoReconnect, setAutoReconnect] = useState(false);

  // UI State
  const [isFullscreen, setIsFullscreen] = useState(false);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  // Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [lastMsgTime, setLastMsgTime] = useState<number>(Date.now());
  const [ircClient, setIrcClient] = useState<TwitchIRC | null>(null);
  const [ircUsername, setIrcUsername] = useState<string | undefined>(undefined);
  const [ircStatus, setIrcStatus] = useState<'CONNECTED' | 'DISCONNECTED' | 'CONNECTING'>('DISCONNECTED');
  const [chatInput, setChatInput] = useState('');

  // Debug State
  const [showDebug, setShowDebug] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const addLog = useCallback((type: 'info' | 'error' | 'in' | 'out', msg: string) => {
    const timestamp = new Date().toLocaleTimeString().split(' ')[0];
    setLogs(prev => [...prev.slice(-99), `[${timestamp}] ${type === 'in' ? '< ' : type === 'out' ? '> ' : ''}${msg}`]);
  }, []);

  // --- WAKE LOCK LOGIC ---
  const requestWakeLock = async () => {
      if ('wakeLock' in navigator) {
          try {
              const sentinel = await navigator.wakeLock.request('screen');
              wakeLockRef.current = sentinel;
              console.log('Wake Lock active');
              sentinel.addEventListener('release', () => {
                  console.log('Wake Lock released');
                  wakeLockRef.current = null;
              });
          } catch (err: any) {
              console.error(`${err.name}, ${err.message}`);
          }
      }
  };

  const releaseWakeLock = async () => {
      if (wakeLockRef.current) {
          await wakeLockRef.current.release();
          wakeLockRef.current = null;
      }
  };

  // Handle Wake Lock based on config and visibility
  useEffect(() => {
      const handleVisibilityChange = () => {
          if (document.visibilityState === 'visible' && twitchConfig.preventSleep) {
              requestWakeLock();
          }
      };

      if (twitchConfig.preventSleep) {
          requestWakeLock();
          document.addEventListener('visibilitychange', handleVisibilityChange);
      } else {
          releaseWakeLock();
      }

      return () => {
          document.removeEventListener('visibilitychange', handleVisibilityChange);
          releaseWakeLock();
      };
  }, [twitchConfig.preventSleep]);

  // --- FULLSCREEN LOGIC ---
  const toggleFullscreen = () => {
      const doc = window.document as any;
      const docEl = document.documentElement as any;

      const requestFullScreen = docEl.requestFullscreen || docEl.mozRequestFullScreen || docEl.webkitRequestFullScreen || docEl.msRequestFullscreen;
      const cancelFullScreen = doc.exitFullscreen || doc.mozCancelFullScreen || doc.webkitExitFullscreen || doc.msExitFullscreen;
      
      const isActive = doc.fullscreenElement || doc.mozFullScreenElement || doc.webkitFullscreenElement || doc.msFullscreenElement;

      if (!isActive) {
        if (requestFullScreen) {
            requestFullScreen.call(docEl).then(() => setIsFullscreen(true)).catch(console.error);
        }
      } else {
        if (cancelFullScreen) {
            cancelFullScreen.call(doc).then(() => setIsFullscreen(false)).catch(console.error);
        }
      }
  };

  // --- INITIALIZATION ---
  useEffect(() => {
    const p = new Peer(); 
    setPeer(p);
    return () => p.destroy();
  }, []);

  // Save Buttons on change
  useEffect(() => {
      localStorage.setItem('sound_buttons', JSON.stringify(soundButtons));
  }, [soundButtons]);

  // --- CONNECTION & RECONNECTION LOGIC ---
  const connectToOverlay = useCallback(() => {
    if (!peer || inputCode.length !== 4) return;
    
    // Don't connect if already connected (avoid duplicate connections)
    if (conn && conn.open) return;

    console.log("Attempting Connection...");
    setStatus('CONNECTING');
    const destId = `${PEER_ID_PREFIX}${inputCode}`;
    const connection = peer.connect(destId);

    connection.on('open', () => { 
        console.log("Connected!");
        setStatus('CONNECTED'); 
        setConn(connection);
        setAutoReconnect(true); // Enable auto-reconnect once we've had a success
    });

    connection.on('close', () => { 
        console.log("Connection Closed");
        setStatus('DISCONNECTED'); 
        setConn(null); 
    });

    connection.on('error', (err) => { 
        console.error("Connection Error", err);
        setStatus('DISCONNECTED'); 
        setConn(null); 
    });
  }, [peer, inputCode, conn]);

  // Auto-Reconnect Interval
  useEffect(() => {
    let interval: number;
    if (autoReconnect && status === 'DISCONNECTED' && inputCode.length === 4) {
        console.log("Auto-reconnecting...");
        interval = window.setInterval(connectToOverlay, 3000); // Try every 3 seconds
    }
    return () => clearInterval(interval);
  }, [autoReconnect, status, inputCode, connectToOverlay]);

  // Immediate Reconnect on Wake (Visibility Change)
  useEffect(() => {
      const handleVisibilityChange = () => {
          if (document.visibilityState === 'visible' && autoReconnect && status === 'DISCONNECTED') {
              console.log("App Woke Up - Reconnecting immediately");
              connectToOverlay();
          }
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);
      return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [autoReconnect, status, connectToOverlay]);


  // --- TWITCH LOGIC ---
  useEffect(() => {
    let isMounted = true;
    let client: TwitchIRC | null = null;
    let followerInterval: number;

    const connectTwitch = async () => {
        if (twitchConfig.accessToken && twitchConfig.channel) {
            if (ircClient) ircClient.disconnect();
            
            const cleanToken = twitchConfig.accessToken.replace(/^oauth:/, '');
            let fetchedUsername = undefined;
            let broadcasterId = '';

            // 1. Validate Token & Get User Info
            try {
                const res = await fetch('https://id.twitch.tv/oauth2/validate', {
                    headers: { 'Authorization': `OAuth ${cleanToken}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    fetchedUsername = data.login;
                    broadcasterId = data.user_id;

                    if(isMounted) {
                        setIrcUsername(data.login);
                        if (data.client_id !== twitchConfig.clientId) {
                             const newConfig = { ...twitchConfig, clientId: data.client_id };
                             setTwitchConfig(newConfig);
                             localStorage.setItem('twitch_config', JSON.stringify(newConfig));
                        }
                    }
                }
            } catch (e) {
                console.warn("Token validation failed");
            }

            // 2. Poll Followers (Simple implementation)
            const checkFollowers = async () => {
                if (!broadcasterId) return;
                try {
                    const res = await fetch(`https://api.twitch.tv/helix/channels/followers?broadcaster_id=${broadcasterId}&first=1`, {
                        headers: { 'Client-ID': twitchConfig.clientId, 'Authorization': `Bearer ${cleanToken}` }
                    });
                    const data = await res.json();
                    if (data.data && data.data.length > 0) {
                        const latest = data.data[0];
                        setEvents(prev => {
                            if (prev.some(e => e.type === 'FOLLOW' && e.username === latest.user_name)) return prev;
                            const newEvent: StreamEvent = {
                                id: Date.now().toString(),
                                type: 'FOLLOW',
                                username: latest.user_name,
                                details: 'New Follower!',
                                timestamp: Date.now(),
                                seen: false
                            };
                            return [newEvent, ...prev];
                        });
                    }
                } catch(e) { console.warn('Follow fetch fail'); }
            };
            followerInterval = window.setInterval(checkFollowers, 60000); 
            checkFollowers();

            // 3. Connect IRC
            client = new TwitchIRC(
                cleanToken, 
                twitchConfig.channel, 
                fetchedUsername, 
                (msg) => {
                    if (!isMounted) return;
                    setChatMessages(prev => [...prev.slice(-49), msg]);
                    setLastMsgTime(Date.now());
                    
                    setPoll(currentPoll => {
                        if (currentPoll && currentPoll.isActive) {
                             const trigger = msg.message.trim().toUpperCase(); 
                             const optIndex = currentPoll.options.findIndex(o => o.trigger === trigger || (o.trigger === '1' && trigger.includes('1'))); 
                             
                             if (optIndex >= 0) {
                                 const updatedOpts = [...currentPoll.options];
                                 updatedOpts[optIndex].votes++;
                                 const updatedPoll = { 
                                     ...currentPoll, 
                                     options: updatedOpts, 
                                     totalVotes: currentPoll.totalVotes + 1 
                                 };
                                 if (conn && conn.open) conn.send({ type: 'POLL_UPDATE', poll: updatedPoll });
                                 return updatedPoll;
                             }
                        }
                        return currentPoll;
                    });
                },
                (evt) => {
                    if (isMounted) setEvents(prev => [evt, ...prev]);
                },
                (type, msg) => { if(isMounted) addLog(type, msg); },
                (newStatus) => { if(isMounted) setIrcStatus(newStatus); }
            );
            client.connect();
            if (isMounted) setIrcClient(client);
        }
    };

    connectTwitch();

    return () => {
        isMounted = false;
        if (client) client.disconnect();
        clearInterval(followerInterval);
    };
  }, [twitchConfig.accessToken, twitchConfig.channel]);

  const sendTriggerPayload = (btn: SoundItem) => {
      if (conn && status === 'CONNECTED') {
          conn.send({ 
              type: 'TRIGGER_SFX', 
              sfxId: btn.id, 
              customImage: btn.imageUrl, 
              customLabel: btn.label, 
              customSound: btn.soundUrl,
              soundPreset: btn.soundPreset,
              fontStyle: btn.fontStyle,
              animation: btn.animation,
              color: btn.color,
              textColor: btn.textColor
          } as PeerPayload);
      }
  };

  const handleButtonPress = (btn: SoundItem) => {
      if (isEditMode) {
          setEditingButton(btn);
      } else {
          // Connected: Send to Overlay, Mute local (prevents echo)
          if (status === 'CONNECTED') {
              sendTriggerPayload(btn);
          } else {
              // Disconnected/Preview: Play Locally
              playSynthSound(btn.soundPreset || btn.id, btn.soundUrl);
          }
      }
  };

  const handleEditorTest = (btn: SoundItem) => {
      if (status === 'CONNECTED') {
          sendTriggerPayload(btn);
      } else {
          // If not connected, just play local
          playSynthSound(btn.soundPreset || btn.id, btn.soundUrl);
          alert('Not connected to Overlay. Playing locally.');
      }
  };

  const saveButtonEdit = (updated: SoundItem) => {
      setSoundButtons(prev => prev.map(b => b.id === updated.id ? updated : b));
      setEditingButton(null);
  };

  // Poll Actions
  const startPoll = (q: string, opts: string[]) => {
      const newPoll: PollState = {
          isActive: true,
          question: q,
          options: opts.map((o, i) => ({ id: i.toString(), label: o, trigger: (i + 1).toString(), votes: 0 })),
          totalVotes: 0
      };
      setPoll(newPoll);
      if (conn && conn.open) conn.send({ type: 'POLL_UPDATE', poll: newPoll });
  };

  const endPoll = () => {
      if (poll) {
          const ended = { ...poll, isActive: false };
          setPoll(ended);
          if (conn && conn.open) conn.send({ type: 'POLL_END', poll: ended });
          setTimeout(() => setPoll(null), 2000); 
      }
  };

  const showChatOnStream = (msg: ChatMessage) => {
      if (conn && conn.open) conn.send({ type: 'SHOW_CHAT_MSG', msg });
  };

  const dismissEvent = (id: string) => {
      setEvents(prev => prev.map(e => e.id === id ? { ...e, seen: true } : e));
  };

  // --- RENDER HELPERS ---
  if (showSettings) {
    return <Settings 
      config={twitchConfig} 
      onSave={(cfg) => { setTwitchConfig(cfg); localStorage.setItem('twitch_config', JSON.stringify(cfg)); }} 
      onBack={() => setShowSettings(false)} 
      isFullscreen={isFullscreen}
      toggleFullscreen={toggleFullscreen}
    />;
  }

  // Connect Screen
  if (status !== 'CONNECTED' && !autoReconnect) {
      return (
          <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
              <div className="w-full max-w-sm bg-gray-800 rounded-2xl p-6 shadow-2xl border border-gray-700">
                  <div className="flex justify-between items-center mb-6">
                      <h2 className="text-xl font-bold flex items-center"><Radio className="mr-2 text-purple-500" /> Connect Deck</h2>
                      <button onClick={() => setShowSettings(true)} className="p-2 hover:bg-gray-700 rounded-full"><SettingsIcon className="w-5 h-5 text-gray-400" /></button>
                  </div>
                  <div className="bg-black/40 p-4 rounded-xl mb-6 text-center">
                      <span className="text-4xl font-mono tracking-widest text-white block h-12">{inputCode.padEnd(4, '•')}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 mb-6">
                    {[1,2,3,4,5,6,7,8,9].map(n => (<button key={n} onClick={() => inputCode.length < 4 && setInputCode(p => p+n)} className="h-16 rounded-lg bg-gray-700 hover:bg-gray-600 text-2xl font-bold border-b-4 border-gray-900 active:border-b-0 active:mt-1">{n}</button>))}
                    <button onClick={() => setInputCode('')} className="h-16 rounded-lg bg-red-900/50 hover:bg-red-900/70 text-red-200 font-bold border-b-4 border-red-900/50 active:border-b-0 active:mt-1">CLR</button>
                    <button onClick={() => inputCode.length < 4 && setInputCode(p => p+'0')} className="h-16 rounded-lg bg-gray-700 hover:bg-gray-600 text-2xl font-bold border-b-4 border-gray-900 active:border-b-0 active:mt-1">0</button>
                    <button onClick={() => setInputCode(p => p.slice(0, -1))} className="h-16 rounded-lg bg-yellow-900/50 hover:bg-yellow-900/70 text-yellow-200 font-bold border-b-4 border-yellow-900/50 active:border-b-0 active:mt-1">DEL</button>
                  </div>
                  <button onClick={connectToOverlay} disabled={inputCode.length !== 4 || status === 'CONNECTING'} className="w-full py-4 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 rounded-xl font-bold text-lg flex justify-center items-center shadow-lg shadow-purple-900/50">{status === 'CONNECTING' ? 'Connecting...' : 'CONNECT'}</button>
                  <div className="mt-6 pt-6 border-t border-gray-700 text-center">
                    <button onClick={() => window.location.hash = '/overlay'} className="inline-flex items-center text-purple-400 hover:text-purple-300 text-sm font-semibold"><Monitor className="w-4 h-4 mr-2" /> Launch Overlay Mode</button>
                  </div>
              </div>
          </div>
      );
  }

  // --- MAIN UI ---
  // Using fixed inset-0 to prevent body scrolling when input is focused on tablets
  return (
    <div className="fixed inset-0 h-[100dvh] w-full overflow-hidden overscroll-none flex flex-col md:flex-row bg-gray-900 text-white relative touch-none">
      
      {/* Sidebar: Chat / Events / Tools */}
      <div className="md:w-72 bg-gray-800 border-r border-gray-700 flex-shrink-0 flex flex-col h-1/2 md:h-full z-10 shadow-xl">
         
         {/* Top Status */}
         <div className="p-3 border-b border-gray-700 flex justify-between items-center bg-gray-900 flex-shrink-0">
            {status === 'CONNECTED' ? (
                <div className="flex items-center gap-2 text-green-400 font-bold text-xs"><Wifi className="w-3 h-3" /> Connected</div>
            ) : (
                <div className="flex items-center gap-2 text-yellow-400 font-bold text-xs animate-pulse"><RefreshCw className="w-3 h-3 animate-spin" /> Reconnecting...</div>
            )}
            
            <div className="flex gap-2 items-center">
                 <button onClick={toggleFullscreen} className="text-gray-400 hover:text-white p-1 rounded hover:bg-gray-700" title="Toggle Fullscreen">
                     {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                 </button>
                 <button onClick={() => setShowSettings(true)} className="text-gray-400 hover:text-white p-1 rounded hover:bg-gray-700"><SettingsIcon className="w-4 h-4"/></button>
                 <button onClick={() => { setConn(null); setStatus('DISCONNECTED'); setAutoReconnect(false); }} className="text-xs text-red-400 hover:text-red-300 ml-1">Disconnect</button>
            </div>
         </div>
         
         {/* Viewer Counter */}
         <div className="px-2 pt-2 bg-gray-900 flex-shrink-0">
            <ViewerCounter config={twitchConfig} />
         </div>

         {/* Tabs */}
         <div className="flex border-b border-gray-700 bg-gray-900 text-xs font-bold uppercase tracking-wider flex-shrink-0">
             <button onClick={() => setActiveTab('chat')} className={`flex-1 py-3 text-center ${activeTab === 'chat' ? 'text-purple-400 border-b-2 border-purple-500 bg-gray-800' : 'text-gray-500 hover:text-gray-300'}`}>Chat</button>
             <button onClick={() => setActiveTab('events')} className={`flex-1 py-3 text-center ${activeTab === 'events' ? 'text-pink-400 border-b-2 border-pink-500 bg-gray-800' : 'text-gray-500 hover:text-gray-300'}`}>Events {events.filter(e => !e.seen).length > 0 && <span className="ml-1 w-2 h-2 bg-pink-500 rounded-full inline-block"/>}</button>
             <button onClick={() => setActiveTab('tools')} className={`flex-1 py-3 text-center ${activeTab === 'tools' ? 'text-blue-400 border-b-2 border-blue-500 bg-gray-800' : 'text-gray-500 hover:text-gray-300'}`}>Tools</button>
         </div>

         {/* Content Area */}
         <div className="flex-1 overflow-hidden bg-gray-900 flex flex-col p-2 min-h-0">
             {activeTab === 'chat' && (
                 <>
                    <div className="flex-1 overflow-hidden relative">
                        <ChatMonitor messages={chatMessages} lastMessageTime={lastMsgTime} onShowOnStream={showChatOnStream} />
                    </div>
                    {/* Chat Input Area */}
                    <form onSubmit={(e) => { e.preventDefault(); if(chatInput.trim() && ircClient) { ircClient.sendMessage(chatInput); setChatInput(''); }}} className="mt-2 flex gap-1 flex-shrink-0">
                        <input className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-2 text-xs focus:outline-none focus:border-purple-500" value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Send message..." />
                        <button type="submit" className="bg-purple-600 px-3 rounded text-white"><Send className="w-3 h-3" /></button>
                    </form>
                 </>
             )}

             {activeTab === 'events' && (
                 <EventsPanel events={events} onDismiss={dismissEvent} />
             )}

             {activeTab === 'tools' && (
                 <PollTool activePoll={poll} onCreate={startPoll} onEnd={endPoll} />
             )}
         </div>
      </div>

      {/* Main Button Grid */}
      <div className="flex-1 p-4 overflow-y-auto bg-gray-900/95 flex flex-col touch-pan-y">
         <div className="flex justify-between items-center mb-4 flex-shrink-0">
             <h1 className="text-xl font-bold text-gray-400 flex items-center gap-2"><Volume2 className="w-5 h-5" /> Soundboard</h1>
             <div className="flex items-center gap-2">
                 {/* Duplicated connect status in main area for better mobile visibility */}
                 {status !== 'CONNECTED' && (
                     <div className="text-xs text-yellow-500 font-bold animate-pulse px-2 flex items-center gap-1 border border-yellow-500/50 rounded bg-yellow-900/20">
                         <WifiOff className="w-3 h-3"/> Reconnecting...
                     </div>
                 )}
                 <button 
                    onClick={() => setIsEditMode(!isEditMode)} 
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold border transition ${isEditMode ? 'bg-yellow-500/20 text-yellow-500 border-yellow-500 animate-pulse' : 'bg-gray-800 text-gray-400 border-gray-700 hover:bg-gray-700'}`}
                 >
                     <Edit2 className="w-3 h-3" /> {isEditMode ? 'Done Editing' : 'Edit Buttons'}
                 </button>
             </div>
         </div>
         
         <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 flex-1 content-start pb-20">
            {soundButtons.map(sound => {
                const IconComp = (Icons as any)[sound.iconName] || Icons.Zap;
                return (
                    <button
                        key={sound.id}
                        onClick={() => handleButtonPress(sound)}
                        className={`relative rounded-2xl shadow-lg transition-all flex flex-col items-center justify-center gap-2 border-b-8 active:border-b-0 active:translate-y-2 h-32 overflow-hidden group
                            ${isEditMode ? 'border-dashed border-2 bg-gray-800 border-gray-600 hover:border-yellow-500 cursor-alias' : `${sound.color} border-black/20 hover:scale-105`}
                        `}
                    >
                        {isEditMode && <div className="absolute top-2 right-2 bg-black/50 p-1 rounded-full z-10"><Edit2 className="w-3 h-3 text-white" /></div>}
                        <IconComp className={`w-8 h-8 ${isEditMode ? 'text-gray-500' : 'text-white drop-shadow-md'}`} />
                        <span className={`font-black text-lg tracking-wider ${isEditMode ? 'text-gray-500' : 'text-white drop-shadow-md'}`}>{sound.label}</span>
                        {!isEditMode && sound.animation && sound.animation !== 'none' && (
                            <div className="absolute bottom-2 right-2 opacity-50"><Icons.Sparkles className="w-3 h-3" /></div>
                        )}
                    </button>
                );
            })}
         </div>
      </div>

      {/* Button Editor Modal */}
      {editingButton && (
          <ButtonEditor 
            button={editingButton} 
            onSave={saveButtonEdit} 
            onCancel={() => setEditingButton(null)} 
            onTest={handleEditorTest}
          />
      )}

      {/* Debug Console */}
      {showDebug && (
        <div className="absolute bottom-0 right-0 w-full md:w-2/3 h-48 bg-black/90 text-green-400 font-mono text-xs border-t-2 border-purple-500 flex flex-col z-50">
            <div className="flex justify-between items-center p-2 bg-gray-900"><span className="font-bold flex items-center"><Terminal className="w-3 h-3 mr-2" /> Debug</span><button onClick={() => setShowDebug(false)}><X className="w-4 h-4" /></button></div>
            <div className="flex-1 overflow-y-auto p-2"><div ref={logsEndRef} />{logs.map((l, i) => <div key={i}>{l}</div>)}</div>
        </div>
      )}
      {!showDebug && <button onClick={() => setShowDebug(true)} className="absolute bottom-2 right-2 opacity-50 hover:opacity-100"><Terminal className="w-4 h-4 text-gray-500" /></button>}
    </div>
  );
};

export default ControlDeck;
