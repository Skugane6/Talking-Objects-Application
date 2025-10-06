/**
 * Motion Detector - Detects significant changes between video frames
 */

export class MotionDetector {
  constructor(videoElement, canvasElement) {
    this.video = videoElement;
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d', { willReadFrequently: true });
    this.previousFrame = null;
    this.threshold = 30; // Pixel difference threshold
    this.minChangedPixels = 0.05; // 5% of pixels must change
  }

  /**
   * Capture and compare current frame with previous frame
   * @returns {boolean} True if significant motion detected
   */
  detectMotion() {
    if (!this.video.videoWidth || !this.video.videoHeight) {
      return false;
    }

    // Set canvas size to match video (downsample for performance)
    const scale = 0.25; // Process at 25% resolution for speed
    this.canvas.width = this.video.videoWidth * scale;
    this.canvas.height = this.video.videoHeight * scale;

    // Draw current frame
    this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
    const currentFrame = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);

    // First frame - no previous data to compare
    if (!this.previousFrame) {
      this.previousFrame = currentFrame;
      return true; // Treat first frame as motion
    }

    // Calculate pixel differences
    const motionDetected = this.compareFrames(currentFrame, this.previousFrame);

    // Store current frame for next comparison
    this.previousFrame = currentFrame;

    return motionDetected;
  }

  /**
   * Compare two frames and determine if motion occurred
   */
  compareFrames(current, previous) {
    const currentData = current.data;
    const previousData = previous.data;
    let changedPixels = 0;
    let totalChange = 0;
    const totalPixels = currentData.length / 4;

    // Compare each pixel (checking only red channel for speed)
    for (let i = 0; i < currentData.length; i += 4) {
      const diff = Math.abs(currentData[i] - previousData[i]);
      totalChange += diff;

      if (diff > this.threshold) {
        changedPixels++;
      }
    }

    const changePercentage = changedPixels / totalPixels;
    const avgChange = totalChange / totalPixels;

    // Motion detected if either:
    // 1. Enough pixels changed (normal motion)
    // 2. Average change is significant (new object with different colors)
    return changePercentage > this.minChangedPixels || avgChange > 25;
  }

  /**
   * Reset motion detector (useful when restarting)
   */
  reset() {
    this.previousFrame = null;
  }

  /**
   * Adjust sensitivity
   * @param {number} sensitivity - Value between 1-10 (10 = most sensitive)
   */
  setSensitivity(sensitivity) {
    // Higher sensitivity = lower threshold
    this.threshold = 50 - (sensitivity * 4);
    this.minChangedPixels = 0.02 + (sensitivity * 0.003);
  }
}