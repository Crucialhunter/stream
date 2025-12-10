
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Peer, DataConnection } from 'peerjs';
import { Wifi, Settings as SettingsIcon, Radio, Volume2, Monitor, RefreshCw, Send, Terminal, X, Edit2, Plus, Trash2, Heart, Gift, BarChart2, Music, Type, Image as ImageIcon, Play, Save, WifiOff, Maximize, Minimize, FlaskConical, PlayCircle, UserPlus, Users, MessageSquarePlus, Zap, Info, PartyPopper, ArrowUp, ArrowDown, Eye, CheckCircle, Activity, ZapOff } from 'lucide-react';
import * as Icons from 'lucide-react';
import { PEER_ID_PREFIX, DEFAULT_SOUND_BOARD, SOUND_LIBRARY, FONT_STYLES, ANIMATION_STYLES, DEFAULT_EVENT_TEMPLATES } from '../constants';
import { PeerPayload, ChatMessage, TwitchConfig, SoundItem, StreamEvent, PollState, ActiveAlert } from '../types';
import { TwitchIRC } from '../services/twitchIRC';
import { playSynthSound } from '../services/audioService';
import { generateMockChat, generateMockEvent, generateMockPoll } from '../services/mockService';
import { loadConfigFromStorage, saveConfigToStorage } from '../services/configService';
import ChatMonitor from './ChatMonitor';
import ViewerCounter from './ViewerCounter';
import Settings from './Settings';
import OverlayDisplay from './OverlayDisplay';

// --- EVENTS PANEL ---
const EventsPanel: React.FC<{ 
    events: StreamEvent[], 
    onDismiss: (id: string) => void,
    onCelebrate: (evt: StreamEvent) => void,
    isDeckOnlyMode?: boolean
}> = ({ events, onDismiss, onCelebrate, isDeckOnlyMode }) => (
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
                        <div className="flex gap-2">
                            {/* In Deck Only mode, we don't have an overlay to celebrate on, so just 'Mark Seen' */}
                            {!isDeckOnlyMode && (
                                <button onClick={() => onCelebrate(evt)} className="text-xs bg-pink-600 hover:bg-pink-500 px-2 py-1 rounded flex items-center gap-1 font-bold" title="Celebrate on Stream"><PartyPopper className="w-3 h-3"/> OK</button>
                            )}
                            <button onClick={() => onDismiss(evt.id)} className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${isDeckOnlyMode ? 'bg-green-600 hover:bg-green-500' : 'bg-gray-600 hover:bg-gray-500'}`}>
                                {isDeckOnlyMode ? <CheckCircle className="w-3 h-3"/> : 'X'}
                            </button>
                        </div>
                    )}
                </div>
            ))}
        </div>
    </div>
);

// --- POLL TOOL ---
const PollTool: React.FC<{ 
    activePoll: PollState | null, 
    onCreate: (q: string, opts: string[]) => void, 
    onEnd: () => void,
    onReaction: (optId: string, type: 'up' | 'down') => void,
    isDeckOnlyMode?: boolean
}> = ({ activePoll, onCreate, onEnd, onReaction, isDeckOnlyMode }) => {
    const [question, setQuestion] = useState('');
    const [options, setOptions] = useState(['Yes', 'No']);

    if (activePoll && activePoll.isActive) {
        return (
            <div className="flex-1 bg-gray-800 rounded-xl p-4 flex flex-col border border-purple-500 relative overflow-hidden">
                <div className="absolute inset-0 bg-purple-900/10 animate-pulse pointer-events-none" />
                <h3 className="font-bold text-lg mb-4 text-white z-10">Active Poll</h3>
                <div className="text-sm text-gray-300 mb-4 z-10">{activePoll.question}</div>
                <div className="flex-1 space-y-2 z-10 overflow-y-auto">
                    {activePoll.options.map(opt => (
                        <div key={opt.id} className="flex items-center justify-between text-xs bg-gray-900 p-2 rounded border border-gray-700">
                            <div className="flex-1">
                                <span>{opt.label} ({opt.trigger})</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="font-bold text-purple-400 text-lg mr-2">{opt.votes}</span>
                                {!isDeckOnlyMode && (
                                    <div className="flex gap-1">
                                        <button onClick={() => onReaction(opt.id, 'up')} className="p-1 hover:bg-gray-700 rounded text-green-400"><ArrowUp className="w-4 h-4" /></button>
                                        <button onClick={() => onReaction(opt.id, 'down')} className="p-1 hover:bg-gray-700 rounded text-red-400"><ArrowDown className="w-4 h-4" /></button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
                {!isDeckOnlyMode && <button onClick={onEnd} className="mt-4 w-full py-3 bg-red-600 hover:bg-red-500 rounded font-bold z-10 flex-shrink-0">End Poll</button>}
                {isDeckOnlyMode && <div className="mt-4 text-center text-xs text-gray-500 italic">Poll controls disabled in Deck Mode</div>}
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
                {!isDeckOnlyMode ? (
                    <button 
                        onClick={() => onCreate(question, options)}
                        disabled={!question || options.some(o => !o)}
                        className="w-full py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 rounded font-bold mt-2"
                    >
                        Start Poll
                    </button>
                ) : (
                    <button disabled className="w-full py-3 bg-gray-700 text-gray-500 rounded font-bold mt-2 cursor-not-allowed">
                        Polls Disabled (Deck Mode)
                    </button>
                )}
            </div>
        </div>
    );
};

// --- DEMO TOOLS (MOCK DATA) ---
const DemoTools: React.FC<{ 
    onAddChat: () => void, 
    onAddEvent: () => void, 
    onStartPoll: () => void,
    onVotePoll: () => void
}> = ({ onAddChat, onAddEvent, onStartPoll, onVotePoll }) => {
    return (
        <div className="flex-1 bg-gray-800 rounded-xl p-4 flex flex-col border-2 border-yellow-600/50 overflow-y-auto relative">
             <div className="absolute inset-0 bg-yellow-500/5 pointer-events-none" />
             <div className="p-3 bg-yellow-900/30 font-bold border-b border-yellow-700/50 flex items-center gap-2 rounded mb-3">
                <FlaskConical className="w-4 h-4 text-yellow-500" /> Demo Controls
            </div>
            <div className="space-y-3 z-10">
                <button onClick={onAddChat} className="w-full flex items-center p-3 rounded bg-gray-700 hover:bg-gray-600 border border-gray-600 hover:border-gray-500 transition text-left">
                    <MessageSquarePlus className="w-5 h-5 mr-3 text-green-400" />
                    <div>
                        <div className="text-sm font-bold">Add Chat Message</div>
                        <div className="text-[10px] text-gray-400">Random user & message</div>
                    </div>
                </button>
                <button onClick={onAddEvent} className="w-full flex items-center p-3 rounded bg-gray-700 hover:bg-gray-600 border border-gray-600 hover:border-gray-500 transition text-left">
                    <UserPlus className="w-5 h-5 mr-3 text-pink-400" />
                    <div>
                        <div className="text-sm font-bold">Trigger Event</div>
                        <div className="text-[10px] text-gray-400">Follow, Sub, Raid, etc.</div>
                    </div>
                </button>
                <button onClick={onStartPoll} className="w-full flex items-center p-3 rounded bg-gray-700 hover:bg-gray-600 border border-gray-600 hover:border-gray-500 transition text-left">
                    <BarChart2 className="w-5 h-5 mr-3 text-blue-400" />
                    <div>
                        <div className="text-sm font-bold">Start Demo Poll</div>
                        <div className="text-[10px] text-gray-400">Creates a preset poll</div>
                    </div>
                </button>
                <button onClick={onVotePoll} className="w-full flex items-center p-3 rounded bg-gray-700 hover:bg-gray-600 border border-gray-600 hover:border-gray-500 transition text-left">
                    <Users className="w-5 h-5 mr-3 text-purple-400" />
                    <div>
                        <div className="text-sm font-bold">Simulate Votes</div>
                        <div className="text-[10px] text-gray-400">Adds random votes</div>
                    </div>
                </button>
            </div>
        </div>
    );
};

// --- BUTTON EDITOR ---
const ButtonEditor: React.FC<{ 
    button: SoundItem, 
    onSave: (btn: SoundItem) => void, 
    onCancel: () => void,
    onTest: (btn: SoundItem) => void,
    onDelete: (id: string) => void
}> = ({ button, onSave, onCancel, onTest, onDelete }) => {
    const [edited, setEdited] = useState<SoundItem>(button);
    const [tab, setTab] = useState<'style' | 'audio' | 'visual'>('style');

    const handleConfirmDelete = () => {
        if (confirm("Are you sure you want to delete this button?")) {
            onDelete(button.id);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-gray-900 rounded-2xl w-full max-w-2xl border border-gray-700 shadow-2xl flex flex-col max-h-[90vh]">
                <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-800 rounded-t-2xl">
                    <h3 className="text-xl font-bold flex items-center gap-2"><Edit2 className="w-5 h-5 text-yellow-500"/> Edit "{edited.label}"</h3>
                    <div className="flex gap-2">
                        <button onClick={onCancel} className="text-gray-400 hover:text-white"><X className="w-6 h-6"/></button>
                    </div>
                </div>
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
                <div className="flex-1 overflow-y-auto p-6 bg-gray-900">
                    {tab === 'style' && (
                        <div className="space-y-6">
                             <div>
                                <label className="text-xs uppercase text-gray-500 font-bold mb-2 block">Button Label</label>
                                <input className="w-full bg-gray-800 border border-gray-700 rounded p-3 text-lg font-bold" value={edited.label} onChange={e => setEdited({...edited, label: e.target.value})} />
                             </div>
                             <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="text-xs uppercase text-gray-500 font-bold mb-2 block">Icon</label>
                                    <select className="w-full bg-gray-800 border border-gray-700 rounded p-3 text-sm" value={edited.iconName} onChange={e => setEdited({...edited, iconName: e.target.value})}>
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
                                         <input type="color" className="w-10 h-10 rounded cursor-pointer bg-transparent border-none" value={edited.textColor || '#ffffff'} onChange={e => setEdited({...edited, textColor: e.target.value})} />
                                         <span className="text-sm font-mono text-gray-400">{edited.textColor || '#ffffff'}</span>
                                     </div>
                                 </div>
                                 <div>
                                     <label className="text-xs uppercase text-gray-500 font-bold mb-2 block">Font Style</label>
                                     <div className="grid grid-cols-2 gap-2">
                                         {FONT_STYLES.map(fs => (
                                             <button key={fs.id} onClick={() => setEdited({...edited, fontStyle: fs.id as any})} className={`text-xs p-2 rounded border ${edited.fontStyle === fs.id ? 'bg-yellow-600/20 border-yellow-500 text-yellow-400' : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'}`}>{fs.label}</button>
                                         ))}
                                     </div>
                                 </div>
                             </div>
                        </div>
                    )}
                    {tab === 'audio' && (
                        <div className="space-y-6">
                            <p className="text-sm text-gray-400 mb-4 bg-gray-800 p-3 rounded border border-gray-700">Choose a built-in game sound or paste a custom URL (MP3/WAV).</p>
                            <div>
                                <label className="text-xs uppercase text-gray-500 font-bold mb-2 block">Built-in Sound Library</label>
                                <div className="space-y-4 max-h-60 overflow-y-auto pr-2">
                                    {Object.entries(SOUND_LIBRARY).map(([category, items]) => (
                                        <div key={category}>
                                            <h4 className="text-xs font-bold text-purple-400 uppercase mb-2 sticky top-0 bg-gray-900 py-1">{category}</h4>
                                            <div className="grid grid-cols-2 gap-2">
                                                {items.map(item => (
                                                    <button key={item.id} onClick={() => { setEdited({...edited, soundPreset: item.id}); playSynthSound(item.id); }} className={`flex items-center justify-between p-3 rounded border text-sm text-left group ${edited.soundPreset === item.id ? 'bg-green-600/20 border-green-500 text-green-400' : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'}`}><span>{item.label}</span><Play className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" /></button>
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
                                <input className="w-full bg-gray-800 border border-gray-700 rounded p-3 text-sm font-mono text-blue-400" placeholder="https://example.com/sound.mp3" value={edited.soundUrl || ''} onChange={e => setEdited({...edited, soundUrl: e.target.value})} />
                            </div>
                        </div>
                    )}
                    {tab === 'visual' && (
                        <div className="space-y-6">
                             <div>
                                 <label className="text-xs uppercase text-gray-500 font-bold mb-2 block">Animation Style</label>
                                 <div className="grid grid-cols-3 gap-2">
                                     {ANIMATION_STYLES.map(anim => (
                                         <button key={anim.id} onClick={() => setEdited({...edited, animation: anim.id as any})} className={`text-sm p-3 rounded border font-medium ${edited.animation === anim.id ? 'bg-pink-600/20 border-pink-500 text-pink-400' : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'}`}>{anim.label}</button>
                                     ))}
                                 </div>
                             </div>
                             <div>
                                <label className="text-xs uppercase text-gray-500 font-bold mb-2 block">Custom Image / GIF URL</label>
                                <input className="w-full bg-gray-800 border border-gray-700 rounded p-3 text-sm font-mono text-blue-400" placeholder="https://media.giphy.com/..." value={edited.imageUrl || ''} onChange={e => setEdited({...edited, imageUrl: e.target.value})} />
                                {edited.imageUrl && (
                                    <div className="mt-4 p-4 bg-gray-800 rounded border border-gray-700 flex justify-center">
                                        <img src={edited.imageUrl} alt="Preview" className="max-h-32 object-contain" />
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
                <div className="p-4 border-t border-gray-700 bg-gray-800 rounded-b-2xl flex gap-3">
                    <button onClick={handleConfirmDelete} className="px-4 bg-red-900/50 hover:bg-red-800 border border-red-800 text-red-300 rounded-lg font-bold" title="Delete Button">
                        <Trash2 className="w-5 h-5" />
                    </button>
                    <button onClick={() => onSave(edited)} className="flex-1 bg-green-600 hover:bg-green-500 py-3 rounded-lg font-bold text-lg flex items-center justify-center gap-2 shadow-lg shadow-green-900/50"><Save className="w-5 h-5"/> Save Changes</button>
                    <button onClick={() => onTest(edited)} className="px-6 bg-purple-600 hover:bg-purple-500 rounded-lg font-bold text-white flex items-center justify-center gap-2 shadow-lg shadow-purple-900/50"><Monitor className="w-5 h-5"/> Test</button>
                </div>
            </div>
        </div>
    );
};


// --- MAIN CONTROL DECK ---
const ControlDeck: React.FC = () => {
  const [showSettings, setShowSettings] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  
  // App Data State
  const [twitchConfig, setTwitchConfig] = useState<TwitchConfig>({ clientId: '', accessToken: '', channel: '', preventSleep: false });
  const [soundButtons, setSoundButtons] = useState<SoundItem[]>(DEFAULT_SOUND_BOARD);
  
  // Sidebar Tab State
  const [activeTab, setActiveTab] = useState<'chat' | 'events' | 'tools' | 'demo'>('chat');
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [poll, setPoll] = useState<PollState | null>(null);

  // Demo Mode State
  const [isDemoMode, setIsDemoMode] = useState(false);
  // Deck Only Mode State
  const [isDeckOnlyMode, setIsDeckOnlyMode] = useState(false);

  const [demoActiveAlert, setDemoActiveAlert] = useState<ActiveAlert | null>(null);
  const demoAlertTimeout = useRef<number | null>(null);

  // Edit Mode State
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingButton, setEditingButton] = useState<SoundItem | null>(null);

  // Connection State
  const [peer, setPeer] = useState<Peer | null>(null);
  const [conn, setConn] = useState<DataConnection | null>(null);
  const [inputCode, setInputCode] = useState('');
  const [status, setStatus] = useState<'DISCONNECTED' | 'CONNECTING' | 'CONNECTED'>('DISCONNECTED');
  const [autoReconnect, setAutoReconnect] = useState(false);
  
  // Network Health / Heartbeat
  const [latency, setLatency] = useState<number | null>(null);
  const lastPongRef = useRef<number>(Date.now());
  const heartbeatIntervalRef = useRef<number | null>(null);

  // UI State
  const [isFullscreen, setIsFullscreen] = useState(false);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const hiddenVideoRef = useRef<HTMLVideoElement>(null); // "Video Hack"

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

  // --- PERSISTENCE & INITIALIZATION ---
  useEffect(() => {
      // 1. Load config from persistent storage
      const loaded = loadConfigFromStorage();
      if (loaded) {
          setSoundButtons(loaded.soundButtons);
          setTwitchConfig(loaded.twitchConfig);
      }
      
      // 2. Check Onboarding
      const seen = localStorage.getItem('onboarding_connect_seen');
      if (!seen) setShowOnboarding(true);

      // 3. Init Peer
      const p = new Peer(); 
      setPeer(p);
      return () => p.destroy();
  }, []);

  // Save config whenever relevant state changes
  useEffect(() => {
      saveConfigToStorage({
          soundButtons,
          twitchConfig
      });
  }, [soundButtons, twitchConfig]);

  const dismissOnboarding = () => {
      setShowOnboarding(false);
      localStorage.setItem('onboarding_connect_seen', '1');
  };

  // --- DEMO MODE HELPERS ---
  const triggerDemoAlert = (alert: ActiveAlert) => {
      setDemoActiveAlert(alert);
      if (demoAlertTimeout.current) window.clearTimeout(demoAlertTimeout.current);
      
      // Auto clear after animation
      const duration = alert.type === 'chat' ? 10000 : 3000;
      demoAlertTimeout.current = window.setTimeout(() => setDemoActiveAlert(null), duration);
  };

  const handleDemoMockChat = () => {
      const msg = generateMockChat();
      setChatMessages(prev => [...prev.slice(-49), msg]);
      setLastMsgTime(Date.now());
  };

  const handleDemoMockEvent = () => {
      const evt = generateMockEvent();
      setEvents(prev => [evt, ...prev]);
  };

  const handleDemoPoll = () => {
      setPoll(generateMockPoll());
  };
  
  const handleDemoVote = () => {
      if (poll && poll.isActive) {
          const updated = {...poll};
          // Add 1-3 votes to random options
          const votesToAdd = Math.ceil(Math.random() * 3);
          for(let i=0; i<votesToAdd; i++) {
              const idx = Math.floor(Math.random() * updated.options.length);
              updated.options[idx].votes++;
              updated.totalVotes++;
          }
          setPoll(updated);
      }
  };

  // Switch to Demo tab when Demo Mode enabled
  useEffect(() => {
      if (isDemoMode) setActiveTab('demo');
      else if (activeTab === 'demo') setActiveTab('chat');
  }, [isDemoMode]);


  // --- WAKE LOCK & SLEEP PREVENTION (Robust) ---
  const activateWakeLock = async () => {
      // 1. Native API
      if ('wakeLock' in navigator) {
          try {
              if (wakeLockRef.current) return;
              const sentinel = await navigator.wakeLock.request('screen');
              wakeLockRef.current = sentinel;
              console.log('Wake Lock acquired (Native)');
              sentinel.addEventListener('release', () => {
                  console.log('Wake Lock released');
                  wakeLockRef.current = null;
                  // If release happened but we still want it, try to re-acquire (might fail if tab hidden)
                  if (twitchConfig.preventSleep && document.visibilityState === 'visible') {
                      activateWakeLock();
                  }
              });
          } catch (err: any) {
              console.warn(`Wake Lock API failed: ${err.name}, ${err.message}`);
          }
      }
      
      // 2. Video Hack (Fallback for Android/iOS)
      if (hiddenVideoRef.current) {
          try {
              hiddenVideoRef.current.play().catch(e => console.warn("Video hack play failed", e));
          } catch(e) { console.warn("Video hack error", e); }
      }
  };

  const releaseWakeLock = async () => {
      if (wakeLockRef.current) {
          await wakeLockRef.current.release();
          wakeLockRef.current = null;
      }
      if (hiddenVideoRef.current) {
          hiddenVideoRef.current.pause();
      }
  };

  useEffect(() => {
      const handleVisibilityChange = () => {
          if (document.visibilityState === 'visible' && twitchConfig.preventSleep) {
              activateWakeLock();
          }
      };

      if (twitchConfig.preventSleep) {
          // Add a small delay to ensure user gesture context if called from click
          setTimeout(activateWakeLock, 100);
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

  // --- CONNECTION & RECONNECTION ---
  const connectToOverlay = useCallback(() => {
    if (!peer || inputCode.length !== 4) return;
    
    // Close existing if trying to reconnect
    if (conn) {
        try { conn.close(); } catch(e){}
    }

    setStatus('CONNECTING');
    const destId = `${PEER_ID_PREFIX}${inputCode}`;
    const connection = peer.connect(destId);

    // Reset Ping tracker
    lastPongRef.current = Date.now();
    setLatency(null);

    connection.on('open', () => { 
        setStatus('CONNECTED'); 
        setConn(connection);
        setAutoReconnect(true);
        addLog('info', 'Connected to Overlay');
        lastPongRef.current = Date.now(); // Reset ping timeout clock
    });

    connection.on('data', (data: any) => {
        // Handle Pong
        if (data && data.type === 'PONG') {
            const now = Date.now();
            const latencyMs = now - data.timestamp;
            setLatency(latencyMs);
            lastPongRef.current = now;
        }
    });

    connection.on('close', () => { 
        setStatus('DISCONNECTED'); 
        setConn(null); 
        setLatency(null);
        addLog('info', 'Connection closed');
    });

    connection.on('error', (err) => { 
        setStatus('DISCONNECTED'); 
        setConn(null); 
        setLatency(null);
        addLog('error', 'Connection error');
    });
  }, [peer, inputCode, conn, addLog]);

  // Heartbeat Loop
  useEffect(() => {
      if (status === 'CONNECTED' && conn && conn.open) {
          heartbeatIntervalRef.current = window.setInterval(() => {
              const now = Date.now();
              // Check for zombie connection (no pong for 10s)
              if (now - lastPongRef.current > 10000) {
                  addLog('error', 'Connection Dead (No Pong). Reconnecting...');
                  connectToOverlay();
                  return;
              }

              // Send Ping
              try {
                  conn.send({ type: 'PING', timestamp: now });
              } catch(e) {
                  console.warn("Ping failed", e);
              }
          }, 2000);
      } else {
          if (heartbeatIntervalRef.current) {
              clearInterval(heartbeatIntervalRef.current);
              heartbeatIntervalRef.current = null;
          }
      }
      return () => {
          if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
      };
  }, [status, conn, connectToOverlay, addLog]);

  // Aggressive Reconnect on Visibility Change (Tab Wake Up)
  useEffect(() => {
      const handleVisibilityForReconnect = () => {
          if (document.visibilityState === 'visible' && autoReconnect) {
              // If we thought we were connected, or if disconnected, check health
              console.log("Tab Awake. Checking Connection...");
              if (!conn || !conn.open || status === 'DISCONNECTED') {
                  console.log("Connection stale. Reconnecting...");
                  connectToOverlay();
              }
          }
      };
      document.addEventListener('visibilitychange', handleVisibilityForReconnect);
      return () => document.removeEventListener('visibilitychange', handleVisibilityForReconnect);
  }, [autoReconnect, conn, status, connectToOverlay]);


  // --- POLL SYNC FIX ---
  // Sync Poll State to Peer whenever it changes.
  // This avoids stale closures inside the TwitchIRC callback.
  useEffect(() => {
      if (conn && conn.open && poll) {
          conn.send({ type: 'POLL_UPDATE', poll });
      } else if (conn && conn.open && !poll) {
          // If poll was cleared locally, we might want to clear remotely? 
          // (Usually handled by onEndPoll sending POLL_END)
      }
  }, [poll, conn]);

  // --- CHAT READ TRACKING ---
  const markChatRead = (msgId: string) => {
      setChatMessages(prev => {
          const targetIndex = prev.findIndex(m => m.id === msgId);
          if (targetIndex === -1) return prev;
          
          // Since new messages are appended to end, we usually read top-down (oldest first).
          // But in a chat monitor, usually bottom is newest.
          // The user requirement: "Si le doy al botón de visto, todos los anteriores se marcan como visto."
          // In our array, index 0 is oldest, index N is newest.
          // If we click index i, we want 0...i to be read.
          return prev.map((msg, idx) => {
              if (idx <= targetIndex) return { ...msg, read: true };
              return msg;
          });
      });
  };


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
                             // LocalStorage save handled by effect
                        }
                    }
                }
            } catch (e) {
                console.warn("Token validation failed");
            }

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

            client = new TwitchIRC(
                cleanToken, 
                twitchConfig.channel, 
                fetchedUsername, 
                (msg) => {
                    if (!isMounted) return;
                    // Add new message, default read=false
                    const newMsg = { ...msg, read: false };
                    setChatMessages(prev => [...prev.slice(-99), newMsg]);
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
                                 // NOTE: Sending to Peer is now handled by the useEffect[poll, conn] hook above
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
      // Check connection before sending, reconnect if needed
      if (status !== 'CONNECTED' || !conn || !conn.open) {
          if (autoReconnect) {
              addLog('info', 'Reconnecting before send...');
              connectToOverlay();
              // Cannot send immediately, user must tap again
              return;
          }
      }

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
      // Wake Lock Refresh on interaction
      if (twitchConfig.preventSleep) activateWakeLock();

      if (isEditMode) {
          setEditingButton(btn);
          return;
      }
      
      // Connected OR Demo Mode:
      if (status === 'CONNECTED' || isDemoMode) {
          // If Connected, send to remote
          if (status === 'CONNECTED') sendTriggerPayload(btn);
          
          // If Demo Mode, also trigger local overlay and play sound locally
          if (isDemoMode) {
             const defaultSound = DEFAULT_SOUND_BOARD.find(s => s.id === btn.id);
             triggerDemoAlert({ 
                 type: 'sfx',
                 label: btn.label || defaultSound?.label || 'ALERT',
                 image: btn.imageUrl,
                 fontStyle: btn.fontStyle || defaultSound?.fontStyle || 'standard',
                 animation: btn.animation || defaultSound?.animation || 'bounce',
                 color: btn.color || defaultSound?.color || 'bg-purple-600',
                 textColor: btn.textColor
             });
             playSynthSound(btn.soundPreset || btn.id, btn.soundUrl);
          }
      } else {
          // Disconnected/Offline: Play Locally only
          playSynthSound(btn.soundPreset || btn.id, btn.soundUrl);
      }
  };

  const handleEditorTest = (btn: SoundItem) => {
      if (status === 'CONNECTED') {
          sendTriggerPayload(btn);
      } else {
          playSynthSound(btn.soundPreset || btn.id, btn.soundUrl);
          if (!isDemoMode) alert('Not connected. Playing locally.');
      }
      
      if (isDemoMode) {
          triggerDemoAlert({
             type: 'sfx',
             label: btn.label,
             image: btn.imageUrl,
             fontStyle: btn.fontStyle,
             animation: btn.animation,
             color: btn.color,
             textColor: btn.textColor
          });
      }
  };

  const saveButtonEdit = (updated: SoundItem) => {
      setSoundButtons(prev => prev.map(b => b.id === updated.id ? updated : b));
      setEditingButton(null);
  };

  const deleteButton = (id: string) => {
      setSoundButtons(prev => prev.filter(b => b.id !== id));
      setEditingButton(null);
  };

  const addNewButton = () => {
      const newBtn: SoundItem = {
          id: `custom-${Date.now()}`,
          label: 'NEW BUTTON',
          color: 'bg-gray-700',
          type: 'custom',
          iconName: 'Zap',
          animation: 'bounce',
          fontStyle: 'standard'
      };
      setSoundButtons(prev => [...prev, newBtn]);
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
      // Handled by useEffect
  };

  const endPoll = () => {
      if (poll) {
          const ended = { ...poll, isActive: false };
          setPoll(ended);
          if (conn && conn.open) conn.send({ type: 'POLL_END', poll: ended });
          setTimeout(() => setPoll(null), 2000); 
      }
  };

  const sendPollReaction = (optId: string, type: 'up' | 'down') => {
      if (conn && conn.open) {
          conn.send({ type: 'POLL_REACTION', optionId: optId, reaction: type });
      }
      if (isDemoMode) {
          // In demo mode we can't easily visualize this on the tablet overlay preview without more state lifting,
          // but we can log it.
          console.log("Demo Reaction:", optId, type);
      }
  };

  const showChatOnStream = (msg: ChatMessage) => {
      if (conn && conn.open) conn.send({ type: 'SHOW_CHAT_MSG', msg });
      
      if (isDemoMode) {
          triggerDemoAlert({ type: 'chat', chatMsg: msg });
          playSynthSound('ui-pop');
      }
  };

  const dismissEvent = (id: string) => {
      setEvents(prev => prev.map(e => e.id === id ? { ...e, seen: true } : e));
  };

  const celebrateEvent = (evt: StreamEvent) => {
      // 1. Determine template based on event type
      const templates = twitchConfig.eventTemplates || DEFAULT_EVENT_TEMPLATES;
      let template = templates.follow;
      let sfxPreset = 'ui-success';
      let color = 'bg-pink-600';

      if (evt.type === 'SUB') { 
          template = templates.sub; 
          sfxPreset = 'fun-wow'; 
          color = 'bg-purple-600';
      }
      if (evt.type === 'RAID') { 
          template = templates.raid; 
          sfxPreset = 'scifi-alarm'; 
          color = 'bg-red-600';
      }
      if (evt.type === 'CHEER') { 
          template = templates.cheer; 
          sfxPreset = 'retro-coin'; 
          color = 'bg-yellow-500';
      }

      const label = template.replace('{user}', evt.username);

      // 2. Trigger on Overlay
      if (conn && conn.open) {
          conn.send({
              type: 'TRIGGER_SFX',
              sfxId: `event-${evt.id}`,
              customLabel: label,
              soundPreset: sfxPreset,
              color: color,
              animation: 'bounce',
              fontStyle: 'comic'
          });
      }

      if (isDemoMode) {
          triggerDemoAlert({
              type: 'sfx',
              label: label,
              color: color,
              animation: 'bounce',
              fontStyle: 'comic'
          });
          playSynthSound(sfxPreset);
      }

      // 3. Dismiss from list
      dismissEvent(evt.id);
  };

  // --- RENDER HELPERS ---
  if (showSettings) {
    return <Settings 
      config={twitchConfig} 
      soundButtons={soundButtons}
      setTwitchConfig={setTwitchConfig}
      setSoundButtons={setSoundButtons}
      onBack={() => setShowSettings(false)} 
      isFullscreen={isFullscreen}
      toggleFullscreen={toggleFullscreen}
    />;
  }

  // Connect Screen
  if (status !== 'CONNECTED' && !autoReconnect && !isDemoMode && !isDeckOnlyMode) {
      return (
          <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4 relative">
              
              {/* HIDDEN VIDEO HACK ELEMENT */}
              <video 
                  ref={hiddenVideoRef} 
                  playsInline 
                  muted 
                  loop 
                  width="1" 
                  height="1" 
                  style={{ position: 'absolute', opacity: 0.01, pointerEvents: 'none' }}
                  src="data:video/mp4;base64,AAAAHGZ0eXBNNBBwAAAAAAAAbW9vdgAAAABsbXZoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA7gAAAAEAAAEAAAEAAAABAAAAAAAAAAAAAAAAAAAAAAAAdHJhawAAAFx0a2hkAAAAAdAAAAAAAAEAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAQAAAAEAAAABAAAAAmdtZGwAAAAUZ21pbgAAAAAAAAABAAAAEFFzbWhkAAAAAAAAAAAAAAJkaGluZgAAABRkaW5mAAAAAGRyZWYAAAAAAAAAAQAAAAx1cmwgAAAAAQAAAA5zdGJsAAAAFHN0c2QAAAAAAAAAAQAAAARtcDR2AAAAFHN0dHMAAAAAAAAAAQAAAAEAAAAcc3RzYwAAAAAAAAABAAAAAQAAAAEAAAABAAAAFHN0c3oAAAAAAAAAEAAAAAEAAAAUc3RjbwAAAAAAAAABAAAAAAAAYXVkYXQ="
              />

              {/* Onboarding Bubble for Connect Screen */}
              {showOnboarding && (
                  <div className="absolute z-50 top-4 right-4 md:right-auto md:top-auto md:mb-64 animate-bounce-in max-w-xs w-full">
                      <div className="bg-gray-800 border-2 border-purple-500 rounded-xl p-4 shadow-2xl relative">
                          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-gray-800 border-b-2 border-r-2 border-purple-500 rotate-45 transform"></div>
                          <div className="flex items-start gap-3 mb-2">
                             <div className="p-1 bg-purple-600 rounded-full"><Info className="w-5 h-5 text-white" /></div>
                             <h3 className="font-bold text-lg leading-tight">How it works</h3>
                          </div>
                          <ul className="text-sm text-gray-300 space-y-2 mb-4 list-disc pl-4">
                              <li>In your OBS overlay, you'll see a <b>4-digit code</b>.</li>
                              <li>Type that code here and press <b>CONNECT</b>.</li>
                              <li>Once connected, trigger sounds & alerts remotely.</li>
                          </ul>
                          <div className="text-xs text-gray-500 mb-3 border-t border-gray-700 pt-2">
                              Config & Sync tools are in Settings.
                          </div>
                          <button onClick={dismissOnboarding} className="w-full py-2 bg-purple-600 hover:bg-purple-500 rounded-lg font-bold text-sm">Got it</button>
                      </div>
                  </div>
              )}

              <div className="w-full max-w-sm bg-gray-800 rounded-2xl p-6 shadow-2xl border border-gray-700 relative z-10">
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
                  <div className="mt-6 pt-6 border-t border-gray-700 flex flex-col gap-3 text-center">
                    <button onClick={() => setIsDeckOnlyMode(true)} className="w-full py-3 bg-blue-900/30 hover:bg-blue-800/40 rounded-xl font-bold text-sm text-blue-400 border border-blue-500/30 flex items-center justify-center"><Eye className="w-4 h-4 mr-2" /> Deck Only (Chat Monitor)</button>
                    <div className="flex gap-2">
                        <button onClick={() => setIsDemoMode(true)} className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl font-bold text-sm text-yellow-500 border border-yellow-500/30 flex items-center justify-center"><FlaskConical className="w-4 h-4 mr-2" /> Demo</button>
                        <button onClick={() => window.location.hash = '/overlay'} className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl font-bold text-sm text-purple-400 border border-purple-500/30 flex items-center justify-center"><Monitor className="w-4 h-4 mr-2" /> Overlay</button>
                    </div>
                  </div>
              </div>
          </div>
      );
  }

  // --- MAIN UI ---
  return (
    <div className="w-full h-screen flex flex-col md:flex-row bg-gray-900 text-white relative overflow-hidden">
      
      {/* HIDDEN VIDEO HACK ELEMENT (Main View) */}
      <video 
          ref={hiddenVideoRef} 
          playsInline 
          muted 
          loop 
          width="1" 
          height="1" 
          style={{ position: 'absolute', opacity: 0.01, pointerEvents: 'none' }}
          src="data:video/mp4;base64,AAAAHGZ0eXBNNBBwAAAAAAAAbW9vdgAAAABsbXZoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA7gAAAAEAAAEAAAEAAAABAAAAAAAAAAAAAAAAAAAAAAAAdHJhawAAAFx0a2hkAAAAAdAAAAAAAAEAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAQAAAAEAAAABAAAAAmdtZGwAAAAUZ21pbgAAAAAAAAABAAAAEFFzbWhkAAAAAAAAAAAAAAJkaGluZgAAABRkaW5mAAAAAGRyZWYAAAAAAAAAAQAAAAx1cmwgAAAAAQAAAA5zdGJsAAAAFHN0c2QAAAAAAAAAAQAAAARtcDR2AAAAFHN0dHMAAAAAAAAAAQAAAAEAAAAcc3RzYwAAAAAAAAABAAAAAQAAAAEAAAABAAAAFHN0c3oAAAAAAAAAEAAAAAEAAAAUc3RjbwAAAAAAAAABAAAAAAAAYXVkYXQ="
      />

      {/* DEMO OVERLAY PREVIEW LAYER */}
      {isDemoMode && (
          <div className="fixed inset-0 z-50 pointer-events-none">
              <OverlayDisplay activeAlert={demoActiveAlert} activePoll={poll} isDemo={true} />
          </div>
      )}

      {/* Sidebar (Expands to full width in Deck Only mode) */}
      <div className={`${isDeckOnlyMode ? 'w-full' : 'md:w-72'} bg-gray-800 border-r border-gray-700 flex-shrink-0 flex flex-col h-[50vh] md:h-full z-40 shadow-xl transition-all duration-300`}>
         
         {/* Top Status */}
         <div className="p-3 border-b border-gray-700 flex justify-between items-center bg-gray-900 flex-shrink-0">
            {isDemoMode ? (
                <div className="flex items-center gap-2 text-yellow-500 font-bold text-xs animate-pulse px-2 py-1 bg-yellow-900/30 rounded border border-yellow-500/50">
                    <FlaskConical className="w-3 h-3" /> DEMO MODE
                </div>
            ) : isDeckOnlyMode ? (
                <div className="flex items-center gap-2 text-blue-400 font-bold text-xs px-2 py-1 bg-blue-900/30 rounded border border-blue-500/50">
                    <Eye className="w-3 h-3" /> DECK MONITOR
                </div>
            ) : (
                status === 'CONNECTED' ? (
                    <div className="flex items-center gap-2">
                        {/* Latency Indicator */}
                        <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded border ${latency && latency < 200 ? 'text-green-400 border-green-500/30 bg-green-900/20' : 'text-yellow-400 border-yellow-500/30 bg-yellow-900/20'}`}>
                            <Activity className="w-3 h-3" /> {latency ? `${latency}ms` : '--'}
                        </div>
                        {/* Force Reconnect Button */}
                        <button 
                            onClick={connectToOverlay} 
                            className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded text-gray-300 hover:text-white"
                            title="Force Reconnect"
                        >
                            <Zap className="w-3 h-3" />
                        </button>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 text-red-400 font-bold text-xs animate-pulse">
                        <ZapOff className="w-3 h-3" /> Disconnected
                    </div>
                )
            )}
            
            <div className="flex gap-2 items-center">
                 {isDemoMode && (
                     <button onClick={() => setIsDemoMode(false)} className="p-1 rounded text-xs font-bold text-yellow-500 bg-yellow-900/30" title="Exit Demo Mode">
                         EXIT DEMO
                     </button>
                 )}
                 <button onClick={toggleFullscreen} className="text-gray-400 hover:text-white p-1 rounded hover:bg-gray-700" title="Toggle Fullscreen">
                     {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                 </button>
                 <button onClick={() => setShowSettings(true)} className="text-gray-400 hover:text-white p-1 rounded hover:bg-gray-700"><SettingsIcon className="w-4 h-4"/></button>
                 <button onClick={() => { setConn(null); setStatus('DISCONNECTED'); setAutoReconnect(false); setIsDemoMode(false); setIsDeckOnlyMode(false); }} className="text-xs text-red-400 hover:text-red-300 ml-1">
                     {isDeckOnlyMode ? 'Exit' : 'Disconnect'}
                 </button>
            </div>
         </div>
         
         {/* Viewer Counter */}
         <div className="px-2 pt-2 bg-gray-900 flex-shrink-0">
            <ViewerCounter config={twitchConfig} />
         </div>

         {/* Tabs */}
         <div className="flex border-b border-gray-700 bg-gray-900 text-xs font-bold uppercase tracking-wider flex-shrink-0 overflow-x-auto">
             <button onClick={() => setActiveTab('chat')} className={`flex-1 py-3 text-center min-w-[60px] ${activeTab === 'chat' ? 'text-purple-400 border-b-2 border-purple-500 bg-gray-800' : 'text-gray-500 hover:text-gray-300'}`}>Chat</button>
             <button onClick={() => setActiveTab('events')} className={`flex-1 py-3 text-center min-w-[60px] ${activeTab === 'events' ? 'text-pink-400 border-b-2 border-pink-500 bg-gray-800' : 'text-gray-500 hover:text-gray-300'}`}>Events {events.filter(e => !e.seen).length > 0 && <span className="ml-1 w-2 h-2 bg-pink-500 rounded-full inline-block"/>}</button>
             <button onClick={() => setActiveTab('tools')} className={`flex-1 py-3 text-center min-w-[60px] ${activeTab === 'tools' ? 'text-blue-400 border-b-2 border-blue-500 bg-gray-800' : 'text-gray-500 hover:text-gray-300'}`}>Tools</button>
             {isDemoMode && (
                 <button onClick={() => setActiveTab('demo')} className={`flex-1 py-3 text-center min-w-[60px] ${activeTab === 'demo' ? 'text-yellow-500 border-b-2 border-yellow-500 bg-gray-800' : 'text-yellow-700 hover:text-yellow-500'}`}>Demo</button>
             )}
         </div>

         {/* Content Area */}
         <div className="flex-1 overflow-hidden bg-gray-900 flex flex-col p-2 min-h-0">
             {activeTab === 'chat' && (
                 <>
                    <div className="flex-1 overflow-hidden relative">
                        <ChatMonitor 
                            messages={chatMessages} 
                            lastMessageTime={lastMsgTime} 
                            onShowOnStream={showChatOnStream}
                            onMarkRead={markChatRead}
                            isDeckOnlyMode={isDeckOnlyMode}
                        />
                    </div>
                    {/* Chat Input Area */}
                    <form onSubmit={(e) => { e.preventDefault(); if(chatInput.trim() && ircClient) { ircClient.sendMessage(chatInput); setChatInput(''); }}} className="mt-2 flex gap-1 flex-shrink-0">
                        <input className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-2 text-xs focus:outline-none focus:border-purple-500" value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Send message..." />
                        <button type="submit" className="bg-purple-600 px-3 rounded text-white"><Send className="w-3 h-3" /></button>
                    </form>
                 </>
             )}

             {activeTab === 'events' && (
                 <EventsPanel events={events} onDismiss={dismissEvent} onCelebrate={celebrateEvent} isDeckOnlyMode={isDeckOnlyMode} />
             )}

             {activeTab === 'tools' && (
                 <PollTool activePoll={poll} onCreate={startPoll} onEnd={endPoll} onReaction={sendPollReaction} isDeckOnlyMode={isDeckOnlyMode} />
             )}

             {activeTab === 'demo' && isDemoMode && (
                 <DemoTools 
                    onAddChat={handleDemoMockChat} 
                    onAddEvent={handleDemoMockEvent} 
                    onStartPoll={handleDemoPoll}
                    onVotePoll={handleDemoVote}
                 />
             )}
         </div>
      </div>

      {/* Main Content (Button Grid) - Hidden in Deck Only Mode */}
      {!isDeckOnlyMode && (
          <div className="flex-1 bg-gray-900/95 flex flex-col h-full overflow-hidden relative z-0">
             
             {/* Header */}
             <div className="flex justify-between items-center p-4 bg-gray-900 border-b border-gray-800 flex-shrink-0">
                 <h1 className="text-xl font-bold text-gray-400 flex items-center gap-2"><Volume2 className="w-5 h-5" /> Soundboard</h1>
                 <div className="flex items-center gap-2">
                     {status !== 'CONNECTED' && !isDemoMode && (
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
             
             {/* Scrollable Grid */}
             <div className="flex-1 overflow-y-auto p-4">
                 <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-20">
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

                    {/* ADD NEW BUTTON (Visible in Edit Mode) */}
                    {isEditMode && (
                        <button
                            onClick={addNewButton}
                            className="relative rounded-2xl shadow-lg transition-all flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-600 bg-gray-800/50 hover:bg-gray-800 hover:border-green-500 group h-32"
                        >
                            <div className="p-3 rounded-full bg-gray-800 group-hover:bg-green-900/30 transition-colors">
                                <Plus className="w-8 h-8 text-gray-500 group-hover:text-green-500" />
                            </div>
                            <span className="font-bold text-sm text-gray-500 group-hover:text-green-500 uppercase tracking-widest">Add New</span>
                        </button>
                    )}
                 </div>
             </div>
          </div>
      )}

      {/* Button Editor Modal */}
      {editingButton && (
          <ButtonEditor 
            button={editingButton} 
            onSave={saveButtonEdit} 
            onCancel={() => setEditingButton(null)} 
            onTest={handleEditorTest}
            onDelete={deleteButton}
          />
      )}

      {/* Debug Console */}
      {showDebug && (
        <div className="absolute bottom-0 right-0 w-full md:w-2/3 h-56 bg-black/95 text-green-400 font-mono text-xs border-t-2 border-purple-500 flex flex-col z-50">
            <div className="flex justify-between items-center p-2 bg-gray-900 border-b border-gray-700">
                <span className="font-bold flex items-center"><Terminal className="w-3 h-3 mr-2" /> Network Diagnostics</span>
                <button onClick={() => setShowDebug(false)}><X className="w-4 h-4" /></button>
            </div>
            
            {/* Connection Stats Panel */}
            <div className="grid grid-cols-2 gap-2 p-2 bg-gray-900/50 border-b border-gray-800 text-[10px]">
                <div className="flex justify-between">
                    <span className="text-gray-500">Peer ID:</span>
                    <span className="text-white">{inputCode ? `...${inputCode}` : 'N/A'}</span>
                </div>
                 <div className="flex justify-between">
                    <span className="text-gray-500">Status:</span>
                    <span className={`${status === 'CONNECTED' ? 'text-green-400' : 'text-red-400'} font-bold`}>{status}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-500">Latency:</span>
                    <span className="text-white">{latency ? `${latency}ms` : 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-500">Last Pong:</span>
                    <span className={Date.now() - lastPongRef.current > 5000 ? 'text-red-400' : 'text-green-400'}>
                        {Math.floor((Date.now() - lastPongRef.current) / 1000)}s ago
                    </span>
                </div>
            </div>
            
            <div className="p-2 border-b border-gray-800">
                <button onClick={connectToOverlay} className="w-full bg-red-900/40 hover:bg-red-900/60 text-red-300 border border-red-800 p-1 rounded font-bold text-xs uppercase flex items-center justify-center gap-2">
                    <Zap className="w-3 h-3"/> Force Full Reconnect
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2"><div ref={logsEndRef} />{logs.map((l, i) => <div key={i}>{l}</div>)}</div>
        </div>
      )}
      {!showDebug && <button onClick={() => setShowDebug(true)} className="absolute bottom-2 right-2 opacity-50 hover:opacity-100"><Terminal className="w-4 h-4 text-gray-500" /></button>}
    </div>
  );
};

export default ControlDeck;
