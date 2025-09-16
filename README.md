# Chummy – Interactive Music Therapy Dashboard (Single-Unit)

Chummy is an interactive music therapy system designed to support caregivers in managing Behavioral and Psychological Symptoms of Dementia (BPSD).

The system combines a Raspberry Pi–based music player (the physical CHUMMY device) with a web dashboard. Together, they provide caregivers with an easy way to deliver personalized music interventions, monitor patient status, and track outcomes in real time.

By uniting hardware, backend, and frontend, Chummy bridges the gap between traditional music therapy and responsive, data-driven care.

# Why Chummy?

Music therapy is a well-established, non-pharmacological method for alleviating agitation, stress, and other symptoms of dementia. However, its effectiveness depends on personalization (matching music to individual preferences) and timely response (intervening the moment symptoms appear).

Chummy helps by providing:

- Simple tactile controls on the device for caregivers (Radio Mode vs. Therapy Mode).

- A live caregiver dashboard to track music playback, patient state, and BPSD events.

- Automatic logging and reporting so that session effectiveness is recorded for future review.

This makes interventions faster, more consistent, and easier to evaluate in real care environments.

# System Overview

Chummy consists of three layers:

- Hardware (Raspberry Pi Unit)

Plays music locally through speakers.

Physical buttons allow quick mode switching (Radio vs. Music Therapy).

Sends structured JSON events (song starts, therapy outcomes) to the backend.

- Backend (Node.js + Express + Socket.IO)

Serves as the central hub.

Receives events from the Pi, manages playlists, and broadcasts updates to the dashboard.

Provides REST APIs for playlists and therapy event logging.

- Frontend (React Dashboard)

Displays “Now Playing” in real time.

Shows patient status (green = Radio, red = Therapy).

Provides an event log for BPSD interventions with timestamps and outcomes.

Frontend (React @ 3000)  ←→  Backend (Node/Express + Socket.IO @ 5002)  ←→  Pi (Flask @ 5002)
                                   ↑                                       ↑
                                   └────────── HTTP POST (song/BPSD) ──────┘

# Features

🎵 Two Modes of Playback

Radio Mode – continuous background music (randomized per folder).

Therapy Mode (MT) – targeted playlists for BPSD episodes, with caregiver reporting.

📊 Caregiver Dashboard

Real-time display of current song and patient status.

Automatic event log of therapy outcomes (effective, ineffective, finished).

🖱 Simple Physical Controls

Rotary knobs for volume/channel.

Large buttons for mode selection (Radio / Music Therapy).

📝 Automatic Reporting

Logs session start/end, effectiveness, and duration.

🔄 Extensible Design

Supports adding your own music.

Built to scale toward multiple CHUMMY units on a shared network.

# Future roadmap: predictive BPSD alerts using machine learning.

# Prerequisites

Laptop/Desktop (backend + frontend)

Node.js ≥ 18

npm ≥ 9

Raspberry Pi (Pi Zero or similar)

Python 3.9+

Packages: pygame, RPi.GPIO, flask, requests

Audio output configured

# Setup
1) Raspberry Pi (CHUMMY unit)

Music folders expected at:

/home/your_name/Music/
  ├─ ChummyC1/
  ├─ ChummyC2/
  ├─ ChummyC3/
  ├─ MT1/
  └─ MT2/


Install dependencies:

sudo apt update
sudo apt install python3-flask -y
pip3 install pygame RPi.GPIO requests


Run CHUMMY:

cd chummy/hardware
python3 main.py


This will:

Start Flask server on port 5002 (/playlists)

Begin playing Radio mode by default

POST song/BPSD events to backend

Configure backend IPs in chummy/hardware/main.py:

BACKEND_URL = "http://<backend-ip>:5002/api/song"
BPSD_URL    = "http://<backend-ip>:5002/api/bpsd"

2) Backend (Node/Express + Socket.IO)
cd server/backend
npm install
node index.js


Default port: 5002

Update Pi IP in server/backend/index.js to match your network

3) Frontend (React)
cd server/frontend
npm install
npm start


Frontend runs at http://localhost:3000

Ensure backend CORS allows your frontend origin

# How It Works

Pi → Backend

Song starts → POST /api/song → backend emits songChanged

BPSD events → POST /api/bpsd → backend emits bpsdEvent

Backend → Frontend

REST: GET /playlists (proxied to Pi)

Socket.IO: songChanged, bpsdEvent

Frontend → Caregivers

Displays “Now Playing”

Shows patient mode (Radio/MT)

Logs therapy outcomes in real time

# API & Events

REST API (Backend)

GET /playlists → returns { [folderName: string]: string[] }

POST /api/song → { song: string }

POST /api/bpsd → { songName, playedSecs, effective, reason? }

Socket.IO (Backend → Frontend)

songChanged: string (e.g. "ChummyC1/song.mp3")

bpsdEvent: { songName, playedSecs, timestamp, effective, reason? }

# Troubleshooting

“Failed to load playlists” → check Pi IP config and backend connection

No events appearing → confirm Flask server is running on Pi and URLs are correct

Socket not connecting → verify CORS and backend port (5002)

# Project Structure
chummy/
  chummy/
    hardware/
      main.py                 # Pi player + Flask /playlists endpoint
  server/
    backend/
      index.js                # Express + Socket.IO + Pi proxy
    frontend/
      src/pages/ChummyCombined.js   # Main dashboard
      src/App.css             # Styles

# The Bigger Picture

Chummy is part of a human-centered approach to dementia care. By bridging embedded hardware, real-time software, and caregiver-friendly interfaces, it aims to:

Improve patient quality of life through responsive, personalized music therapy.

Reduce caregiver burden by simplifying interventions.

Lay the groundwork for future predictive systems that anticipate BPSD episodes using labeled audio and caregiver feedback
