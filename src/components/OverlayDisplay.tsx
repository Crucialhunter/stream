import React from 'react';
import { MessageSquare } from 'lucide-react';
import { ActiveAlert, PollState, FontStyle, AnimationStyle } from '../types';
import { FONT_STYLES } from '../constants';

interface OverlayDisplayProps {
  activeAlert: ActiveAlert | null;
  activePoll: PollState | null;
  isDemo?: boolean;
}

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

const OverlayDisplay: React.FC<OverlayDisplayProps> = ({ activeAlert, activePoll, isDemo }) => {
  
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

  // Render Alert Content
  const renderAlert = () => {
    if (!activeAlert) return null;

    if (activeAlert.type === 'chat' && activeAlert.chatMsg) {
        return (
            <div className="w-screen h-screen flex items-end justify-center pb-20 bg-transparent fixed inset-0 z-20 pointer-events-none">
                 <div className="bg-white/95 text-gray-900 p-6 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] max-w-2xl w-full border-l-8 border-purple-600 animate-slide-up transform font-sans">
                     <div className="flex items-start gap-4">
                         <div className="p-3 bg-purple-100 rounded-full text-purple-600">
                             <MessageSquare className="w-8 h-8" />
                         </div>
                         <div className="flex-1">
                             <h3 className="font-extrabold text-xl text-purple-700 mb-1">{activeAlert.chatMsg.username} says:</h3>
                             <p className="text-2xl font-medium leading-snug">
                                {activeAlert.chatMsg.tokens.map((t, i) => (
                                    t.type === 'emote' ? <img key={i} src={t.url} className="inline h-8 mx-1" alt="emote"/> : t.content
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
      <div className="w-screen h-screen flex items-center justify-center bg-transparent fixed inset-0 z-20 pointer-events-none overflow-hidden">
        <div className={`text-center relative ${animation}`}>
            {hasImage ? (
                <div className="relative">
                     <img 
                        src={activeAlert.image} 
                        alt="Alert" 
                        className="max-h-[60vh] max-w-[80vw] rounded-xl shadow-2xl border-4 border-white object-contain bg-black/50"
                    />
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
  };

  return (
    <>
      {isDemo && (
          <div className="fixed top-4 right-4 z-50 bg-yellow-500 text-black font-black text-xs px-2 py-1 rounded shadow-lg pointer-events-none opacity-80 border-2 border-black">
              DEMO PREVIEW
          </div>
      )}
      {renderPoll()}
      {renderAlert()}
    </>
  );
};

export default OverlayDisplay;
