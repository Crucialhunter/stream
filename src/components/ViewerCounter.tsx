import React, { useState, useEffect, useRef } from 'react';
import { Users, AlertCircle, Loader2 } from 'lucide-react';
import { TwitchConfig } from '../types';

interface ViewerCounterProps {
  config: TwitchConfig;
}

const HIGHLIGHT_DURATION = 120000; // 2 minutes

const ViewerCounter: React.FC<ViewerCounterProps> = ({ config }) => {
  const [viewers, setViewers] = useState<number>(0);
  const [prevViewers, setPrevViewers] = useState<number>(0);
  const [isHighlighting, setIsHighlighting] = useState(false);
  const [error, setError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0); // Used to force updates
  
  // Update Interval from config or default to 30 seconds
  const updateInterval = (config.viewerUpdateInterval || 30) * 1000;
  
  // Progress Wheel State
  const [timeUntilUpdate, setTimeUntilUpdate] = useState(updateInterval);
  
  const highlightTimeoutRef = useRef<number | null>(null);

  // Helper to fetch data
  const fetchViewerCount = async () => {
    if (!config.accessToken || !config.clientId || !config.channel) return;

    // Sanitize channel name to prevent "Malformed query params" (400)
    const cleanChannel = config.channel.replace(/^#/, '').trim();
    if (!cleanChannel) return;

    setError(false);
    setIsLoading(true);

    try {
      // Helix API: Get Streams
      const url = `https://api.twitch.tv/helix/streams?user_login=${encodeURIComponent(cleanChannel)}`;
      const res = await fetch(url, {
        headers: {
          'Client-ID': config.clientId,
          'Authorization': `Bearer ${config.accessToken.replace(/^oauth:/, '')}`
        }
      });

      if (!res.ok) {
          const errText = await res.text();
          console.error('Twitch API Error Body:', errText);
          throw new Error(`API Error: ${res.status} ${res.statusText}`);
      }

      const data = await res.json();
      
      // If stream is active, data.data[0] exists. If offline, it's empty.
      const currentCount = data.data.length > 0 ? data.data[0].viewer_count : 0;

      setViewers((prev) => {
        // Logic for highlighting
        if (currentCount > prev) {
           triggerHighlight();
        }
        setPrevViewers(prev);
        return currentCount;
      });

    } catch (e) {
      console.error("Viewer fetch error", e);
      setError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const triggerHighlight = () => {
    setIsHighlighting(true);
    // Clear existing timeout if we get another increase
    if (highlightTimeoutRef.current) {
        window.clearTimeout(highlightTimeoutRef.current);
    }
    // Set new timeout
    highlightTimeoutRef.current = window.setTimeout(() => {
        setIsHighlighting(false);
    }, HIGHLIGHT_DURATION);
  };

  // Main Loop
  useEffect(() => {
    // Initial fetch
    fetchViewerCount();
    
    // Reset timer whenever interval changes or we manually refresh
    setTimeUntilUpdate(updateInterval);

    // Set up polling interval
    const intervalId = setInterval(() => {
        fetchViewerCount();
        setTimeUntilUpdate(updateInterval);
    }, updateInterval);

    // Set up visual progress ticker (updates every 100ms)
    const tickerId = setInterval(() => {
        setTimeUntilUpdate(prev => Math.max(0, prev - 100));
    }, 100);

    return () => {
        clearInterval(intervalId);
        clearInterval(tickerId);
        if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.accessToken, config.channel, updateInterval, refreshTrigger]); 

  // SVG Maths for the wheel
  const radius = 8;
  const circumference = 2 * Math.PI * radius;
  const progressPercent = timeUntilUpdate / updateInterval;
  const dashOffset = circumference * (1 - progressPercent); // Invert to show "emptying"

  if (!config.accessToken) return null;

  return (
    <div className={`
      relative overflow-hidden transition-all duration-500 rounded-xl border mb-3
      ${isHighlighting 
        ? 'bg-green-900/40 border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.3)]' 
        : 'bg-gray-800 border-gray-700'}
    `}>
      {/* Background Pulse Animation for Highlight */}
      {isHighlighting && (
          <div className="absolute inset-0 bg-green-500/10 animate-pulse pointer-events-none" />
      )}

      <div className="p-3 flex justify-between items-center relative z-10">
        
        {/* Left: Icon & Label */}
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${isHighlighting ? 'bg-green-500 text-black' : 'bg-gray-700 text-gray-400'}`}>
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Viewers</p>
            <p className={`text-2xl font-black leading-none ${isHighlighting ? 'text-green-400' : 'text-white'}`}>
               {viewers}
            </p>
          </div>
        </div>

        {/* Right: Progress Wheel or Error */}
        <div 
          className="flex items-center justify-center w-8 h-8 cursor-pointer hover:scale-110 transition-transform active:scale-95" 
          title={error ? "Update Failed - Click to retry" : "Time until next update - Click to refresh"}
          onClick={() => setRefreshTrigger(p => p + 1)}
        >
           {error ? (
               <AlertCircle className="w-6 h-6 text-red-500 animate-pulse" />
           ) : (
               <div className="relative w-8 h-8 flex items-center justify-center">
                  {/* Background Circle */}
                  <svg className="absolute w-full h-full transform -rotate-90">
                      <circle
                        cx="16" cy="16" r={radius}
                        stroke="currentColor"
                        strokeWidth="3"
                        fill="transparent"
                        className="text-gray-700"
                      />
                      {/* Progress Circle */}
                      <circle
                        cx="16" cy="16" r={radius}
                        stroke="currentColor"
                        strokeWidth="3"
                        fill="transparent"
                        strokeDasharray={circumference}
                        strokeDashoffset={dashOffset}
                        strokeLinecap="round"
                        className={`${isHighlighting ? 'text-green-500' : 'text-purple-500'} transition-all duration-100 ease-linear`}
                      />
                  </svg>
                  {/* Tiny center dot indicating loading state if actual fetch is pending */}
                  {isLoading && <div className="absolute w-1.5 h-1.5 bg-white rounded-full animate-ping" />}
               </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default ViewerCounter;