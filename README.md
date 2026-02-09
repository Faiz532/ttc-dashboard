# 🚇 TTC Subway Status Dashboard

**Real-time Toronto subway alerts visualized on an interactive SVG map**

![Live Status](https://img.shields.io/badge/status-live-brightgreen)
![TTC Lines](https://img.shields.io/badge/lines-1%20%7C%202%20%7C%204%20%7C%205%20%7C%206-blue)
![AI Powered](https://img.shields.io/badge/AI-Gemini-purple)

## ✨ Features

- 📍 **Interactive SVG Map** – Pan and zoom the full TTC subway network
- 🔴 **Real-time Alerts** – Service suspensions, delays, and shuttle buses
- 🤖 **AI-Powered Parsing** – Google Gemini extracts structured data from alert text
- 📱 **Responsive Design** – Optimized for both mobile and desktop
- 🌙 **Dark/Light Mode** – Toggle between themes
- ⏰ **Auto-refresh** – Alerts update every 60 seconds

## 🗺️ What It Shows

| Alert Type | Visualization |
|------------|---------------|
| **Service Suspension** | Red pulsing capsule on affected stations |
| **Delay** | Orange capsule with delay indicator |
| **Shuttle Bus** | Blue animated outline around affected section |

## 🛠️ Tech Stack

**Backend:**
- Node.js + Express
- Google Gemini AI for natural language processing
- Axios for API requests

**Frontend:**
- Vanilla JavaScript
- GSAP for animations
- Vanta.js for animated backgrounds
- SVG for the subway map

**Hosting:**
- Render (primary backend)
- Vercel (serverless functions)

## 🚀 Quick Start

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/ttc-dashboard.git
cd ttc-dashboard

# Install dependencies
npm install

# Set up environment variables
echo "GEMINI_API_KEY=your_api_key_here" > .env

# Run locally
npm start
```

Then visit `http://localhost:3000`

## 📁 Project Structure

```
ttc-dashboard/
├── server.js           # Main Express server
├── api/
│   └── data.js         # Vercel serverless function
├── public/
│   ├── index.html      # Entry point (device detection)
│   ├── desktop.html    # Desktop version
│   ├── mobile.html     # Mobile version
│   ├── desktop.js      # Desktop map logic
│   ├── mobile.js       # Mobile map logic
│   └── *.css           # Stylesheets
└── package.json
```

## 🔗 Live Demo

**🌐 [subwaystatus.live](https://subwaystatus.live)**

## 📄 License

MIT License - Feel free to use and modify!

---

*Built with ☕ in Toronto*
