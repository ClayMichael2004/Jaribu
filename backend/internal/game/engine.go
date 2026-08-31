package game

import (
	"fmt"
	"math"
	"math/rand"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"jaribu-beats-backend/internal/db"
	"jaribu-beats-backend/internal/models"
	"jaribu-beats-backend/internal/music"
)

// Engine orchestrates game session lifecycle, scoring, and non-repeating question generation
type Engine struct {
	db            *db.Database
	deezer        *music.DeezerClient
	soloMutex     sync.RWMutex
	soloGames     map[string]*models.SoloGameSession
	passMutex     sync.RWMutex
	passPlayMap   map[string]*models.PassPlaySession
	songPoolLock  sync.RWMutex
	categoryPool  map[string][]models.Song
	recentLock    sync.RWMutex
	recentSongIDs []string
	recentTitles  []string
}

// NewEngine constructs a new Game Engine instance
func NewEngine(database *db.Database, deezerClient *music.DeezerClient) *Engine {
	eng := &Engine{
		db:            database,
		deezer:        deezerClient,
		soloGames:     make(map[string]*models.SoloGameSession),
		passPlayMap:   make(map[string]*models.PassPlaySession),
		categoryPool:  make(map[string][]models.Song),
		recentSongIDs: make([]string, 0, 200),
		recentTitles:  make([]string, 0, 200),
	}
	go eng.warmupSongPools()
	return eng
}

func cleanSongTitle(title string) string {
	t := strings.ToLower(title)
	if idx := strings.Index(t, "("); idx != -1 {
		t = t[:idx]
	}
	if idx := strings.Index(t, "["); idx != -1 {
		t = t[:idx]
	}
	t = strings.ReplaceAll(t, "-", " ")
	return strings.TrimSpace(t)
}

func (e *Engine) recordRecentSong(id, title string) {
	e.recentLock.Lock()
	defer e.recentLock.Unlock()

	e.recentSongIDs = append(e.recentSongIDs, id)
	if len(e.recentSongIDs) > 150 {
		e.recentSongIDs = e.recentSongIDs[len(e.recentSongIDs)-150:]
	}

	norm := cleanSongTitle(title)
	e.recentTitles = append(e.recentTitles, norm)
	if len(e.recentTitles) > 150 {
		e.recentTitles = e.recentTitles[len(e.recentTitles)-150:]
	}
}

func (e *Engine) isRecentlyPlayed(id, title string) bool {
	e.recentLock.RLock()
	defer e.recentLock.RUnlock()

	for _, rid := range e.recentSongIDs {
		if rid == id {
			return true
		}
	}
	norm := cleanSongTitle(title)
	for _, rt := range e.recentTitles {
		if rt == norm {
			return true
		}
	}
	return false
}

func (e *Engine) warmupSongPools() {
	categories := music.GetAvailableCategories()
	for _, cat := range categories {
		songs, err := e.deezer.GetCategorySongs(cat.ID, 40)
		if err == nil && len(songs) > 0 {
			e.songPoolLock.Lock()
			e.categoryPool[cat.ID] = songs
			e.songPoolLock.Unlock()
			e.db.SaveSongs(songs)
		}
	}
}

// GetSongsForCategory retrieves songs with dynamic fetching and artist query support
func (e *Engine) GetSongsForCategory(category string) []models.Song {
	// For artist queries or general mix, dynamically fetch fresh pool
	if strings.HasPrefix(category, "artist:") {
		artistName := strings.TrimPrefix(category, "artist:")
		songs, err := e.deezer.GetArtistSongs(artistName, 50)
		if err == nil && len(songs) >= 4 {
			e.db.SaveSongs(songs)
			return songs
		}
	}

	e.songPoolLock.RLock()
	songs, ok := e.categoryPool[category]
	e.songPoolLock.RUnlock()

	if ok && len(songs) >= 15 {
		return songs
	}

	fetched, err := e.deezer.GetCategorySongs(category, 50)
	if err == nil && len(fetched) >= 4 {
		e.songPoolLock.Lock()
		e.categoryPool[category] = fetched
		e.songPoolLock.Unlock()
		e.db.SaveSongs(fetched)
		return fetched
	}

	dbSongs := e.db.GetSongsByCategory(category, 50)
	if len(dbSongs) >= 4 {
		return dbSongs
	}

	return nil
}

// StartSoloSession initializes a new single player game with clean non-repeating tracking
func (e *Engine) StartSoloSession(playerName, avatarEmoji, avatarColor, category string, difficulty models.Difficulty, totalRounds int) (*models.SoloGameSession, *models.Question, error) {
	if totalRounds <= 0 {
		totalRounds = 5
	}
	if playerName == "" {
		playerName = "Player 1"
	}
	if avatarEmoji == "" {
		avatarEmoji = "🎧"
	}
	if avatarColor == "" {
		avatarColor = "#FF5722"
	}
	if difficulty == "" {
		difficulty = models.DifficultyMedium
	}

	songs := e.GetSongsForCategory(category)
	if len(songs) < 4 {
		return nil, nil, fmt.Errorf("insufficient songs available for category: %s", category)
	}

	sessionID := uuid.New().String()
	player := models.PlayerProfile{
		ID:          uuid.New().String(),
		Name:        playerName,
		AvatarEmoji: avatarEmoji,
		AvatarColor: avatarColor,
		Score:       0,
		Streak:      0,
		MaxStreak:   0,
	}

	usedSongIDs := make(map[string]bool)
	usedSongTitles := make(map[string]bool)

	session := &models.SoloGameSession{
		SessionID:      sessionID,
		Player:         player,
		Difficulty:     difficulty,
		Category:       category,
		TotalRounds:    totalRounds,
		CurrentRound:   1,
		IsFinished:     false,
		UsedSongIDs:    usedSongIDs,
		UsedSongTitles: usedSongTitles,
		CreatedAt:      time.Now(),
		ExpiresAt:      time.Now().Add(1 * time.Hour),
	}

	qInternal, clientQ, err := e.generateQuestion(songs, difficulty, 1, category, player.ID, player.Name, session.UsedSongIDs, session.UsedSongTitles)
	if err != nil {
		return nil, nil, err
	}
	session.CurrentQuestion = qInternal

	e.soloMutex.Lock()
	e.soloGames[sessionID] = session
	e.soloMutex.Unlock()

	return session, clientQ, nil
}

// SubmitSoloAnswer verifies answer, updates score and streak, and progresses to next round
func (e *Engine) SubmitSoloAnswer(sessionID, selectedOptionID string, timeTakenMs int) (*models.RoundResult, *models.Question, bool, error) {
	e.soloMutex.Lock()
	session, exists := e.soloGames[sessionID]
	e.soloMutex.Unlock()

	if !exists {
		return nil, nil, false, fmt.Errorf("session not found or expired")
	}
	if session.IsFinished || session.CurrentQuestion == nil {
		return nil, nil, false, fmt.Errorf("game is already finished")
	}

	q := session.CurrentQuestion
	isSkipped := (selectedOptionID == "skip")
	isCorrect := (selectedOptionID == q.CorrectSongID) && !isSkipped

	points, multiplier := 0, 1.0
	if !isSkipped {
		points, multiplier = e.calculateScore(isCorrect, session.Difficulty, timeTakenMs, q.DurationLimitMs, session.Player.Streak)
		session.Player.TotalGuesses++
	}

	if isCorrect {
		session.Player.CorrectGuesses++
		session.Player.Streak++
		if session.Player.Streak > session.Player.MaxStreak {
			session.Player.MaxStreak = session.Player.Streak
		}
		session.Player.Score += points
		if session.Player.FastestTimeMs == 0 || (timeTakenMs > 0 && timeTakenMs < session.Player.FastestTimeMs) {
			session.Player.FastestTimeMs = timeTakenMs
		}
	} else if !isSkipped {
		session.Player.Streak = 0
	}

	var selectedOpt models.Option
	if isSkipped {
		selectedOpt = models.Option{ID: "skip", Title: "⏭️ Skipped Beat", Artist: ""}
	} else {
		for _, opt := range q.Options {
			if opt.ID == selectedOptionID {
				selectedOpt = opt
				break
			}
		}
	}

	result := &models.RoundResult{
		RoundNumber:    session.CurrentRound,
		PlayerID:       session.Player.ID,
		PlayerName:     session.Player.Name,
		SelectedOption: selectedOpt,
		CorrectSong:    q.TargetSong,
		IsCorrect:      isCorrect,
		PointsEarned:   points,
		Streak:         session.Player.Streak,
		Multiplier:     multiplier,
		TimeTakenMs:    timeTakenMs,
		CurrentScores: []models.PlayerScore{
			{
				PlayerID:    session.Player.ID,
				PlayerName:  session.Player.Name,
				AvatarEmoji: session.Player.AvatarEmoji,
				AvatarColor: session.Player.AvatarColor,
				Score:       session.Player.Score,
				Rank:        1,
			},
		},
	}

	// Progress round
	isGameOver := false
	var nextQ *models.Question

	if session.CurrentRound >= session.TotalRounds {
		session.IsFinished = true
		session.FinalScore = session.Player.Score
		isGameOver = true

		acc := 0
		if session.Player.TotalGuesses > 0 {
			acc = int(float64(session.Player.CorrectGuesses) / float64(session.Player.TotalGuesses) * 100)
		}
		_ = e.db.SaveLeaderboardEntry(&models.LeaderboardEntry{
			PlayerName:  session.Player.Name,
			AvatarEmoji: session.Player.AvatarEmoji,
			AvatarColor: session.Player.AvatarColor,
			Score:       session.Player.Score,
			Category:    session.Category,
			Difficulty:  string(session.Difficulty),
			GameMode:    string(models.ModeSolo),
			MaxStreak:   session.Player.MaxStreak,
			AccuracyPct: acc,
		})
	} else {
		session.CurrentRound++
		songs := e.GetSongsForCategory(session.Category)
		qInternal, clientQ, err := e.generateQuestion(songs, session.Difficulty, session.CurrentRound, session.Category, session.Player.ID, session.Player.Name, session.UsedSongIDs, session.UsedSongTitles)
		if err != nil {
			return nil, nil, false, err
		}
		session.CurrentQuestion = qInternal
		nextQ = clientQ
	}

	return result, nextQ, isGameOver, nil
}

// StartPassPlaySession initializes a local multiplayer game with non-repeating song tracking
func (e *Engine) StartPassPlaySession(players []models.PlayerProfile, category string, difficulty models.Difficulty, totalRoundsPerPlayer int) (*models.PassPlaySession, *models.Question, error) {
	if len(players) < 2 {
		return nil, nil, fmt.Errorf("pass and play requires at least 2 players")
	}
	if totalRoundsPerPlayer <= 0 {
		totalRoundsPerPlayer = 3
	}
	if difficulty == "" {
		difficulty = models.DifficultyMedium
	}

	songs := e.GetSongsForCategory(category)
	if len(songs) < 4 {
		return nil, nil, fmt.Errorf("insufficient songs for category: %s", category)
	}

	sessionID := uuid.New().String()
	for i := range players {
		if players[i].ID == "" {
			players[i].ID = uuid.New().String()
		}
		players[i].Score = 0
		players[i].Streak = 0
		players[i].MaxStreak = 0
	}

	usedSongIDs := make(map[string]bool)
	usedSongTitles := make(map[string]bool)

	session := &models.PassPlaySession{
		SessionID:          sessionID,
		Players:            players,
		CurrentPlayerIndex: 0,
		CurrentRound:       1,
		TotalRounds:        totalRoundsPerPlayer * len(players),
		Difficulty:         difficulty,
		Category:           category,
		IsFinished:         false,
		RoundHistory:       make([]models.RoundResult, 0),
		UsedSongIDs:        usedSongIDs,
		UsedSongTitles:     usedSongTitles,
		CreatedAt:          time.Now(),
	}

	currPlayer := session.Players[0]
	qInternal, clientQ, err := e.generateQuestion(songs, difficulty, 1, category, currPlayer.ID, currPlayer.Name, session.UsedSongIDs, session.UsedSongTitles)
	if err != nil {
		return nil, nil, err
	}
	session.CurrentQuestion = qInternal

	e.passMutex.Lock()
	e.passPlayMap[sessionID] = session
	e.passMutex.Unlock()

	return session, clientQ, nil
}

// SubmitPassPlayAnswer handles a turn submission and rotates to next player without duplicate songs
func (e *Engine) SubmitPassPlayAnswer(sessionID, selectedOptionID string, timeTakenMs int) (*models.RoundResult, *models.PlayerProfile, *models.Question, bool, error) {
	e.passMutex.Lock()
	session, exists := e.passPlayMap[sessionID]
	e.passMutex.Unlock()

	if !exists {
		return nil, nil, nil, false, fmt.Errorf("session not found or expired")
	}
	if session.IsFinished || session.CurrentQuestion == nil {
		return nil, nil, nil, false, fmt.Errorf("game is already finished")
	}

	currPlayer := &session.Players[session.CurrentPlayerIndex]
	q := session.CurrentQuestion
	isSkipped := (selectedOptionID == "skip")
	isCorrect := (selectedOptionID == q.CorrectSongID) && !isSkipped

	points, multiplier := 0, 1.0
	if !isSkipped {
		points, multiplier = e.calculateScore(isCorrect, session.Difficulty, timeTakenMs, q.DurationLimitMs, currPlayer.Streak)
		currPlayer.TotalGuesses++
	}

	if isCorrect {
		currPlayer.CorrectGuesses++
		currPlayer.Streak++
		if currPlayer.Streak > currPlayer.MaxStreak {
			currPlayer.MaxStreak = currPlayer.Streak
		}
		currPlayer.Score += points
	} else if !isSkipped {
		currPlayer.Streak = 0
	}

	var selectedOpt models.Option
	if isSkipped {
		selectedOpt = models.Option{ID: "skip", Title: "⏭️ Skipped Beat", Artist: ""}
	} else {
		for _, opt := range q.Options {
			if opt.ID == selectedOptionID {
				selectedOpt = opt
				break
			}
		}
	}

	// Sort players descending by score for accurate ranking
	sortedPlayers := make([]models.PlayerProfile, len(session.Players))
	copy(sortedPlayers, session.Players)
	sort.Slice(sortedPlayers, func(i, j int) bool {
		return sortedPlayers[i].Score > sortedPlayers[j].Score
	})

	scores := make([]models.PlayerScore, len(sortedPlayers))
	for i, p := range sortedPlayers {
		scores[i] = models.PlayerScore{
			PlayerID:    p.ID,
			PlayerName:  p.Name,
			AvatarEmoji: p.AvatarEmoji,
			AvatarColor: p.AvatarColor,
			Score:       p.Score,
			Rank:        i + 1,
		}
	}

	result := &models.RoundResult{
		RoundNumber:    session.CurrentRound,
		PlayerID:       currPlayer.ID,
		PlayerName:     currPlayer.Name,
		SelectedOption: selectedOpt,
		CorrectSong:    q.TargetSong,
		IsCorrect:      isCorrect,
		PointsEarned:   points,
		Streak:         currPlayer.Streak,
		Multiplier:     multiplier,
		TimeTakenMs:    timeTakenMs,
		CurrentScores:  scores,
	}

	session.RoundHistory = append(session.RoundHistory, *result)

	// Rotate player & check game over
	isGameOver := false
	var nextPlayer *models.PlayerProfile
	var nextQ *models.Question

	if session.CurrentRound >= session.TotalRounds {
		session.IsFinished = true
		isGameOver = true

		winner := sortedPlayers[0]

		// Build breakdown of opponents and points
		var summaries []string
		for idx, p := range sortedPlayers {
			summaries = append(summaries, fmt.Sprintf("#%d %s (%d pts)", idx+1, p.Name, p.Score))
		}
		opponentsSummary := strings.Join(summaries, " • ")

		// Record each player's score to SQLite
		for _, p := range sortedPlayers {
			_ = e.db.SaveLeaderboardEntry(&models.LeaderboardEntry{
				PlayerName:  p.Name,
				AvatarEmoji: p.AvatarEmoji,
				AvatarColor: p.AvatarColor,
				Score:       p.Score,
				Category:    session.Category,
				Difficulty:  string(session.Difficulty),
				GameMode:    string(models.ModePassPlay),
				MaxStreak:   p.MaxStreak,
				MatchWinner: winner.Name,
				Opponents:   opponentsSummary,
			})
		}
	} else {
		session.CurrentRound++
		session.CurrentPlayerIndex = (session.CurrentPlayerIndex + 1) % len(session.Players)
		nextP := session.Players[session.CurrentPlayerIndex]
		nextPlayer = &nextP

		songs := e.GetSongsForCategory(session.Category)
		qInternal, clientQ, err := e.generateQuestion(songs, session.Difficulty, session.CurrentRound, session.Category, nextP.ID, nextP.Name, session.UsedSongIDs, session.UsedSongTitles)
		if err != nil {
			return nil, nil, nil, false, err
		}
		session.CurrentQuestion = qInternal
		nextQ = clientQ
	}

	return result, nextPlayer, nextQ, isGameOver, nil
}

// generateQuestion builds a round question with guaranteed non-repeating target songs and unique distractors
func (e *Engine) generateQuestion(
	songs []models.Song,
	difficulty models.Difficulty,
	roundNum int,
	category, playerID, playerName string,
	usedSongIDs, usedSongTitles map[string]bool,
) (*models.QuestionInternal, *models.Question, error) {
	if len(songs) < 4 {
		return nil, nil, fmt.Errorf("not enough songs to generate question")
	}

	// Filter for unused target songs in this game session
	var sessionUnused []models.Song
	var freshUnusedCandidates []models.Song

	for _, s := range songs {
		if s.PreviewURL == "" {
			continue
		}
		normTitle := cleanSongTitle(s.Title)
		if !usedSongIDs[s.ID] && !usedSongTitles[normTitle] && !usedSongTitles[s.Title] {
			sessionUnused = append(sessionUnused, s)
			// Check if song was also played in recent games on this server
			if !e.isRecentlyPlayed(s.ID, s.Title) {
				freshUnusedCandidates = append(freshUnusedCandidates, s)
			}
		}
	}

	// Prefer fresh candidates that were NOT recently played
	candidates := freshUnusedCandidates
	if len(candidates) < 4 {
		candidates = sessionUnused
	}

	// If candidate pool is low, fetch more songs dynamically from Deezer/iTunes
	if len(candidates) < 4 {
		freshSongs, err := e.deezer.GetCategorySongs(category, 60)
		if err == nil && len(freshSongs) > 0 {
			e.db.SaveSongs(freshSongs)
			for _, s := range freshSongs {
				if s.PreviewURL == "" {
					continue
				}
				normTitle := cleanSongTitle(s.Title)
				if !usedSongIDs[s.ID] && !usedSongTitles[normTitle] && !usedSongTitles[s.Title] {
					candidates = append(candidates, s)
					songs = append(songs, s)
				}
			}
		}
	}

	// Fallback to all songs if player exhausted all available tracks
	if len(candidates) == 0 {
		candidates = songs
	}

	r := rand.New(rand.NewSource(time.Now().UnixNano()))
	targetIndex := r.Intn(len(candidates))
	targetSong := candidates[targetIndex]
	normTargetTitle := cleanSongTitle(targetSong.Title)

	// Mark target song as used for this game session & global server recent buffer
	usedSongIDs[targetSong.ID] = true
	usedSongTitles[targetSong.Title] = true
	usedSongTitles[normTargetTitle] = true
	e.recordRecentSong(targetSong.ID, targetSong.Title)

	numOptions := 4
	durationLimitMs := 10000
	playSnippetSec := 8

	switch difficulty {
	case models.DifficultyEasy:
		numOptions = 4
		durationLimitMs = 15000
		playSnippetSec = 15
	case models.DifficultyMedium:
		numOptions = 4
		durationLimitMs = 10000
		playSnippetSec = 8
	case models.DifficultyHard:
		if len(songs) >= 6 {
			numOptions = 6
		}
		durationLimitMs = 6000
		playSnippetSec = 4
	}

	// Pick distractor songs distinct from target
	perm := r.Perm(len(songs))
	var chosenOptions []models.Option
	chosenOptions = append(chosenOptions, models.Option{
		ID:     targetSong.ID,
		Title:  targetSong.Title,
		Artist: targetSong.Artist,
	})

	seenOptionTitles := map[string]bool{
		normTargetTitle:               true,
		cleanSongTitle(targetSong.Title): true,
	}

	for _, idx := range perm {
		s := songs[idx]
		if s.ID == targetSong.ID {
			continue
		}
		normS := cleanSongTitle(s.Title)
		if seenOptionTitles[normS] {
			continue
		}
		seenOptionTitles[normS] = true
		chosenOptions = append(chosenOptions, models.Option{
			ID:     s.ID,
			Title:  s.Title,
			Artist: s.Artist,
		})
		if len(chosenOptions) >= numOptions {
			break
		}
	}

	// Shuffle the options so target isn't always first
	r.Shuffle(len(chosenOptions), func(i, j int) {
		chosenOptions[i], chosenOptions[j] = chosenOptions[j], chosenOptions[i]
	})

	correctIdx := 0
	for i, opt := range chosenOptions {
		if opt.ID == targetSong.ID {
			correctIdx = i
			break
		}
	}

	qID := uuid.New().String()
	clientQ := &models.Question{
		ID:              qID,
		RoundNumber:     roundNum,
		PreviewURL:      targetSong.PreviewURL,
		DurationLimitMs: durationLimitMs,
		PlaySnippetSec:  playSnippetSec,
		Options:         chosenOptions,
		Category:        category,
		Difficulty:      difficulty,
		ForPlayerID:     playerID,
		ForPlayerName:   playerName,
	}

	internalQ := &models.QuestionInternal{
		Question:      *clientQ,
		CorrectSongID: targetSong.ID,
		CorrectIndex:  correctIdx,
		StartedAt:     time.Now(),
		TargetSong:    targetSong,
	}

	return internalQ, clientQ, nil
}

// calculateScore computes dynamic score with time bonus and streak multiplier
func (e *Engine) calculateScore(isCorrect bool, difficulty models.Difficulty, timeTakenMs, durationLimitMs, currentStreak int) (int, float64) {
	if !isCorrect {
		return 0, 1.0
	}

	basePoints := 100
	maxTimeBonus := 100

	switch difficulty {
	case models.DifficultyEasy:
		basePoints = 100
		maxTimeBonus = 100
	case models.DifficultyMedium:
		basePoints = 200
		maxTimeBonus = 150
	case models.DifficultyHard:
		basePoints = 350
		maxTimeBonus = 250
	}

	if timeTakenMs < 500 {
		timeTakenMs = 500
	}
	if timeTakenMs > durationLimitMs {
		timeTakenMs = durationLimitMs
	}

	timeRatio := 1.0 - (float64(timeTakenMs) / float64(durationLimitMs))
	if timeRatio < 0 {
		timeRatio = 0
	}
	timeBonus := int(float64(maxTimeBonus) * timeRatio)

	multiplier := 1.0
	switch {
	case currentStreak >= 5:
		multiplier = 3.0
	case currentStreak >= 4:
		multiplier = 2.0
	case currentStreak >= 3:
		multiplier = 1.5
	case currentStreak >= 2:
		multiplier = 1.25
	}

	totalPoints := int(math.Round(float64(basePoints+timeBonus) * multiplier))
	return totalPoints, multiplier
}
