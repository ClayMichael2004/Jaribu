# 🚀 Jaribu — Cloud Deployment Guide (Render & Docker)

This guide provides step-by-step instructions for deploying **Jaribu** to production on **[Render.com](https://render.com)** as well as **Docker / VPS** environments.

---

## 📋 Table of Contents
1. [Architecture Overview](#1-architecture-overview)
2. [Deploying to Render (Recommended)](#2-deploying-to-render-recommended)
   - [Step 1: Deploy Go Backend (Web Service)](#step-1-deploy-go-backend-web-service)
   - [Step 2: Deploy Frontend Web App (Static Site)](#step-2-deploy-frontend-web-app-static-site)
   - [Step 3: Connect Android APK to Cloud Backend](#step-3-connect-android-apk-to-cloud-backend)
3. [How SQLite Works in Production](#3-how-sqlite-works-in-production)
4. [Alternative: Deploying with Docker Compose on VPS](#4-alternative-deploying-with-docker-compose-on-vps)
5. [Post-Deployment Smoke Test Checklist](#5-post-deployment-smoke-test-checklist)

---

## 1. Architecture Overview

In production, the application splits into two high-performance cloud components:

```
[ Android App / Web Browser ]
             │
             ▼ (HTTPS / WSS)
   ┌─────────────────────────────────────────┐
   │        Render Cloud Platform            │
   │                                         │
   │   ┌─────────────────────────────────┐   │
   │   │  Frontend (Static Site / CDN)   │   │
   │   │  https://jaribu-app.onrender.com│   │
   │   └────────────────┬────────────────┘   │
   │                    │ (API calls)        │
   │   ┌────────────────▼────────────────┐   │
   │   │  Go Backend (Web Service)       │   │
   │   │  https://jaribu-api.onrender.com│   │
   │   │  - Port dynamically assigned    │   │
   │   │  - SQLite (Auto-migrating)      │   │
   │   │  - Audio Proxy & Stream Cache   │   │
   │   └─────────────────────────────────┘   │
   └─────────────────────────────────────────┘
```

---

## 2. Deploying to Render (Recommended)

Render offers free SSL, automatic continuous deployment on every `git push`, and native Go runtime support.

### Prerequisites
- A free account on **[Render.com](https://render.com)**.
- Your GitHub repository connected to Render: `https://github.com/ClayMichael2004/Jaribu`.

---

### Step 1: Deploy Go Backend (Web Service)

1. Log in to your Render Dashboard and click **New + > Web Service**.
2. Select your repository: **`ClayMichael2004/Jaribu`**.
3. Fill in the following configuration settings:

| Setting | Value |
| :--- | :--- |
| **Name** | `jaribu-backend` |
| **Region** | Choose the closest region (e.g. *Frankfurt*, *Oregon*, *Singapore*) |
| **Branch** | `main` |
| **Root Directory** | `backend` |
| **Runtime** | **Go** *(or **Docker**)* |
| **Build Command** | `go build -o server ./cmd/server` |
| **Start Command** | `./server` |
| **Instance Type** | **Free** *(or Starter)* |

4. **Environment Variables**:
   Click **Advanced > Add Environment Variable**:
   - `GIN_MODE` = `release`

5. *(Optional for Paid Tier)* **Persistent Disk**:
   - If using a paid instance and you want permanent SQLite database storage across all restarts, go to **Disks > Add Disk**:
     - **Name**: `sqlite-data`
     - **Mount Path**: `data`
     - **Size**: `1 GB`

6. Click **Create Web Service**.

> **Note on Port**: Render automatically passes a dynamic `PORT` environment variable (e.g., `PORT=10000`). The Go server in `backend/cmd/server/main.go` reads `os.Getenv("PORT")` automatically and binds to `0.0.0.0:PORT`.

Once deployed, Render provides your public backend URL:
👉 `https://jaribu-backend.onrender.com`

---

### Step 2: Deploy Frontend Web App (Static Site)

Render provides **100% Free** hosting with global CDN edge caching for static single-page web applications.

1. In Render Dashboard, click **New + > Static Site**.
2. Select the same repository: **`ClayMichael2004/Jaribu`**.
3. Configure the settings:

| Setting | Value |
| :--- | :--- |
| **Name** | `jaribu-app` |
| **Branch** | `main` |
| **Root Directory** | `frontend` |
| **Build Command** | `npm install && npx expo export --platform web` |
| **Publish Directory** | `dist` |

4. **Add Environment Variable**:
   - `EXPO_PUBLIC_API_URL` = `https://jaribu-backend.onrender.com` *(Use your actual backend URL from Step 1)*

5. Click **Create Static Site**.

Your web game is live at:
👉 `https://jaribu-app.onrender.com`

---

### Step 3: Connect Android APK to Cloud Backend

To allow your Android mobile APK to connect to your live cloud backend from anywhere (using mobile data / Wi-Fi):

1. In `frontend/src/config/api.js`, update the fallback or production URL to your Render backend:
   ```javascript
   const PRODUCTION_API = 'https://jaribu-backend.onrender.com';
   ```
2. Build the Android APK in Android Studio:
   - Click **Build > Build Bundle(s) / APK(s) > Build APK(s)**.
   - Output APK location: `frontend/android/app/build/outputs/apk/debug/app-debug.apk`.
3. Install on any Android phone. Players anywhere in the world can now compete without being on the same local Wi-Fi network!

---

## 3. How SQLite Works in Production

### Zero-Configuration Database
- When the Go backend boots up, it executes `db.InitDB()`.
- It automatically creates the `data/` directory and `jaribu_beats.db` database file if they do not exist.
- It executes all table migrations and seeds initial benchmark high scores automatically.
- **You will never need to install a database server, run SQL scripts, or configure database credentials.**

### Free Tier vs. Persistent Disk on Render
| Tier | SQLite Behavior | Best For |
| :--- | :--- | :--- |
| **Free Plan** | Database file lives in container storage; resets if container sleeps after 15m idle. | Testing, demos, playing live matches with friends. |
| **Starter ($7/mo) + Disk** | Database file lives on dedicated physical cloud block storage; never resets. | Production leaderboards & historical records. |

---

## 4. Alternative: Deploying with Docker Compose on VPS

If deploying to your own Virtual Private Server (DigitalOcean Droplet, AWS EC2, Linode, Ubuntu VPS):

```bash
# 1. Clone repository on your VPS
git clone https://github.com/ClayMichael2004/Jaribu.git
cd Jaribu

# 2. Start both frontend & backend with Docker Compose
docker-compose up --build -d

# 3. Check status
docker-compose ps
```

- **Frontend**: `http://<your-server-ip>:3000`
- **Backend API**: `http://<your-server-ip>:8080/api/health`

---

## 5. Post-Deployment Smoke Test Checklist

After deploying to Render, verify these endpoints to ensure full health:

- [ ] **Health Endpoint**: Visit `https://jaribu-backend.onrender.com/api/health` -> Returns `{"status":"healthy"}`.
- [ ] **Music Categories**: Visit `https://jaribu-backend.onrender.com/api/categories` -> Returns list of 10 music genres.
- [ ] **Artist Search**: Visit `https://jaribu-backend.onrender.com/api/artists/search?q=drake` -> Returns artists with photos.
- [ ] **Audio Stream Proxy**: Test song preview playback in Solo Rush or Pass & Play mode.
- [ ] **End-to-End Game**: Complete a 3-round Solo Rush match and verify the score records on the Leaderboard.
