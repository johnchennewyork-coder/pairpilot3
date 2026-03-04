# PairPilot AI Interview Assistant

PairPilot is an unobtrusive macOS menu bar application built with **Electron + React** that acts as your AI pair-programming assistant. Once started, it sits quietly on your screen and periodically captures your screen and records your microphone to automatically query the Google Gemini Multimodal API.

It returns bite-sized hints, summarizes the current trajectory of your coding interview, and, when finished, provides an overall performance evaluation along with a mock hire signal.

![PairPilot UI](https://via.placeholder.com/800x400?text=PairPilot+AI+Assistant)

## Features

- **Menu Bar Integration:** Easily accessible from your macOS top menu bar.
- **Floating UI:** Frameless, transparent assistant UI that overlays your coding environment unobtrusively.
- **Auto Capture:** Set an interval (e.g. 30 seconds), and PairPilot will take a screenshot and an audio chunk and send them to the Gemini AI context window.
- **Keyboard Shortcuts:**
  - `Cmd+Shift+A` - Force an immediate capture and request a hint.
  - `Cmd+Shift+H` - Toggle the visibility of the floating assistant.
  - `Cmd+Shift+Q` - Force quit the application entirely.
- **End-of-Interview Evaluation:** Evaluates your coding progression history and provides a final numerical score (0-100) and hiring signal (Strong Hire, Weak Hire, No Hire).
- **Secure Configuration:** Prompts and API keys are stored locally via `electron-store`.

**Note:** On macOS you may see a one-time console message `SetApplicationIsDaemon: paramErr (-50)`. This is a harmless Chromium/sandbox log and does not affect the app.

## Tech Stack

- **Frontend:** React, TypeScript, Tailwind CSS, Lucide React
- **Desktop Wrapper:** Electron, electron-vite, electron-store
- **AI Integration:** Google Gemini Multimodal API (`@google/genai`)
- **Routing:** React Router DOM

## Prerequisites

- Node.js (v20+ recommended)
- A Google Gemini API Key. You can get one from [Google AI Studio](https://aistudio.google.com/).

## Installation

1. Clone this repository:
   ```bash
   git clone <your-repo-url>
   cd pairpilot
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the application in development mode:
   ```bash
   npm run dev
   ```

## Usage Guide

1. **Initial Setup:** On the first launch, a Settings Splash window will appear. Enter your Google Gemini API Key, set up the prompt behavior, and configure how often screenshots should trigger (e.g., `30` seconds).
2. **Start the Assistant:** Click the "Start Assistant" button. The floating transparent window will appear in the top right corner of your screen.
3. **Begin Recording:** Click **Start** inside the floating assistant UI. PairPilot will start requesting macOS permissions for screen recording and microphone access. Make sure to allow these.
4. **Code!** The assistant will periodically flash and populate the window with the latest hints and summaries based on your screen state and voice.
5. **Evaluate:** When your interview/session is over, click **Evaluate**. PairPilot will take your entire session history, prompt the AI to grade you, and open the final Evaluation Results window.

## Building for Production

To compile the Electron app into a macOS executable `.dmg` or `.app`:

```bash
npm run build
```

The output will be located in the `dist` and `release` directories depending on the configuration.

## License

MIT
