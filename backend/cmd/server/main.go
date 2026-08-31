package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"

	"jaribu-beats-backend/internal/db"
	"jaribu-beats-backend/internal/game"
	"jaribu-beats-backend/internal/handlers"
	"jaribu-beats-backend/internal/music"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Println("🔥 Starting Jaribu Beats (BeatBonga) Engine...")

	// Initialize Database (SQLite with persistent vault seed & leaderboards)
	database, err := db.InitDB()
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	log.Println("✅ Database initialized successfully.")

	// Initialize Deezer Music Client
	deezerClient := music.NewDeezerClient()
	log.Println("✅ Deezer Music Client ready with Kenyan & Global catalog cache.")

	// Initialize Game Engine & Room Manager
	gameEngine := game.NewEngine(database, deezerClient)
	roomManager := game.NewRoomManager(gameEngine)
	log.Println("✅ Game Engine & Real-time Room Manager ready.")

	// Set Gin mode
	gin.SetMode(gin.ReleaseMode)
	r := gin.New()
	r.Use(gin.Recovery())

	// Configure CORS for Mobile and Web
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"*"},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization", "X-Requested-With"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: false,
		MaxAge:           12 * time.Hour,
	}))

	// Register API and WebSocket Handlers
	handler := handlers.NewHandler(database, deezerClient, gameEngine, roomManager)
	handler.RegisterRoutes(r)

	serverAddr := fmt.Sprintf("0.0.0.0:%s", port)
	log.Printf("🚀 Jaribu Beats Server running on http://%s (API: /api/health)", serverAddr)

	if err := r.Run(serverAddr); err != nil && err != http.ErrServerClosed {
		log.Fatalf("Server failed: %v", err)
	}
}
