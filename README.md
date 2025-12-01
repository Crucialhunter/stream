
# StreamDeck Overlay & Control

A powerful, browser-based streaming companion app. Turn your tablet or phone into a control deck to trigger animations and sounds on your OBS overlay via a local P2P connection, while monitoring and interacting with your Twitch chat.

## 🌟 Features

### 🎮 Remote Control Deck
- **Soundboard**: Trigger visual and audio alerts (HYPE, FAIL, GG, etc.) on your stream overlay instantly.
- **Customizable Buttons**: Enter "Edit Mode" to change button labels, colors, and assign custom Sound URLs or GIF/Image URLs for the overlay.
- **Low Latency**: Uses PeerJS for direct Peer-to-Peer communication between your control device and your PC/OBS.

### 💜 Twitch Integration
- **Live Chat Monitor**: See chat messages in real-time.
- **Show on Stream**: Tap the "Monitor" icon next to any chat message to display it as a featured card on your overlay.
- **Events Panel**: Track new Followers and Subscribers in a dedicated tab. Acknowledge them to clear the list.
- **Chat Commands**: Viewers can trigger sounds using commands like `!hype`, `!fail`, `!gg`.
- **Emote Support**: Displays Twitch emotes natively in the chat window.

### 📊 Audience Interaction
- **Polls & Predictions**: Create quick polls from the "Tools" tab. Viewers vote by typing numbers (1, 2, 3...) in chat.
- **Live Visuals**: The overlay displays a real-time bar chart of the poll results.

### 🎥 OBS Overlay
- **Browser Source Ready**: Dedicated Overlay mode designed for OBS.
- **Visual Effects**: Displays animations, custom images, featured chat messages, and polls.
- **Audio Feedback**: Plays synthesized sounds or custom audio files directly from the overlay source.

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
4.  **Control Audio via OBS**: Checked.

### 3. Connecting the Control Deck

1.  Open the app on your Tablet/Phone (`http://YOUR_PC_IP:5173`).
2.  Enter the **4-digit code** displayed on your OBS Overlay.
3.  Click **CONNECT**.

## ⚙️ Twitch Configuration

1.  Click **Config** (Gear Icon).
2.  **Client ID**: Get this from [Twitch Dev Console](https://dev.twitch.tv/console). Set Redirect URI to `http://localhost:5173`.
3.  **Channel**: Enter your username.
4.  **Connect**: Click the button to authorize.

## 🎮 How to Use New Features

### Customizing Buttons
1.  Click the **"Edit Buttons"** toggle on the main dashboard.
2.  Tap any button to open the editor.
3.  Paste a URL for a sound (mp3/wav) or an image (gif/png).
4.  Click Save and exit Edit Mode.

### Creating a Poll
1.  Go to the **"Tools"** tab in the sidebar.
2.  Enter a Question and Options.
3.  Click **Start Poll**.
4.  Viewers vote by typing "1", "2", etc. in chat.
5.  Click **End Poll** to finish.

### Showing Chat on Stream
1.  In the **Chat** tab, hover over (or tap) a message.
2.  Click the **Monitor/Screen Icon** that appears.
3.  The message will pop up on your Overlay for 10 seconds.
