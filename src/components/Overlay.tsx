import React, { useEffect, useState, useRef } from 'react';
import { Peer } from 'peerjs';
import { ArrowLeft, Volume2 } from 'lucide-react';
import { PeerPayload, ChatMessage, PollState, ActiveAlert } from '../types';
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

  // --- AUDIO UNLOCK OVERLAY ---
  if (!audioEnabled) {
      return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 text-white cursor-pointer" onClick={handleManualAudioUnlock}>
              <div className="text-center animate-bounce">
                  <div className="bg-purple-600 p-6 rounded-full inline-flex mb-4 shadow-[0_0_50px_rgba(168,85,247,0.5)]">
                      <Volume2 className="w-16 h-16 text-white" />
                  </div>
                  <h1 className="text-3xl font-black uppercase tracking-widest">Click to Enable Audio</h1>
                  <p className="text-gray-400 mt-2">Required for OBS/Browser Autoplay</p>
              </div>
          </div>
      );
  }

  // Render Display Component
  if (activeAlert || activePoll) {
      return <OverlayDisplay activeAlert={activeAlert} activePoll={activePoll} />;
  }

  // Setup Screen (Hidden when configured in OBS usually, but visible if no connection)
  return (
    <div className="w-screen h-screen flex flex-col items-center justify-center bg-gray-900/80 backdrop-blur-sm text-white relative font-sans">
      {!isConnected ? (
        <>
            <button 
                onClick={() => window.location.hash = ''} 
                className="absolute top-6 left-6 flex items-center text-gray-400 hover:text-white transition"
            >
                <ArrowLeft className="w-5 h-5 mr-2" /> Back to Controls
            </button>

            <h2 className="text-2xl font-bold mb-4 uppercase tracking-widest text-gray-400">Overlay Setup</h2>
            <div className="bg-black/50 p-8 rounded-2xl border-2 border-purple-500/50 backdrop-blur-xl">
                <p className="text-gray-400 mb-2 text-center uppercase text-xs font-bold">Pairing Code</p>
                <div className="text-8xl font-mono font-bold tracking-widest text-purple-400">
                {code || '....'}
                </div>
            </div>
        </>
      ) : (
          <div className="absolute bottom-4 right-4 flex items-center gap-2 opacity-50">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs font-mono uppercase">System Ready</span>
          </div>
      )}
    </div>
  );
};

export default Overlay;
