# 🎵 Beat Bonga (Jaribu Beats) — Song Snippet Quiz Game

<div align="center">

![Beat Bonga Logo](frontend/assets/icon.png)

**The Ultimate Real-Time Music Snippet Quiz Application**  
*Test your musical ear against the clock in Solo Rush, battle friends in Pass & Play, or challenge your mastery with Artist Spotlight mode!*

[![Go Version](https://img.shields.io/badge/Go-1.22+-00ADD8?style=for-the-badge&logo=go)](https://golang.org)
[![React Native](https://img.shields.io/badge/React_Native-Expo_SDK_51-61DAFB?style=for-the-badge&logo=react)](https://reactnative.dev)
[![Docker](https://img.shields.io/badge/Docker-Compose_Ready-2496ED?style=for-the-badge&logo=docker)](https://docker.com)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

</div>

---

## 🌟 Key Features

- ⚡ **Solo Rush Mode**: Race against an interactive vinyl turntable countdown clock. Score up to 1,000+ points per round with speed bonuses and combo multipliers up to 3.0x!
- 👥 **Pass & Play Party Mode**: Local pass-the-phone multiplayer for 2 to 6 players. Features custom player nicknames, 🎲 random fun name generator, customizable avatar badges, and a celebration podium!
- 🎤 **Artist Spotlight Mode**: Search for *any* artist in the world (e.g. *Wakadinali*, *Sauti Sol*, *Drake*, *Bob Marley*, *Sinach*, *Taylor Swift*). The game engine curates question snippets and multiple-choice distractors exclusively by or featuring that artist.
- 🎲 **Anti-Repetition Engine**: Global thread-safe ring buffer and normalized title filter prevents duplicate songs from appearing across consecutive rounds or fresh game instances.
- 🌍 **Expanded Music Genres**:
  - 🎲 **Random Mega Mix** (*General surprise shuffle across all eras and styles*)
  - 🇰🇪 **Kenyan All-Stars** (*Gengetone, Arbantone, Benga & Nairobi Urban*)
  - 🌍 **Afrobeats & Amapiano** (*Burna Boy, Asake, Tyla, Rema, Wizkid*)
  - 🇯🇲 **Reggae & Roots** (*Bob Marley, Chronixx, Lucky Dube, Peter Tosh*)
  - 🔊 **Dancehall & Riddims** (*Vybz Kartel, Popcaan, Sean Paul, Shenseea*)
  - 🙏 **Gospel & Worship** (*Mercy Chinwo, Sinach, Kirk Franklin, Ada Ehi*)
  - 🎤 **Hip-Hop & Trap** (*Kendrick Lamar, Drake, Travis Scott, 2Pac, Eminem*)
  - 🌟 **Billboard Pop Hits** (*The Weeknd, Dua Lipa, Bruno Mars, Ariana Grande*)
  - 📼 **90s & 2000s Throwbacks** (*Usher, Beyoncé, Akon, 50 Cent, TLC*)
  - 🎸 **Rock & Legendary Anthems** (*Queen, Nirvana, Linkin Park, AC/DC*)
- ✏️ **Custom Rounds Input**: Choose presets (3, 5, 10 rounds) or enter any custom round count (1–50 rounds for Solo, 1–20 rounds each for Pass & Play).
- 🏆 **Dynamic Leaderboards & Local Hall of Fame**: Global competitive highscores, streak tracking, accuracy ratings, and local player score history.
- 🔊 **Audio Stream Proxy**: Dedicated backend stream proxy with range request support and CORS bypass to deliver playback without hotlinking restrictions.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Backend** | **Go (Golang 1.22)**, Gin Web Framework, Gorilla WebSocket, pure-Go SQLite (`modernc.org/sqlite`), Deezer & iTunes API Integrations |
| **Frontend** | **React Native**, **Expo SDK 51**, HTML5 Audio API, Expo AV, React Native Reanimated, Responsive Dark/Obsidian UI Theme |
| **DevOps & Containers** | **Docker**, **Docker Compose**, Multi-Stage Alpine Builds, Nginx Reverse Proxy |
| **Mobile Deployment** | Android Studio Prebuilt Native Project (`frontend/android`), Gradle, APK Generator |

---

## 🚀 Quickstart Guide

### Option 1: Run with Docker Compose (Fastest & Cross-Platform)

Ensure you have [Docker](https://www.docker.com/) and [Docker Compose](https://docs.docker.com/compose/) installed:

```bash
# Clone repository
git clone https://github.com/ClayMichael2004/Jaribu.git
cd Jaribu

# Build and start all services in detached mode
docker-compose up --build -d

# View running containers
docker-compose ps
```

- **Frontend Web Application**: [http://localhost:3000](http://localhost:3000)
- **Backend REST API**: [http://localhost:8080/api/health](http://localhost:8080/api/health)

To view logs or stop the containers:
```bash
# Follow logs
docker-compose logs -f

# Stop containers
docker-compose down
```

---

### Option 2: Run Native Local Development

#### 1. Start the Go Backend Server:
```powershell
cd backend

# Option A: Run directly with Go toolchain
go run ./cmd/server

# Option B: Run precompiled binary
.\jaribu-server.exe
```
The server will start listening on `http://localhost:8080`.

#### 2. Start the Frontend (Expo / Web):
```powershell
cd frontend

# Install npm dependencies
npm install

# Start Expo dev server
npx expo start
```
- Press **`w`** to open in your web browser.
- Press **`a`** to open in an Android emulator.
- Scan the QR code with **Expo Go** on your physical phone.

---

### Option 3: Run on Physical Android Phone via Android Studio

1. Open **Android Studio**.
2. Click **Open** and select:
   ```
   Jaribu/frontend/android
   ```
3. Allow Gradle to sync dependencies.
4. Connect your Android phone with **USB Debugging** enabled.
5. Click the green **Run ▶** button to install and launch directly on your device.
6. To export a standalone APK:
   - Click **Build > Build Bundle(s) / APK(s) > Build APK(s)**.
   - APK output location: `frontend/android/app/build/outputs/apk/debug/app-debug.apk`.

---

## 📡 REST API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Service health status and timestamp |
| `GET` | `/api/categories` | List all available music genres and metadata |
| `GET` | `/api/songs/search?q=:query` | Search song previews and metadata |
| `GET` | `/api/artists/search?q=:query` | Search artists with photos for Spotlight mode |
| `GET` | `/api/audio/proxy?url=:url` | Audio stream proxy with CORS & Range support |
| `POST` | `/api/game/solo/start` | Initialize Solo Rush session |
| `POST` | `/api/game/solo/answer` | Submit answer for solo session |
| `POST` | `/api/game/pass-play/start` | Initialize Pass & Play session |
| `POST` | `/api/game/pass-play/answer` | Submit answer for Pass & Play turn |
| `GET` | `/api/leaderboard` | Get Hall of Fame highscores by category |
| `POST` | `/api/leaderboard/submit` | Submit new score record |
| `GET` | `/api/records/my?player_name=:name` | Get local player match history and stats |
| `POST` | `/api/records/reset` | Clear local player history |
| `POST` | `/api/rooms/create` | Create multiplayer live room |
| `GET` | `/api/rooms/:code` | Get multiplayer room status |
| `WS` | `/ws/room?room_code=:code` | WebSocket live room connection |

---

## 📂 Project Structure

```
Jaribu/
├── backend/                        # Go Backend Application
│   ├── cmd/server/main.go          # Server entry point & CORS configuration
│   ├── internal/
│   │   ├── db/db.go                # SQLite database repository & schema
│   │   ├── game/engine.go          # Core game session logic & anti-repetition buffer
│   │   ├── game/room.go            # WebSocket multiplayer room manager
│   │   ├── handlers/routes.go      # REST endpoints & audio proxy handler
│   │   ├── handlers/websocket.go   # WebSocket event handlers
│   │   ├── models/models.go        # Data structures and request/response models
│   │   └── music/deezer.go         # Music provider integration (Deezer + iTunes)
│   │   └── music/vault.go          # Curated catalogs & fallback playlists
│   ├── data/                       # SQLite storage volume
│   ├── Dockerfile                  # Multi-stage Go container build
│   └── go.mod
│
├── frontend/                       # React Native / Expo Frontend
│   ├── android/                    # Native Android Gradle Project
│   ├── assets/                     # App icons, splash screens, audio assets
│   ├── src/
│   │   ├── components/             # Reusable UI components (Turntable visualizer, cards)
│   │   ├── config/api.js           # API client & automatic LAN IP resolver
│   │   ├── constants/theme.js      # Design tokens, color palette, difficulties
│   │   ├── screens/                # Application screens
│   │   │   ├── HomeScreen.js       # Main menu, mode switcher, artist spotlight
│   │   │   ├── SoloGameScreen.js   # Single-player rush game loop
│   │   │   ├── PassPlaySetupScreen.js # Pass & Play lobby & custom naming
│   │   │   ├── PassPlayGameScreen.js  # Pass & Play turn transitions & gameplay
│   │   │   └── LeaderboardScreen.js   # Highscores & personal player records
│   │   └── utils/audio.js          # Audio manager with Web Audio & Expo AV fallback
│   ├── App.js                      # Root navigation controller
│   ├── Dockerfile                  # Multi-stage Expo Web + Nginx container
│   └── package.json
│
├── docker-compose.yml              # Multi-container orchestration specification
├── DOCUMENTATION.md                # Comprehensive technical manual & architecture deep-dive
└── README.md                       # Main documentation (this file)
```

---

## 📄 License

This project is licensed under the **MIT License**.
