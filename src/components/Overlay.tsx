import React, { useEffect, useState, useRef } from 'react';
import { Peer } from 'peerjs';
import { ArrowLeft, Volume2 } from 'lucide-react';
import { PeerPayload, PollState, ActiveAlert } from '../types';
import { PEER_ID_PREFIX, DEFAULT_SOUND_BOARD } from '../constants';
import { playSynthSound, unlockAudio } from '../services/audioService';
import OverlayDisplay from './OverlayDisplay';

const Overlay: React.FC = () => {
  const [code, setCode] = useState<string>('');
  const [activeAlert, setActiveAlert] = useState<ActiveAlert | null>(null);
  const [activePoll, setActivePoll] = useState<PollState | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  
  const alertTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    // Generate pairing code
    const generatedCode = Math.floor(1000 + Math.random() * 9000).toString();
    setCode(generatedCode);

    const peerId = `${PEER_ID_PREFIX}${generatedCode}`;
    const peer = new Peer(peerId);

    peer.on('connection', (conn) => {
      console.log('Controller connected');
      setIsConnected(true);

      conn.on('data', (data) => {
        const payload = data as PeerPayload;
        handlePayload(payload);
      });

      conn.on('close', () => setIsConnected(false));
    });
    
    // Try to unlock audio automatically
    unlockAudio().then(success => {
        if (success) setAudioEnabled(true);
    });

    return () => { peer.destroy(); };
  }, []);

  const handleManualAudioUnlock = async () => {
      const success = await unlockAudio();
      if (success) setAudioEnabled(true);
  };

  const handlePayload = (payload: PeerPayload) => {
    // SFX Trigger
    if (payload.type === 'TRIGGER_SFX') {
        const defaultSound = DEFAULT_SOUND_BOARD.find(s => s.id === payload.sfxId);
        const label = payload.customLabel || defaultSound?.label || 'ALERT';
        
        setActiveAlert({ 
            type: 'sfx', 
            label: label, 
            image: payload.customImage,
            fontStyle: payload.fontStyle || defaultSound?.fontStyle || 'standard',
            animation: payload.animation || defaultSound?.animation || 'bounce',
            color: payload.color || defaultSound?.color || 'bg-purple-600',
            textColor: payload.textColor
        });
        
        const soundToPlay = payload.customSound ? null : (payload.soundPreset || payload.sfxId);
        playSynthSound(soundToPlay || 'alert', payload.customSound);
        
        if (alertTimeoutRef.current) window.clearTimeout(alertTimeoutRef.current);
        alertTimeoutRef.current = window.setTimeout(() => setActiveAlert(null), 3000);
    }
    
    // Show Chat Message
    if (payload.type === 'SHOW_CHAT_MSG') {
        setActiveAlert({ type: 'chat', chatMsg: payload.msg });
        playSynthSound('ui-pop'); 
        
        if (alertTimeoutRef.current) window.clearTimeout(alertTimeoutRef.current);
        alertTimeoutRef.current = window.setTimeout(() => setActiveAlert(null), 10000);
    }

    // Polls
    if (payload.type === 'POLL_UPDATE') {
        setActivePoll(payload.poll);
    }
    if (payload.type === 'POLL_END') {
        setTimeout(() => setActivePoll(null), 5000);
    }
  };

  // --- AUDIO UNLOCK OVERLAY (Floating Card) ---
  if (!audioEnabled) {
      return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-transparent" onClick={handleManualAudioUnlock}>
              <div className="bg-gray-900/95 border-2 border-purple-500 p-8 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col items-center animate-bounce cursor-pointer backdrop-blur-md">
                  <div className="bg-purple-600 p-4 rounded-full mb-4 shadow-lg">
                      <Volume2 className="w-12 h-12 text-white" />
                  </div>
                  <h1 className="text-2xl font-black uppercase tracking-widest text-white">Enable Audio</h1>
                  <p className="text-gray-400 mt-2 text-sm">Click anywhere to start</p>
              </div>
          </div>
      );
  }

  // Render Display Component (Alerts / Polls)
  if (activeAlert || activePoll) {
      return <OverlayDisplay activeAlert={activeAlert} activePoll={activePoll} />;
  }

  // --- SETUP SCREEN (Floating Card / Idle State) ---
  return (
    <div className="w-screen h-screen flex flex-col items-center justify-center bg-transparent text-white relative font-sans">
      {!isConnected ? (
        // Not Connected: Show Pairing Code Card
        <div className="bg-gray-900/90 p-8 rounded-3xl border border-gray-700 shadow-2xl backdrop-blur-md flex flex-col items-center max-w-sm mx-4">
             <div className="w-full flex justify-start mb-4">
                <button 
                    onClick={() => window.location.hash = ''} 
                    className="flex items-center text-gray-400 hover:text-white transition text-xs font-bold uppercase tracking-wider"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back
                </button>
             </div>

            <h2 className="text-xl font-bold mb-6 uppercase tracking-widest text-gray-300">Overlay Setup</h2>
            
            <div className="bg-black/40 p-6 rounded-2xl border-2 border-purple-500/50 backdrop-blur-xl w-full text-center">
                <p className="text-gray-400 mb-2 uppercase text-[10px] font-bold tracking-widest">Pairing Code</p>
                <div className="text-6xl font-mono font-bold tracking-widest text-purple-400">
                {code || '....'}
                </div>
            </div>
            
            <p className="mt-6 text-gray-500 text-xs text-center max-w-[200px]">
                Enter this code on your Control Deck to pair.
            </p>
        </div>
      ) : (
          // Connected & Idle: Minimal "System Ready" Badge
          <div className="absolute bottom-4 right-4 flex items-center gap-2 px-3 py-1 bg-black/40 rounded-full backdrop-blur-md border border-white/10 shadow-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_#22c55e]"></div>
              <span className="text-[10px] font-mono uppercase text-gray-300">System Ready</span>
          </div>
      )}
    </div>
  );
};

export default Overlay;