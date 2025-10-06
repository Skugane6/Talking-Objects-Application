/**
 * Object Detector - Detects object boundaries and outline for AR overlay
 */

export class ObjectDetector {
  constructor(videoElement) {
    this.video = videoElement;
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    this.objectBounds = null;
    this.edgeCanvas = document.createElement('canvas');
    this.edgeCtx = this.edgeCanvas.getContext('2d', { willReadFrequently: true });
  }

  /**
   * Detect object boundaries in the current frame
   * Uses edge detection and center-weighted analysis
   * @returns {Object|null} Object bounds {x, y, width, height, centerX, centerY}
   */
  detectObjectBounds() {
    if (!this.video.videoWidth || !this.video.videoHeight) {
      return null;
    }

    // Set canvas size (downsampled for performance)
    const scale = 0.5;
    this.canvas.width = this.video.videoWidth * scale;
    this.canvas.height = this.video.videoHeight * scale;
    this.edgeCanvas.width = this.canvas.width;
    this.edgeCanvas.height = this.canvas.height;

    // Draw current frame
    this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);

    // Apply edge detection
    const edges = this.detectEdges(imageData);

    // Find the primary object bounds (center-weighted)
    const bounds = this.findObjectBounds(edges);

    // Scale bounds back to original video dimensions
    if (bounds) {
      this.objectBounds = {
        x: bounds.x / scale,
        y: bounds.y / scale,
        width: bounds.width / scale,
        height: bounds.height / scale,
        centerX: bounds.centerX / scale,
        centerY: bounds.centerY / scale
      };
    }

    return this.objectBounds;
  }

  /**
   * Apply Sobel edge detection
   */
  detectEdges(imageData) {
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    const edges = new Uint8ClampedArray(width * height);

    // Sobel kernels
    const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
    const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let gx = 0;
        let gy = 0;

        // Apply kernels
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = ((y + ky) * width + (x + kx)) * 4;
            const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
            const kernelIdx = (ky + 1) * 3 + (kx + 1);

            gx += gray * sobelX[kernelIdx];
            gy += gray * sobelY[kernelIdx];
          }
        }

        // Calculate magnitude
        const magnitude = Math.sqrt(gx * gx + gy * gy);
        edges[y * width + x] = magnitude > 50 ? 255 : 0;
      }
    }

    return edges;
  }

  /**
   * Find object bounds from edge map using center-weighted detection
   */
  findObjectBounds(edges) {
    const width = this.canvas.width;
    const height = this.canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;

    // Find bounds of edge pixels, weighted towards center
    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;
    let edgeCount = 0;
    let weightedSumX = 0;
    let weightedSumY = 0;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (edges[y * width + x] > 0) {
          // Calculate distance from center
          const distX = Math.abs(x - centerX);
          const distY = Math.abs(y - centerY);
          const distFromCenter = Math.sqrt(distX * distX + distY * distY);

          // Weight edges closer to center more heavily
          const maxDist = Math.sqrt(centerX * centerX + centerY * centerY);
          const weight = 1 - (distFromCenter / maxDist);

          if (weight > 0.3) { // Only consider edges reasonably close to center
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);

            weightedSumX += x * weight;
            weightedSumY += y * weight;
            edgeCount += weight;
          }
        }
      }
    }

    // No object found
    if (edgeCount < 10) {
      // Fallback to center region
      return {
        x: width * 0.25,
        y: height * 0.25,
        width: width * 0.5,
        height: height * 0.5,
        centerX: centerX,
        centerY: centerY
      };
    }

    // Calculate weighted center
    const objCenterX = weightedSumX / edgeCount;
    const objCenterY = weightedSumY / edgeCount;

    // Add padding around detected bounds
    const padding = 20;
    minX = Math.max(0, minX - padding);
    minY = Math.max(0, minY - padding);
    maxX = Math.min(width, maxX + padding);
    maxY = Math.min(height, maxY + padding);

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
      centerX: objCenterX,
      centerY: objCenterY
    };
  }

  /**
   * Get outline points for particle spawning
   * @returns {Array} Array of {x, y} points along object outline
   */
  getOutlinePoints(numPoints = 20) {
    if (!this.objectBounds) {
      return [];
    }

    const points = [];
    const { x, y, width, height } = this.objectBounds;

    // Generate points around the perimeter
    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2;
      const px = x + width / 2 + Math.cos(angle) * (width / 2);
      const py = y + height / 2 + Math.sin(angle) * (height / 2);

      points.push({ x: px, y: py });
    }

    return points;
  }

  /**
   * Reset detector
   */
  reset() {
    this.objectBounds = null;
  }
}
