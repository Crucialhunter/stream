

import React, { useEffect, useState, useRef } from 'react';
import { Peer } from 'peerjs';
import { ArrowLeft, MessageSquare, Volume2 } from 'lucide-react';
import { PeerPayload, ChatMessage, PollState, FontStyle, AnimationStyle } from '../types';
import { PEER_ID_PREFIX, DEFAULT_SOUND_BOARD, FONT_STYLES } from '../constants';
import { playSynthSound, unlockAudio } from '../services/audioService';

interface ActiveAlert {
    type: 'sfx' | 'chat';
    text?: string;
    image?: string;
    chatMsg?: ChatMessage;
    label?: string;
    
    // Style props
    fontStyle?: FontStyle;
    animation?: AnimationStyle;
    color?: string;
    textColor?: string;
}

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
    
    // Try to unlock audio automatically (might work in some environments)
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
        // Find default for fallback label/color if not custom
        const defaultSound = DEFAULT_SOUND_BOARD.find(s => s.id === payload.sfxId);
        const label = payload.customLabel || defaultSound?.label || 'ALERT';
        
        // Show Visual
        setActiveAlert({ 
            type: 'sfx', 
            label: label, 
            image: payload.customImage,
            fontStyle: payload.fontStyle || defaultSound?.fontStyle || 'standard',
            animation: payload.animation || defaultSound?.animation || 'bounce',
            color: payload.color || defaultSound?.color || 'bg-purple-600',
            textColor: payload.textColor
        });
        
        // Play Sound: Prioritize Custom Sound URL -> Preset -> Legacy ID
        const soundToPlay = payload.customSound ? null : (payload.soundPreset || payload.sfxId);
        playSynthSound(soundToPlay || 'alert', payload.customSound);
        
        // Auto Hide
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

  // Helper to get font family
  const getFontFamily = (style?: FontStyle) => {
      const found = FONT_STYLES.find(f => f.id === style);
      return found ? found.family : 'ui-sans-serif, system-ui';
  };

  // Helper to get animation class
  const getAnimationClass = (anim?: AnimationStyle) => {
      switch(anim) {
          case 'bounce': return 'animate-bounce-in';
          case 'shake': return 'animate-shake';
          case 'pulse': return 'animate-pulse-hard';
          case 'glitch': return 'animate-glitch';
          case 'spin': return 'animate-spin-once';
          case 'flash': return 'animate-flash';
          default: return 'animate-fade-in';
      }
  };

  // Render Poll Widget
  const renderPoll = () => {
      if (!activePoll) return null;
      const maxVotes = Math.max(...activePoll.options.map(o => o.votes), 1); // Avoid div/0

      return (
          <div className="fixed top-10 right-10 w-80 bg-gray-900/90 border-2 border-purple-500 rounded-xl p-4 shadow-2xl backdrop-blur-md animate-fade-in-up font-sans z-30">
              <h3 className="text-white font-bold text-lg mb-3 border-b border-gray-700 pb-2">{activePoll.question}</h3>
              <div className="space-y-3">
                  {activePoll.options.map(opt => {
                      return (
                          <div key={opt.id} className="relative">
                              <div className="flex justify-between text-white text-sm font-bold mb-1 relative z-10">
                                  <span><span className="text-yellow-400 mr-2">type "{opt.trigger}"</span> {opt.label}</span>
                                  <span>{opt.votes}</span>
                              </div>
                              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
                                    style={{ width: `${(opt.votes / maxVotes) * 100}%` }}
                                  ></div>
                              </div>
                          </div>
                      );
                  })}
              </div>
          </div>
      );
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

  // Render Main Alert Area
  if (activeAlert) {
    if (activeAlert.type === 'chat' && activeAlert.chatMsg) {
        return (
            <div className="w-screen h-screen flex items-end justify-center pb-20 bg-transparent">
                 {renderPoll()}
                 <div className="bg-white/95 text-gray-900 p-6 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] max-w-2xl w-full border-l-8 border-purple-600 animate-slide-up transform font-sans z-20">
                     <div className="flex items-start gap-4">
                         <div className="p-3 bg-purple-100 rounded-full text-purple-600">
                             <MessageSquare className="w-8 h-8" />
                         </div>
                         <div className="flex-1">
                             <h3 className="font-extrabold text-xl text-purple-700 mb-1">{activeAlert.chatMsg.username} says:</h3>
                             <p className="text-2xl font-medium leading-snug">
                                {activeAlert.chatMsg.tokens.map((t, i) => (
                                    t.type === 'emote' ? <img key={i} src={t.url} className="inline h-8 mx-1"/> : t.content
                                ))}
                             </p>
                         </div>
                     </div>
                 </div>
            </div>
        );
    }

    // Standard SFX/Image Alert with styles
    const font = getFontFamily(activeAlert.fontStyle);
    const animation = getAnimationClass(activeAlert.animation);
    const hasImage = !!activeAlert.image;

    return (
      <div className="w-screen h-screen flex items-center justify-center bg-transparent relative overflow-hidden">
        {renderPoll()}
        <div className={`text-center relative z-20 ${animation}`}>
            {hasImage ? (
                <div className="relative">
                     <img 
                        src={activeAlert.image} 
                        alt="Alert" 
                        className="max-h-[60vh] max-w-[80vw] rounded-xl shadow-2xl border-4 border-white object-contain bg-black/50"
                    />
                    {/* If both image and label exist, show label below */}
                    {activeAlert.label && (
                         <div 
                            className="mt-4 text-6xl font-black text-white drop-shadow-[0_5px_5px_rgba(0,0,0,0.8)]"
                            style={{ fontFamily: font, WebkitTextStroke: '2px black', color: activeAlert.textColor || 'white' }}
                         >
                            {activeAlert.label}
                         </div>
                    )}
                </div>
            ) : (
                <h1 
                    className="text-9xl font-black drop-shadow-[0_10px_10px_rgba(0,0,0,0.8)] px-12 py-6 rounded-3xl"
                    style={{ 
                        fontFamily: font,
                        WebkitTextStroke: '3px white',
                        color: activeAlert.textColor || 'transparent',
                        backgroundImage: activeAlert.textColor ? 'none' : 'linear-gradient(to right, #c084fc, #db2777)',
                        backgroundClip: activeAlert.textColor ? 'border-box' : 'text',
                        WebkitBackgroundClip: activeAlert.textColor ? 'border-box' : 'text',
                        backgroundColor: activeAlert.textColor ? 'transparent' : undefined,
                    }}
                >
                    {activeAlert.label}
                </h1>
            )}
        </div>
      </div>
    );
  }

  // Setup Screen (Hidden when configured in OBS usually, but visible if no connection)
  return (
    <div className="w-screen h-screen flex flex-col items-center justify-center bg-gray-900/80 backdrop-blur-sm text-white relative font-sans">
      {renderPoll()}
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