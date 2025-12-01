import React, { useEffect, useRef, useState } from 'react';
import { ChatMessage } from '../types';
import { MessageSquare, AlertTriangle, MonitorUp } from 'lucide-react';

interface ChatMonitorProps {
  messages: ChatMessage[];
  lastMessageTime: number;
  onShowOnStream: (msg: ChatMessage) => void;
}

const INACTIVITY_THRESHOLD = 3 * 60 * 1000; // 3 minutes

const ChatMonitor: React.FC<ChatMonitorProps> = ({ messages, lastMessageTime, onShowOnStream }) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [isInactive, setIsInactive] = useState(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const interval = setInterval(() => {
      const diff = Date.now() - lastMessageTime;
      setIsInactive(diff > INACTIVITY_THRESHOLD && messages.length > 0);
    }, 5000);
    return () => clearInterval(interval);
  }, [lastMessageTime, messages]);

  return (
    <div className={`flex flex-col h-full bg-gray-800 rounded-xl overflow-hidden border ${isInactive ? 'border-red-500 border-2 animate-pulse' : 'border-gray-700'}`}>
      <div className={`p-3 font-bold border-b border-gray-700 flex justify-between items-center ${isInactive ? 'bg-red-900/50' : 'bg-gray-750'}`}>
        <span className="flex items-center gap-2">
           <MessageSquare className="w-4 h-4" /> Live Chat
        </span>
        {isInactive && (
          <span className="text-red-400 text-xs flex items-center font-bold">
            <AlertTriangle className="w-3 h-3 mr-1" />
            INACTIVE
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-hide">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-10 text-sm italic">
            Waiting for messages...
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className="group flex items-start gap-2 animate-fade-in hover:bg-gray-700/30 p-1 rounded -mx-1">
              <button 
                  onClick={() => onShowOnStream(msg)}
                  className="mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity text-gray-500 hover:text-purple-400 flex-shrink-0"
                  title="Show on Stream"
              >
                  <MonitorUp className="w-4 h-4" />
              </button>
              <div className="text-sm break-words flex-1">
                <span 
                    className="font-bold mr-1 inline-block" 
                    style={{ color: msg.color || '#a855f7' }}
                >
                    {msg.username}:
                </span>
                <span className="text-gray-300 inline">
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
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};

export default ChatMonitor;