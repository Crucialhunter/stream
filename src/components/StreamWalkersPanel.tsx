
import React, { useState, useEffect, useRef } from 'react';
import { 
  Zap, Wifi, WifiOff, Users, Sword, Smile, CloudRain, 
  Gift, Camera, BarChart2, Play, Search, Lock, Unlock, 
  Edit2, Save, X, Info, Crown, VenetianMask, FileText, Move
} from 'lucide-react';
import { StreamWalkersCommand, Walker, WalkerLogEntry } from '../types';
import { 
  WALKER_MOODS, WALKER_EVENTS, WALKER_SCENES, 
  WALKER_ITEMS, WALKER_EMOTES 
} from '../constants';

interface StreamWalkersPanelProps {
  status: 'CONNECTED' | 'CONNECTING' | 'DISCONNECTED';
  code: string;
  setCode: (c: string) => void;
  onConnect: () => void;
  onDisconnect: () => void;
  onCommand: (cmd: StreamWalkersCommand) => void;
  walkersList: Walker[];
  serverState: any;
  latency: number | null;
  walkersLogs: WalkerLogEntry[];
}

const StreamWalkersPanel: React.FC<StreamWalkersPanelProps> = ({
  status, code, setCode, onConnect, onDisconnect, onCommand, 
  walkersList, serverState, latency, walkersLogs
}) => {
  // Local UI State
  const [selectedWalkerId, setSelectedWalkerId] = useState<string | null>(null);
  const [isEditingWalker, setIsEditingWalker] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editCosmetics, setEditCosmetics] = useState({ crown: false, cape: false });
  
  // Logs UI State
  const [showLogs, setShowLogs] = useState(false);
  const [logPosition, setLogPosition] = useState({ x: 20, y: 80 });
  const [isDraggingLogs, setIsDraggingLogs] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Focus Form
  const [focusDuration, setFocusDuration] = useState(10);
  const [focusBubble, setFocusBubble] = useState('');
  const [focusLock, setFocusLock] = useState(false);

  // Drop Form
  const [dropType, setDropType] = useState(WALKER_ITEMS[0]);
  const [dropCount, setDropCount] = useState(5);

  // Duel Form
  const [duelDefenderId, setDuelDefenderId] = useState<string>('');

  const selectedWalker = walkersList.find(w => w.id === selectedWalkerId);

  // Sync edit state when selection changes
  useEffect(() => {
    if (selectedWalker) {
      setEditTitle(selectedWalker.title || '');
      setEditCosmetics({
        crown: selectedWalker.cosmetics.crown || false,
        cape: selectedWalker.cosmetics.cape || false
      });
    }
  }, [selectedWalker]);

  // Auto-scroll logs
  useEffect(() => {
      if (showLogs && logsEndRef.current) {
          logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
  }, [walkersLogs, showLogs]);

  const handleSaveWalker = () => {
    if (!selectedWalker) return;
    onCommand({
      type: 'UPDATE_WALKER_META',
      target: { id: selectedWalker.id },
      title: editTitle,
      cosmetics: editCosmetics
    });
    setIsEditingWalker(false);
  };

  // --- DRAG LOGIC ---
  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
      // Differentiate between mouse and touch for client coordinates
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

      setIsDraggingLogs(true);
      dragOffset.current = {
          x: clientX - logPosition.x,
          y: clientY - logPosition.y
      };
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDraggingLogs) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

      setLogPosition({
          x: clientX - dragOffset.current.x,
          y: clientY - dragOffset.current.y
      });
  };

  const handleMouseUp = () => {
      setIsDraggingLogs(false);
  };

  // Add global listeners for drag release (so it doesn't get stuck if released outside)
  useEffect(() => {
      if (isDraggingLogs) {
          window.addEventListener('mouseup', handleMouseUp);
          window.addEventListener('touchend', handleMouseUp);
          window.addEventListener('mousemove', handleMouseMove as any);
          window.addEventListener('touchmove', handleMouseMove as any);
      } else {
          window.removeEventListener('mouseup', handleMouseUp);
          window.removeEventListener('touchend', handleMouseUp);
          window.removeEventListener('mousemove', handleMouseMove as any);
          window.removeEventListener('touchmove', handleMouseMove as any);
      }
      return () => {
          window.removeEventListener('mouseup', handleMouseUp);
          window.removeEventListener('touchend', handleMouseUp);
          window.removeEventListener('mousemove', handleMouseMove as any);
          window.removeEventListener('touchmove', handleMouseMove as any);
      }
  }, [isDraggingLogs]);


  const activeMood = serverState?.mood || 'DEFAULT';

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white relative">
      
      {/* LOGS PANEL OVERLAY */}
      {showLogs && (
          <div 
            className="absolute z-50 flex flex-col bg-gray-900 border border-gray-600 shadow-2xl rounded-lg w-80 h-96 overflow-hidden"
            style={{ top: logPosition.y, left: logPosition.x }}
          >
              {/* Header (Draggable) */}
              <div 
                className="bg-gray-800 p-2 border-b border-gray-700 flex justify-between items-center cursor-move select-none"
                onMouseDown={handleMouseDown}
                onTouchStart={handleMouseDown}
              >
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-300">
                      <Move className="w-3 h-3" /> Stream Walkers – Log
                  </div>
                  <button onClick={() => setShowLogs(false)} className="text-gray-400 hover:text-white">
                      <X className="w-4 h-4" />
                  </button>
              </div>

              {/* Log Content */}
              <div className="flex-1 overflow-y-auto p-2 space-y-1 bg-black/80 font-mono text-[10px]">
                  {walkersLogs.length === 0 && <div className="text-gray-500 italic text-center mt-4">No logs yet...</div>}
                  {walkersLogs.map(log => (
                      <div key={log.id} className="border-b border-gray-800 pb-1 mb-1">
                          <div className="flex gap-2 mb-0.5">
                              <span className="text-gray-500">{log.timestamp}</span>
                              <span className={`font-bold ${
                                  log.direction === 'OUT' ? 'text-blue-400' : 
                                  log.direction === 'IN' ? 'text-green-400' : 'text-yellow-500'
                              }`}>
                                  {log.direction}
                              </span>
                              <span className="text-white font-bold">{log.type}</span>
                          </div>
                          <div className="text-gray-300 break-words">{log.message}</div>
                          {log.details && (
                              <details className="mt-0.5">
                                  <summary className="cursor-pointer text-gray-600 hover:text-gray-400 select-none text-[9px]">&gt; Details</summary>
                                  <pre className="text-gray-500 bg-gray-900/50 p-1 rounded overflow-x-auto whitespace-pre-wrap mt-1">
                                      {JSON.stringify(log.details, null, 2)}
                                  </pre>
                              </details>
                          )}
                      </div>
                  ))}
                  <div ref={logsEndRef} />
              </div>
          </div>
      )}


      {/* CONNECTION HEADER */}
      <div className="p-4 bg-gray-800 border-b border-gray-700 flex flex-wrap gap-4 items-center justify-between flex-shrink-0">
         <div className="flex items-center gap-3">
             <div className="bg-blue-900/50 p-2 rounded-lg border border-blue-500/30">
                <Users className="w-5 h-5 text-blue-400" />
             </div>
             <div>
                 <h2 className="font-bold text-lg leading-none">Stream Walkers</h2>
                 <div className="flex items-center gap-2 mt-1">
                     <div className={`w-2 h-2 rounded-full ${status === 'CONNECTED' ? 'bg-green-500 animate-pulse' : status === 'CONNECTING' ? 'bg-yellow-500' : 'bg-red-500'}`} />
                     <span className="text-xs text-gray-400 font-mono">
                         {status} {latency ? `(${latency}ms)` : ''}
                     </span>
                 </div>
             </div>
         </div>
         
         <div className="flex items-center gap-2 bg-gray-900 p-1.5 rounded-lg border border-gray-700">
             {/* LOG TOGGLE BUTTON */}
             <button 
                onClick={() => setShowLogs(!showLogs)} 
                className={`p-2 rounded transition border ${showLogs ? 'bg-blue-600/30 border-blue-500 text-blue-400' : 'bg-gray-800 border-gray-600 text-gray-400 hover:text-white'}`}
                title="Toggle Walker Logs"
             >
                 <FileText className="w-4 h-4" />
             </button>

             <div className="w-px h-6 bg-gray-700 mx-1"></div>

             <span className="text-xs font-bold text-gray-500 px-2 uppercase">Code</span>
             <input 
                 value={code}
                 onChange={(e) => setCode(e.target.value.slice(0, 4))}
                 className="w-16 bg-gray-800 text-center font-mono font-bold text-white border border-gray-600 rounded p-1 focus:border-blue-500 outline-none"
                 placeholder="0000"
                 disabled={status === 'CONNECTED'}
             />
             {status === 'CONNECTED' ? (
                 <button onClick={onDisconnect} className="p-2 bg-red-900/50 text-red-400 hover:text-white hover:bg-red-600 rounded transition" title="Disconnect">
                     <WifiOff className="w-4 h-4" />
                 </button>
             ) : (
                 <button 
                    onClick={onConnect} 
                    disabled={code.length !== 4 || status === 'CONNECTING'}
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 rounded font-bold text-sm transition"
                 >
                     {status === 'CONNECTING' ? '...' : 'Connect'}
                 </button>
             )}
         </div>
      </div>

      {/* SCROLLABLE CONTENT */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        
        {/* SECTION: WALKERS LIST */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
            <div className="p-3 bg-gray-750 border-b border-gray-700 flex justify-between items-center">
                <span className="font-bold text-sm uppercase text-gray-400 flex items-center gap-2"><Search className="w-4 h-4"/> Active Walkers ({walkersList.length})</span>
                <button onClick={() => onCommand({ type: 'LIST_WALKERS' })} className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded">Refresh</button>
            </div>
            
            <div className="max-h-48 overflow-y-auto p-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {walkersList.map(w => (
                    <button 
                        key={w.id}
                        onClick={() => setSelectedWalkerId(w.id)}
                        className={`p-2 rounded-lg border text-left flex items-center gap-2 transition-all ${selectedWalkerId === w.id ? 'bg-blue-600/20 border-blue-500 ring-1 ring-blue-500' : 'bg-gray-700/50 border-gray-600 hover:bg-gray-700'}`}
                    >
                        <div className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center text-xs font-bold border border-gray-600 relative">
                            {w.name.slice(0, 2).toUpperCase()}
                            {w.cosmetics.crown && <Crown className="w-3 h-3 text-yellow-400 absolute -top-1.5 -right-1" />}
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="font-bold text-sm truncate">{w.title ? `${w.title} ${w.name}` : w.name}</div>
                            <div className="text-[10px] text-gray-400 flex gap-2">
                                <span>🪙 {w.inventory.coins}</span>
                                <span>❤️ {w.inventory.hearts}</span>
                            </div>
                        </div>
                    </button>
                ))}
            </div>

            {/* EDIT SELECTED WALKER */}
            {selectedWalker && (
                <div className="p-3 bg-blue-900/10 border-t border-gray-700">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="font-bold text-blue-400 text-sm flex items-center gap-2"><Edit2 className="w-4 h-4"/> Edit: {selectedWalker.name}</h3>
                        <div className="flex gap-2">
                            {isEditingWalker ? (
                                <>
                                    <button onClick={() => setIsEditingWalker(false)} className="p-1 hover:text-red-400"><X className="w-4 h-4"/></button>
                                    <button onClick={handleSaveWalker} className="p-1 hover:text-green-400"><Save className="w-4 h-4"/></button>
                                </>
                            ) : (
                                <button onClick={() => setIsEditingWalker(true)} className="text-xs underline text-gray-400 hover:text-white">Change Meta</button>
                            )}
                        </div>
                    </div>
                    
                    {isEditingWalker ? (
                        <div className="grid grid-cols-2 gap-3 items-end">
                            <div>
                                <label className="text-[10px] uppercase font-bold text-gray-500">Title</label>
                                <input className="w-full bg-gray-900 border border-gray-600 rounded p-1 text-sm" value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder="e.g. King" />
                            </div>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => setEditCosmetics(c => ({ ...c, crown: !c.crown }))}
                                    className={`flex-1 p-1.5 rounded border text-xs font-bold flex items-center justify-center gap-1 ${editCosmetics.crown ? 'bg-yellow-600/30 border-yellow-500 text-yellow-400' : 'bg-gray-700 border-gray-600'}`}
                                >
                                    <Crown className="w-3 h-3"/> Crown
                                </button>
                                <button 
                                    onClick={() => setEditCosmetics(c => ({ ...c, cape: !c.cape }))}
                                    className={`flex-1 p-1.5 rounded border text-xs font-bold flex items-center justify-center gap-1 ${editCosmetics.cape ? 'bg-purple-600/30 border-purple-500 text-purple-400' : 'bg-gray-700 border-gray-600'}`}
                                >
                                    <VenetianMask className="w-3 h-3"/> Cape
                                </button>
                            </div>
                        </div>
                    ) : (
                        // QUICK ACTIONS FOR SELECTED
                        <div className="grid grid-cols-4 gap-2">
                             {WALKER_EMOTES.map(emote => (
                                 <button 
                                    key={emote.id} 
                                    onClick={() => onCommand({ type: 'EMOTE', target: { id: selectedWalker.id }, emote: emote.id })}
                                    className="p-2 bg-gray-700 hover:bg-gray-600 rounded text-xs font-bold border border-gray-600"
                                 >
                                     {emote.label}
                                 </button>
                             ))}
                        </div>
                    )}
                </div>
            )}
        </div>

        {/* SECTION: ACTIONS GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            
            {/* FOCUS MODE */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
                <h3 className="font-bold text-purple-400 mb-3 flex items-center gap-2"><Camera className="w-4 h-4"/> Focus Mode</h3>
                <div className="space-y-3">
                    <div className="flex gap-2">
                         <input 
                            className="flex-1 bg-gray-900 border border-gray-600 rounded p-2 text-sm"
                            placeholder="Speech Bubble Text..."
                            value={focusBubble}
                            onChange={e => setFocusBubble(e.target.value)}
                         />
                         <input 
                            type="number" 
                            className="w-16 bg-gray-900 border border-gray-600 rounded p-2 text-sm text-center"
                            value={focusDuration}
                            onChange={e => setFocusDuration(Number(e.target.value))}
                            min={1} max={60}
                         />
                    </div>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => setFocusLock(!focusLock)} 
                            className={`p-2 rounded border ${focusLock ? 'bg-red-900/40 border-red-500 text-red-400' : 'bg-gray-700 border-gray-600 text-gray-400'}`}
                            title="Lock Focus"
                        >
                            {focusLock ? <Lock className="w-5 h-5"/> : <Unlock className="w-5 h-5"/>}
                        </button>
                        <button 
                            onClick={() => onCommand({ 
                                type: 'FOCUS', 
                                target: { id: selectedWalkerId || undefined }, 
                                durationMs: focusDuration * 1000, 
                                lock: focusLock, 
                                bubbleText: focusBubble 
                            })}
                            className="flex-1 bg-purple-600 hover:bg-purple-500 rounded font-bold text-sm"
                        >
                            Focus {selectedWalkerId ? 'Selected' : 'Random'}
                        </button>
                        <button 
                            onClick={() => onCommand({ type: 'CLEAR_FOCUS' })}
                            className="px-3 bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded font-bold text-sm"
                        >
                            Clear
                        </button>
                    </div>
                </div>
            </div>

            {/* DUELS */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
                <h3 className="font-bold text-red-400 mb-3 flex items-center gap-2"><Sword className="w-4 h-4"/> Duels</h3>
                <div className="space-y-2">
                    <button 
                        onClick={() => onCommand({ type: 'DUEL_RANDOM' })}
                        className="w-full py-2 bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded text-sm font-bold flex items-center justify-center gap-2"
                    >
                        Random vs Random
                    </button>
                    <button 
                        onClick={() => onCommand({ type: 'DUEL_ONE_CHOSEN', target: { id: selectedWalkerId || undefined } })}
                        disabled={!selectedWalkerId}
                        className="w-full py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 border border-gray-600 rounded text-sm font-bold flex items-center justify-center gap-2"
                    >
                        {selectedWalkerId ? 'Selected' : '(Select Walker)'} vs Random
                    </button>
                    
                    <div className="flex gap-2 mt-2 pt-2 border-t border-gray-700">
                         <select 
                            className="flex-1 bg-gray-900 border border-gray-600 rounded p-1 text-xs"
                            value={duelDefenderId}
                            onChange={e => setDuelDefenderId(e.target.value)}
                         >
                             <option value="">Vs Specific...</option>
                             {walkersList.filter(w => w.id !== selectedWalkerId).map(w => (
                                 <option key={w.id} value={w.id}>{w.name}</option>
                             ))}
                         </select>
                         <button 
                            onClick={() => onCommand({ type: 'DUEL_CUSTOM', attacker: { id: selectedWalkerId! }, defender: { id: duelDefenderId } })}
                            disabled={!selectedWalkerId || !duelDefenderId}
                            className="px-4 bg-red-600 hover:bg-red-500 disabled:bg-gray-700 rounded text-xs font-bold"
                         >
                             Fight
                         </button>
                    </div>
                </div>
            </div>

            {/* MOOD */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
                <h3 className="font-bold text-yellow-400 mb-3 flex items-center gap-2"><Smile className="w-4 h-4"/> Global Mood</h3>
                <div className="grid grid-cols-3 gap-2">
                    {WALKER_MOODS.map(mood => (
                        <button
                            key={mood}
                            onClick={() => onCommand({ type: 'SET_MOOD', mood })}
                            className={`py-2 px-1 text-xs font-bold rounded border transition ${activeMood === mood ? 'bg-yellow-600/30 border-yellow-500 text-yellow-400' : 'bg-gray-700 border-gray-600 text-gray-400 hover:bg-gray-600'}`}
                        >
                            {mood}
                        </button>
                    ))}
                </div>
            </div>

            {/* DROPS */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
                <h3 className="font-bold text-green-400 mb-3 flex items-center gap-2"><Gift className="w-4 h-4"/> Drop Items</h3>
                <div className="flex gap-2">
                    <select 
                        className="flex-1 bg-gray-900 border border-gray-600 rounded p-2 text-sm"
                        value={dropType}
                        onChange={e => setDropType(e.target.value)}
                    >
                        {WALKER_ITEMS.map(i => <option key={i} value={i}>{i}</option>)}
                    </select>
                    <input 
                        type="number"
                        className="w-16 bg-gray-900 border border-gray-600 rounded p-2 text-center text-sm"
                        value={dropCount}
                        onChange={e => setDropCount(Number(e.target.value))}
                        min={1} max={50}
                    />
                    <button 
                        onClick={() => onCommand({ type: 'DROP_ITEMS', itemType: dropType, count: dropCount })}
                        className="px-4 bg-green-600 hover:bg-green-500 rounded font-bold text-sm"
                    >
                        Drop
                    </button>
                </div>
            </div>

            {/* GLOBAL EVENTS */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
                <h3 className="font-bold text-orange-400 mb-3 flex items-center gap-2"><CloudRain className="w-4 h-4"/> Global Events</h3>
                <div className="grid grid-cols-2 gap-2">
                    {WALKER_EVENTS.map(evt => (
                        <button
                            key={evt.id}
                            onClick={() => onCommand({ type: 'TRIGGER_EVENT', eventType: evt.id, duration: 8 })}
                            className="py-2 bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded text-xs font-bold"
                        >
                            {evt.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* SCENES & UTILS */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
                <h3 className="font-bold text-pink-400 mb-3 flex items-center gap-2"><Play className="w-4 h-4"/> Scenes & Utils</h3>
                <div className="space-y-2">
                    <div className="flex gap-2">
                        {WALKER_SCENES.map(scene => (
                            <button 
                                key={scene.id}
                                onClick={() => onCommand({ type: 'PLAY_SCENE', scene: scene.id })}
                                className="flex-1 py-1.5 bg-gray-700 hover:bg-pink-900/30 border border-gray-600 hover:border-pink-500 rounded text-[10px] font-bold"
                            >
                                {scene.label}
                            </button>
                        ))}
                    </div>
                    <button 
                        onClick={() => onCommand({ type: 'STOP_SCENE' })}
                        className="w-full py-1 bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded text-[10px] font-bold text-red-300"
                    >
                        Stop Scene
                    </button>
                    
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-700">
                        <button onClick={() => onCommand({ type: 'TOGGLE_PHOTO_MODE' })} className="py-2 bg-gray-700 hover:bg-gray-600 rounded text-xs font-bold flex items-center justify-center gap-1 border border-gray-600">
                            <Camera className="w-3 h-3"/> Photo Toggle
                        </button>
                         <button onClick={() => onCommand({ type: 'STATS_OVERLAY', visible: !serverState?.statsOverlay })} className="py-2 bg-gray-700 hover:bg-gray-600 rounded text-xs font-bold flex items-center justify-center gap-1 border border-gray-600">
                            <BarChart2 className="w-3 h-3"/> Stats Toggle
                        </button>
                    </div>
                </div>
            </div>
            
        </div>
      </div>
    </div>
  );
};

export default StreamWalkersPanel;
