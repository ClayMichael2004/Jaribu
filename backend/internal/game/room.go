package game

import (
	"encoding/json"
	"log"
	"math/rand"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"jaribu-beats-backend/internal/models"
)

// Client represents a connected websocket player
type Client struct {
	ID          string          `json:"id"`
	Name        string          `json:"name"`
	AvatarEmoji string          `json:"avatar_emoji"`
	AvatarColor string          `json:"avatar_color"`
	RoomCode    string          `json:"room_code"`
	IsHost      bool            `json:"is_host"`
	Score       int             `json:"score"`
	Streak      int             `json:"streak"`
	HasAnswered bool            `json:"has_answered"`
	Conn        *websocket.Conn `json:"-"`
	Send        chan []byte     `json:"-"`
}

// Room represents a live multiplayer game room
type Room struct {
	Code            string                    `json:"code"`
	HostID          string                    `json:"host_id"`
	Category        string                    `json:"category"`
	Difficulty      models.Difficulty         `json:"difficulty"`
	TotalRounds     int                       `json:"total_rounds"`
	CurrentRound    int                       `json:"current_round"`
	Status          string                    `json:"status"` // "lobby", "playing", "round_over", "game_over"
	Clients         map[string]*Client        `json:"clients"`
	CurrentQuestion *models.QuestionInternal `json:"-"`
	UsedSongIDs     map[string]bool           `json:"-"`
	UsedSongTitles  map[string]bool           `json:"-"`
	mu              sync.RWMutex
}

// RoomManager manages all active live multiplayer rooms
type RoomManager struct {
	rooms  map[string]*Room
	mu     sync.RWMutex
	engine *Engine
}

// NewRoomManager creates a new RoomManager instance
func NewRoomManager(engine *Engine) *RoomManager {
	return &RoomManager{
		rooms:  make(map[string]*Room),
		engine: engine,
	}
}

// WSMessage format
type WSMessage struct {
	Type    string          `json:"type"`
	Payload json.RawMessage `json:"payload"`
}

// CreateRoom generates a unique 4-character code and initializes a room
func (rm *RoomManager) CreateRoom(category string, difficulty models.Difficulty, totalRounds int) *Room {
	rm.mu.Lock()
	defer rm.mu.Unlock()

	code := rm.generateRoomCode()
	if totalRounds <= 0 {
		totalRounds = 5
	}
	if difficulty == "" {
		difficulty = models.DifficultyMedium
	}
	if category == "" {
		category = "kenyan"
	}

	room := &Room{
		Code:           code,
		Category:       category,
		Difficulty:     difficulty,
		TotalRounds:    totalRounds,
		CurrentRound:   0,
		Status:         "lobby",
		Clients:        make(map[string]*Client),
		UsedSongIDs:    make(map[string]bool),
		UsedSongTitles: make(map[string]bool),
	}

	rm.rooms[code] = room
	return room
}

// GetRoom retrieves an existing room
func (rm *RoomManager) GetRoom(code string) (*Room, bool) {
	rm.mu.RLock()
	defer rm.mu.RUnlock()
	room, ok := rm.rooms[code]
	return room, ok
}

func (rm *RoomManager) generateRoomCode() string {
	const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
	r := rand.New(rand.NewSource(time.Now().UnixNano()))
	for {
		b := make([]byte, 4)
		for i := range b {
			b[i] = letters[r.Intn(len(letters))]
		}
		code := string(b)
		if _, exists := rm.rooms[code]; !exists {
			return code
		}
	}
}

// Broadcast sends a JSON message to all connected clients in a room
func (r *Room) Broadcast(msgType string, payload interface{}) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	data, err := json.Marshal(payload)
	if err != nil {
		return
	}

	rawMsg, _ := json.Marshal(WSMessage{
		Type:    msgType,
		Payload: data,
	})

	for _, client := range r.Clients {
		select {
		case client.Send <- rawMsg:
		default:
		}
	}
}

// StartRound begins the next live round
func (rm *RoomManager) StartRound(room *Room) {
	room.mu.Lock()
	defer room.mu.Unlock()

	if room.CurrentRound >= room.TotalRounds {
		room.Status = "game_over"
		room.Broadcast("GAME_OVER", room.GetLeaderboardPayload())
		return
	}

	room.CurrentRound++
	room.Status = "playing"

	for _, c := range room.Clients {
		c.HasAnswered = false
	}

	if room.UsedSongIDs == nil {
		room.UsedSongIDs = make(map[string]bool)
	}
	if room.UsedSongTitles == nil {
		room.UsedSongTitles = make(map[string]bool)
	}

	songs := rm.engine.GetSongsForCategory(room.Category)
	qInternal, clientQ, err := rm.engine.generateQuestion(songs, room.Difficulty, room.CurrentRound, room.Category, "", "All Players", room.UsedSongIDs, room.UsedSongTitles)
	if err != nil {
		log.Printf("Failed to generate room question: %v", err)
		return
	}
	room.CurrentQuestion = qInternal

	room.Broadcast("ROUND_START", clientQ)
}

// HandleAnswer processes a client's live guess
func (rm *RoomManager) HandleAnswer(room *Room, client *Client, selectedID string, timeTakenMs int) {
	room.mu.Lock()
	defer room.mu.Unlock()

	if room.Status != "playing" || client.HasAnswered || room.CurrentQuestion == nil {
		return
	}

	client.HasAnswered = true
	q := room.CurrentQuestion
	isCorrect := (selectedID == q.CorrectSongID)

	points, mult := rm.engine.calculateScore(isCorrect, room.Difficulty, timeTakenMs, q.DurationLimitMs, client.Streak)
	if isCorrect {
		client.Streak++
		client.Score += points
	} else {
		client.Streak = 0
	}

	// Notify player of personal result
	resPayload := map[string]interface{}{
		"player_id":     client.ID,
		"player_name":   client.Name,
		"is_correct":    isCorrect,
		"points_earned": points,
		"multiplier":    mult,
		"total_score":   client.Score,
		"streak":        client.Streak,
		"correct_song":  q.TargetSong,
	}
	room.Broadcast("PLAYER_ANSWERED", resPayload)

	// Check if all clients have answered
	allAnswered := true
	for _, c := range room.Clients {
		if !c.HasAnswered {
			allAnswered = false
			break
		}
	}

	if allAnswered {
		room.Status = "round_over"
		room.Broadcast("ROUND_OVER", map[string]interface{}{
			"correct_song": q.TargetSong,
			"scores":       room.GetLeaderboardPayload(),
		})
	}
}

// GetLeaderboardPayload returns sorted player list
func (r *Room) GetLeaderboardPayload() []map[string]interface{} {
	var list []map[string]interface{}
	for _, c := range r.Clients {
		list = append(list, map[string]interface{}{
			"id":           c.ID,
			"name":         c.Name,
			"avatar_emoji": c.AvatarEmoji,
			"avatar_color": c.AvatarColor,
			"score":        c.Score,
			"streak":       c.Streak,
			"is_host":      c.IsHost,
		})
	}
	return list
}
