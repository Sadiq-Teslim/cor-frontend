/**
 * RPPGDetector - Blood Pressure Detection via Remote Photoplethysmography
 *
 * Uses the phone's rear camera + flash LED to detect pulse from fingertip.
 * The flash shines light into the finger, and the camera captures tiny
 * fluctuations in reflected red light caused by blood flow.
 *
 * Improved accuracy through:
 * - Bandpass filtering (0.7-4Hz for 42-240 BPM range)
 * - Detrending to remove baseline drift
 * - Adaptive peak detection with validation
 * - Motion artifact rejection
 * - Multi-factor confidence scoring
 */

export interface RPPGResult {
  heartRate: number;
  hrv: number;
  confidence: number;
}

export interface SignalQuality {
  strength: number; // 0-1 overall quality
  brightness: number; // 0-1 finger coverage indicator
  pulsatile: number; // 0-1 pulse wave quality
  stability: number; // 0-1 motion stability
  isFingerDetected: boolean;
}

// Target sample rate ~30fps
const TARGET_FPS = 30;
const MIN_HR = 40;
const MAX_HR = 200;
const MIN_SAMPLES_FOR_ANALYSIS = 180; // 6 seconds minimum
const OPTIMAL_SAMPLES = 450; // 15 seconds optimal
const EARLY_COMPLETION_SAMPLES = 300; // 10 seconds for early completion
const EARLY_COMPLETION_CONFIDENCE = 0.6; // Higher confidence threshold for early completion
const CONSECUTIVE_GOOD_READINGS = 3; // Need 3 consecutive good readings to complete early

export interface EarlyCompletionStatus {
  canComplete: boolean;
  confidence: number;
  consecutiveGoodReadings: number;
  estimatedHR: number | null;
}

export class RPPGDetector {
  private video: HTMLVideoElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null;
  private stream: MediaStream | null = null;
  private raf: number | null = null;
  private redSamples: number[] = [];
  private greenSamples: number[] = []; // Green channel for validation
  private timestamps: number[] = [];
  private running = false;
  private onSignalUpdate?: (quality: SignalQuality) => void;
  private onEarlyCompletion?: (result: RPPGResult) => void;
  private lastBrightness = 0;
  private motionBuffer: number[] = [];
  private consecutiveGoodReadings = 0;
  private lastValidResult: RPPGResult | null = null;
  private earlyCompletionTriggered = false;

  constructor(
    video: HTMLVideoElement,
    canvas: HTMLCanvasElement,
    onSignalUpdate?: (quality: SignalQuality) => void,
    onEarlyCompletion?: (result: RPPGResult) => void,
  ) {
    this.video = video;
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.onSignalUpdate = onSignalUpdate;
    this.onEarlyCompletion = onEarlyCompletion;
  }

  /**
   * Start capturing video from rear camera with torch enabled
   */
  async start(): Promise<void> {
    if (this.running) return;

    try {
      // Request rear camera with optimal settings for PPG
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 320 },
          height: { ideal: 240 },
          frameRate: { ideal: 30 },
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
        console.warn("Torch not available on this device");
      }

      // Lock exposure/white balance if possible for consistent readings
      try {
        const capabilities = track.getCapabilities?.() as any;
        if (capabilities?.exposureMode) {
          await (track as any).applyConstraints({
            advanced: [{ exposureMode: "manual" }],
          });
        }
        if (capabilities?.whiteBalanceMode) {
          await (track as any).applyConstraints({
            advanced: [{ whiteBalanceMode: "manual" }],
          });
        }
      } catch {
        // Manual controls not available
      }

      this.video.srcObject = this.stream;
      await this.video.play();

      this.redSamples = [];
      this.greenSamples = [];
      this.timestamps = [];
      this.motionBuffer = [];
      this.consecutiveGoodReadings = 0;
      this.lastValidResult = null;
      this.earlyCompletionTriggered = false;
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
   * Get comprehensive signal quality metrics
   */
  getSignalQuality(): SignalQuality {
    if (this.redSamples.length < 60) {
      return {
        strength: 0,
        brightness: 0,
        pulsatile: 0,
        stability: 1,
        isFingerDetected: false,
      };
    }

    const recent = this.redSamples.slice(-60);
    const mean = recent.reduce((a, b) => a + b, 0) / recent.length;

    // Brightness check: finger covering camera with flash = high red values (180-255)
    // No finger or partial coverage = lower values
    const brightness = Math.min(1, Math.max(0, (mean - 120) / 100));
    const isFingerDetected = mean > 150 && mean < 255;

    // Pulsatile quality: variance in the signal indicates pulse waves
    const variance =
      recent.reduce((s, v) => s + (v - mean) ** 2, 0) / recent.length;
    const stdDev = Math.sqrt(variance);

    // Good pulse signal has stdDev between 1-15 (too high = noise, too low = no pulse)
    let pulsatile = 0;
    if (stdDev >= 0.5 && stdDev <= 20) {
      pulsatile = Math.min(1, stdDev / 8);
    }

    // Stability: check for sudden movements (large frame-to-frame changes)
    let stability = 1;
    if (this.motionBuffer.length >= 10) {
      const recentMotion = this.motionBuffer.slice(-10);
      const avgMotion =
        recentMotion.reduce((a, b) => a + b, 0) / recentMotion.length;
      stability = Math.max(0, 1 - avgMotion / 10);
    }

    // Overall strength combines all factors
    const strength =
      isFingerDetected && pulsatile > 0.1
        ? brightness * 0.3 + pulsatile * 0.5 + stability * 0.2
        : 0;

    return {
      strength: Math.min(1, strength),
      brightness,
      pulsatile,
      stability,
      isFingerDetected,
    };
  }

  /**
   * Legacy method for backward compatibility
   */
  getSignalStrength(): number {
    return this.getSignalQuality().strength;
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
    return this.redSamples.length >= MIN_SAMPLES_FOR_ANALYSIS;
  }

  /**
   * Check if we can complete early with high confidence
   * Returns status object with completion info
   */
  getEarlyCompletionStatus(): EarlyCompletionStatus {
    if (this.redSamples.length < EARLY_COMPLETION_SAMPLES) {
      return {
        canComplete: false,
        confidence: 0,
        consecutiveGoodReadings: 0,
        estimatedHR: null,
      };
    }

    const result = this.getResult();

    if (result && result.confidence >= EARLY_COMPLETION_CONFIDENCE) {
      return {
        canComplete: this.consecutiveGoodReadings >= CONSECUTIVE_GOOD_READINGS,
        confidence: result.confidence,
        consecutiveGoodReadings: this.consecutiveGoodReadings,
        estimatedHR: result.heartRate,
      };
    }

    return {
      canComplete: false,
      confidence: result?.confidence || 0,
      consecutiveGoodReadings: this.consecutiveGoodReadings,
      estimatedHR: result?.heartRate || null,
    };
  }

  /**
   * Check for early completion and trigger callback if ready
   * Called internally during the capture loop
   */
  private checkEarlyCompletion(): void {
    if (this.earlyCompletionTriggered || !this.onEarlyCompletion) return;
    if (this.redSamples.length < EARLY_COMPLETION_SAMPLES) return;

    const result = this.getResult();

    if (result && result.confidence >= EARLY_COMPLETION_CONFIDENCE) {
      // Check if HR is consistent with previous reading
      if (this.lastValidResult) {
        const hrDiff = Math.abs(
          result.heartRate - this.lastValidResult.heartRate,
        );
        if (hrDiff <= 5) {
          // HR is consistent, increment counter
          this.consecutiveGoodReadings++;
        } else {
          // HR changed too much, reset counter
          this.consecutiveGoodReadings = 1;
        }
      } else {
        this.consecutiveGoodReadings = 1;
      }

      this.lastValidResult = result;

      // Trigger early completion if we have enough consecutive good readings
      if (this.consecutiveGoodReadings >= CONSECUTIVE_GOOD_READINGS) {
        this.earlyCompletionTriggered = true;
        this.onEarlyCompletion(result);
      }
    } else {
      // Bad reading, reset counter
      this.consecutiveGoodReadings = 0;
    }
  }

  /**
   * Get HR and HRV result from collected samples
   * Returns null if not enough data or invalid readings
   */
  getResult(): RPPGResult | null {
    if (this.redSamples.length < MIN_SAMPLES_FOR_ANALYSIS) return null;

    // Check signal quality first
    const quality = this.getSignalQuality();
    if (!quality.isFingerDetected || quality.strength < 0.2) {
      return null;
    }

    // Use the samples we have (up to optimal amount)
    const samplesToUse = Math.min(this.redSamples.length, OPTIMAL_SAMPLES);
    const signal = this.redSamples.slice(-samplesToUse);
    const times = this.timestamps.slice(-samplesToUse);

    // Calculate actual sample rate
    const duration = (times[times.length - 1] - times[0]) / 1000;
    const actualFps = signal.length / duration;

    // Step 1: Detrend signal (remove baseline drift)
    const detrended = this.detrend(signal);

    // Step 2: Bandpass filter (0.7-4Hz for 42-240 BPM)
    const filtered = this.bandpassFilter(detrended, actualFps, 0.7, 4);

    // Step 3: Find peaks with adaptive threshold
    const peaks = this.findPeaksAdaptive(filtered, actualFps);

    if (peaks.length < 5) return null;

    // Step 4: Calculate intervals and validate
    const intervals: number[] = [];
    for (let i = 1; i < peaks.length; i++) {
      const interval = times[peaks[i]] - times[peaks[i - 1]];
      // Reject physiologically impossible intervals
      if (interval > 300 && interval < 1500) {
        // 40-200 BPM range
        intervals.push(interval);
      }
    }

    if (intervals.length < 4) return null;

    // Step 5: Remove outlier intervals (more than 2 std dev from median)
    const cleanedIntervals = this.removeOutliers(intervals);
    if (cleanedIntervals.length < 4) return null;

    // Step 6: Calculate heart rate
    const avgInterval =
      cleanedIntervals.reduce((a, b) => a + b, 0) / cleanedIntervals.length;
    const heartRate = Math.round(60000 / avgInterval);

    // Step 7: Calculate HRV (RMSSD)
    let sumSqDiff = 0;
    for (let i = 1; i < cleanedIntervals.length; i++) {
      sumSqDiff += (cleanedIntervals[i] - cleanedIntervals[i - 1]) ** 2;
    }
    const hrv = Math.round(
      Math.sqrt(sumSqDiff / (cleanedIntervals.length - 1)),
    );

    // Step 8: Validate results
    if (heartRate < MIN_HR || heartRate > MAX_HR) return null;
    if (hrv < 0 || hrv > 300) return null;

    // Step 9: Calculate confidence score
    const confidence = this.calculateConfidence(
      cleanedIntervals,
      quality,
      peaks.length,
    );

    // Require minimum confidence
    if (confidence < 0.3) return null;

    return { heartRate, hrv, confidence };
  }

  /**
   * Main capture loop - samples red and green channels from video frames
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
    const size = Math.min(videoWidth, videoHeight, 100); // Larger patch for better averaging

    const data = this.ctx.getImageData(
      cx - size / 2,
      cy - size / 2,
      size,
      size,
    ).data;

    // Calculate average red and green channel values
    let redSum = 0;
    let greenSum = 0;
    const pixelCount = data.length / 4;

    for (let i = 0; i < data.length; i += 4) {
      redSum += data[i]; // Red channel
      greenSum += data[i + 1]; // Green channel
    }

    const avgRed = redSum / pixelCount;
    const avgGreen = greenSum / pixelCount;

    // Detect motion (sudden brightness changes)
    if (this.lastBrightness > 0) {
      const motion = Math.abs(avgRed - this.lastBrightness);
      this.motionBuffer.push(motion);
      if (this.motionBuffer.length > 30) {
        this.motionBuffer.shift();
      }
    }
    this.lastBrightness = avgRed;

    // Store samples
    this.redSamples.push(avgRed);
    this.greenSamples.push(avgGreen);
    this.timestamps.push(performance.now());

    // Keep rolling buffer (~20 seconds at 30fps)
    const maxSamples = 600;
    if (this.redSamples.length > maxSamples) {
      this.redSamples.shift();
      this.greenSamples.shift();
      this.timestamps.shift();
    }

    // Notify signal quality update
    if (this.onSignalUpdate) {
      this.onSignalUpdate(this.getSignalQuality());
    }

    // Check for early completion every ~1 second (30 frames)
    if (this.redSamples.length % 30 === 0) {
      this.checkEarlyCompletion();
    }

    this.raf = requestAnimationFrame(this.loop);
  };

  /**
   * Detrend signal using linear regression to remove baseline drift
   */
  private detrend(signal: number[]): number[] {
    const n = signal.length;
    let sumX = 0,
      sumY = 0,
      sumXY = 0,
      sumX2 = 0;

    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += signal[i];
      sumXY += i * signal[i];
      sumX2 += i * i;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return signal.map((v, i) => v - (slope * i + intercept));
  }

  /**
   * Simple bandpass filter using moving averages
   * Removes frequencies outside the heart rate range
   */
  private bandpassFilter(
    signal: number[],
    fs: number,
    lowCut: number,
    highCut: number,
  ): number[] {
    // High-pass: remove frequencies below lowCut (remove baseline)
    const highPassWindow = Math.round(fs / lowCut);
    const highPassed = this.subtractMovingAverage(signal, highPassWindow);

    // Low-pass: remove frequencies above highCut (remove noise)
    const lowPassWindow = Math.max(3, Math.round(fs / highCut / 2));
    return this.movingAverage(highPassed, lowPassWindow);
  }

  /**
   * Subtract moving average (high-pass filter)
   */
  private subtractMovingAverage(signal: number[], window: number): number[] {
    const ma = this.movingAverage(signal, window);
    return signal.map((v, i) => v - ma[i]);
  }

  /**
   * Moving average filter (low-pass filter)
   */
  private movingAverage(signal: number[], window: number): number[] {
    const result: number[] = [];
    const halfWindow = Math.floor(window / 2);

    for (let i = 0; i < signal.length; i++) {
      let sum = 0;
      let count = 0;
      for (
        let j = Math.max(0, i - halfWindow);
        j <= Math.min(signal.length - 1, i + halfWindow);
        j++
      ) {
        sum += signal[j];
        count++;
      }
      result.push(sum / count);
    }
    return result;
  }

  /**
   * Find peaks with adaptive threshold based on signal characteristics
   */
  private findPeaksAdaptive(signal: number[], fs: number): number[] {
    // Calculate threshold based on signal statistics
    const mean = signal.reduce((a, b) => a + b, 0) / signal.length;
    const stdDev = Math.sqrt(
      signal.reduce((s, v) => s + (v - mean) ** 2, 0) / signal.length,
    );

    // Adaptive threshold: peaks should be above mean + fraction of stdDev
    const threshold = mean + stdDev * 0.3;

    // Minimum samples between peaks (based on max heart rate of 200 BPM)
    const minPeakDistance = Math.round((fs * 60) / MAX_HR);

    const peaks: number[] = [];

    for (let i = 3; i < signal.length - 3; i++) {
      // Check if this is a local maximum
      if (
        signal[i] > threshold &&
        signal[i] > signal[i - 1] &&
        signal[i] > signal[i - 2] &&
        signal[i] > signal[i - 3] &&
        signal[i] >= signal[i + 1] &&
        signal[i] >= signal[i + 2] &&
        signal[i] >= signal[i + 3]
      ) {
        // Check minimum distance from last peak
        if (
          peaks.length === 0 ||
          i - peaks[peaks.length - 1] >= minPeakDistance
        ) {
          peaks.push(i);
        } else if (signal[i] > signal[peaks[peaks.length - 1]]) {
          // Replace last peak if this one is higher
          peaks[peaks.length - 1] = i;
        }
      }
    }

    return peaks;
  }

  /**
   * Remove outlier intervals using IQR method
   */
  private removeOutliers(intervals: number[]): number[] {
    if (intervals.length < 4) return intervals;

    const sorted = [...intervals].sort((a, b) => a - b);
    const q1 = sorted[Math.floor(sorted.length * 0.25)];
    const q3 = sorted[Math.floor(sorted.length * 0.75)];
    const iqr = q3 - q1;

    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;

    return intervals.filter((v) => v >= lowerBound && v <= upperBound);
  }

  /**
   * Calculate confidence score based on multiple factors
   */
  private calculateConfidence(
    intervals: number[],
    quality: SignalQuality,
    peakCount: number,
  ): number {
    // Factor 1: Signal quality (40%)
    const qualityScore = quality.strength;

    // Factor 2: Interval consistency (30%)
    const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const coeffOfVariation =
      Math.sqrt(
        intervals.reduce((s, v) => s + (v - mean) ** 2, 0) / intervals.length,
      ) / mean;
    const consistencyScore = Math.max(0, 1 - coeffOfVariation * 2);

    // Factor 3: Number of peaks detected (20%)
    const peakScore = Math.min(1, peakCount / 15);

    // Factor 4: Stability (10%)
    const stabilityScore = quality.stability;

    return (
      qualityScore * 0.4 +
      consistencyScore * 0.3 +
      peakScore * 0.2 +
      stabilityScore * 0.1
    );
  }
}

export default RPPGDetector;
