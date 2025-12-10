
# StreamDeck Overlay & Control

A powerful, browser-based streaming companion app. Turn your tablet or phone into a control deck to trigger animations and sounds on your OBS overlay via a local P2P connection, while monitoring and interacting with your Twitch chat.

## 🌟 Features

### 🎮 Remote Control Deck
- **Soundboard**: Trigger visual and audio alerts (HYPE, FAIL, GG, etc.) on your stream overlay instantly.
- **Customizable Buttons**: Enter "Edit Mode" to change button labels, colors, icons, fonts, animations, and assign custom Sound URLs or GIF/Image URLs.
- **Low Latency**: Uses PeerJS for direct Peer-to-Peer communication between your control device and your PC/OBS.
- **Robust Connection**: Includes advanced sleep prevention (Wake Lock + Video Hack) and aggressive auto-reconnection to ensure your deck stays connected even on mobile devices.

### 📱 Deck Only Mode (Chat Monitor)
- **Dedicated Monitor**: Use your device purely for tracking chat without the overlay controls.
- **Read/Unread Tracking**: Messages are highlighted until marked as read.
- **Bulk Mark as Read**: Tapping a checkmark clears that message and all older messages, helping you keep track of where you left off.

### 💜 Twitch Integration
- **Live Chat Monitor**: See chat messages in real-time with emote support.
- **Show on Stream**: Tap the "Monitor" icon next to any chat message to display it as a featured card on your overlay (Control Mode only).
- **Events Panel**: Track new Followers, Subscribers, Raids, and Cheers in a dedicated tab.
- **Custom Celebrations**: Click the "Celebrate" button on an event to trigger a customizable alert on stream (e.g., "{user} just subscribed!").
- **Chat Commands**: Viewers can trigger sounds using commands like `!hype`, `!fail`, `!gg` (if configured).

### 📊 Audience Interaction
- **Polls**: Create quick polls from the "Tools" tab. Viewers vote by typing numbers (1, 2, 3...) in chat.
- **Real-time Visuals**: The overlay displays a dynamic bar chart of the results.
- **Poll Reactions**: As the streamer, you can trigger "Up/Down" visual reactions on specific poll options to hype up the voting on the overlay.

### 🎥 OBS Overlay
- **Browser Source Ready**: Dedicated Overlay mode designed for 1920x1080 resolution.
- **Visual Effects**: Displays animations, custom images, featured chat messages, and poll results.
- **Audio Feedback**: Plays synthesized sounds or custom audio files directly from the overlay source.

### 🔄 Sync & Backup
- **P2P Sync**: Send your entire profile (buttons + settings) from one device to another wirelessly.
- **Backup**: Export your configuration to a JSON file for safekeeping.

## 🚀 Getting Started

### 1. Installation & Running Locally

1.  **Clone the repository**: `git clone <url>` and `cd streamdeck-overlay`
2.  **Install dependencies**: `npm install`
3.  **Start the server**: `npm run dev`
4.  **Access the App**: `http://localhost:5173`

### 2. OBS Configuration

1.  Add a **Browser Source** in OBS.
2.  **URL**: `http://localhost:5173/#/overlay`
3.  **Width**: `1920`, **Height**: `1080`
4.  **Control Audio via OBS**: Checked (Recommended).

### 3. Connecting the Control Deck

1.  Open the app on your Tablet/Phone (`http://YOUR_PC_IP:5173`).
2.  **Control Mode**: Enter the **4-digit code** displayed on your OBS Overlay and click **CONNECT**.
3.  **Deck Only Mode**: Click "Deck Only (Chat Monitor)" at the bottom if you only want to read chat.

## ⚙️ Twitch Configuration

1.  Click **Config** (Gear Icon) in the sidebar.
2.  **Client ID**: Get this from [Twitch Dev Console](https://dev.twitch.tv/console). Set Redirect URI to `http://localhost:5173` (or your local IP).
3.  **Channel**: Enter your Twitch username.
4.  **Connect**: Click the button to authorize and get your token.
5.  **Events Tab**: Customize the text templates used when celebrating events (e.g., "{user} is now following!").

## 🎮 How to Use

### Managing Chat (Deck Only Mode)
- **Unread Messages**: Appear with a purple tint and bright border.
- **Mark Read**: Tap the checkmark on a message. That message *and all messages above it* (older ones) will be marked as read.

### Creating a Poll
1.  Go to the **"Tools"** tab.
2.  Enter a Question and Options.
3.  Click **Start Poll**.
4.  Use the **Up/Down Arrows** next to options to trigger visual reactions on the overlay.
5.  Click **End Poll** to finish.

### Triggering Event Celebrations
1.  Go to the **"Events"** tab.
2.  When an event (Sub, Follow, etc.) appears, click **"OK" (Celebrate)**.
3.  This triggers an alert on the overlay using the template defined in Settings.
4.  Click **"X"** to dismiss the event without celebrating.

### Customizing Buttons
1.  Click the **"Edit Buttons"** toggle on the main dashboard.
2.  Tap any button to open the editor.
3.  Customize Label, Icon, Color, Sound, Image, Font, and Animation.
4.  Click **Save** and exit Edit Mode.

### Syncing Profiles
1.  Go to **Settings > Sync**.
2.  **Sender**: Click "Start as Sender" to generate a code.
3.  **Receiver**: Enter that code on the new device and click "Connect".
