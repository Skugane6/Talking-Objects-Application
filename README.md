# 🎭 Talking Objects App

**Bring everyday objects to life with AI!**

Point your camera at any object, and watch it come to life with personality, voice, and awareness of its surroundings. This app uses computer vision and AI to transform ordinary items into chatty companions that react to what they see around them.

![Talking Objects Demo](https://img.shields.io/badge/status-ready-brightgreen)

---

## ✨ Features

- 📸 **Live Camera Vision** - Real-time object identification using your device camera
- 🧠 **AI-Powered Personality** - Objects speak in first-person with unique personalities
- 🗣️ **Text-to-Speech** - Natural voice synthesis brings objects to life
- 🎭 **Multiple Personalities** - Choose between playful, grumpy, wise, excited, or chill modes
- 🎯 **Motion Detection** - Smart frame analysis only when things change
- 💾 **Intelligent Caching** - Minimizes API calls for better performance
- 📱 **Mobile-First** - Optimized for iOS Safari and Android Chrome
- 🆓 **Free APIs** - Uses generous free-tier services

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- A Google Gemini API key (free tier available)
- A modern web browser with camera access

### Installation

1. **Clone or download this repository**

```bash
cd talking-objects-app
```

2. **Install dependencies**

```bash
npm install
```

3. **Set up your API key**

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and add your Gemini API key:

```env
VITE_GEMINI_API_KEY=your_actual_api_key_here
```

> **Get your free Gemini API key:** Visit [Google AI Studio](https://makersuite.google.com/app/apikey)

4. **Start the development server**

```bash
npm run dev
```

5. **Open in your browser**

Navigate to `http://localhost:5173` (or the URL shown in terminal)

---