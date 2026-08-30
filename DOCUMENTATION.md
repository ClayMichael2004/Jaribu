# 🎵 Jaribu — System Architecture & Technical Documentation

This document provides a comprehensive technical breakdown of **Jaribu**, covering system architecture, game engine internals, scoring algorithms, music discovery APIs, real-time protocols, database schemas, frontend component hierarchies, and deployment configurations.

---

## 1. System Architecture Overview

Jaribu is engineered as a distributed, low-latency music quiz ecosystem comprising a high-throughput **Go backend** and a reactive **React Native / Expo frontend** optimized for mobile and web viewports.

```
+-----------------------------------------------------------------------------------+
|                                 CLIENT CLIENT LAYER                               |
|   +--------------------------+    +-------------------------+    +--------------+ |
|   |   Android Studio App     |    |     Expo Mobile App     |    |   Web App    | |
|   |  (APK / USB Debugging)   |    |    (Expo Go Scanner)    |    |  (Port 3000) | |
|   +------------+-------------+    +------------+------------+    +------+-------+ |
+----------------|-------------------------------|------------------------|---------+
                 |                               |                        |
                 +-----------------------+-------+------------------------+
                                         |
                                  HTTP / REST & WS
                                         |
+----------------------------------------v------------------------------------------+
|                             GO BACKEND ENGINE (Port 8080)                         |
|                                                                                   |
|  +-----------------------------------------------------------------------------+  |
|  | Gin Router & Middleware: CORS, Recovery, Logger, Request Timeout            |  |
|  +-----------------------------------------------------------------------------+  |
|         |                        |                          |                     |
|  +------v-------+      +---------v-----------+      +-------v------------------+  |
|  | Game Engine  |      | Audio Stream Proxy  |      | WebSocket Room Manager   |  |
|  | - Solo Rush  |      | - CORS Bypass       |      | - Room Codes (UUID/Hex)  |  |
|  | - Pass&Play  |      | - Range Buffering   |      | - Gorilla WS Hub         |  |
|  | - Anti-Repeat|      | - Chunked Streaming |      | - Live Event Broadcast   |  |
|  +------+-------+      +---------+-----------+      +--------------------------+  |
|         |                        |                                                |
|  +------v------------------------v-----------+      +--------------------------+  |
|  | Music Vault & Provider Integrations       |      | SQLite Database Driver   |  |
|  | - Deezer API (Search, Metadata, Artists)  |      | - modernc.org/sqlite     |  |
|  | - iTunes Search API (Permanent Audio MP3) |      | - Highscores & Sessions  |  |
|  | - Curated Regional Catalogs (10+ Genres)  |      | - Player Match Records   |  |
|  +-------------------------------------------+      +--------------------------+  |
+-----------------------------------------------------------------------------------+
```

---

## 2. Backend Subsystems & Internal Architecture

### 2.1 Game Engine & Session Lifecycle (`internal/game/engine.go`)

The game engine manages in-memory game sessions with thread-safe read/write mutexes (`sync.RWMutex`).

```go
type Engine struct {
    db             *db.Database
    deezer         *music.DeezerClient
    soloMutex      sync.RWMutex
    passPlayMutex  sync.RWMutex
    recentLock     sync.RWMutex
    soloGames      map[string]*models.SoloGameSession
    passPlayGames  map[string]*models.PassPlaySession
    recentSongIDs  []string // Rolling ring buffer
    recentTitles   []string // Normalized title buffer
}
```

#### Session Lifecycle:
1. **Initialization (`StartSoloSession` / `StartPassPlaySession`)**:
   - Client specifies category (e.g., `kenyan`, `afrobeats`, `reggae`, `dancehall`, `gospel`, `general`, or `artist:ArtistName`), difficulty, and round count.
   - Engine queries the music provider to fetch track candidates.
   - The first question is generated with 1 correct track and 3 distinct distractors.
2. **Turn Submission (`SubmitSoloAnswer` / `SubmitPassPlayAnswer`)**:
   - Client submits the chosen option ID and response time in milliseconds (`time_taken_ms`).
   - Server validates whether the option matches the question's target track.
   - Calculates score, bonus points, streaks, and updates session statistics.
   - Generates the next question or sets `is_game_over = true` / `is_match_over = true`.

---

### 2.2 Anti-Repetition Ring Buffer & Song Deduplication

To avoid repeating songs during continuous gameplay, the engine implements a multi-tier deduplication mechanism:

1. **Global Server Buffer (`recentSongIDs` & `recentTitles`)**:
   - Stores up to the last 150 played songs in a rolling ring buffer.
   - When generating a new question, candidates in this buffer are penalized or excluded.
2. **Session Track Exclusion (`UsedSongIDs`)**:
   - Tracks previously played within the current session are strictly disallowed.
3. **Normalized Title Comparison (`cleanSongTitle`)**:
   - Strips common punctuation, casing, and bracketed meta text:
     ```go
     func cleanSongTitle(title string) string {
         title = strings.ToLower(title)
         // Remove (...), [...], "feat.", "ft.", "(official video)", etc.
         ...
     }
     ```
   - Distractors with identical cleaned titles to the target or to other distractors are filtered out to prevent duplicate names appearing in choices.

---

### 2.3 Scoring Algorithm & Combo Multipliers

The scoring engine rewards speed, accuracy, and consecutive correct streaks:

$$\text{TimeBonus} = \max\left(0, 1 - \frac{\text{TimeTakenMs}}{\text{DurationLimitMs}}\right)$$

$$\text{BaseScore} = \text{BasePoints} \times (1 + \text{TimeBonus} \times 0.5)$$

$$\text{TotalPoints} = \text{round}(\text{BaseScore} \times \text{StreakMultiplier})$$

| Streak Count | Multiplier | Visual Indicator |
| :---: | :---: | :--- |
| **0 – 1** | **1.0x** | Default |
| **2** | **1.25x** | ⚡ Double Hit |
| **3** | **1.5x** | 🔥 On Fire |
| **4** | **2.0x** | 💥 Mega Combo |
| **5+** | **3.0x** | 👑 Unstoppable King |

---

### 2.4 Music Discovery Provider (`internal/music/deezer.go` & `vault.go`)

The music subsystem handles live track queries and metadata curation:

1. **Dual Provider Strategy**:
   - **iTunes Search API**: Primary source for permanent, cross-origin 30-second audio stream MP3/M4A previews.
   - **Deezer API**: Enriches tracks with high-resolution artist photography, album art, fan metrics, and dynamic discography searches.
2. **Artist Spotlight Mode (`GetArtistSongs`)**:
   - Dispatches queries targeting the specific artist name.
   - Normalizes titles, includes both solo hits and notable collaborations/features, and filters short or defective previews.
3. **Genre Catalogs**:
   - Curated queries for 10 distinct genres with over 25 verified signature artists per category.

---

### 2.5 Audio Streaming Proxy (`/api/audio/proxy`)

Browsers and mobile webviews enforce strict Cross-Origin Resource Sharing (CORS) and Autoplay policies. The backend audio proxy resolves this by:
- Forwarding HTTP `Range` headers for seeking and streaming audio buffers.
- Setting `Access-Control-Allow-Origin: *` and `Content-Type: audio/mpeg`.
- Eliminating third-party CDN token expiration issues.

---

### 2.6 Database Persistence (`internal/db/db.go`)

Uses `modernc.org/sqlite` (pure Go SQLite implementation that runs without requiring CGO or native GCC dependencies).

```sql
CREATE TABLE IF NOT EXISTS leaderboard_entries (
    id TEXT PRIMARY KEY,
    player_name TEXT NOT NULL,
    avatar_emoji TEXT NOT NULL,
    avatar_color TEXT NOT NULL,
    score INTEGER NOT NULL,
    category TEXT NOT NULL,
    difficulty TEXT NOT NULL,
    accuracy_percent REAL NOT NULL,
    streak INTEGER NOT NULL,
    fastest_time_ms INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_leaderboard_category_score 
ON leaderboard_entries(category, score DESC);

CREATE TABLE IF NOT EXISTS game_sessions (
    id TEXT PRIMARY KEY,
    game_mode TEXT NOT NULL,
    category TEXT NOT NULL,
    difficulty TEXT NOT NULL,
    total_rounds INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL
);
```

---

## 3. Frontend Subsystems & UI/UX Architecture

### 3.1 Component Hierarchy

```
App.js (Navigation Controller)
├── HomeScreen.js
│   ├── Top Header (Logo + Records Button)
│   ├── Game Mode Selector (Solo Rush / Pass & Play)
│   ├── Custom Player Profile Input (Solo Nickname & Avatar)
│   ├── Category Tabs (Genres & Mixes / 🎤 Artist Spotlight)
│   │   ├── Genre Cards Grid (10 Genres)
│   │   └── Artist Search & Popular Quick-Picks Grid
│   ├── Difficulty Selector (Easy 12s, Medium 8s, Hard 5s)
│   ├── Custom Rounds Selector (3, 5, 10, or ✏️ Stepper 1-50)
│   └── Start Button
│
├── SoloGameScreen.js
│   ├── HUD (Exit, Round Counter, Score, Combo Multiplier)
│   ├── TurntableVisualizer (Vinyl Record Spin & Audio Waveform)
│   ├── CountdownTimer (Radial / Linear Progress)
│   ├── Multiple Choice Option Cards (A, B, C, D)
│   └── Game Over Summary Screen
│
├── PassPlaySetupScreen.js
│   ├── Player Roster List (2 to 6 Players)
│   ├── Custom Player Name Input & 🎲 Random Fun Nickname Generator
│   ├── Avatar Emoji & Color Palette Picker
│   ├── Rounds per Player Stepper (1-20)
│   └── Match Overview Card
│
├── PassPlayGameScreen.js
│   ├── 📱 Pass-The-Phone Transition Screen (Guaranteed-Visible Ready Button)
│   ├── Active Turn Gameplay (Turntable, Timer, Options)
│   ├── Instant Turn Result Banner
│   └── Match Over Podium Celebration & Final Rankings
│
└── LeaderboardScreen.js
    ├── Category Filter Pills
    ├── Global Hall of Fame Table
    └── Personal Player Records & Match History
```

---

### 3.2 UI Design System & Tokens (`src/constants/theme.js`)

- **Primary Signature Color**: Coral Red (`#FF4B4B`)
- **Background Canvas**: Deep Obsidian (`#0B0F19`)
- **Surface Elevation**: Dark Slate (`#151C2C`)
- **Card Background**: Midnight Navy (`#1E293B`)
- **Success Mint**: `#00E676`
- **Warning Amber**: `#FFC107`
- **Error Crimson**: `#EF4444`

---

## 4. Dockerization & Production Deployment

### 4.1 Backend Dockerfile Structure
- Multi-stage build using `golang:1.22-alpine` builder.
- Produces a statically linked, stripped Linux binary (`-ldflags="-s -w -extldflags '-static'"`).
- Final container runs on ultra-minimal `alpine:3.19` (~15MB image size).

### 4.2 Frontend Web Dockerfile Structure
- Multi-stage build using `node:20-alpine` to compile Expo web distribution (`npx expo export --platform web`).
- Final container serves optimized HTML/JS/CSS assets via `nginx:alpine` with built-in reverse proxy rules forwarding `/api/` and `/ws/` to the backend service.

### 4.3 Docker Compose Configuration
`docker-compose.yml` configures network isolation, shared data volume persistence, and automatic container dependency startup with healthcheck probes.

```bash
docker-compose up --build -d
```
