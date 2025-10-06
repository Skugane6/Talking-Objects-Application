/**
 * Text-to-Speech Module - Uses ElevenLabs API with Web Speech API fallback
 */

export class TextToSpeech {
  constructor() {
    this.synth = window.speechSynthesis;
    this.currentUtterance = null;
    this.isSpeaking = false;
    this.voice = null;
    this.voiceMap = {};
    this.currentAudio = null;
    this.audioContext = null;
    this.currentBlobUrl = null; // Track blob URL for cleanup

    // ElevenLabs API config
    this.elevenLabsApiKey = import.meta.env.VITE_ELEVENLABS_API_KEY;
    this.useElevenLabs = !!this.elevenLabsApiKey;

    console.log('ElevenLabs API Key loaded:', this.useElevenLabs ? 'YES' : 'NO');
    if (this.useElevenLabs) {
      console.log('Will use ElevenLabs for TTS');
    }

    // ElevenLabs voice IDs (free tier voices)
    this.elevenLabsVoices = {
      default: 'XB0fDUnXU5powFXDhCwa', // Charlotte - British female
      female: 'XB0fDUnXU5powFXDhCwa', // Charlotte - British female
      male: 'XB0fDUnXU5powFXDhCwa', // Charlotte - British female (using same for consistency)
      robot: 'XB0fDUnXU5powFXDhCwa' // Charlotte - British female (using same for consistency)
    };

    // Initialize fallback voices
    this.initVoices();

    // Initialize audio context for mobile Safari
    this.initAudioContext();
  }

  /**
   * Initialize audio context for mobile Safari compatibility
   */
  initAudioContext() {
    try {
      // Create AudioContext on first user interaction (handled by browser)
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.audioContext = new AudioContext();
      }
    } catch (error) {
      console.warn('AudioContext not supported:', error);
    }
  }

  /**
   * Resume audio context (required for mobile Safari)
   */
  async resumeAudioContext() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume();
        console.log('AudioContext resumed');
      } catch (error) {
        console.warn('Failed to resume AudioContext:', error);
      }
    }
  }

  /**
   * Initialize audio element on user interaction (for iOS)
   * Call this on the start button click
   */
  initAudioOnUserGesture() {
    // Create audio element if it doesn't exist
    if (!this.currentAudio) {
      this.currentAudio = new Audio();
      this.currentAudio.preload = 'auto';
      this.currentAudio.playsInline = true; // Critical for iOS

      // Play silent audio to unlock iOS audio
      const silentAudio = 'data:audio/mp3;base64,SUQzBAAAAAABEVRYWFgAAAAtAAADY29tbWVudABCaWdTb3VuZEJhbmsuY29tIC8gTGFTb25vdGhlcXVlLm9yZwBURU5DAAAAHQAAA1N3aXRjaCBQbHVzIMKpIE5DSCBTb2Z0d2FyZQBUSVQyAAAABgAAAzIyMzUAVFNTRQAAAA8AAANMYXZmNTcuODMuMTAwAAAAAAAAAAAAAAD/80DEAAAAA0gAAAAATEFNRTMuMTAwVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQsRbAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQMSkAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV';
      this.currentAudio.src = silentAudio;

      this.currentAudio.play().then(() => {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
        console.log('Audio unlocked for iOS');
      }).catch(e => {
        console.log('Audio unlock not needed or failed:', e);
      });
    }

    // Resume audio context
    this.resumeAudioContext();
  }

  /**
   * Initialize and categorize available voices
   */
  initVoices() {
    const loadVoices = () => {
      const voices = this.synth.getVoices();

      // Categorize voices by characteristics, prioritizing natural-sounding voices
      this.voiceMap = {
        default: voices.find(v => v.default) || voices[0],
        female: voices.find(v =>
          v.name.includes('Samantha') ||
          v.name.includes('Victoria') ||
          v.name.includes('Fiona') ||
          v.name.includes('Karen') ||
          (v.name.includes('female') && v.lang.startsWith('en'))
        ),
        male: voices.find(v =>
          v.name.includes('Daniel') ||
          v.name.includes('Alex') ||
          v.name.includes('Fred') ||
          v.name.includes('Tom') ||
          (v.name.includes('male') && v.lang.startsWith('en'))
        ),
        robot: voices.find(v => v.name.includes('Albert') || v.name.includes('Bad News')),
      };

      // Set default voice to a natural English voice if available
      const preferredVoice = voices.find(v =>
        (v.lang.startsWith('en-US') || v.lang.startsWith('en-GB')) &&
        (v.name.includes('Google') || v.name.includes('Microsoft') || v.name.includes('Samantha') || v.name.includes('Daniel'))
      );
      this.voice = preferredVoice || this.voiceMap.default;
    };

    // Voices load asynchronously
    if (this.synth.getVoices().length > 0) {
      loadVoices();
    }

    this.synth.addEventListener('voiceschanged', loadVoices);
  }

  /**
   * Remove emojis from text
   * @param {string} text - Text to clean
   * @returns {string} - Text without emojis
   */
  removeEmojis(text) {
    // Remove all emojis using comprehensive regex
    return text.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{2300}-\u{23FF}\u{2B50}\u{2B55}\u{231A}\u{231B}\u{2328}\u{23CF}\u{23E9}-\u{23F3}\u{23F8}-\u{23FA}\u{25AA}\u{25AB}\u{25B6}\u{25C0}\u{25FB}-\u{25FE}\u{2934}\u{2935}\u{2B05}-\u{2B07}\u{2B1B}\u{2B1C}\u{3030}\u{303D}\u{3297}\u{3299}\u{FE0F}\u{200D}]/gu, '');
  }

  /**
   * Speak text with personality-based voice selection
   * @param {string} text - Text to speak
   * @param {string} objectType - Type of object (to select appropriate voice)
   */
  async speak(text, objectType = '') {
    // Cancel current speech if any
    if (this.isSpeaking) {
      this.stop();
    }

    // Remove emojis from text before speaking
    const cleanText = this.removeEmojis(text).trim();

    // If text is empty after cleaning, reject
    if (!cleanText) {
      return Promise.resolve();
    }

    // Try ElevenLabs first, only fallback if quota is exhausted
    if (this.useElevenLabs) {
      try {
        return await this.speakWithElevenLabs(cleanText, objectType);
      } catch (error) {
        // Only fallback to Web Speech API if quota is exhausted
        if (error.isQuotaError) {
          console.warn('ElevenLabs quota exhausted, falling back to Web Speech API');
          this.useElevenLabs = false; // Disable for rest of session
          return await this.speakWithWebAPI(cleanText, objectType);
        }
        // For other errors (network, etc), throw to let caller retry
        throw error;
      }
    } else {
      return await this.speakWithWebAPI(cleanText, objectType);
    }
  }

  /**
   * Speak using ElevenLabs API
   */
  async speakWithElevenLabs(text, objectType = '') {
    const voiceId = this.selectElevenLabsVoice(objectType);

    return new Promise(async (resolve, reject) => {
      try {
        // Resume audio context for mobile Safari
        await this.resumeAudioContext();

        // Stop and clean up any existing audio
        if (this.currentAudio) {
          this.currentAudio.pause();
          this.currentAudio.currentTime = 0;
        }

        // Clean up previous blob URL to prevent memory leak
        if (this.currentBlobUrl) {
          URL.revokeObjectURL(this.currentBlobUrl);
          this.currentBlobUrl = null;
        }

        this.isSpeaking = true;

        console.log('Calling ElevenLabs API with voice:', voiceId);

        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
          method: 'POST',
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': this.elevenLabsApiKey.trim()
          },
          body: JSON.stringify({
            text: text,
            model_id: 'eleven_turbo_v2_5',
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75,
              style: 0.0,
              use_speaker_boost: true
            }
          })
        });

        console.log('ElevenLabs response status:', response.status);

        if (!response.ok) {
          // Check if it's a quota error (401 for invalid key, 429 for rate limit, 403 for quota exceeded)
          if (response.status === 401 || response.status === 403 || response.status === 429) {
            let errorMessage = 'Quota exceeded';

            try {
              const errorData = await response.json();
              errorMessage = errorData.detail?.message || errorData.message || errorMessage;
            } catch (e) {
              // If JSON parsing fails, use status code
            }

            // Check if quota is exhausted (not just rate limited)
            if (errorMessage.toLowerCase().includes('quota') ||
                errorMessage.toLowerCase().includes('character limit') ||
                errorMessage.toLowerCase().includes('insufficient') ||
                response.status === 401) {
              const quotaError = new Error(`ElevenLabs quota exhausted: ${errorMessage}`);
              quotaError.isQuotaError = true;
              throw quotaError;
            }
          }

          // Other errors - could be temporary
          throw new Error(`ElevenLabs API error: ${response.status}`);
        }

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);

        // Store blob URL for cleanup
        this.currentBlobUrl = audioUrl;

        // Reuse or create audio element
        if (!this.currentAudio) {
          this.currentAudio = new Audio();
          this.currentAudio.preload = 'auto';
          this.currentAudio.playsInline = true; // Critical for iOS
        }

        this.currentAudio.src = audioUrl;

        this.currentAudio.onended = () => {
          this.isSpeaking = false;
          // Clean up blob URL
          if (this.currentBlobUrl) {
            URL.revokeObjectURL(this.currentBlobUrl);
            this.currentBlobUrl = null;
          }
          resolve();
        };

        this.currentAudio.onerror = (error) => {
          console.error('Audio playback error:', error);
          this.isSpeaking = false;
          // Clean up blob URL
          if (this.currentBlobUrl) {
            URL.revokeObjectURL(this.currentBlobUrl);
            this.currentBlobUrl = null;
          }
          reject(error);
        };

        // Mobile Safari: load before play
        await this.currentAudio.load();

        // Play with error handling for mobile
        try {
          await this.currentAudio.play();
        } catch (playError) {
          console.error('Play failed:', playError);
          this.isSpeaking = false;
          // Clean up blob URL
          if (this.currentBlobUrl) {
            URL.revokeObjectURL(this.currentBlobUrl);
            this.currentBlobUrl = null;
          }
          reject(playError);
        }
      } catch (error) {
        this.isSpeaking = false;
        // Clean up blob URL on error
        if (this.currentBlobUrl) {
          URL.revokeObjectURL(this.currentBlobUrl);
          this.currentBlobUrl = null;
        }
        reject(error);
      }
    });
  }

  /**
   * Speak using Web Speech API (fallback)
   */
  async speakWithWebAPI(text, objectType = '') {
    return new Promise((resolve, reject) => {
      // Fix for Chrome/Safari bug where speechSynthesis stops working
      // Cancel any pending utterances and resume if paused
      if (this.synth.speaking || this.synth.pending) {
        this.synth.cancel();
      }

      // Resume if paused (common issue on mobile)
      if (this.synth.paused) {
        this.synth.resume();
      }

      const utterance = new SpeechSynthesisUtterance(text);

      // Select voice based on object type
      utterance.voice = this.selectVoiceForObject(objectType);

      // Voice parameters for more natural speech
      utterance.rate = 0.95;
      utterance.pitch = this.selectPitchForObject(objectType);
      utterance.volume = 1.0;

      // Event handlers
      utterance.onstart = () => {
        this.isSpeaking = true;
        this.currentUtterance = utterance;
      };

      utterance.onend = () => {
        this.isSpeaking = false;
        this.currentUtterance = null;
        resolve();
      };

      utterance.onerror = (event) => {
        console.error('Speech error:', event);
        this.isSpeaking = false;
        this.currentUtterance = null;

        // If error is 'interrupted' or 'canceled', still resolve (not an actual error)
        if (event.error === 'interrupted' || event.error === 'canceled') {
          resolve();
        } else {
          reject(event);
        }
      };

      // Speak
      this.synth.speak(utterance);

      // Workaround for Chrome bug: force resume after a brief delay
      setTimeout(() => {
        if (this.synth.paused) {
          this.synth.resume();
        }
      }, 100);
    });
  }

  /**
   * Select ElevenLabs voice based on object type
   */
  selectElevenLabsVoice(objectType) {
    const type = objectType.toLowerCase();

    // Robots, electronics, machines
    if (type.includes('robot') || type.includes('computer') || type.includes('phone')) {
      return this.elevenLabsVoices.robot;
    }

    // Soft objects, toys, cute things
    if (type.includes('teddy') || type.includes('toy') || type.includes('pillow') || type.includes('plush')) {
      return this.elevenLabsVoices.female;
    }

    // Tools, sports equipment, tough objects
    if (type.includes('hammer') || type.includes('tool') || type.includes('ball') || type.includes('equipment')) {
      return this.elevenLabsVoices.male;
    }

    return this.elevenLabsVoices.default;
  }

  /**
   * Select appropriate voice based on object type
   */
  selectVoiceForObject(objectType) {
    const type = objectType.toLowerCase();

    // Robots, electronics, machines
    if (type.includes('robot') || type.includes('computer') || type.includes('phone')) {
      return this.voiceMap.robot || this.voiceMap.male || this.voiceMap.default;
    }

    // Soft objects, toys, cute things
    if (type.includes('teddy') || type.includes('toy') || type.includes('pillow') || type.includes('plush')) {
      return this.voiceMap.female || this.voiceMap.default;
    }

    // Tools, sports equipment, tough objects
    if (type.includes('hammer') || type.includes('tool') || type.includes('ball') || type.includes('equipment')) {
      return this.voiceMap.male || this.voiceMap.default;
    }

    return this.voiceMap.default;
  }

  /**
   * Select pitch based on object type
   */
  selectPitchForObject(objectType) {
    const type = objectType.toLowerCase();

    // Small, cute objects = higher pitch
    if (type.includes('toy') || type.includes('small') || type.includes('cute')) {
      return 1.3;
    }

    // Large, heavy objects = lower pitch
    if (type.includes('heavy') || type.includes('machine') || type.includes('furniture')) {
      return 0.8;
    }

    return 1.0; // Normal pitch
  }

  /**
   * Stop current speech
   */
  stop() {
    // Stop ElevenLabs audio
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      // Don't set to null - reuse the element
    }

    // Clean up blob URL
    if (this.currentBlobUrl) {
      URL.revokeObjectURL(this.currentBlobUrl);
      this.currentBlobUrl = null;
    }

    // Stop Web Speech API
    if (this.synth.speaking) {
      this.synth.cancel();
      this.currentUtterance = null;
    }

    this.isSpeaking = false;
  }

  /**
   * Check if TTS is supported
   */
  static isSupported() {
    return 'speechSynthesis' in window;
  }

  /**
   * Get speaking status
   */
  getSpeakingStatus() {
    return this.isSpeaking;
  }
}