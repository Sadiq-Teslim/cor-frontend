/**
 * RPPGDetector - Blood Pressure Detection via Remote Photoplethysmography
 *
 * Uses the phone's rear camera + flash LED to detect pulse from fingertip.
 * The flash shines light into the finger, and the camera captures tiny
 * fluctuations in reflected red light caused by blood flow.
 */

export interface RPPGResult {
  heartRate: number;
  hrv: number;
  confidence: number;
}

export class RPPGDetector {
  private video: HTMLVideoElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null;
  private stream: MediaStream | null = null;
  private raf: number | null = null;
  private redSamples: number[] = [];
  private timestamps: number[] = [];
  private running = false;
  private onSignalUpdate?: (strength: number) => void;

  constructor(
    video: HTMLVideoElement,
    canvas: HTMLCanvasElement,
    onSignalUpdate?: (strength: number) => void,
  ) {
    this.video = video;
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.onSignalUpdate = onSignalUpdate;
  }

  /**
   * Start capturing video from rear camera with torch enabled
   */
  async start(): Promise<void> {
    if (this.running) return;

    try {
      // Request rear camera with low resolution (faster processing)
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 320 },
          height: { ideal: 240 },
        },
        audio: false,
      });

      const track = this.stream.getVideoTracks()[0];

      // Try to enable torch (flash LED) for better signal
      try {
        await (track as any).applyConstraints({
          advanced: [{ torch: true }],
        });
      } catch {
        // Torch unavailable — still works but weaker signal
        console.warn("Torch not available on this device");
      }

      this.video.srcObject = this.stream;
      await this.video.play();

      this.redSamples = [];
      this.timestamps = [];
      this.running = true;
      this.loop();
    } catch (error) {
      console.error("Failed to start camera:", error);
      throw new Error("Camera access denied or unavailable");
    }
  }

  /**
   * Stop capturing and release camera
   */
  stop(): void {
    this.running = false;

    if (this.raf) {
      cancelAnimationFrame(this.raf);
      this.raf = null;
    }

    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }

    this.video.srcObject = null;
  }

  /**
   * Check if camera is currently capturing
   */
  isRunning(): boolean {
    return this.running;
  }

  /**
   * Get current signal strength (0-1)
   * Higher = better finger placement, stronger pulse signal
   */
  getSignalStrength(): number {
    if (this.redSamples.length < 60) return 0;

    const recent = this.redSamples.slice(-60);
    const mean = recent.reduce((a, b) => a + b, 0) / recent.length;
    const variance =
      recent.reduce((s, v) => s + (v - mean) ** 2, 0) / recent.length;

    // Normalize variance to 0-1 range
    return Math.min(1, Math.sqrt(variance) / 12);
  }

  /**
   * Get number of samples collected so far
   */
  getSampleCount(): number {
    return this.redSamples.length;
  }

  /**
   * Check if enough samples have been collected for analysis
   */
  hasEnoughSamples(): boolean {
    return this.redSamples.length >= 150;
  }

  /**
   * Get HR and HRV result from collected samples
   * Returns null if not enough data or invalid readings
   */
  getResult(): RPPGResult | null {
    if (this.redSamples.length < 150) return null;

    const peaks = this.findPeaks(this.redSamples);
    if (peaks.length < 4) return null;

    // Calculate peak-to-peak intervals in milliseconds
    const intervals: number[] = [];
    for (let i = 1; i < peaks.length; i++) {
      intervals.push(this.timestamps[peaks[i]] - this.timestamps[peaks[i - 1]]);
    }

    // Heart Rate (BPM) from average interval
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const heartRate = Math.round(60000 / avgInterval);

    // HRV — RMSSD (Root Mean Square of Successive Differences)
    let sumSqDiff = 0;
    for (let i = 1; i < intervals.length; i++) {
      sumSqDiff += (intervals[i] - intervals[i - 1]) ** 2;
    }
    const hrv = Math.round(Math.sqrt(sumSqDiff / (intervals.length - 1)));

    // Calculate confidence based on signal variance
    const mean =
      this.redSamples.reduce((a, b) => a + b, 0) / this.redSamples.length;
    const variance =
      this.redSamples.reduce((s, v) => s + (v - mean) ** 2, 0) /
      this.redSamples.length;
    const confidence = Math.min(1, Math.sqrt(variance) / 15);

    // Sanity checks — reject impossible values
    if (heartRate < 40 || heartRate > 200) return null;
    if (hrv < 0 || hrv > 300) return null;

    return { heartRate, hrv, confidence };
  }

  /**
   * Main capture loop - samples red channel from video frames
   */
  private loop = (): void => {
    if (!this.running || !this.ctx) return;

    const { videoWidth, videoHeight } = this.video;

    // Wait for video to be ready
    if (videoWidth === 0) {
      this.raf = requestAnimationFrame(this.loop);
      return;
    }

    // Set canvas size to match video
    this.canvas.width = videoWidth;
    this.canvas.height = videoHeight;

    // Draw current frame to canvas
    this.ctx.drawImage(this.video, 0, 0);

    // Sample center region (where finger covers camera)
    const cx = Math.floor(videoWidth / 2);
    const cy = Math.floor(videoHeight / 2);
    const size = Math.min(videoWidth, videoHeight, 80); // 80×80 center patch

    const data = this.ctx.getImageData(
      cx - size / 2,
      cy - size / 2,
      size,
      size,
    ).data;

    // Calculate average red channel value
    let redSum = 0;
    const pixelCount = data.length / 4;
    for (let i = 0; i < data.length; i += 4) {
      redSum += data[i]; // index 0 = Red channel
    }

    const avgRed = redSum / pixelCount;
    this.redSamples.push(avgRed);
    this.timestamps.push(performance.now());

    // Keep rolling buffer of last 600 samples (~20 seconds at 30fps)
    if (this.redSamples.length > 600) {
      this.redSamples.splice(0, 1);
      this.timestamps.splice(0, 1);
    }

    // Notify signal strength update
    if (this.onSignalUpdate) {
      this.onSignalUpdate(this.getSignalStrength());
    }

    this.raf = requestAnimationFrame(this.loop);
  };

  /**
   * Find peaks in signal for heart rate calculation
   */
  private findPeaks(signal: number[]): number[] {
    // Smooth signal with moving average (window = 5)
    const smoothed: number[] = [];
    for (let i = 0; i < signal.length; i++) {
      let sum = 0,
        count = 0;
      for (
        let j = Math.max(0, i - 5);
        j <= Math.min(signal.length - 1, i + 5);
        j++
      ) {
        sum += signal[j];
        count++;
      }
      smoothed.push(sum / count);
    }

    const mean = smoothed.reduce((a, b) => a + b, 0) / smoothed.length;
    const peaks: number[] = [];

    // Find local maxima above mean, with minimum 9-frame gap (max 200 BPM)
    for (let i = 2; i < smoothed.length - 2; i++) {
      if (
        smoothed[i] > mean &&
        smoothed[i] > smoothed[i - 1] &&
        smoothed[i] > smoothed[i - 2] &&
        smoothed[i] >= smoothed[i + 1] &&
        smoothed[i] >= smoothed[i + 2]
      ) {
        if (peaks.length === 0 || i - peaks[peaks.length - 1] > 9) {
          peaks.push(i);
        }
      }
    }

    return peaks;
  }
}

export default RPPGDetector;
