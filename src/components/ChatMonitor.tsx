
import React, { useEffect, useRef, useState } from 'react';
import { ChatMessage } from '../types';
import { MessageSquare, AlertTriangle, MonitorUp, Check, CheckCheck } from 'lucide-react';

interface ChatMonitorProps {
  messages: ChatMessage[];
  lastMessageTime: number;
  onShowOnStream: (msg: ChatMessage) => void;
  onMarkRead: (msgId: string) => void;
  isDeckOnlyMode?: boolean;
}

const INACTIVITY_THRESHOLD = 3 * 60 * 1000; // 3 minutes

const ChatMonitor: React.FC<ChatMonitorProps> = ({ messages, lastMessageTime, onShowOnStream, onMarkRead, isDeckOnlyMode }) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [isInactive, setIsInactive] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);

  // Handle auto-scroll only if we are at the bottom
  useEffect(() => {
    if (autoScroll) {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, autoScroll]);

  // Detect manual scroll to disable auto-scroll
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
      const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
      // If user is near bottom (within 50px), enable auto-scroll
      if (scrollHeight - scrollTop - clientHeight < 50) {
          setAutoScroll(true);
      } else {
          setAutoScroll(false);
      }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      const diff = Date.now() - lastMessageTime;
      setIsInactive(diff > INACTIVITY_THRESHOLD && messages.length > 0);
    }, 5000);
    return () => clearInterval(interval);
  }, [lastMessageTime, messages]);

  const unreadCount = messages.filter(m => !m.read).length;

  return (
    <div className={`flex flex-col h-full bg-gray-800 rounded-xl overflow-hidden border transition-colors duration-300 ${isInactive ? 'border-red-500 border-2' : 'border-gray-700'}`}>
      <div className={`p-3 font-bold border-b border-gray-700 flex justify-between items-center transition-colors ${isInactive ? 'bg-red-900/50' : 'bg-gray-750'}`}>
        <span className="flex items-center gap-2">
           <MessageSquare className="w-4 h-4" /> 
           {isDeckOnlyMode ? 'Chat Monitor' : 'Live Chat'}
           {unreadCount > 0 && isDeckOnlyMode && (
               <span className="bg-purple-600 text-white text-[10px] px-2 py-0.5 rounded-full animate-pulse">{unreadCount} unread</span>
           )}
        </span>
        {isInactive && (
          <span className="text-red-400 text-xs flex items-center font-bold">
            <AlertTriangle className="w-3 h-3 mr-1" />
            INACTIVE
          </span>
        )}
      </div>

      <div 
        className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-hide"
        onScroll={handleScroll}
      >
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-10 text-sm italic">
            Waiting for messages...
          </div>
        ) : (
          messages.map((msg) => {
            const isUnread = isDeckOnlyMode && !msg.read;
            return (
                <div 
                    key={msg.id} 
                    className={`group flex items-start gap-2 animate-fade-in p-2 rounded -mx-1 border-l-4 transition-all duration-300
                        ${isUnread 
                            ? 'bg-purple-900/30 border-purple-500 shadow-inner' 
                            : 'bg-transparent border-transparent hover:bg-gray-700/30 opacity-80'
                        }
                    `}
                >
                  <div className="flex flex-col gap-1 mt-0.5 flex-shrink-0">
                      {/* Mark Read Button (Only Deck Mode) */}
                      {isDeckOnlyMode && (
                          <button 
                             onClick={() => onMarkRead(msg.id)}
                             className={`p-1 rounded transition-colors ${isUnread ? 'text-purple-400 hover:text-white hover:bg-purple-600' : 'text-gray-600 hover:text-gray-400'}`}
                             title="Mark this and older as read"
                          >
                             {isUnread ? <Check className="w-4 h-4" /> : <CheckCheck className="w-4 h-4"/>}
                          </button>
                      )}

                      {/* Show on Stream Button (Only if NOT Deck Mode, as deck mode implies no overlay control) */}
                      {!isDeckOnlyMode && (
                        <button 
                            onClick={() => onShowOnStream(msg)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-500 hover:text-purple-400"
                            title="Show on Stream"
                        >
                            <MonitorUp className="w-4 h-4" />
                        </button>
                      )}
                  </div>

                  <div className="text-sm break-words flex-1">
                    <span 
                        className="font-bold mr-1 inline-block" 
                        style={{ color: msg.color || '#a855f7' }}
                    >
                        {msg.username}:
                    </span>
                    <span className={`inline ${isUnread ? 'text-white font-medium' : 'text-gray-400'}`}>
                        {msg.tokens.map((token, idx) => (
                            <span key={idx} className="inline-block align-middle">
                                {token.type === 'emote' && token.url ? (
                                    <img src={token.url} alt={token.content} title={token.content} className="inline h-6 mx-1 align-middle" />
                                ) : (
                                    <span>{token.content}</span>
                                )}
                            </span>
                        ))}
                    </span>
                  </div>
                  <span className="text-[10px] text-gray-600 self-end whitespace-nowrap">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>
      
      {!autoScroll && (
          <div 
            className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-xs px-3 py-1 rounded-full shadow-lg cursor-pointer animate-bounce z-10"
            onClick={() => { setAutoScroll(true); bottomRef.current?.scrollIntoView(); }}
          >
              Resume Auto-scroll
          </div>
      )}
    </div>
  );
};

export default ChatMonitor;
