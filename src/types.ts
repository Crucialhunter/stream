

export type AppMode = 'CONTROL' | 'OVERLAY' | 'SETTINGS';

export type FontStyle = 'standard' | 'retro' | 'scifi' | 'comic' | 'horror' | 'handwritten';
export type AnimationStyle = 'none' | 'bounce' | 'shake' | 'pulse' | 'glitch' | 'spin' | 'flash';

export interface SoundItem {
  id: string;
  label: string;
  color: string; // Background color (Tailwind class or Hex)
  textColor?: string; // Hex color
  type: 'success' | 'danger' | 'warning' | 'info' | 'purple' | 'custom';
  iconName: string; 
  
  // Advanced Audio
  soundUrl?: string; // Custom Audio URL
  soundPreset?: string; // ID for built-in synth library

  // Advanced Visuals
  imageUrl?: string; // Custom GIF/Image URL for overlay
  fontStyle?: FontStyle;
  animation?: AnimationStyle;
}

export interface MessageToken {
  type: 'text' | 'emote';
  content: string;
  url?: string;
}

export interface ChatMessage {
  id: string;
  username: string;
  message: string;
  tokens: MessageToken[];
  color?: string;
  timestamp: number;
}

export interface StreamEvent {
  id: string;
  type: 'FOLLOW' | 'SUB' | 'RAID' | 'CHEER';
  username: string;
  details?: string;
  timestamp: number;
  seen: boolean;
}

export interface PollOption {
  id: string;
  label: string;
  trigger: string; // text to type in chat to vote
  votes: number;
}

export interface PollState {
  isActive: boolean;
  question: string;
  options: PollOption[];
  totalVotes: number;
  winnerId?: string;
}

export interface ActiveAlert {
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

export interface TwitchConfig {
  clientId: string;
  accessToken: string;
  channel: string;
  viewerUpdateInterval?: number; // seconds
  preventSleep?: boolean; // New: Wake Lock preference
}

// P2P Message Types
export type PeerPayload = 
  | { 
      type: 'TRIGGER_SFX'; 
      sfxId: string; 
      // Overrides for playback/display
      customImage?: string; 
      customLabel?: string; 
      customSound?: string;
      soundPreset?: string;
      fontStyle?: FontStyle;
      animation?: AnimationStyle;
      color?: string;
      textColor?: string;
    }
  | { type: 'SHOW_CHAT_MSG'; msg: ChatMessage }
  | { type: 'POLL_UPDATE'; poll: PollState }
  | { type: 'POLL_END'; poll: PollState }
  | { type: 'ALERT'; alertType: 'INACTIVITY' | 'FOLLOW' };