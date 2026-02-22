# COR – Frontend

> From everyday data to early cardiovascular prevention.

COR is a proactive cardiovascular risk screening web application that estimates blood pressure trends using smartphone camera-based photoplethysmography (PPG), lifestyle signals, and AI-driven analysis.

This repository contains the frontend implementation of COR.

---

## Problem

Cardiovascular diseases cause nearly 20 million deaths globally each year.
In Nigeria, an estimated 30–35% of adults live with hypertension — many undiagnosed.

Hypertension is often asymptomatic until it becomes fatal.

COR aims to transform the smartphone into a first-line cardiovascular risk screening tool.

---

## Solution Overview

COR leverages:

* Smartphone camera (PPG) for pulse waveform capture
* HRV and pulse morphology feature extraction
* Machine learning–based blood pressure estimation
* Longitudinal trend analysis
* Food image analysis for sodium impact estimation
* Sleep and activity inference from device sensors
* Voice-enabled interaction (multilingual support)

COR is not a diagnostic medical device.
It is a screening and risk stratification tool designed to prompt early intervention.

---

## Frontend Features

* Clean cardiovascular dashboard
* Real-time measurement interface
* 7-day trend visualization
* Risk score indicator (Green / Yellow / Red)
* Lifestyle correlation insights
* Food image upload & analysis interface
* Voice-guided measurement flow
* Multilingual UI support
* Confidence score display for transparency

## Future Implementations
* Fast sync with Smart Watches
---

## Dashboard Structure

### Main Panel

* Estimated Blood Pressure
* Confidence Score
* Cardiovascular Risk Level
* Weekly Trend Graph

### Insights Panel

* HRV Score
* Sleep Pattern Indicator
* Activity Level Summary
* Sodium Risk Indicator

---

## Tech Stack

* React / Next.js (Frontend Framework)
* TypeScript
* Tailwind CSS (Styling)
* Chart.js / Recharts (Data Visualization)
* Web Speech API (Voice Interaction)
* Camera API (PPG Capture)
* Axios / Fetch (API Communication)

---

## Measurement Flow

1. User activates COR via voice or button.
2. User places finger on camera for 10 seconds.
3. Frontend captures video frames.
4. Signal data is sent to backend for processing.
5. Processed results returned:

   * Estimated Systolic / Diastolic BP
   * HRV metrics
   * Confidence score
6. Dashboard updates with trend analysis.

---

## Validation Approach

During pilot testing:

* BP readings were paired with digital cuff measurements.
* PPG features were extracted and fed into regression models.
* Correlation coefficient and mean absolute error were calculated.

COR is designed as a screening tool, not a replacement for certified medical devices.

---

## Getting Started

### Clone the Repository

```bash
git clone https://github.com/your-username/cor-frontend.git
cd cor-frontend
```

### Install Dependencies

```bash
npm install
```

### Run Development Server

```bash
npm run dev
```

App runs on:

```
http://localhost:3000
```

---

## Folder Structure

```
/components
  - Dashboard
  - Measurement
  - VoiceAssistant
  - TrendChart
/pages
  - index.tsx
  - dashboard.tsx
  - measure.tsx
/utils
  - signalProcessing.ts
  - api.ts
```

---

## Disclaimer

COR provides estimated blood pressure trends using non-invasive optical signals.
It is not intended for medical diagnosis. Users are advised to confirm abnormal readings with certified medical devices and consult healthcare professionals.

---

## 👥 Team

Built for Cavista Hackathon 2026
Theme: From Data to Prevention – Healthcare as a Tool