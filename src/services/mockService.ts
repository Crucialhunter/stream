
import { ChatMessage, StreamEvent, PollState } from '../types';

const MOCK_USERS = [
  { name: 'Ninja', color: '#eab308' },
  { name: 'Pokimane', color: '#ec4899' },
  { name: 'Shroud', color: '#3b82f6' },
  { name: 'DrDisrespect', color: '#ef4444' },
  { name: 'xQc', color: '#a855f7' },
  { name: 'TimTheTatman', color: '#fbbf24' },
  { name: 'Summit1g', color: '#f97316' },
  { name: 'Lirik', color: '#6366f1' }
];

const MOCK_MESSAGES = [
  "POGGERS!",
  "LUL that fail",
  "Can you play that song again?",
  "HYPE HYPE HYPE",
  "Is this live?",
  "GG WP",
  "Omg hi!",
  "What game is this?",
  "KEKW",
  "monkaS",
  "!hype",
  "!fail",
  "1", "2", "1" // Poll votes
];

const MOCK_EMOTES = [
  "https://static-cdn.jtvnw.net/emoticons/v2/58765/default/dark/2.0", // LUL
  "https://static-cdn.jtvnw.net/emoticons/v2/30259/default/dark/2.0", // HeyGuys
  "https://static-cdn.jtvnw.net/emoticons/v2/25/default/dark/2.0",    // Kappa
  "https://static-cdn.jtvnw.net/emoticons/v2/120232/default/dark/2.0" // TriHard
];

export const generateMockChat = (): ChatMessage => {
  const user = MOCK_USERS[Math.floor(Math.random() * MOCK_USERS.length)];
  const rawMsg = MOCK_MESSAGES[Math.floor(Math.random() * MOCK_MESSAGES.length)];
  
  // Randomly add an emote
  const tokens = [{ type: 'text', content: rawMsg }];
  if (Math.random() > 0.7) {
     tokens.push({ 
         type: 'emote', 
         content: 'emote', 
         url: MOCK_EMOTES[Math.floor(Math.random() * MOCK_EMOTES.length)] 
     } as any);
  }

  return {
    id: Date.now().toString() + Math.random(),
    username: user.name,
    message: rawMsg,
    tokens: tokens as any[],
    color: user.color,
    timestamp: Date.now(),
    read: false
  };
};

export const generateMockEvent = (): StreamEvent => {
  const types: StreamEvent['type'][] = ['FOLLOW', 'SUB', 'RAID', 'CHEER'];
  const type = types[Math.floor(Math.random() * types.length)];
  const user = MOCK_USERS[Math.floor(Math.random() * MOCK_USERS.length)];

  let details = '';
  switch(type) {
      case 'FOLLOW': details = 'New Follower!'; break;
      case 'SUB': details = 'Subscribed at Tier 1!'; break;
      case 'RAID': details = `Raided with ${Math.floor(Math.random() * 500)} viewers!`; break;
      case 'CHEER': details = `Cheered ${Math.floor(Math.random() * 1000)} bits!`; break;
  }

  return {
    id: Date.now().toString() + Math.random(),
    type,
    username: user.name,
    details,
    timestamp: Date.now(),
    seen: false
  };
};

export const generateMockPoll = (): PollState => {
    return {
        isActive: true,
        question: "What should we play next?",
        options: [
            { id: '1', label: 'Minecraft', trigger: '1', votes: 12 },
            { id: '2', label: 'Valorant', trigger: '2', votes: 8 },
            { id: '3', label: 'Just Chatting', trigger: '3', votes: 25 }
        ],
        totalVotes: 45
    };
};
