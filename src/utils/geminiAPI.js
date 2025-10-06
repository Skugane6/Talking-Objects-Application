/**
 * Gemini API Integration - Handles vision and text generation
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

export class GeminiVision {
  constructor(apiKey) {
    if (!apiKey || apiKey === 'your_api_key_here') {
      throw new Error('Please set your Gemini API key in the .env file');
    }

    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({
      model: "gemini-2.0-flash-exp",
      generationConfig: {
        temperature: 0.9,
        maxOutputTokens: 80, // Keep responses very short to save TTS credits
      }
    });

    this.conversationHistory = [];
    this.maxHistoryLength = 5;
    this.currentObject = null;
  }

  /**
   * Analyze image and generate object's response
   * @param {string} imageDataUrl - Base64 encoded image
   * @param {string} personality - Personality style
   * @returns {Promise<{object: string, response: string}>}
   */
  async analyzeAndRespond(imageDataUrl, personality = 'playful') {
    try {
      // Convert data URL to format Gemini expects
      const base64Data = imageDataUrl.split(',')[1];

      const imagePart = {
        inlineData: {
          data: base64Data,
          mimeType: 'image/jpeg'
        }
      };

      // Build context-aware prompt
      const prompt = this.buildPrompt(personality);

      // Generate response
      const result = await this.model.generateContent([prompt, imagePart]);
      const response = await result.response;
      const text = response.text();

      // Parse response to extract object identity and dialogue
      const parsed = this.parseResponse(text);

      // Update conversation history
      this.updateHistory(parsed.response);

      // Update current object
      if (parsed.object) {
        this.currentObject = parsed.object;
      }

      return parsed;

    } catch (error) {
      console.error('Gemini API error:', error);
      // Fallback to "the void" instead of throwing error
      const voidResponse = {
        object: '🌌 The Void',
        response: this.getVoidResponse()
      };

      // Update conversation history and current object
      this.updateHistory(voidResponse.response);
      this.currentObject = voidResponse.object;

      return voidResponse;
    }
  }

  /**
   * Get a random void response for when analysis fails
   */
  getVoidResponse() {
    const voidResponses = [
      "Nothing but darkness... or is there?",
      "Ah, the emptiness embraces me again.",
      "I see everything and nothing at once.",
      "The void whispers secrets only I can hear.",
      "In darkness, I find myself.",
      "Between existence and nothingness, here I am.",
      "The shadows are my companions.",
      "What lies beyond the black? I wonder...",
      "In this nothingness, I am everything.",
      "The abyss stares back, and I stare harder."
    ];
    return voidResponses[Math.floor(Math.random() * voidResponses.length)];
  }

  /**
   * Build personality-aware prompt
   */
  buildPrompt(personality) {
    const personalityTraits = {
      playful: "You are playful, curious, and love to make observations about your surroundings. You're friendly and slightly mischievous.",
      grumpy: "You are grumpy, sarcastic, and tired of being an object. You complain about things but in a funny way.",
      wise: "You are wise, philosophical, and offer thoughtful observations about life and existence.",
      excited: "You are extremely excited and energetic! Everything amazes you! You use lots of enthusiasm!",
      chill: "You are super laid-back and chill. Nothing bothers you. You speak like a relaxed surfer dude."
    };

    const trait = personalityTraits[personality] || personalityTraits.playful;

    let prompt = `You are an AI that brings objects to life. Look at this image and:

1. Identify the MAIN object in the center/foreground
2. Speak AS that object in first-person
3. React to what you see around you in ONE SHORT sentence (10-15 words max)

Personality: ${trait}

Format your response EXACTLY like this:
OBJECT: [name of object with emoji]
SPEECH: [ONE SHORT punchy sentence]

${this.getContextPrompt()}

Be observant, reactive, and fun! Keep it VERY SHORT (one sentence, 10-15 words).`;

    return prompt;
  }

  /**
   * Get context from conversation history
   */
  getContextPrompt() {
    if (this.conversationHistory.length === 0) {
      return "This is your first time being seen. Introduce yourself with excitement or personality!";
    }

    const recentHistory = this.conversationHistory.slice(-3).join(' ');
    return `Recent things you've said: "${recentHistory}"\n\nBuild on this or notice NEW things around you. If the scene changed drastically, react to it!`;
  }

  /**
   * Parse Gemini's response
   */
  parseResponse(text) {
    const lines = text.trim().split('\n');
    let object = null;
    let response = text;

    for (const line of lines) {
      if (line.startsWith('OBJECT:')) {
        object = line.replace('OBJECT:', '').trim();
      } else if (line.startsWith('SPEECH:')) {
        response = line.replace('SPEECH:', '').trim();
      }
    }

    // Fallback if parsing fails
    if (!object) {
      object = this.currentObject || '📦 Mysterious Object';
    }

    // Clean up response
    response = response.replace(/^(OBJECT:|SPEECH:)/gi, '').trim();

    return { object, response };
  }

  /**
   * Update conversation history
   */
  updateHistory(message) {
    this.conversationHistory.push(message);

    // Keep history size manageable
    if (this.conversationHistory.length > this.maxHistoryLength) {
      this.conversationHistory.shift();
    }
  }

  /**
   * Reset conversation history
   */
  resetHistory() {
    this.conversationHistory = [];
    this.currentObject = null;
  }

  /**
   * Get current object identity
   */
  getCurrentObject() {
    return this.currentObject || '📦 Unknown Object';
  }

  /**
   * Check if detected object is different from current object
   */
  isNewObject(detectedObject) {
    if (!this.currentObject) return true;

    // Normalize object names for comparison (remove emojis, lowercase)
    const normalize = (str) => str.replace(/[^\w\s]/gi, '').trim().toLowerCase();
    const current = normalize(this.currentObject);
    const detected = normalize(detectedObject);

    return current !== detected;
  }
}