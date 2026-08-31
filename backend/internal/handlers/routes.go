package handlers

import (
	"encoding/json"
	"io"
	"log"
	"net/http"
	"strconv"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"

	"jaribu-beats-backend/internal/db"
	"jaribu-beats-backend/internal/game"
	"jaribu-beats-backend/internal/models"
	"jaribu-beats-backend/internal/music"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

// Handler contains dependencies for routing
type Handler struct {
	db          *db.Database
	deezer      *music.DeezerClient
	engine      *game.Engine
	roomManager *game.RoomManager
	httpClient  *http.Client
}

// NewHandler initializes handler dependencies
func NewHandler(database *db.Database, deezerClient *music.DeezerClient, gameEngine *game.Engine, rm *game.RoomManager) *Handler {
	return &Handler{
		db:          database,
		deezer:      deezerClient,
		engine:      gameEngine,
		roomManager: rm,
		httpClient: &http.Client{
			Timeout: 15 * time.Second,
		},
	}
}

// RegisterRoutes sets up all REST and WebSocket routes
func (h *Handler) RegisterRoutes(r *gin.Engine) {
	api := r.Group("/api")
	{
		// Health check
		api.GET("/health", h.HealthCheck)

		// Audio Stream Proxy (Eliminates browser autoplay/CORS/hotlinking restrictions)
		api.GET("/audio/proxy", h.ProxyAudioStream)

		// Categories & Music Discovery
		api.GET("/categories", h.GetCategories)
		api.GET("/songs/search", h.SearchSongs)
		api.GET("/artists/search", h.SearchArtists)

		// Solo Game Mode
		api.POST("/game/solo/start", h.StartSoloGame)
		api.POST("/game/solo/answer", h.SubmitSoloAnswer)

		// Pass & Play Mode
		api.POST("/game/pass-play/start", h.StartPassPlayGame)
		api.POST("/game/pass-play/answer", h.SubmitPassPlayAnswer)

		// Player Profile Persistence (Permanent in SQLite)
		api.GET("/profile", h.GetProfile)
		api.POST("/profile", h.SaveProfile)

		// Leaderboards & Games Feed
		api.GET("/leaderboard", h.GetLeaderboard)
		api.GET("/games/solo", h.GetSoloGames)
		api.GET("/games/multiplayer", h.GetMultiplayerGames)
		api.POST("/leaderboard/submit", h.SubmitLeaderboard)
		api.GET("/records/my", h.GetMyRecords)
		api.POST("/records/reset", h.ResetRecords)

		// Live Rooms
		api.POST("/rooms/create", h.CreateRoom)
		api.GET("/rooms/:code", h.GetRoomInfo)
	}

	r.GET("/ws/room", h.HandleWebSocket)
}

// HealthCheck returns server status
func (h *Handler) HealthCheck(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":    "healthy",
		"timestamp": time.Now().Unix(),
		"version":   "1.0.0",
		"service":   "Jaribu Beats Engine",
	})
}

// ProxyAudioStream streams remote MP3 preview audio to client with proper Content-Type & CORS headers
func (h *Handler) ProxyAudioStream(c *gin.Context) {
	audioURL := c.Query("url")
	if audioURL == "" {
		c.String(http.StatusBadRequest, "Missing url parameter")
		return
	}

	req, err := http.NewRequest("GET", audioURL, nil)
	if err != nil {
		c.String(http.StatusInternalServerError, "Invalid URL")
		return
	}

	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")

	// Copy Range header for seeking/audio buffer
	if rangeHeader := c.GetHeader("Range"); rangeHeader != "" {
		req.Header.Set("Range", rangeHeader)
	}

	resp, err := h.httpClient.Do(req)
	if err != nil {
		c.String(http.StatusBadGateway, "Failed to stream audio")
		return
	}
	defer resp.Body.Close()

	contentType := resp.Header.Get("Content-Type")
	if contentType == "" {
		contentType = "audio/mpeg"
	}
	c.Header("Content-Type", contentType)
	c.Header("Accept-Ranges", "bytes")
	c.Header("Access-Control-Allow-Origin", "*")

	if resp.Header.Get("Content-Length") != "" {
		c.Header("Content-Length", resp.Header.Get("Content-Length"))
	}
	if resp.Header.Get("Content-Range") != "" {
		c.Header("Content-Range", resp.Header.Get("Content-Range"))
	}

	c.Status(resp.StatusCode)
	_, _ = io.Copy(c.Writer, resp.Body)
}

// GetCategories returns available genres
func (h *Handler) GetCategories(c *gin.Context) {
	categories := music.GetAvailableCategories()
	c.JSON(http.StatusOK, gin.H{
		"categories": categories,
	})
}

// SearchSongs allows on-demand track preview queries for any artist
func (h *Handler) SearchSongs(c *gin.Context) {
	query := c.Query("q")
	if query == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "search query 'q' is required"})
		return
	}
	limitStr := c.DefaultQuery("limit", "20")
	limit, _ := strconv.Atoi(limitStr)

	songs, err := h.deezer.SearchTracks(query, "custom", limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"query": query,
		"total": len(songs),
		"songs": songs,
	})
}

// SearchArtists searches for artists with names and photos for the Artist Spotlight mode
func (h *Handler) SearchArtists(c *gin.Context) {
	query := c.Query("q")
	if query == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "search query 'q' is required"})
		return
	}
	limitStr := c.DefaultQuery("limit", "15")
	limit, _ := strconv.Atoi(limitStr)

	artists, err := h.deezer.SearchArtists(query, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"query":   query,
		"total":   len(artists),
		"artists": artists,
	})
}

// StartSoloGameRequest input
type StartSoloGameRequest struct {
	PlayerName  string `json:"player_name"`
	AvatarEmoji string `json:"avatar_emoji"`
	AvatarColor string `json:"avatar_color"`
	Category    string `json:"category"`
	Difficulty  string `json:"difficulty"`
	TotalRounds int    `json:"total_rounds"`
}

// StartSoloGame initiates single player session
func (h *Handler) StartSoloGame(c *gin.Context) {
	var req StartSoloGameRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.Category == "" {
		req.Category = "kenyan"
	}
	if req.TotalRounds <= 0 {
		req.TotalRounds = 5
	}
	diff := models.Difficulty(req.Difficulty)
	if diff == "" {
		diff = models.DifficultyMedium
	}

	session, question, err := h.engine.StartSoloSession(
		req.PlayerName,
		req.AvatarEmoji,
		req.AvatarColor,
		req.Category,
		diff,
		req.TotalRounds,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"session_id":     session.SessionID,
		"player":         session.Player,
		"difficulty":     session.Difficulty,
		"category":       session.Category,
		"total_rounds":   session.TotalRounds,
		"current_round":  session.CurrentRound,
		"first_question": question,
	})
}

// SubmitAnswerRequest input
type SubmitAnswerRequest struct {
	SessionID        string `json:"session_id" binding:"required"`
	SelectedOptionID string `json:"selected_option_id" binding:"required"`
	TimeTakenMs      int    `json:"time_taken_ms"`
}

// SubmitSoloAnswer checks guess and returns score + next question
func (h *Handler) SubmitSoloAnswer(c *gin.Context) {
	var req SubmitAnswerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	result, nextQ, isGameOver, err := h.engine.SubmitSoloAnswer(req.SessionID, req.SelectedOptionID, req.TimeTakenMs)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"result":        result,
		"next_question": nextQ,
		"is_game_over":  isGameOver,
	})
}

// StartPassPlayRequest input
type StartPassPlayRequest struct {
	Players              []models.PlayerProfile `json:"players" binding:"required"`
	Category             string                 `json:"category"`
	Difficulty           string                 `json:"difficulty"`
	TotalRoundsPerPlayer int                    `json:"rounds_per_player"`
}

// StartPassPlayGame initiates local multiplayer
func (h *Handler) StartPassPlayGame(c *gin.Context) {
	var req StartPassPlayRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if len(req.Players) < 2 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "At least 2 players are required for Pass & Play"})
		return
	}
	if req.Category == "" {
		req.Category = "kenyan"
	}
	if req.TotalRoundsPerPlayer <= 0 {
		req.TotalRoundsPerPlayer = 3
	}
	diff := models.Difficulty(req.Difficulty)
	if diff == "" {
		diff = models.DifficultyMedium
	}

	session, question, err := h.engine.StartPassPlaySession(
		req.Players,
		req.Category,
		diff,
		req.TotalRoundsPerPlayer,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"session_id":           session.SessionID,
		"players":              session.Players,
		"current_player_index": session.CurrentPlayerIndex,
		"current_player":       session.Players[0],
		"total_rounds":         session.TotalRounds,
		"first_question":       question,
	})
}

// SubmitPassPlayAnswer submits player's turn in Pass & Play
func (h *Handler) SubmitPassPlayAnswer(c *gin.Context) {
	var req SubmitAnswerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	result, nextPlayer, nextQ, isGameOver, err := h.engine.SubmitPassPlayAnswer(req.SessionID, req.SelectedOptionID, req.TimeTakenMs)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"result":        result,
		"next_player":   nextPlayer,
		"next_question": nextQ,
		"is_game_over":  isGameOver,
	})
}

// GetLeaderboard handles fetching ranked scores with category filtering
func (h *Handler) GetLeaderboard(c *gin.Context) {
	category := c.Query("category")
	difficulty := c.Query("difficulty")
	mode := c.Query("mode")
	limitStr := c.DefaultQuery("limit", "35")
	limit, _ := strconv.Atoi(limitStr)

	entries, err := h.db.GetLeaderboard(category, difficulty, mode, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"category":    category,
		"total":       len(entries),
		"leaderboard": entries,
	})
}

// GetMultiplayerLeaderboard returns all multiplayer matches with winner breakdown
// GetProfile retrieves the active persistent profile from SQLite
func (h *Handler) GetProfile(c *gin.Context) {
	profile, err := h.db.GetActiveProfile()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"profile": profile,
	})
}

// SaveProfile updates or saves player profile permanently into SQLite
func (h *Handler) SaveProfile(c *gin.Context) {
	var req models.UserProfile
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if req.PlayerName == "" {
		req.PlayerName = "Clay"
	}
	if req.AvatarEmoji == "" {
		req.AvatarEmoji = "🎧"
	}
	if req.AvatarColor == "" {
		req.AvatarColor = "#c0c1ff"
	}

	if err := h.db.SaveProfile(&req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status":  "saved",
		"profile": req,
	})
}

// GetSoloGames returns all played solo games sorted newest first with category filter
func (h *Handler) GetSoloGames(c *gin.Context) {
	category := c.Query("category")
	limitStr := c.DefaultQuery("limit", "50")
	limit, _ := strconv.Atoi(limitStr)

	games, err := h.db.GetAllSoloGames(category, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"category": category,
		"total":    len(games),
		"games":    games,
	})
}

// GetMultiplayerGames returns all played multiplayer matches sorted newest first with category filter
func (h *Handler) GetMultiplayerGames(c *gin.Context) {
	category := c.Query("category")
	limitStr := c.DefaultQuery("limit", "50")
	limit, _ := strconv.Atoi(limitStr)

	matches, err := h.db.GetAllMultiplayerGames(category, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"category": category,
		"total":    len(matches),
		"matches":  matches,
	})
}

// GetMyRecords returns historical records for user's profile with calculated high scores and total accumulated score
func (h *Handler) GetMyRecords(c *gin.Context) {
	playerName := c.DefaultQuery("player_name", "Clay")
	records, err := h.db.GetPlayerRecords(playerName)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	highestScore, totalScore, totalGames, bestStreak, _ := h.db.GetPlayerStats(playerName)
	if totalGames == 0 && len(records) > 0 {
		totalGames = len(records)
		for _, r := range records {
			if r.Score > highestScore {
				highestScore = r.Score
			}
			totalScore += r.Score
			if r.MaxStreak > bestStreak {
				bestStreak = r.MaxStreak
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"player_name":             playerName,
		"total_games":             totalGames,
		"highest_score":           highestScore,
		"total_accumulated_score": totalScore,
		"best_streak":             bestStreak,
		"records":                 records,
	})
}

// ResetRecords clears all scores or player specific history
func (h *Handler) ResetRecords(c *gin.Context) {
	playerName := c.Query("player_name")
	if err := h.db.ClearAllRecords(playerName); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status":  "cleared",
		"message": "Scores and match history reset successfully.",
	})
}

// SubmitLeaderboard saves a finished score
func (h *Handler) SubmitLeaderboard(c *gin.Context) {
	var entry models.LeaderboardEntry
	if err := c.ShouldBindJSON(&entry); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.db.SaveLeaderboardEntry(&entry); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "saved", "entry": entry})
}

// CreateRoom creates a live multiplayer lobby
func (h *Handler) CreateRoom(c *gin.Context) {
	var req struct {
		Category    string `json:"category"`
		Difficulty  string `json:"difficulty"`
		TotalRounds int    `json:"total_rounds"`
	}
	_ = c.ShouldBindJSON(&req)

	diff := models.Difficulty(req.Difficulty)
	if diff == "" {
		diff = models.DifficultyMedium
	}

	room := h.roomManager.CreateRoom(req.Category, diff, req.TotalRounds)
	c.JSON(http.StatusOK, gin.H{
		"room_code":    room.Code,
		"category":     room.Category,
		"difficulty":   room.Difficulty,
		"total_rounds": room.TotalRounds,
	})
}

// GetRoomInfo checks if room exists
func (h *Handler) GetRoomInfo(c *gin.Context) {
	code := c.Param("code")
	room, exists := h.roomManager.GetRoom(code)
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "Room not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":         room.Code,
		"category":     room.Category,
		"difficulty":   room.Difficulty,
		"total_rounds": room.TotalRounds,
		"status":       room.Status,
		"players":      room.GetLeaderboardPayload(),
	})
}

// HandleWebSocket manages real-time socket connections for rooms
func (h *Handler) HandleWebSocket(c *gin.Context) {
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("WebSocket upgrade failed: %v", err)
		return
	}

	roomCode := c.Query("room")
	playerName := c.DefaultQuery("name", "Player")
	avatarEmoji := c.DefaultQuery("emoji", "🎵")
	avatarColor := c.DefaultQuery("color", "#FF5722")

	room, exists := h.roomManager.GetRoom(roomCode)
	if !exists {
		_ = conn.WriteJSON(gin.H{"error": "Room not found"})
		conn.Close()
		return
	}

	clientID := uuid.New().String()
	isHost := (len(room.Clients) == 0)

	client := &game.Client{
		ID:          clientID,
		Name:        playerName,
		AvatarEmoji: avatarEmoji,
		AvatarColor: avatarColor,
		RoomCode:    roomCode,
		IsHost:      isHost,
		Conn:        conn,
		Send:        make(chan []byte, 256),
	}

	room.Clients[clientID] = client
	if isHost {
		room.HostID = clientID
	}

	// Broadcast player joined
	room.Broadcast("PLAYER_JOINED", map[string]interface{}{
		"player":  client,
		"players": room.GetLeaderboardPayload(),
		"is_host": isHost,
	})

	var wg sync.WaitGroup
	wg.Add(2)

	// Writer pump
	go func() {
		defer wg.Done()
		for msg := range client.Send {
			if err := conn.WriteMessage(websocket.TextMessage, msg); err != nil {
				break
			}
		}
		conn.Close()
	}()

	// Reader pump
	go func() {
		defer wg.Done()
		defer func() {
			delete(room.Clients, clientID)
			close(client.Send)
			room.Broadcast("PLAYER_LEFT", map[string]interface{}{
				"player_id": clientID,
				"players":   room.GetLeaderboardPayload(),
			})
			conn.Close()
		}()

		for {
			_, message, err := conn.ReadMessage()
			if err != nil {
				break
			}

			var wsMsg struct {
				Type    string          `json:"type"`
				Payload json.RawMessage `json:"payload"`
			}
			if err := json.Unmarshal(message, &wsMsg); err != nil {
				continue
			}

			switch wsMsg.Type {
			case "START_GAME":
				if client.IsHost {
					h.roomManager.StartRound(room)
				}
			case "SUBMIT_ANSWER":
				var ans struct {
					OptionID    string `json:"option_id"`
					TimeTakenMs int    `json:"time_taken_ms"`
				}
				if err := json.Unmarshal(wsMsg.Payload, &ans); err == nil {
					h.roomManager.HandleAnswer(room, client, ans.OptionID, ans.TimeTakenMs)
				}
			case "NEXT_ROUND":
				if client.IsHost {
					h.roomManager.StartRound(room)
				}
			}
		}
	}()
}
