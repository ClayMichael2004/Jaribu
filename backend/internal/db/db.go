package db

import (
	"log"
	"os"
	"path/filepath"
	"strings"
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
	if err := gormDB.AutoMigrate(&models.Song{}, &models.LeaderboardEntry{}, &models.UserProfile{}); err != nil {
		return nil, err
	}

	database := &Database{DB: gormDB}
	database.seedInitialData()

	return database, nil
}

// seedInitialData sets initial benchmark player and default profile if empty
func (d *Database) seedInitialData() {
	var profileCount int64
	d.DB.Model(&models.UserProfile{}).Count(&profileCount)
	if profileCount == 0 {
		d.DB.Create(&models.UserProfile{
			PlayerName:  "Clay",
			AvatarEmoji: "🎧",
			AvatarColor: "#c0c1ff",
			IsActive:    true,
		})
	}

	var count int64
	d.DB.Model(&models.LeaderboardEntry{}).Count(&count)
	if count == 0 {
		samples := []models.LeaderboardEntry{
			{PlayerName: "NairobiGroover", AvatarEmoji: "🎧", AvatarColor: "#c0c1ff", Score: 2450, Category: "kenyan", Difficulty: "medium", GameMode: "solo", MaxStreak: 8, AccuracyPct: 100, CreatedAt: time.Now().Add(-2 * time.Hour)},
			{PlayerName: "AfroQueen", AvatarEmoji: "🔥", AvatarColor: "#ffb95f", Score: 2180, Category: "afrobeats", Difficulty: "medium", GameMode: "solo", MaxStreak: 7, AccuracyPct: 90, CreatedAt: time.Now().Add(-5 * time.Hour)},
			{PlayerName: "RhymeMaster", AvatarEmoji: "⚡", AvatarColor: "#4edea3", Score: 1950, Category: "hiphop", Difficulty: "hard", GameMode: "solo", MaxStreak: 5, AccuracyPct: 80, CreatedAt: time.Now().Add(-12 * time.Hour)},
			{PlayerName: "PopStar254", AvatarEmoji: "⭐", AvatarColor: "#70d6ff", Score: 1800, Category: "pop", Difficulty: "easy", GameMode: "solo", MaxStreak: 6, AccuracyPct: 95, CreatedAt: time.Now().Add(-24 * time.Hour)},
			{PlayerName: "RootsReggaeDJ", AvatarEmoji: "🎧", AvatarColor: "#ffb95f", Score: 1720, Category: "reggae", Difficulty: "medium", GameMode: "solo", MaxStreak: 5, AccuracyPct: 85, CreatedAt: time.Now().Add(-48 * time.Hour)},
			{PlayerName: "GospelVibrations", AvatarEmoji: "⭐", AvatarColor: "#70d6ff", Score: 1650, Category: "gospel", Difficulty: "medium", GameMode: "solo", MaxStreak: 4, AccuracyPct: 80, CreatedAt: time.Now().Add(-72 * time.Hour)},
		}
		for _, s := range samples {
			d.DB.Create(&s)
		}
	}
}

// GetActiveProfile retrieves the saved player profile from SQLite
func (d *Database) GetActiveProfile() (*models.UserProfile, error) {
	var profile models.UserProfile
	err := d.DB.Order("updated_at DESC").First(&profile).Error
	if err != nil {
		return &models.UserProfile{
			PlayerName:  "Clay",
			AvatarEmoji: "🎧",
			AvatarColor: "#c0c1ff",
			IsActive:    true,
		}, nil
	}
	return &profile, nil
}

// SaveProfile persists or updates the user profile in SQLite
func (d *Database) SaveProfile(p *models.UserProfile) error {
	d.mu.Lock()
	defer d.mu.Unlock()

	var existing models.UserProfile
	if err := d.DB.First(&existing).Error; err == nil {
		existing.PlayerName = p.PlayerName
		existing.AvatarEmoji = p.AvatarEmoji
		existing.AvatarColor = p.AvatarColor
		existing.IsActive = true
		return d.DB.Save(&existing).Error
	}
	return d.DB.Create(p).Error
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

// GetAllSoloGames retrieves all individual solo games played with their real scores, sorted newest first
func (d *Database) GetAllSoloGames(category string, limit int) ([]models.LeaderboardEntry, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	var entries []models.LeaderboardEntry
	query := d.DB.Where("game_mode = ? OR game_mode = ''", string(models.ModeSolo)).Order("created_at DESC")

	if category != "" && category != "all" {
		if strings.HasPrefix(category, "artist:") {
			query = query.Where("category = ?", category)
		} else {
			query = query.Where("category = ? OR category LIKE ?", category, "%"+category+"%")
		}
	}

	err := query.Limit(limit).Find(&entries).Error
	return entries, err
}

// GetAllMultiplayerGames retrieves all multiplayer matches with winner and opponent breakdown, sorted newest first
func (d *Database) GetAllMultiplayerGames(category string, limit int) ([]models.LeaderboardEntry, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	var records []models.LeaderboardEntry
	query := d.DB.Where("game_mode = ?", string(models.ModePassPlay)).Order("created_at DESC")

	if category != "" && category != "all" {
		if strings.HasPrefix(category, "artist:") {
			query = query.Where("category = ?", category)
		} else {
			query = query.Where("category = ? OR category LIKE ?", category, "%"+category+"%")
		}
	}

	err := query.Limit(limit).Find(&records).Error
	return records, err
}

// GetLeaderboard retrieves top UNIQUE ranked scores per player name (deduplicated by player name)
func (d *Database) GetLeaderboard(category, difficulty, mode string, limit int) ([]models.LeaderboardEntry, error) {
	if limit <= 0 || limit > 100 {
		limit = 35
	}
	var entries []models.LeaderboardEntry

	subQuery := d.DB.Model(&models.LeaderboardEntry{}).
		Select("player_name, MAX(score) as max_score")

	if category != "" && category != "all" {
		if strings.HasPrefix(category, "artist:") {
			subQuery = subQuery.Where("category = ?", category)
		} else {
			subQuery = subQuery.Where("category = ? OR category LIKE ?", category, "%"+category+"%")
		}
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
	err := query.Limit(100).Find(&records).Error
	return records, err
}

// GetPlayerStats computes all-time highest score and total accumulated score directly in SQLite
func (d *Database) GetPlayerStats(playerName string) (highestScore int, totalScore int, totalGames int, bestStreak int, err error) {
	type StatsResult struct {
		MaxScore   int
		TotalScore int
		GameCount  int
		MaxStreak  int
	}
	var res StatsResult
	query := d.DB.Model(&models.LeaderboardEntry{}).
		Select("COALESCE(MAX(score), 0) as max_score, COALESCE(SUM(score), 0) as total_score, COUNT(*) as game_count, COALESCE(MAX(max_streak), 0) as max_streak")

	if playerName != "" {
		query = query.Where("player_name = ?", playerName)
	}

	err = query.Scan(&res).Error
	return res.MaxScore, res.TotalScore, res.GameCount, res.MaxStreak, err
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
