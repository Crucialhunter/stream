

import { SoundItem, EventTemplates } from './types';

export const PEER_ID_PREFIX = 'streamdeck-app-v1-';
export const SYNC_PEER_PREFIX = 'streamdeck-sync-v1-';
// The ID prefix that the Stream Walkers Overlay (Host) is listening on
export const WALKERS_PEER_PREFIX = 'streamwalkers-host-v1-';

export const FONT_STYLES = [
  { id: 'standard', label: 'Standard', family: 'ui-sans-serif, system-ui' },
  { id: 'retro', label: 'Retro Arcade', family: '"Press Start 2P", monospace' },
  { id: 'scifi', label: 'Sci-Fi Tech', family: '"Orbitron", sans-serif' },
  { id: 'comic', label: 'Comic Book', family: '"Bangers", cursive' },
  { id: 'horror', label: 'Spooky', family: '"Creepster", cursive' },
  { id: 'handwritten', label: 'Handwritten', family: '"Permanent Marker", cursive' },
];

export const ANIMATION_STYLES = [
  { id: 'none', label: 'None' },
  { id: 'bounce', label: 'Bounce' },
  { id: 'shake', label: 'Shake' },
  { id: 'pulse', label: 'Pulse' },
  { id: 'glitch', label: 'Glitch' },
  { id: 'spin', label: 'Spin' },
  { id: 'flash', label: 'Flash' },
];

export const DEFAULT_EVENT_TEMPLATES: EventTemplates = {
    follow: '{user} is now following!',
    sub: '{user} just subscribed!',
    raid: 'Raid incoming from {user}!',
    cheer: '{user} cheered bits!'
};

// --- STREAM WALKERS CONSTANTS ---

export const WALKER_MOODS = ['DEFAULT', 'CHILL', 'PARTY', 'CHAOS', 'SLEEP'];

export const WALKER_EVENTS = [
  { id: 'METEOR_SHOWER', label: 'Meteors' },
  { id: 'FLOOD', label: 'Flood' },
  { id: 'EARTHQUAKE', label: 'Quake' },
  { id: 'CONFETTI', label: 'Confetti' }
];

export const WALKER_SCENES = [
  { id: 'RAID_WELCOME', label: 'Raid Welcome' },
  { id: 'BRB', label: 'BRB' },
  { id: 'STREAM_END', label: 'Stream End' }
];

export const WALKER_ITEMS = ['COIN', 'HEART', 'BOMB'];

export const WALKER_EMOTES = [
  { id: 'happy', label: 'Happy' },
  { id: 'sad', label: 'Sad' },
  { id: 'shocked', label: 'Shocked' },
  { id: 'excited', label: 'Excited' }
];

export const SOUND_LIBRARY = {
  'retro': [
    { id: 'retro-coin', label: 'Coin' },
    { id: 'retro-jump', label: 'Jump' },
    { id: 'retro-laser', label: 'Laser' },
    { id: 'retro-powerup', label: 'Power Up' },
    { id: 'retro-hit', label: 'Damage' },
  ],
  'scifi': [
    { id: 'scifi-warp', label: 'Warp' },
    { id: 'scifi-phaser', label: 'Phaser' },
    { id: 'scifi-alarm', label: 'Red Alert' },
  ],
  'ui': [
    { id: 'ui-success', label: 'Success Chime' },
    { id: 'ui-error', label: 'Error Buzz' },
    { id: 'ui-click', label: 'Click' },
    { id: 'ui-pop', label: 'Pop' },
  ],
  'fun': [
    { id: 'fun-wow', label: 'Wow (Synth)' },
    { id: 'fun-fail', label: 'Fail Horn' },
    { id: 'fun-horn', label: 'Air Horn' },
  ]
};

export const DEFAULT_SOUND_BOARD: SoundItem[] = [
  { id: 'hype', label: 'HYPE', color: 'bg-purple-600', type: 'purple', iconName: 'Zap', soundPreset: 'scifi-warp', fontStyle: 'scifi', animation: 'pulse' },
  { id: 'fail', label: 'FAIL', color: 'bg-red-600', type: 'danger', iconName: 'ThumbsDown', soundPreset: 'fun-fail', fontStyle: 'comic', animation: 'shake' },
  { id: 'gg', label: 'GG', color: 'bg-green-600', type: 'success', iconName: 'Trophy', soundPreset: 'ui-success', fontStyle: 'retro', animation: 'bounce' },
  { id: 'wow', label: 'WOW', color: 'bg-yellow-500', type: 'warning', iconName: 'Star', soundPreset: 'fun-wow', fontStyle: 'comic', animation: 'spin' },
  { id: 'lol', label: 'LUL', color: 'bg-blue-500', type: 'info', iconName: 'Laugh', soundPreset: 'ui-pop', animation: 'bounce' },
  { id: 'alert', label: 'ALERT', color: 'bg-red-800', type: 'danger', iconName: 'Siren', soundPreset: 'scifi-alarm', fontStyle: 'horror', animation: 'flash' },
];

export const TWITCH_SCOPES = [
  'chat:read',
  'chat:edit',
  'moderator:read:followers' // Needed for follower fetching if available
];

export const TWITCH_REDIRECT_URI_LOCAL = 'http://localhost:5173'; 
export const TWITCH_AUTH_BASE = 'https://id.twitch.tv/oauth2/authorize';
