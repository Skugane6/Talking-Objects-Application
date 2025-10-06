/**
 * Smart Caching System - Minimize API calls
 */

export class ResponseCache {
  constructor(maxSize = 20, ttl = 300000) { // 5 minutes TTL
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttl = ttl; // Time to live in milliseconds
  }

  /**
   * Generate cache key from image data
   * Uses a simple hash of image data
   */
  generateKey(imageData) {
    // Take samples from different parts of the image
    const samples = [
      imageData.slice(100, 120),
      imageData.slice(1000, 1020),
      imageData.slice(5000, 5020),
      imageData.slice(10000, 10020)
    ].join('');

    // Simple hash function
    let hash = 0;
    for (let i = 0; i < samples.length; i++) {
      const char = samples.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return hash.toString(36);
  }

  /**
   * Get cached response if available and not expired
   */
  get(imageData) {
    const key = this.generateKey(imageData);
    const cached = this.cache.get(key);

    if (!cached) {
      return null;
    }

    // Check if expired
    const age = Date.now() - cached.timestamp;
    if (age > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  /**
   * Store response in cache
   */
  set(imageData, data) {
    const key = this.generateKey(imageData);

    // Implement LRU: Remove oldest if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Clear cache
   */
  clear() {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      ttl: this.ttl
    };
  }
}

/**
 * Frame Similarity Detector - Skip similar frames
 */
export class FrameSimilarityDetector {
  constructor(threshold = 0.92) {
    this.previousFrameHash = null;
    this.threshold = threshold; // 92% similarity = skip
  }

  /**
   * Calculate perceptual hash of frame
   */
  calculateHash(imageData) {
    // Extract base64 data
    const base64 = imageData.split(',')[1];

    // Sample every Nth character for speed
    const step = Math.floor(base64.length / 100);
    let hash = '';

    for (let i = 0; i < base64.length; i += step) {
      hash += base64[i];
    }

    return hash;
  }

  /**
   * Calculate similarity between two hashes
   */
  calculateSimilarity(hash1, hash2) {
    if (!hash1 || !hash2 || hash1.length !== hash2.length) {
      return 0;
    }

    let matches = 0;
    for (let i = 0; i < hash1.length; i++) {
      if (hash1[i] === hash2[i]) {
        matches++;
      }
    }

    return matches / hash1.length;
  }

  /**
   * Check if frame is similar to previous frame
   * Returns false if frame is different enough to analyze
   */
  isSimilar(imageData) {
    const currentHash = this.calculateHash(imageData);

    if (!this.previousFrameHash) {
      this.previousFrameHash = currentHash;
      return false; // First frame, not similar
    }

    const similarity = this.calculateSimilarity(this.previousFrameHash, currentHash);

    // Only update hash if frames are similar (to detect rapid changes)
    if (similarity >= this.threshold) {
      this.previousFrameHash = currentHash;
      return true;
    }

    // Significant change detected - reset hash for next comparison
    this.previousFrameHash = currentHash;
    return false;
  }

  /**
   * Reset detector
   */
  reset() {
    this.previousFrameHash = null;
  }
}

/**
 * Rate Limiter - Prevent API abuse
 */
export class RateLimiter {
  constructor(maxRequests = 10, timeWindow = 60000) { // 10 requests per minute
    this.maxRequests = maxRequests;
    this.timeWindow = timeWindow;
    this.requests = [];
  }

  /**
   * Check if request is allowed
   */
  canMakeRequest() {
    const now = Date.now();

    // Remove old requests outside the time window
    this.requests = this.requests.filter(timestamp => now - timestamp < this.timeWindow);

    // Check if under limit
    if (this.requests.length >= this.maxRequests) {
      return false;
    }

    // Add current request
    this.requests.push(now);
    return true;
  }

  /**
   * Get time until next request is allowed
   */
  getTimeUntilNextRequest() {
    if (this.requests.length < this.maxRequests) {
      return 0;
    }

    const oldestRequest = this.requests[0];
    const timeElapsed = Date.now() - oldestRequest;
    return Math.max(0, this.timeWindow - timeElapsed);
  }

  /**
   * Reset rate limiter
   */
  reset() {
    this.requests = [];
  }
}