package models

import (
	"time"
)

// Difficulty represents the game difficulty
type Difficulty string

const (
	DifficultyEasy   Difficulty = "easy"   // 15s snippet, 4 options, 15s timer
	DifficultyMedium Difficulty = "medium" // 8s snippet, 4 options, 10s timer
	DifficultyHard   Difficulty = "hard"   // 4s snippet, 6 options, 6s timer
)

// GameMode represents single or party modes
type GameMode string

const (
	ModeSolo     GameMode = "solo"
	ModePassPlay GameMode = "pass_and_play"
	ModeRoom     GameMode = "room"
)

// Song represents a song item with preview audio
type Song struct {
	ID          string    `json:"id" gorm:"primaryKey"`
	Title       string    `json:"title"`
	Artist      string    `json:"artist"`
	Album       string    `json:"album"`
	CoverURL    string    `json:"cover_url"`
	PreviewURL  string    `json:"preview_url"`
	Category    string    `json:"category" gorm:"index"`
	DurationSec int       `json:"duration_sec"`
	CreatedAt   time.Time `json:"created_at"`
}

// Option represents a multiple-choice guess option
type Option struct {
	ID     string `json:"id"`
	Title  string `json:"title"`
	Artist string `json:"artist"`
}

// Question represents a generated question sent to the client (without correct index revealed)
type Question struct {
	ID              string     `json:"id"`
	RoundNumber     int        `json:"round_number"`
	PreviewURL      string     `json:"preview_url"`
	CoverBlurredURL string     `json:"cover_blurred_url,omitempty"`
	DurationLimitMs int        `json:"duration_limit_ms"`
	PlaySnippetSec  int        `json:"play_snippet_sec"`
	Options         []Option   `json:"options"`
	Category        string     `json:"category"`
	Difficulty      Difficulty `json:"difficulty"`
	ForPlayerID     string     `json:"for_player_id,omitempty"`
	ForPlayerName   string     `json:"for_player_name,omitempty"`
}

// QuestionInternal holds secret server-side info for verification
type QuestionInternal struct {
	Question
	CorrectSongID string    `json:"-"`
	CorrectIndex  int       `json:"-"`
	StartedAt     time.Time `json:"-"`
	TargetSong    Song      `json:"-"`
}

// PlayerProfile represents a player in a game
type PlayerProfile struct {
	ID             string `json:"id"`
	Name           string `json:"name"`
	AvatarColor    string `json:"avatar_color"`
	AvatarEmoji    string `json:"avatar_emoji"`
	Score          int    `json:"score"`
	Streak         int    `json:"streak"`
	MaxStreak      int    `json:"max_streak"`
	CorrectGuesses int    `json:"correct_guesses"`
	TotalGuesses   int    `json:"total_guesses"`
	FastestTimeMs  int    `json:"fastest_time_ms"`
}

// SoloGameSession tracks a single-player game session
type SoloGameSession struct {
	SessionID       string            `json:"session_id"`
	Player          PlayerProfile     `json:"player"`
	Difficulty      Difficulty        `json:"difficulty"`
	Category        string            `json:"category"`
	TotalRounds     int               `json:"total_rounds"`
	CurrentRound    int               `json:"current_round"`
	CurrentQuestion *QuestionInternal `json:"current_question,omitempty"`
	IsFinished      bool              `json:"is_finished"`
	FinalScore      int               `json:"final_score"`
	UsedSongIDs     map[string]bool   `json:"-"`
	UsedSongTitles  map[string]bool   `json:"-"`
	CreatedAt       time.Time         `json:"created_at"`
	ExpiresAt       time.Time         `json:"expires_at"`
}

// PassPlaySession tracks local multiplayer (Ludo-style turns)
type PassPlaySession struct {
	SessionID          string            `json:"session_id"`
	Players            []PlayerProfile   `json:"players"`
	CurrentPlayerIndex int               `json:"current_player_index"`
	CurrentRound       int               `json:"current_round"`
	TotalRounds        int               `json:"total_rounds"`
	Difficulty         Difficulty        `json:"difficulty"`
	Category           string            `json:"category"`
	CurrentQuestion    *QuestionInternal `json:"current_question,omitempty"`
	IsFinished         bool              `json:"is_finished"`
	RoundHistory       []RoundResult     `json:"round_history"`
	UsedSongIDs        map[string]bool   `json:"-"`
	UsedSongTitles     map[string]bool   `json:"-"`
	CreatedAt          time.Time         `json:"created_at"`
}

// RoundResult represents the outcome of a single player's guess
type RoundResult struct {
	RoundNumber   int           `json:"round_number"`
	PlayerID      string        `json:"player_id"`
	PlayerName    string        `json:"player_name"`
	SelectedOption Option       `json:"selected_option"`
	CorrectSong   Song          `json:"correct_song"`
	IsCorrect     bool          `json:"is_correct"`
	PointsEarned  int           `json:"points_earned"`
	Streak        int           `json:"streak"`
	Multiplier    float64       `json:"multiplier"`
	TimeTakenMs   int           `json:"time_taken_ms"`
	CurrentScores []PlayerScore `json:"current_scores"`
}

// PlayerScore is a lightweight score mapping
type PlayerScore struct {
	PlayerID    string `json:"player_id"`
	PlayerName  string `json:"player_name"`
	AvatarEmoji string `json:"avatar_emoji"`
	AvatarColor string `json:"avatar_color"`
	Score       int    `json:"score"`
	Rank        int    `json:"rank"`
}

// LeaderboardEntry records high scores in database
type LeaderboardEntry struct {
	ID          uint      `json:"id" gorm:"primaryKey;autoIncrement"`
	PlayerName  string    `json:"player_name" gorm:"index"`
	AvatarEmoji string    `json:"avatar_emoji"`
	AvatarColor string    `json:"avatar_color"`
	Score       int       `json:"score" gorm:"index"`
	Category    string    `json:"category" gorm:"index"`
	Difficulty  string    `json:"difficulty" gorm:"index"`
	GameMode    string    `json:"game_mode" gorm:"index"`
	MaxStreak   int       `json:"max_streak"`
	AccuracyPct int       `json:"accuracy_pct"`
	CreatedAt   time.Time `json:"created_at" gorm:"autoCreateTime"`
}

// CategoryInfo details available music collections
type CategoryInfo struct {
	ID            string   `json:"id"`
	Name          string   `json:"name"`
	Subtitle      string   `json:"subtitle"`
	Emoji         string   `json:"emoji"`
	Color         string   `json:"color"`
	Gradient      []string `json:"gradient"`
	SampleArtists []string `json:"sample_artists"`
	IsSpecial     bool     `json:"is_special"`
}

// ArtistSearchResult represents artist search output
type ArtistSearchResult struct {
	ID        int64    `json:"id"`
	Name      string   `json:"name"`
	Picture   string   `json:"picture"`
	NbAlbums  int      `json:"nb_albums,omitempty"`
	NbFans    int      `json:"nb_fans,omitempty"`
	TopTracks []string `json:"top_tracks,omitempty"`
}

