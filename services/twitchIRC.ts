
import { ChatMessage, MessageToken, StreamEvent } from '../types';

type MessageHandler = (msg: ChatMessage) => void;
type EventHandler = (evt: StreamEvent) => void;
type LogHandler = (type: 'info' | 'error' | 'in' | 'out', message: string) => void;
type StatusHandler = (status: 'CONNECTED' | 'DISCONNECTED' | 'CONNECTING') => void;

export class TwitchIRC {
  private ws: WebSocket | null = null;
  private channel: string;
  private token: string;
  private username: string;
  private onMessage: MessageHandler;
  private onEvent: EventHandler;
  private onLog: LogHandler;
  private onStatus: StatusHandler;

  constructor(
    token: string, 
    channel: string, 
    username: string | undefined, 
    onMessage: MessageHandler,
    onEvent: EventHandler = () => {},
    onLog: LogHandler = () => {},
    onStatus: StatusHandler = () => {}
  ) {
    this.token = token.replace(/^oauth:/, '');
    this.channel = channel.toLowerCase();
    this.username = username || 'justinfan12345';
    this.onMessage = onMessage;
    this.onEvent = onEvent;
    this.onLog = onLog;
    this.onStatus = onStatus;
  }

  public connect() {
    if (this.ws) {
        this.onLog('info', 'Closing existing connection before reconnecting...');
        this.ws.close();
    }

    this.onStatus('CONNECTING');
    this.onLog('info', `Connecting to Twitch IRC as ${this.username}...`);
    this.ws = new WebSocket('wss://irc-ws.chat.twitch.tv:443');

    this.ws.onopen = () => {
      if (this.ws) {
        this.onStatus('CONNECTED');
        this.onLog('out', `PASS oauth:***`);
        this.ws.send(`PASS oauth:${this.token}`);
        this.ws.send(`NICK ${this.username}`);
        const capReq = 'CAP REQ :twitch.tv/tags twitch.tv/commands twitch.tv/membership';
        this.onLog('out', capReq);
        this.ws.send(capReq);
        this.onLog('out', `JOIN #${this.channel}`);
        this.ws.send(`JOIN #${this.channel}`);
      }
    };

    this.ws.onmessage = (event) => {
      const data = event.data.toString();
      
      if (!data.startsWith('PING')) {
        this.onLog('in', data.trim());
      }

      if (data.startsWith('PING')) {
        this.ws?.send('PONG :tmi.twitch.tv');
        return;
      }

      if (data.includes('Login authentication failed')) {
        this.onLog('error', 'Authentication Failed! Check your token.');
        this.onStatus('DISCONNECTED');
      }

      // Handle PRIVMSG (Chat)
      if (data.includes('PRIVMSG')) {
        this.parseMessage(data);
      }

      // Handle USERNOTICE (Subs, Raids, etc.)
      if (data.includes('USERNOTICE')) {
          this.parseUserNotice(data);
      }
    };

    this.ws.onclose = (event) => {
      this.onStatus('DISCONNECTED');
      this.onLog('info', `Twitch Disconnected (Code: ${event.code})`);
    };
    
    this.ws.onerror = (err) => {
      this.onStatus('DISCONNECTED');
      this.onLog('error', 'WebSocket Error occurred');
    };
  }

  private parseEmotes(text: string, emotesTag: string | undefined): MessageToken[] {
    if (!emotesTag) return [{ type: 'text', content: text }];
    const locations: {start: number, end: number, id: string}[] = [];
    const emoteGroups = emotesTag.split('/');
    emoteGroups.forEach(group => {
      const [id, ranges] = group.split(':');
      if (!ranges) return;
      ranges.split(',').forEach(range => {
        const [start, end] = range.split('-').map(Number);
        locations.push({start, end, id});
      });
    });
    locations.sort((a, b) => a.start - b.start);
    const tokens: MessageToken[] = [];
    let currentIndex = 0;
    locations.forEach(loc => {
      if (loc.start > currentIndex) {
        tokens.push({ type: 'text', content: text.slice(currentIndex, loc.start) });
      }
      tokens.push({
        type: 'emote',
        content: text.slice(loc.start, loc.end + 1),
        url: `https://static-cdn.jtvnw.net/emoticons/v2/${loc.id}/default/dark/2.0`
      });
      currentIndex = loc.end + 1;
    });
    if (currentIndex < text.length) {
      tokens.push({ type: 'text', content: text.slice(currentIndex) });
    }
    return tokens;
  }

  private parseMessage(raw: string) {
    try {
      const parts = raw.split(`PRIVMSG #${this.channel} :`);
      if (parts.length >= 2) {
        const message = parts.slice(1).join(`PRIVMSG #${this.channel} :`).trim();
        const metaPart = parts[0];
        let username = 'Unknown';
        const displayNameMatch = metaPart.match(/display-name=([^;]*)/);
        if (displayNameMatch && displayNameMatch[1]) username = displayNameMatch[1];
        else {
          const nickMatch = metaPart.match(/:(\w+)!(?:\w+)@/);
          if (nickMatch) username = nickMatch[1];
        }
        const colorMatch = metaPart.match(/color=(#[A-Fa-f0-9]{6});/);
        const color = colorMatch ? colorMatch[1] : undefined;
        const emotesMatch = metaPart.match(/emotes=([^;]*)/);
        const emotesTag = emotesMatch ? emotesMatch[1] : undefined;
        const tokens = this.parseEmotes(message, emotesTag);
        this.onMessage({
          id: Date.now().toString() + Math.random(),
          username,
          message,
          tokens,
          color,
          timestamp: Date.now()
        });
      }
    } catch (e) {
      console.error(e);
    }
  }

  private parseUserNotice(raw: string) {
      try {
        // Example: @badge-info=...;msg-id=sub;... :tmi.twitch.tv USERNOTICE #channel
        const metaPart = raw.split(' :tmi.twitch.tv USERNOTICE')[0];
        const msgIdMatch = metaPart.match(/msg-id=([^;]*)/);
        const msgId = msgIdMatch ? msgIdMatch[1] : '';

        // Extract Username
        let username = 'Someone';
        const displayNameMatch = metaPart.match(/display-name=([^;]*)/);
        if (displayNameMatch && displayNameMatch[1]) username = displayNameMatch[1];
        else {
            const loginMatch = metaPart.match(/login=([^;]*)/);
            if (loginMatch) username = loginMatch[1];
        }

        if (msgId === 'sub' || msgId === 'resub' || msgId === 'subgift') {
             this.onEvent({
                 id: Date.now().toString(),
                 type: 'SUB',
                 username: username,
                 details: msgId === 'subgift' ? 'Gifted a sub!' : 'Subscribed!',
                 timestamp: Date.now(),
                 seen: false
             });
        } else if (msgId === 'raid') {
             this.onEvent({
                 id: Date.now().toString(),
                 type: 'RAID',
                 username: username,
                 details: 'Raided the channel!',
                 timestamp: Date.now(),
                 seen: false
             });
        }
      } catch (e) {
          console.error("Error parsing UserNotice", e);
      }
  }

  public sendMessage(text: string) {
    if (this.ws && this.ws.readyState === 1) {
      this.onLog('out', `PRIVMSG #${this.channel} :${text}`);
      this.ws.send(`PRIVMSG #${this.channel} :${text}`);
    } else {
      const stateMap = ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'];
      const state = this.ws ? stateMap[this.ws.readyState] : 'NULL';
      this.onLog('error', `Cannot send: WebSocket is ${state}`);
    }
  }

  public disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.onStatus('DISCONNECTED');
    }
  }
}
