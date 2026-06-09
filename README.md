# 🎵 Vibe — Offline Music Studio

<img src="icon-192.png" align="right" width="120" alt="Vibe Icon" />

Vibe is a pocket music studio that runs entirely in the browser and works fully offline. Play, sing, and be the band using real-touch and real-breath web audio interfaces.

> Real instruments. Real touch. Real breath. A pocket music studio that runs offline.

---

## 🚀 Key Features

* **Multi-Instrument Synth Engines:** Play simulated acoustic and synthetic instruments including Piano, Flute, and more.
* **Interactive Pitch Engine:** Sing or hum to detect real-time notes and trigger instrument tones.
* **Responsive Visual Jam Interfaces:** Optimized for phones, tablets, and desktop computers with touch support.
* **Fully Offline PWA:** Installable on home screens (iOS/Android) and powered by service workers for offline loading.
* **Zero-Build Architecture:** Utilizes `@babel/standalone` and React via CDN, allowing it to run instantly without complex compilation.

---

## 🛠️ How it Works (Architecture)

Vibe is designed as a lightweight, zero-dependency frontend application:
- **`index.html`**: Entrypoint loading React and Babel standalone from CDN.
- **`assets/audio.js`**: Custom Web Audio API synthesizer engine handling oscillator nodes, envelope controls, and audio output routing.
- **`assets/pitch.js`**: Core pitch detection code utilizing autocorrelation/FFT algorithms for microphone audio input analysis.
- **`assets/app.jsx` & `assets/screens.jsx`**: Main navigation, application state management, and interface routers.
- **`assets/piano-flute.jsx` & `assets/other-instruments.jsx`**: Custom React components rendering instrument keyboards and sensors.

---

## 💻 Running Locally

Since the application requires microphone access (for the pitch/singing engine) and utilizes service workers, it should be served over `http://localhost` (or `http://127.0.0.1`).

You can run it locally with any simple static web server. Below are a few quick ways:

### Using Node.js (http-server)
```bash
npx http-server . -p 8080
```

### Using Python
```bash
python -m http.server 8080
```

### Using Wrangler (Cloudflare Pages dev server)
```bash
npx wrangler pages dev . --compatibility-date=2026-04-08
```

Open **`http://localhost:8080`** (or the corresponding port) in your web browser.

---

## 📦 Deployment

This project includes a GitHub Actions CI/CD workflow to deploy static content directly to **GitHub Pages**.

### Continuous Deployment
Every push to the `main` branch automatically builds and deploys the latest version to GitHub Pages. The configuration can be found in `.github/workflows/deploy.yml`.
