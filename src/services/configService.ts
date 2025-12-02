import { DeckConfig } from '../types';

const CONFIG_STORAGE_KEY = 'streamdeck_config_v1';

export const loadConfigFromStorage = (): DeckConfig | null => {
  try {
    const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    
    // Superficial validation
    if (parsed && Array.isArray(parsed.soundButtons) && typeof parsed.twitchConfig === 'object') {
      return parsed as DeckConfig;
    }
    return null;
  } catch (e) {
    console.error("Failed to load config", e);
    return null;
  }
};

export const saveConfigToStorage = (config: DeckConfig): void => {
  try {
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.error("Failed to save config", e);
  }
};

export const validateConfig = (data: any): boolean => {
  if (!data) return false;
  if (!Array.isArray(data.soundButtons)) return false;
  if (!data.twitchConfig || typeof data.twitchConfig !== 'object') return false;
  return true;
};

export const exportConfigToJson = (config: DeckConfig) => {
  const json = JSON.stringify(config, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `streamdeck-profile-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};