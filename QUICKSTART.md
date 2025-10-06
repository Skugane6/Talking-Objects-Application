# ⚡ Quick Start Guide

Get your Talking Objects app running in 3 minutes!

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Get Your FREE Gemini API Key

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Click "Create API Key"
3. Copy the key

## Step 3: Add API Key

Create a `.env` file in the project root:

```env
VITE_GEMINI_API_KEY=paste_your_key_here
```

Or just copy the example file and edit it:

```bash
cp .env.example .env
# Then edit .env with your favorite editor
```

## Step 4: Run the App

```bash
npm run dev
```

Open the URL shown in your terminal (usually `http://localhost:5173`)

## Step 5: Try It Out!

1. Click **"Start Talking"**
2. Allow camera access
3. Point at any object
4. Watch it come to life! 🎉

---

## 🔧 Troubleshooting

### "Please set your Gemini API key" error?

- Make sure your `.env` file is in the project root folder
- Check there are no extra spaces in the API key
- Restart the dev server: `Ctrl+C` then `npm run dev` again

### Camera not working?

- Allow camera permission when prompted
- On mobile: use HTTPS (localhost is OK for testing)
- Try a different browser

### No sound?

- Check device volume
- Unmute browser tab
- On iPhone: make sure silent mode is OFF

---

## 📱 Test on Mobile

1. On your computer, note the network URL shown when you run `npm run dev`
   - Example: `http://192.168.1.5:5173`

2. Open that URL on your phone (must be on same WiFi)

3. Grant camera permissions

4. Point at objects and enjoy!

---

## 🎭 Personality Tips

Try different settings:

- **Playful** = Friendly and curious
- **Grumpy** = Sarcastic and funny
- **Wise** = Philosophical
- **Excited** = Super enthusiastic!
- **Chill** = Laid-back vibes

Change personality in the ⚙️ settings menu (bottom left).

---

## 🚀 Next Steps

Check out the full [README.md](README.md) for:
- Deployment instructions
- Customization options
- Technical details
- Advanced features

**Enjoy making objects talk!** 🎤✨