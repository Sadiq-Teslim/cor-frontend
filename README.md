# Cor

Cor is a proactive cardiovascular health companion for young African professionals. It monitors behavioral and physiological signals through a standard smartphone, builds a personal cardiovascular baseline, and delivers a spoken alert in the user's language when the data indicates a concerning trend.

---

## Why Cor Exists

38% of adult Nigerians have hypertension. Only 17.4% know it. The gap exists because every existing solution requires the patient to already know they are one. Clinics require you to show up. Hardware requires purchase. Apps require manual input. Cor requires none of these things.

---

## How It Works

Cor operates across three layers.

The **passive layer** runs in the background at all times. The phone accelerometer and gyroscope track movement, sedentary duration, and sleep patterns. Screen usage data captures stress load proxies including late-night engagement and session density.

The **active layer** fires when passive signals detect a pattern worth confirming. The user holds their finger over the rear camera for 30 seconds. Using remote photoplethysmography, the camera detects blood volume fluctuations in the fingertip with each heartbeat and extracts heart rate and heart rate variability. Pulse transit time, calculated from the touchscreen and accelerometer in tandem, provides a blood pressure estimate.

The **food layer** captures meal data through the camera. The Logmeal API identifies the food, returns sodium and calorie data, and Cor generates a blood pressure impact statement relative to the user's current trend.

All signals feed into the Cardiovascular Stress Score, a weighted on-device model that drives every alert and insight Cor produces.

---

## Cardiovascular Stress Score

| Signal | Weight | Source |
|---|---|---|
| HRV 7-day trend | 35% | rPPG reading |
| Sedentary duration | 25% | Accelerometer |
| Sleep quality | 20% | Motion and screen data |
| Food and medication | 12% | Camera and voice log |
| Screen stress index | 8% | Usage analytics |

The model calibrates against each user's personal baseline, not population averages. Alerts fire only after the score exceeds the user's personalized threshold for five consecutive days.

---

## Accuracy

A 2025 Singapore General Hospital clinical study across 200 patients found rPPG-based diastolic BP prediction achieved a mean error of 0.16 mmHg from cuff readings. A peer-reviewed deep learning rPPG study the same year found a 71% positive predictive value for elevated systolic BP above 130 mmHg. A 2024 validation study across 90 patients found dark skin tone had no significant negative impact on accuracy.

Cor is not a diagnostic device. All outputs are wellness-grade trend signals. When elevated risk is detected, Cor recommends a physical cuff reading.

---

## Frontend

Built as a Progressive Web App, fully responsive across desktop, tablet, and mobile. On desktop the interface renders in a centered 480px container. On mobile it fills the full viewport.

The application has 15 screens managed through a single navigation layer. Onboarding runs linearly across screens 1 through 7. The main application is accessible through a persistent bottom navigation bar with four tabs: Home, Insights, Log, and Settings.

Built in vanilla HTML, CSS, and JavaScript with no framework dependencies. All state is managed in a single JavaScript object. Screen transitions use a 150ms opacity fade. The Hey Cor button uses a 2-second CSS scale pulse. The BP reading screen uses a 30-second SVG stroke animation for the countdown ring.

Typography uses Inter from Google Fonts. The color system is defined as CSS variables and applied globally.

The Hey Cor voice interface is a bottom sheet overlay accessible from every post-onboarding screen. It handles voice input, displays the response inline, and dismisses without navigating away from the current screen.

The proactive alert renders as a full-screen overlay triggered by the CSS threshold logic, not by user navigation.

---

## Backend

The backend is a Node.js REST API.

User authentication uses JWT with refresh token rotation. Onboarding data, health baselines, CSS history, meal logs, medication records, and alert history are stored in PostgreSQL with row-level security per user.

The CSS model runs on-device for real-time feedback and is validated server-side on sync. Readings are pushed to the backend when connectivity is available and stored against the user's longitudinal health record.

rPPG signal processing runs on-device. Extracted HRV and heart rate values are sent to the backend alongside a signal confidence score. Readings below the confidence threshold are excluded from the CSS calculation.

Food analysis calls the Logmeal API from the backend to protect the API key and allow server-side enrichment with user-specific BP context before returning the result to the client.

The voice interface connects to an LLM API with a system prompt scoped to the user's current health profile, CSS score, recent readings, and medication list. Responses are constrained to cardiovascular health guidance.

Smartwatch data is ingested through Apple HealthKit, Google Health Connect, Samsung Health SDK, and the Fitbit Web API on a background sync schedule.

Clinical share reports are generated server-side as PDFs using the user's stored longitudinal data for the selected time range.

All data in transit is encrypted. Health data at rest is encrypted at field level for all personally identifiable and medical fields.

---

## Screens

| Screen | Purpose |
|---|---|
| Welcome | Entry point |
| Language Select | Sets interface language globally |
| Onboarding Questions | Builds health baseline |
| Medical Records Upload | Seeds model with prior history |
| Smartwatch Connect | Links health platform APIs |
| First BP Reading | Establishes physiological baseline |
| Home | Daily health status and actions |
| BP Check | On-demand cardiovascular reading |
| Food Logger | Camera or voice meal analysis |
| Medication Tracker | Drug log with BP interaction flags |
| Lifestyle Insights | Weekly narrative health summary |
| Trend History | CSS chart over 7, 14, or 30 days |
| Proactive Alert | Triggered overlay when threshold crossed |
| Clinical Share | Report generation and export |
| Settings | Preferences, connections, privacy |

---

## Languages

English, Pidgin, Yoruba, Igbo, Hausa, French. Set at onboarding and applied to all interface text, voice alerts, and Hey Cor responses.

---

## Offline Behavior

Core readings, trend history, and the last generated insight are cached locally. The CSS model runs on-device. Entries made offline are queued and synced when connectivity is restored. All features degrade gracefully on 2G.

---

## Business Model

**Free** covers passive monitoring, BP readings, voice alerts, food camera with a daily limit, and multilingual support.

**Premium at 2,000 naira per month** adds full trend history, unlimited food camera, complete medication tracking, personalized AI guidance, and clinical share reports.

**B2B SDK** makes Cor's monitoring engine available to hospitals and digital health platforms for integration into existing patient products. Pricing is per patient per month.

---

## Roadmap

**Phase 1** is the consumer application launching in Nigeria with free and premium tiers.

**Phase 2** introduces the clinical SDK, hospital partnerships, and Cor's Table, an AI meal planning feature that generates weekly plans using African foods optimized for the user's cardiovascular trajectory.

**Phase 3** builds an anonymized population health dataset across the user base, creating infrastructure for public health research and government intervention planning across the continent.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | HTML, CSS, Vanilla JavaScript |
| Backend | Node.js, PostgreSQL |
| Food Analysis | Logmeal API |
| Voice Interface | LLM API |
| Wearables | HealthKit, Google Health Connect, Samsung Health SDK, Fitbit API |
| Auth | JWT with refresh token rotation |
| Hosting | PWA, deployable on any static host |

---

*Cor is not a medical device. It is the thing that tells you to see one before you need to.*
