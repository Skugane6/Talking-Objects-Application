/**
 * Background Sound Manager - Adds ambient sounds based on object type
 */

export class BackgroundSoundManager {
  constructor() {
    this.currentSound = null;
    this.volume = 0.3;
    this.isEnabled = true;

    // Map object types to sound frequencies/patterns
    this.soundProfiles = {
      electronic: { type: 'hum', frequency: 120 },
      mechanical: { type: 'whir', frequency: 80 },
      nature: { type: 'ambient', frequency: 200 },
      default: { type: 'subtle', frequency: 150 }
    };

    // Initialize Web Audio API
    this.audioContext = null;
    this.oscillator = null;
    this.gainNode = null;
  }

  /**
   * Initialize audio context (must be called after user interaction)
   */
  init() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.gainNode = this.audioContext.createGain();
      this.gainNode.connect(this.audioContext.destination);
      this.gainNode.gain.value = 0;
    }
  }

  /**
   * Start background sound for an object type
   */
  start(objectType = '') {
    if (!this.isEnabled) return;

    this.init();
    this.stop(); // Stop current sound

    const profile = this.getProfileForObject(objectType);

    // Create oscillator
    this.oscillator = this.audioContext.createOscillator();
    this.oscillator.type = 'sine';
    this.oscillator.frequency.value = profile.frequency;

    // Connect to gain node
    this.oscillator.connect(this.gainNode);

    // Fade in
    this.gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    this.gainNode.gain.linearRampToValueAtTime(
      this.volume * 0.1,
      this.audioContext.currentTime + 1
    );

    this.oscillator.start();
    this.currentSound = objectType;
  }

  /**
   * Stop background sound
   */
  stop() {
    if (this.oscillator) {
      // Fade out
      if (this.audioContext) {
        this.gainNode.gain.linearRampToValueAtTime(
          0,
          this.audioContext.currentTime + 0.5
        );
      }

      setTimeout(() => {
        if (this.oscillator) {
          this.oscillator.stop();
          this.oscillator.disconnect();
          this.oscillator = null;
        }
      }, 500);
    }
    this.currentSound = null;
  }

  /**
   * Get sound profile for object type
   */
  getProfileForObject(objectType) {
    const type = objectType.toLowerCase();

    // Electronic devices
    if (type.includes('phone') || type.includes('computer') ||
        type.includes('laptop') || type.includes('monitor')) {
      return this.soundProfiles.electronic;
    }

    // Mechanical objects
    if (type.includes('fan') || type.includes('clock') ||
        type.includes('machine') || type.includes('motor')) {
      return this.soundProfiles.mechanical;
    }

    // Nature objects
    if (type.includes('plant') || type.includes('flower') ||
        type.includes('tree') || type.includes('water')) {
      return this.soundProfiles.nature;
    }

    return this.soundProfiles.default;
  }

  /**
   * Set volume
   */
  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.gainNode && this.oscillator) {
      this.gainNode.gain.setValueAtTime(
        this.volume * 0.1,
        this.audioContext.currentTime
      );
    }
  }

  /**
   * Toggle enable/disable
   */
  toggle() {
    this.isEnabled = !this.isEnabled;
    if (!this.isEnabled) {
      this.stop();
    }
    return this.isEnabled;
  }

  /**
   * Check if supported
   */
  static isSupported() {
    return 'AudioContext' in window || 'webkitAudioContext' in window;
  }
}
