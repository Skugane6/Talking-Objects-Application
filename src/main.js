/**
 * Talking Objects App - Main Application
 * Brings everyday objects to life using AI vision and voice
 */

import './style.css';
import { CameraManager } from './utils/camera.js';
import { MotionDetector } from './utils/motionDetector.js';
import { GeminiVision } from './utils/geminiAPI.js';
import { TextToSpeech } from './utils/textToSpeech.js';
import { ResponseCache, FrameSimilarityDetector, RateLimiter } from './utils/cache.js';
import { BackgroundSoundManager } from './utils/backgroundSound.js';
import { ObjectDetector } from './utils/objectDetector.js';

class TalkingObjectsApp {
  constructor() {
    // DOM Elements
    this.elements = {
      video: document.getElementById('camera-feed'),
      motionCanvas: document.getElementById('motion-canvas'),
      objectLabel: document.getElementById('object-label'),
      objectName: document.getElementById('object-name'),
      statusIndicator: document.getElementById('status-indicator'),
      statusText: document.getElementById('status-text'),
      speechBubble: document.getElementById('speech-bubble'),
      speechText: document.getElementById('speech-text'),
      startBtn: document.getElementById('start-btn'),
      stopBtn: document.getElementById('stop-btn'),
      settingsToggle: document.getElementById('settings-toggle'),
      settings: document.getElementById('settings'),
      personalitySelect: document.getElementById('personality-select'),
      intervalSelect: document.getElementById('interval-select'),
      messageToast: document.getElementById('message-toast'),
      themeToggle: document.getElementById('theme-toggle'),
      volumeControl: document.getElementById('volume-control'),
      volumeSlider: document.getElementById('volume-slider'),
      reactionButtons: document.getElementById('reaction-buttons'),
      expressionOverlay: document.getElementById('expression-overlay'),
      expressionParticles: document.querySelector('.expression-particles')
    };

    // Core modules
    this.camera = new CameraManager(this.elements.video);
    this.motionDetector = new MotionDetector(this.elements.video, this.elements.motionCanvas);
    this.objectDetector = new ObjectDetector(this.elements.video);
    this.tts = new TextToSpeech();
    this.backgroundSound = new BackgroundSoundManager();
    this.gemini = null; // Initialize after API key check

    // Optimization modules
    this.cache = new ResponseCache(20, 300000); // 20 items, 5 min TTL
    this.similarityDetector = new FrameSimilarityDetector(0.92); // 92% similarity threshold
    this.rateLimiter = new RateLimiter(10, 60000); // 10 requests per minute

    // State
    this.isRunning = false;
    this.analysisInterval = null;
    this.lastAnalysisTime = 0;
    this.minAnalysisInterval = 5000; // 5 seconds default
    this.currentExpression = null;
    this.expressionTimeout = null;
    this.quotaPaused = false;
    this.quotaResumeTime = null;

    // Initialize
    this.init();
  }

  /**
   * Initialize application
   */
  async init() {
    // Check browser support
    if (!this.checkBrowserSupport()) {
      return;
    }

    // Initialize Gemini API
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey || apiKey === 'your_api_key_here') {
        this.showMessage('Please add your Gemini API key to the .env file', 'error', 10000);
        return;
      }
      this.gemini = new GeminiVision(apiKey);
    } catch (error) {
      this.showMessage(error.message, 'error');
      return;
    }

    // Setup event listeners
    this.setupEventListeners();

    // Load theme preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
      document.body.classList.add('light-mode');
      this.elements.themeToggle.textContent = '☀️';
    }

    // Show ready message
    this.showMessage('Ready! Point your camera at any object to bring it to life.', 'success', 3000);
  }

  /**
   * Check if browser supports required features
   */
  checkBrowserSupport() {
    const errors = [];

    if (!CameraManager.isSupported()) {
      errors.push('Camera API not supported');
    }

    if (!TextToSpeech.isSupported()) {
      errors.push('Text-to-Speech not supported');
    }

    if (errors.length > 0) {
      this.showMessage(`Browser not supported: ${errors.join(', ')}`, 'error', 10000);
      return false;
    }

    return true;
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Start button
    this.elements.startBtn.addEventListener('click', () => this.start());

    // Stop button
    this.elements.stopBtn.addEventListener('click', () => this.stop());

    // Settings toggle
    this.elements.settingsToggle.addEventListener('click', () => {
      this.elements.settings.classList.toggle('collapsed');
    });

    // Interval change
    this.elements.intervalSelect.addEventListener('change', (e) => {
      this.minAnalysisInterval = parseInt(e.target.value);
    });

    // Theme toggle
    this.elements.themeToggle.addEventListener('click', () => this.toggleTheme());

    // Volume control
    this.elements.volumeSlider.addEventListener('input', (e) => {
      const volume = e.target.value / 100;
      this.backgroundSound.setVolume(volume);
    });

    // Reaction buttons
    const reactionBtns = this.elements.reactionButtons.querySelectorAll('.reaction-btn');
    reactionBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const reaction = btn.getAttribute('data-reaction');
        this.triggerReaction(reaction);
      });
    });

    // Prevent scrolling on mobile
    document.body.addEventListener('touchmove', (e) => {
      if (this.isRunning) {
        e.preventDefault();
      }
    }, { passive: false });
  }

  /**
   * Toggle dark/light theme
   */
  toggleTheme() {
    document.body.classList.toggle('light-mode');
    const isLight = document.body.classList.contains('light-mode');
    this.elements.themeToggle.textContent = isLight ? '☀️' : '🌙';
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
  }

  /**
   * Trigger a reaction from the object
   */
  async triggerReaction(reaction) {
    if (!this.isRunning || this.tts.isSpeaking || !this.gemini?.currentObject) return;

    // Get AI-generated reaction based on current object and personality
    try {
      this.setStatus('thinking', 'Generating reaction...');

      const reactionPrompts = {
        compliment: "The user just complimented you! Respond with delight and appreciation in first-person. ONE SHORT sentence.",
        laugh: "The user is trying to make you laugh! Respond with laughter and joy in first-person. ONE SHORT sentence.",
        surprise: "The user just surprised you! Respond with shock or amazement in first-person. ONE SHORT sentence.",
        grumpy: "The user annoyed you! Respond grumpily or sarcastically in first-person. ONE SHORT sentence."
      };

      const prompt = `You are a ${this.gemini.currentObject}. ${reactionPrompts[reaction]}

Personality: ${this.elements.personalitySelect.value}
Format: Just the response text, nothing else. Stay in character as the object.`;

      const result = await this.gemini.model.generateContent(prompt);
      const text = result.response.text().trim();

      this.displaySpeech(text);
      this.setStatus('speaking', 'Reacting...');
      try {
        await this.tts.speak(text, this.gemini.currentObject);
        this.setStatus('idle', 'Ready');
      } catch (speechError) {
        console.log('Reaction speech error:', speechError);
        // Only show message if it's a critical error
        if (speechError.message?.includes('not supported')) {
          this.showMessage('Text-to-speech not available', 'error', 3000);
        }
        this.setStatus('idle', 'Ready');
      }
    } catch (error) {
      console.log('Reaction generation error:', error);
      // Fallback to generic reactions
      const fallbackReactions = {
        compliment: "Oh stop it, you're making me blush!",
        laugh: "Haha! That tickles!",
        surprise: "WHOA! You startled me!",
        grumpy: "Ugh, seriously?"
      };
      const text = fallbackReactions[reaction];
      this.displaySpeech(text);
      this.setStatus('speaking', 'Reacting...');
      try {
        await this.tts.speak(text, this.gemini?.currentObject || '');
        this.setStatus('idle', 'Ready');
      } catch (error) {
        console.log('Reaction speech error:', error);
        // Only show message if it's a critical error
        if (error.message?.includes('not supported')) {
          this.showMessage('Text-to-speech not available', 'error', 3000);
        }
        this.setStatus('idle', 'Ready');
      }
    }
  }

  /**
   * Start the talking objects experience
   */
  async start() {
    if (this.isRunning) return;

    try {
      // Update UI
      this.setStatus('analyzing', 'Starting camera...');
      this.elements.startBtn.classList.add('hidden');

      // Initialize audio on user gesture (critical for iOS)
      this.tts.initAudioOnUserGesture();

      // Start camera
      await this.camera.start();

      // Update state
      this.isRunning = true;
      this.elements.stopBtn.classList.remove('hidden');

      // Show volume control and reaction buttons
      this.elements.volumeControl.classList.remove('hidden');
      this.elements.reactionButtons.classList.remove('hidden');

      // Initialize background sound
      this.backgroundSound.init();

      // Start analysis loop
      this.startAnalysisLoop();

      this.showMessage('Camera active! Looking at your surroundings...', 'success', 2000);

    } catch (error) {
      this.showMessage(error.message, 'error');
      this.reset();
    }
  }

  /**
   * Stop the experience
   */
  stop() {
    if (!this.isRunning) return;

    // Stop camera
    this.camera.stop();

    // Stop speech and background sound
    this.tts.stop();
    this.backgroundSound.stop();

    // Clear intervals and timeouts
    if (this.analysisInterval) {
      clearInterval(this.analysisInterval);
      this.analysisInterval = null;
    }

    if (this.expressionTimeout) {
      clearTimeout(this.expressionTimeout);
      this.expressionTimeout = null;
    }

    // Reset state
    this.isRunning = false;
    this.quotaPaused = false;
    this.quotaResumeTime = null;
    this.currentExpression = null;
    this.motionDetector.reset();
    this.gemini.resetHistory();
    this.similarityDetector.reset();
    this.objectDetector.reset();

    // Update UI
    this.reset();
    this.showMessage('Stopped', 'success', 2000);
  }

  /**
   * Start the analysis loop
   */
  startAnalysisLoop() {
    // Analyze immediately
    this.analyzeFrame();

    // Start continuous AR tracking
    this.startARTracking();

    // Then check periodically
    this.analysisInterval = setInterval(() => {
      const now = Date.now();
      const timeSinceLastAnalysis = now - this.lastAnalysisTime;

      // Check if enough time has passed
      if (timeSinceLastAnalysis >= this.minAnalysisInterval) {
        // Check for motion
        const motionDetected = this.motionDetector.detectMotion();

        if (motionDetected) {
          this.analyzeFrame();
        }
      }
    }, 1000); // Check every second
  }

  /**
   * Start continuous AR tracking to follow object movement
   */
  startARTracking() {
    // Update AR overlay position smoothly
    const updateAR = () => {
      if (!this.isRunning) return;

      // Only track if expression is active
      if (this.elements.expressionOverlay.classList.contains('active')) {
        const bounds = this.objectDetector.detectObjectBounds();
        if (bounds) {
          this.positionEyesOnObject(bounds);
        }
      }

      // Continue tracking
      requestAnimationFrame(updateAR);
    };

    requestAnimationFrame(updateAR);
  }

  /**
   * Analyze current frame
   */
  async analyzeFrame() {
    if (!this.isRunning) {
      return;
    }

    // Check if we're paused due to quota
    if (this.quotaPaused) {
      const now = Date.now();
      if (now < this.quotaResumeTime) {
        const secondsLeft = Math.ceil((this.quotaResumeTime - now) / 1000);
        this.setStatus('idle', `Quota exceeded. Resuming in ${secondsLeft}s`);
        return;
      } else {
        // Resume
        this.quotaPaused = false;
        this.quotaResumeTime = null;
        this.showMessage('Quota resumed! Continuing analysis...', 'success', 2000);
      }
    }

    try {
      this.setStatus('analyzing', 'Looking...');
      this.lastAnalysisTime = Date.now();

      // Capture frame
      const frameData = this.camera.captureFrame(800);

      // Check frame similarity - skip if too similar to previous frame
      if (this.similarityDetector.isSimilar(frameData)) {
        console.log('Frame too similar, skipping analysis');
        this.setStatus('idle', 'Ready');
        return;
      }

      // Check rate limit
      if (!this.rateLimiter.canMakeRequest()) {
        const waitTime = Math.ceil(this.rateLimiter.getTimeUntilNextRequest() / 1000);
        this.showMessage(`Rate limit reached. Wait ${waitTime}s...`, 'error', 2000);
        this.setStatus('idle', 'Rate limited');
        return;
      }

      // Check cache first
      const cached = this.cache.get(frameData);
      if (cached) {
        console.log('Using cached response');
        await this.handleAnalysisResult(cached);
        return;
      }

      // Get personality
      const personality = this.elements.personalitySelect.value;

      // Analyze with Gemini
      const result = await this.gemini.analyzeAndRespond(frameData, personality);

      // Cache the result
      this.cache.set(frameData, result);

      // Handle result
      await this.handleAnalysisResult(result);

    } catch (error) {
      console.error('Analysis error:', error);

      // Check if it's a quota error
      if (error.message === 'QUOTA_EXCEEDED') {
        const retryAfter = error.retryAfter || 60;
        this.quotaPaused = true;
        this.quotaResumeTime = Date.now() + (retryAfter * 1000);

        this.showMessage(
          `Daily quota exceeded (50 requests/day). Pausing for ${retryAfter}s...`,
          'error',
          5000
        );
        this.setStatus('idle', `Quota exceeded. Resuming in ${retryAfter}s`);
      } else {
        // Show brief error message and return to ready state
        this.showMessage('Could not analyze image. Retrying...', 'error', 2000);
        this.setStatus('idle', 'Ready');
      }
    }
  }

  /**
   * Handle analysis result (from cache or API)
   */
  async handleAnalysisResult(result) {
    // Check if this is a new object
    const isNewObject = this.gemini.isNewObject(result.object);

    if (isNewObject) {
      // New object detected!
      console.log('New object detected:', result.object);

      // Wait for current speech to finish before switching
      if (this.tts.isSpeaking) {
        console.log('Waiting for current speech to finish...');
        // Skip this update - we're still talking about the previous object
        return;
      }

      // Show transition message
      this.showMessage(`New object detected: ${result.object}`, 'success', 1500);

      // Brief pause for smooth transition
      await new Promise(resolve => setTimeout(resolve, 150));

      // Reset context for new object
      this.gemini.resetHistory();
      this.similarityDetector.reset();

      // Start background sound for new object
      this.backgroundSound.start(result.object);
    } else {
      // Same object - skip if already speaking to avoid queue buildup
      if (this.tts.isSpeaking) {
        console.log('Already speaking, skipping update');
        return;
      }
    }

    // Update UI with object identity
    this.elements.objectName.textContent = result.object;
    this.elements.objectLabel.classList.remove('hidden');

    // Add flash animation for new objects
    if (isNewObject) {
      this.elements.objectLabel.style.animation = 'objectFlash 0.4s ease-out';
      setTimeout(() => {
        this.elements.objectLabel.style.animation = '';
      }, 400);
    }

    // Display speech
    this.displaySpeech(result.response);

    // Speak the response
    this.setStatus('speaking', 'Speaking...');
    try {
      await this.tts.speak(result.response, result.object);
      this.setStatus('idle', 'Ready');
    } catch (error) {
      // Speech error - log but don't show to user unless critical
      console.log('Speech error:', error);

      // Only show message if it's a critical error (not just network hiccup)
      if (error.message?.includes('not supported')) {
        this.showMessage('Text-to-speech not available', 'error', 3000);
      }

      this.setStatus('idle', 'Ready');
    }
  }

  /**
   * Display speech in bubble
   */
  displaySpeech(text) {
    this.elements.speechText.textContent = text;
    this.elements.speechBubble.classList.remove('hidden');

    // Detect expression from text and personality
    this.updateExpression(text);

    // Auto-hide after speaking
    setTimeout(() => {
      this.elements.speechBubble.classList.add('hidden');
    }, 8000);
  }

  /**
   * Update expression based on text and personality
   */
  updateExpression(text) {
    const personality = this.elements.personalitySelect.value;
    let expression = 'happy'; // default

    // Determine expression based on personality
    if (personality === 'fearful') {
      expression = 'fearful';
    } else if (personality === 'grumpy') {
      expression = 'angry';
    } else if (personality === 'excited') {
      expression = 'surprised';
    } else if (personality === 'wise' || personality === 'chill') {
      expression = 'happy';
    } else {
      // For playful, detect from text sentiment
      const lowerText = text.toLowerCase();
      if (lowerText.includes('!') || lowerText.includes('wow') || lowerText.includes('amazing')) {
        expression = 'surprised';
      } else if (lowerText.includes('?') || lowerText.includes('hmm')) {
        expression = 'happy';
      }
    }

    this.showExpression(expression);
  }

  /**
   * Show visual expression with AR positioning
   */
  showExpression(expression) {
    // Clear previous expression
    if (this.expressionTimeout) {
      clearTimeout(this.expressionTimeout);
    }

    // Detect object bounds for AR overlay
    const bounds = this.objectDetector.detectObjectBounds();

    // Remove all expression classes
    this.elements.expressionOverlay.classList.remove('happy', 'fearful', 'surprised', 'angry', 'active');

    // Add new expression
    this.currentExpression = expression;
    this.elements.expressionOverlay.classList.add(expression, 'active');

    // Position eyes on the object
    if (bounds) {
      this.positionEyesOnObject(bounds);
    }

    // Add particles from object outline
    if (expression === 'happy') {
      this.spawnARParticles(['✨', '💫', '⭐'], 8, bounds);
    } else if (expression === 'fearful') {
      this.spawnARParticles(['😰', '💦', '😨'], 6, bounds);
    } else if (expression === 'surprised') {
      this.spawnARParticles(['❗', '💥', '✨'], 10, bounds);
    } else if (expression === 'angry') {
      this.spawnARParticles(['💢', '🔥', '😤'], 8, bounds);
    }

    // Auto-hide expression after 5 seconds
    this.expressionTimeout = setTimeout(() => {
      this.elements.expressionOverlay.classList.remove('active');
    }, 5000);
  }

  /**
   * Position eyes on the detected object
   */
  positionEyesOnObject(bounds) {
    const eyesContainer = this.elements.expressionOverlay.querySelector('.expression-eyes');
    if (!eyesContainer || !bounds) return;

    // Get video dimensions
    const videoRect = this.elements.video.getBoundingClientRect();

    // Calculate eye position (upper third of object)
    const eyeY = bounds.y + bounds.height * 0.3;
    const eyeX = bounds.centerX;

    // Convert to screen coordinates
    const screenX = (eyeX / this.elements.video.videoWidth) * 100;
    const screenY = (eyeY / this.elements.video.videoHeight) * 100;

    // Position eyes
    eyesContainer.style.top = `${screenY}%`;
    eyesContainer.style.left = `${screenX}%`;

    // Scale eyes based on object size
    const objectSizeRatio = Math.min(bounds.width / this.elements.video.videoWidth,
                                      bounds.height / this.elements.video.videoHeight);
    const scale = Math.max(0.5, Math.min(1.5, objectSizeRatio * 2));
    eyesContainer.style.transform = `translate(-50%, -50%) scale(${scale})`;
  }

  /**
   * Spawn AR particles from object outline
   */
  spawnARParticles(emojis, count, bounds) {
    this.elements.expressionParticles.innerHTML = '';

    if (!bounds) {
      // Fallback to center if no bounds detected
      bounds = {
        x: this.elements.video.videoWidth * 0.25,
        y: this.elements.video.videoHeight * 0.25,
        width: this.elements.video.videoWidth * 0.5,
        height: this.elements.video.videoHeight * 0.5,
        centerX: this.elements.video.videoWidth / 2,
        centerY: this.elements.video.videoHeight / 2
      };
    }

    // Get outline points
    const outlinePoints = this.objectDetector.getOutlinePoints(count);

    for (let i = 0; i < count; i++) {
      const particle = document.createElement('div');
      particle.className = 'particle';
      particle.textContent = emojis[Math.floor(Math.random() * emojis.length)];

      // Use outline points if available, otherwise use perimeter
      let particleX, particleY;

      if (outlinePoints.length > 0) {
        const point = outlinePoints[i % outlinePoints.length];
        particleX = (point.x / this.elements.video.videoWidth) * 100;
        particleY = (point.y / this.elements.video.videoHeight) * 100;
      } else {
        // Fallback: spawn around object perimeter
        const angle = (i / count) * Math.PI * 2;
        const x = bounds.centerX + Math.cos(angle) * (bounds.width / 2);
        const y = bounds.centerY + Math.sin(angle) * (bounds.height / 2);
        particleX = (x / this.elements.video.videoWidth) * 100;
        particleY = (y / this.elements.video.videoHeight) * 100;
      }

      particle.style.left = `${particleX}%`;
      particle.style.top = `${particleY}%`;
      particle.style.animation = `particleFly ${1.5 + Math.random()}s ease-out forwards`;
      particle.style.animationDelay = `${i * 0.15}s`;

      this.elements.expressionParticles.appendChild(particle);

      // Remove particle after animation
      setTimeout(() => {
        particle.remove();
      }, (1.5 + Math.random()) * 1000 + i * 150);
    }
  }

  /**
   * Set status indicator
   */
  setStatus(status, text) {
    this.elements.statusIndicator.className = `status-${status}`;
    this.elements.statusText.textContent = text;
  }

  /**
   * Show temporary message
   */
  showMessage(text, type = 'info', duration = 3000) {
    this.elements.messageToast.textContent = text;
    this.elements.messageToast.className = type;
    this.elements.messageToast.classList.remove('hidden');

    setTimeout(() => {
      this.elements.messageToast.classList.add('hidden');
    }, duration);
  }

  /**
   * Reset UI
   */
  reset() {
    this.elements.startBtn.classList.remove('hidden');
    this.elements.stopBtn.classList.add('hidden');
    this.elements.objectLabel.classList.add('hidden');
    this.elements.speechBubble.classList.add('hidden');
    this.elements.volumeControl.classList.add('hidden');
    this.elements.reactionButtons.classList.add('hidden');
    this.elements.expressionOverlay.classList.remove('active', 'happy', 'fearful', 'surprised', 'angry');
    this.elements.expressionParticles.innerHTML = '';
    this.setStatus('idle', 'Ready');
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new TalkingObjectsApp();
});