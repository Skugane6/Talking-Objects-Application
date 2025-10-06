/**
 * Camera Module - Handles camera access and video streaming
 */

export class CameraManager {
  constructor(videoElement) {
    this.video = videoElement;
    this.stream = null;
    this.isActive = false;
  }

  /**
   * Initialize camera with mobile-optimized settings
   */
  async start() {
    try {
      // Mobile-optimized constraints
      const constraints = {
        video: {
          facingMode: 'environment', // Use back camera on mobile
          width: { ideal: 1280 },
          height: { ideal: 720 },
          aspectRatio: { ideal: 16/9 }
        },
        audio: false
      };

      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.video.srcObject = this.stream;
      this.isActive = true;

      // Wait for video to be ready
      await new Promise((resolve) => {
        this.video.onloadedmetadata = () => {
          resolve();
        };
      });

      return true;
    } catch (error) {
      console.error('Camera access error:', error);
      throw new Error(this.getCameraErrorMessage(error));
    }
  }

  /**
   * Stop camera stream
   */
  stop() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
      this.video.srcObject = null;
      this.isActive = false;
    }
  }

  /**
   * Capture current frame as base64 image
   */
  captureFrame(maxWidth = 800) {
    if (!this.isActive) {
      throw new Error('Camera is not active');
    }

    const canvas = document.createElement('canvas');
    const video = this.video;

    // Calculate dimensions maintaining aspect ratio
    const scale = Math.min(maxWidth / video.videoWidth, 1);
    canvas.width = video.videoWidth * scale;
    canvas.height = video.videoHeight * scale;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Return base64 data URL with reduced quality for API efficiency
    return canvas.toDataURL('image/jpeg', 0.8);
  }

  /**
   * Get user-friendly camera error messages
   */
  getCameraErrorMessage(error) {
    if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
      return 'Camera permission denied. Please allow camera access and try again.';
    } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
      return 'No camera found on this device.';
    } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
      return 'Camera is already in use by another application.';
    } else {
      return 'Unable to access camera. Please check your browser settings.';
    }
  }

  /**
   * Check if camera API is supported
   */
  static isSupported() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }
}