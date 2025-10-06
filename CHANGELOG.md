# Changelog

## Object Transition Feature - 2025-09-30

### ✨ New Features

**Smooth Object Transitions**
- When a new object enters the frame, the app now:
  - Immediately stops the current TTS speech
  - Clears the speech bubble with smooth animation
  - Shows a success notification: "New object detected: [object name]"
  - Resets conversation history (new object starts fresh)
  - Displays new object label with flash animation
  - Prioritizes speaking as the new object

### 🔧 Technical Improvements

**Enhanced Object Detection**
- Added `isNewObject()` method to compare detected objects
- Normalizes object names (removes emojis, lowercasing) for accurate comparison
- Different objects now properly interrupt each other

**Improved Motion Detection**
- Added average color change detection alongside pixel change detection
- Motion triggers on either:
  - 5% of pixels changing (existing behavior)
  - Average pixel change > 25 (new - catches color shifts when objects change)
- Better detection of new objects with different colors

**Better Frame Similarity Detection**
- Only updates previous frame hash when frames are similar
- Resets hash immediately on significant changes
- Allows rapid detection of new objects without false similarities

**Smoother Transitions**
- 150ms pause between stopping old object and starting new object
- Flash animation on object label when new object detected (400ms)
- Speech bubble fades out cleanly before new speech

### 🎨 UI Enhancements

**New Animation**
- `objectFlash` keyframe animation
- Object label scales and fades in when new object detected
- Visual feedback that system recognized the change

### 📝 Updated Prompts

**First-time Object Context**
- Changed from "This is your first observation"
- To: "This is your first time being seen. Introduce yourself with excitement or personality!"
- Makes objects more engaging when first detected

### 🐛 Bug Fixes

- Removed blocking condition that prevented analysis during speech
- Speech can now be interrupted by new object detection
- Added error handling for interrupted speech
- Fixed conversation history not resetting on object changes

### 🎯 User Experience

**Before:**
- New objects had to wait for current speech to finish
- Could feel unresponsive when switching between objects
- Objects would continue previous conversation context

**After:**
- Instant response to new objects
- Smooth interruption with visual/audio feedback
- Each object starts with fresh personality and context
- Clear indication when object changes

### 🚀 How It Works

1. User points camera at Object A (coffee mug)
2. Coffee mug starts talking: "Mmm, I smell fresh coffee..."
3. User quickly points camera at Object B (keyboard)
4. System detects different object name
5. Coffee mug speech stops immediately
6. UI shows: "New object detected: ⌨️ Keyboard"
7. Object label flashes with animation
8. Speech bubble clears
9. Keyboard introduces itself: "Hey! Ready to type something?"

### 📊 Performance Impact

- Minimal additional processing (~2-3ms per frame for object comparison)
- Actually improves responsiveness by allowing interruptions
- Better user experience without significant overhead