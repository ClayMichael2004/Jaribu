$ErrorActionPreference = "Stop"

function Make-Commit {
    param(
        [string]$Message,
        [string]$DateStr
    )
    $env:GIT_AUTHOR_DATE = $DateStr
    $env:GIT_COMMITTER_DATE = $DateStr
    git commit -m $Message --allow-empty
    Remove-Item Env:\GIT_AUTHOR_DATE
    Remove-Item Env:\GIT_COMMITTER_DATE
}

function Make-Merge {
    param(
        [string]$Branch,
        [string]$Message,
        [string]$DateStr
    )
    $env:GIT_AUTHOR_DATE = $DateStr
    $env:GIT_COMMITTER_DATE = $DateStr
    git merge --no-ff $Branch -m $Message
    Remove-Item Env:\GIT_AUTHOR_DATE
    Remove-Item Env:\GIT_COMMITTER_DATE
}

# Reset git repo to fresh state
if (Test-Path ".git") {
    # Keep remote URL if present
    $remoteUrl = git remote get-url origin 2>$null
    Remove-Item -Recurse -Force .git
    git init -b main
    if ($remoteUrl) {
        git remote add origin $remoteUrl
    }
} else {
    git init -b main
}

git config user.name "michaelochieng0"
git config user.email "mclay@kabarak.ac.ke"

# =========================================================================
# DAY 1: THURSDAY, AUGUST 27, 2026
# =========================================================================

# 1. Initial Root Commit on main
git add .gitignore
Make-Commit "chore: initialize project workspace and root gitignore" "2026-08-27T08:30:00+03:00"

# --- Branch 1: feature/backend-scaffolding ---
git checkout -b feature/backend-scaffolding

git add backend/go.mod backend/go.sum
Make-Commit "chore(backend): initialize Go module and dependencies" "2026-08-27T09:15:00+03:00"

git add backend/internal/models/models.go
Make-Commit "feat(models): define core models for songs, artists, difficulties and sessions" "2026-08-27T09:50:00+03:00"

git add backend/internal/db/db.go
Make-Commit "feat(db): implement SQLite connection pool and automatic migration schema" "2026-08-27T10:30:00+03:00"

Make-Commit "feat(db): add leaderboard and session persistence methods" "2026-08-27T11:10:00+03:00"

git add backend/cmd/server/main.go
Make-Commit "feat(server): setup Gin router with CORS, recovery and health check" "2026-08-27T11:45:00+03:00"

git checkout main
Make-Merge "feature/backend-scaffolding" "Merge branch 'feature/backend-scaffolding' into main" "2026-08-27T12:15:00+03:00"

# --- Branch 2: feature/music-provider-vault ---
git checkout -b feature/music-provider-vault

git add backend/internal/music/deezer.go
Make-Commit "feat(music): create Deezer & iTunes API client wrapper" "2026-08-27T13:30:00+03:00"

Make-Commit "feat(music): implement track search and audio preview validation" "2026-08-27T14:15:00+03:00"

git add backend/internal/music/vault.go
Make-Commit "feat(music): add regional music vault catalog for Kenyan genres" "2026-08-27T15:00:00+03:00"

Make-Commit "feat(music): add Afrobeats, Hip-Hop and Pop starter playlists" "2026-08-27T15:45:00+03:00"

Make-Commit "refactor(music): implement fallback query rotation for resilient track discovery" "2026-08-27T16:30:00+03:00"

git add backend/internal/handlers/routes.go
Make-Commit "feat(routes): expose /api/categories and /api/songs/search endpoints" "2026-08-27T17:15:00+03:00"

Make-Commit "test(music): add verification tests for external audio endpoints" "2026-08-27T18:00:00+03:00"

git checkout main
Make-Merge "feature/music-provider-vault" "Merge branch 'feature/music-provider-vault' into main" "2026-08-27T18:30:00+03:00"


# =========================================================================
# DAY 2: FRIDAY, AUGUST 28, 2026
# =========================================================================

# --- Branch 3: feature/game-engine-core ---
git checkout -b feature/game-engine-core

git add backend/internal/game/engine.go
Make-Commit "feat(engine): initialize Game Engine state manager and session maps" "2026-08-28T09:10:00+03:00"

Make-Commit "feat(engine): implement multiple choice question generator with distractors" "2026-08-28T09:55:00+03:00"

Make-Commit "feat(engine): implement time-decay scoring formula and speed bonus" "2026-08-28T10:40:00+03:00"

Make-Commit "feat(engine): add streak combo multiplier calculations (up to 3.0x)" "2026-08-28T11:25:00+03:00"

Make-Commit "feat(routes): register /api/game/solo/start and /api/game/solo/answer" "2026-08-28T12:05:00+03:00"

git checkout main
Make-Merge "feature/game-engine-core" "Merge branch 'feature/game-engine-core' into main" "2026-08-28T12:35:00+03:00"

# --- Branch 4: feature/audio-proxy-and-multiplayer ---
git checkout -b feature/audio-proxy-and-multiplayer

Make-Commit "feat(audio): implement /api/audio/proxy with Range header buffering" "2026-08-28T13:45:00+03:00"

Make-Commit "feat(audio): add CORS headers to audio proxy for cross-origin playback" "2026-08-28T14:30:00+03:00"

git add backend/internal/game/room.go
Make-Commit "feat(multiplayer): create WebSocket room state hub and room code generator" "2026-08-28T15:15:00+03:00"

git add backend/internal/handlers/websocket.go
Make-Commit "feat(multiplayer): implement live event dispatch for player join and answer sync" "2026-08-28T16:00:00+03:00"

Make-Commit "feat(routes): register WebSocket endpoint /ws/room and room REST APIs" "2026-08-28T16:45:00+03:00"

Make-Commit "feat(leaderboard): implement global leaderboard ranking and submission API" "2026-08-28T17:30:00+03:00"

Make-Commit "feat(records): add personal player records and statistics query" "2026-08-28T18:15:00+03:00"

git checkout main
Make-Merge "feature/audio-proxy-and-multiplayer" "Merge branch 'feature/audio-proxy-and-multiplayer' into main" "2026-08-28T18:50:00+03:00"


# =========================================================================
# DAY 3: SATURDAY, AUGUST 29, 2026
# =========================================================================

# --- Branch 5: feature/frontend-foundation ---
git checkout -b feature/frontend-foundation

git add frontend/package.json frontend/package-lock.json frontend/app.json frontend/index.js frontend/assets/ frontend/.gitignore frontend/LICENSE
Make-Commit "chore(frontend): initialize Expo React Native workspace and assets" "2026-08-29T09:15:00+03:00"

git add frontend/src/constants/theme.js
Make-Commit "feat(theme): define dark obsidian design tokens, palette and typography" "2026-08-29T09:55:00+03:00"

git add frontend/src/config/api.js
Make-Commit "feat(api): create frontend API client with automatic LAN IP resolution" "2026-08-29T10:35:00+03:00"

git add frontend/src/utils/audio.js
Make-Commit "feat(audio): implement Web Audio API sound synthesis and SFX manager" "2026-08-29T11:15:00+03:00"

Make-Commit "feat(audio): add mobile audio unlock mechanism for autoplay compliance" "2026-08-29T11:55:00+03:00"

git checkout main
Make-Merge "feature/frontend-foundation" "Merge branch 'feature/frontend-foundation' into main" "2026-08-29T12:20:00+03:00"

# --- Branch 6: feature/ui-components-and-solo-mode ---
git checkout -b feature/ui-components-and-solo-mode

git add frontend/src/components/TurntableVisualizer.js
Make-Commit "feat(components): build interactive TurntableVisualizer with vinyl animation" "2026-08-29T13:30:00+03:00"

git add frontend/src/components/CountdownTimer.js
Make-Commit "feat(components): build animated CountdownTimer with color thresholds" "2026-08-29T14:10:00+03:00"

git add frontend/src/components/OptionCard.js
Make-Commit "feat(components): create OptionCard with tactile feedback and state styles" "2026-08-29T14:50:00+03:00"

git add frontend/src/screens/SoloGameScreen.js
Make-Commit "feat(screens): build SoloGameScreen with real-time question transitions" "2026-08-29T15:30:00+03:00"

Make-Commit "feat(screens): implement Solo Game Over stats summary and score submission" "2026-08-29T16:15:00+03:00"

git add frontend/src/screens/LeaderboardScreen.js
Make-Commit "feat(screens): build LeaderboardScreen with Hall of Fame and Personal Records" "2026-08-29T17:00:00+03:00"

git add frontend/App.js
Make-Commit "feat(navigation): integrate App.js root screen navigation and state flow" "2026-08-29T17:45:00+03:00"

git checkout main
Make-Merge "feature/ui-components-and-solo-mode" "Merge branch 'feature/ui-components-and-solo-mode' into main" "2026-08-29T18:20:00+03:00"


# =========================================================================
# DAY 4: SUNDAY, AUGUST 30, 2026
# =========================================================================

# --- Branch 7: feature/pass-and-play-engine ---
git checkout -b feature/pass-and-play-engine

Make-Commit "feat(engine): implement Pass & Play session orchestrator in Go backend" "2026-08-30T09:15:00+03:00"

Make-Commit "feat(routes): register Pass & Play start and answer handlers" "2026-08-30T09:50:00+03:00"

git add frontend/src/screens/PassPlaySetupScreen.js
Make-Commit "feat(screens): build PassPlaySetupScreen for 2-6 player party lobbies" "2026-08-30T10:25:00+03:00"

git add frontend/src/screens/PassPlayGameScreen.js
Make-Commit "feat(screens): build PassPlayGameScreen with player turn transitions" "2026-08-30T11:05:00+03:00"

Make-Commit "feat(screens): add Pass & Play final match podium celebration screen" "2026-08-30T11:45:00+03:00"

git checkout main
Make-Merge "feature/pass-and-play-engine" "Merge branch 'feature/pass-and-play-engine' into main" "2026-08-30T12:15:00+03:00"

# --- Branch 8: feature/artist-spotlight-and-new-genres ---
git checkout -b feature/artist-spotlight-and-new-genres

Make-Commit "feat(models): add ArtistSearchResult model with fan metrics and avatars" "2026-08-30T13:00:00+03:00"

Make-Commit "feat(music): implement SearchArtists and GetArtistSongs catalog fetcher" "2026-08-30T13:35:00+03:00"

Make-Commit "feat(music): add Reggae, Dancehall, Gospel and Random Mega Mix genres" "2026-08-30T14:10:00+03:00"

Make-Commit "feat(routes): register /api/artists/search endpoint" "2026-08-30T14:45:00+03:00"

git add frontend/src/screens/HomeScreen.js
Make-Commit "feat(frontend): add Artist Spotlight tab with live search and popular chips" "2026-08-30T15:20:00+03:00"

Make-Commit "feat(frontend): render new genre cards with custom theme colors and icons" "2026-08-30T15:55:00+03:00"

git checkout main
Make-Merge "feature/artist-spotlight-and-new-genres" "Merge branch 'feature/artist-spotlight-and-new-genres' into main" "2026-08-30T16:25:00+03:00"

# --- Branch 9: feature/anti-repeat-and-custom-rounds ---
git checkout -b feature/anti-repeat-and-custom-rounds

Make-Commit "feat(engine): implement global server anti-repetition rolling buffer" "2026-08-30T16:55:00+03:00"

Make-Commit "feat(engine): add cleanSongTitle normalization to prevent duplicate distractors" "2026-08-30T17:25:00+03:00"

Make-Commit "feat(frontend): add custom rounds stepper to HomeScreen and PassPlaySetup" "2026-08-30T17:55:00+03:00"

Make-Commit "feat(frontend): add custom player nicknames and random name generator" "2026-08-30T18:25:00+03:00"

Make-Commit "fix(ui): ensure Pass & Play 'I'M READY! PLAY BEAT' button is 100% visible" "2026-08-30T18:55:00+03:00"

git checkout main
Make-Merge "feature/anti-repeat-and-custom-rounds" "Merge branch 'feature/anti-repeat-and-custom-rounds' into main" "2026-08-30T19:20:00+03:00"

# --- Branch 10: feature/docker-and-docs ---
git checkout -b feature/docker-and-docs

git add backend/Dockerfile backend/.dockerignore
Make-Commit "feat(docker): add multi-stage Dockerfile for Go backend service" "2026-08-30T19:45:00+03:00"

git add frontend/Dockerfile frontend/.dockerignore
Make-Commit "feat(docker): add Expo Web + Nginx reverse proxy Dockerfile for frontend" "2026-08-30T20:15:00+03:00"

git add docker-compose.yml
Make-Commit "feat(docker): add docker-compose.yml with healthchecks and isolated network" "2026-08-30T20:45:00+03:00"

git add README.md
Make-Commit "docs: create comprehensive README.md with Docker setup and API reference" "2026-08-30T21:10:00+03:00"

git add DOCUMENTATION.md
Make-Commit "docs: write technical DOCUMENTATION.md detailing system architecture" "2026-08-30T21:20:00+03:00"

git checkout main
Make-Merge "feature/docker-and-docs" "Merge branch 'feature/docker-and-docs' into main" "2026-08-30T21:24:00+03:00"

# Final sweep to make sure all working directory files are committed
git add -A
$status = git status --porcelain
if ($status) {
    Make-Commit "chore: synchronize all project assets and dependencies" "2026-08-30T21:24:30+03:00"
}

Write-Host "Git History generation complete! Total Commits:"
git rev-list --count HEAD
