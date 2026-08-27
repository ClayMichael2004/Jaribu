package db

import (
	"log"
	"os"
	"path/filepath"
	"sync"
	"time"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"jaribu-beats-backend/internal/models"
)

// Database wraps the gorm.DB connection
type Database struct {
	DB *gorm.DB
	mu sync.RWMutex
}

// InitDB initializes SQLite database and auto-migrates models
func InitDB() (*Database, error) {
	dbDir := "./data"
	if err := os.MkdirAll(dbDir, 0755); err != nil {
		log.Printf("Failed to create db dir, falling back to current dir: %v", err)
		dbDir = "."
	}
	dbPath := filepath.Join(dbDir, "jaribu_beats.db")

	gormDB, err := gorm.Open(sqlite.Open(dbPath), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		return nil, err
	}

	// Auto-migrate tables
	if err := gormDB.AutoMigrate(&models.Song{}, &models.LeaderboardEntry{}); err != nil {
		return nil, err
	}

	database := &Database{DB: gormDB}
	database.seedInitialHighScores()

	return database, nil
}

// seedInitialHighScores sets initial benchmark players only if empty
func (d *Database) seedInitialHighScores() {
	var count int64
	d.DB.Model(&models.LeaderboardEntry{}).Count(&count)
	if count == 0 {
		samples := []models.LeaderboardEntry{
			{PlayerName: "NairobiGroover", AvatarEmoji: "🦁", AvatarColor: "#FF5722", Score: 2450, Category: "kenyan", Difficulty: "medium", GameMode: "solo", MaxStreak: 8, AccuracyPct: 100, CreatedAt: time.Now().Add(-2 * time.Hour)},
			{PlayerName: "AfroQueen", AvatarEmoji: "👑", AvatarColor: "#EC4899", Score: 2180, Category: "afrobeats", Difficulty: "medium", GameMode: "solo", MaxStreak: 7, AccuracyPct: 90, CreatedAt: time.Now().Add(-5 * time.Hour)},
			{PlayerName: "RhymeMaster", AvatarEmoji: "🎧", AvatarColor: "#7C3AED", Score: 1950, Category: "hiphop", Difficulty: "hard", GameMode: "solo", MaxStreak: 5, AccuracyPct: 80, CreatedAt: time.Now().Add(-12 * time.Hour)},
			{PlayerName: "PopStar254", AvatarEmoji: "⭐", AvatarColor: "#00E5FF", Score: 1800, Category: "pop", Difficulty: "easy", GameMode: "solo", MaxStreak: 6, AccuracyPct: 95, CreatedAt: time.Now().Add(-24 * time.Hour)},
		}
		for _, s := range samples {
			d.DB.Create(&s)
		}
	}
}

// SaveSongs batch stores or updates songs cleanly
func (d *Database) SaveSongs(songs []models.Song) {
	d.mu.Lock()
	defer d.mu.Unlock()
	for _, s := range songs {
		d.DB.Save(&s)
	}
}

// GetSongsByCategory returns cached songs for a category
func (d *Database) GetSongsByCategory(category string, limit int) []models.Song {
	var songs []models.Song
	query := d.DB.Where("category = ?", category)
	if limit > 0 {
		query = query.Limit(limit)
	}
	query.Find(&songs)
	return songs
}

// SaveLeaderboardEntry records a new game score
func (d *Database) SaveLeaderboardEntry(entry *models.LeaderboardEntry) error {
	d.mu.Lock()
	defer d.mu.Unlock()
	return d.DB.Create(entry).Error
}

// GetLeaderboard retrieves top UNIQUE scores per player name (no duplicates for Player 1!)
func (d *Database) GetLeaderboard(category, difficulty, mode string, limit int) ([]models.LeaderboardEntry, error) {
	if limit <= 0 || limit > 100 {
		limit = 25
	}
	var entries []models.LeaderboardEntry

	// Deduplicate by player_name, taking only their highest score record
	subQuery := d.DB.Model(&models.LeaderboardEntry{}).
		Select("player_name, MAX(score) as max_score")

	if category != "" && category != "all" {
		subQuery = subQuery.Where("category = ?", category)
	}
	if difficulty != "" && difficulty != "all" {
		subQuery = subQuery.Where("difficulty = ?", difficulty)
	}
	if mode != "" && mode != "all" {
		subQuery = subQuery.Where("game_mode = ?", mode)
	}
	subQuery = subQuery.Group("player_name")

	err := d.DB.Model(&models.LeaderboardEntry{}).
		Joins("JOIN (?) AS best ON leaderboard_entries.player_name = best.player_name AND leaderboard_entries.score = best.max_score", subQuery).
		Group("leaderboard_entries.player_name").
		Order("leaderboard_entries.score DESC").
		Limit(limit).
		Find(&entries).Error

	return entries, err
}

// GetPlayerRecords returns all historical game sessions for a specific player name
func (d *Database) GetPlayerRecords(playerName string) ([]models.LeaderboardEntry, error) {
	var records []models.LeaderboardEntry
	query := d.DB.Order("created_at DESC")
	if playerName != "" {
		query = query.Where("player_name = ?", playerName)
	}
	err := query.Limit(50).Find(&records).Error
	return records, err
}

// ClearAllRecords completely clears leaderboard and player records
func (d *Database) ClearAllRecords(playerName string) error {
	d.mu.Lock()
	defer d.mu.Unlock()
	if playerName != "" {
		return d.DB.Where("player_name = ?", playerName).Delete(&models.LeaderboardEntry{}).Error
	}
	return d.DB.Exec("DELETE FROM leaderboard_entries").Error
}
