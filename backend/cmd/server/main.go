package main

import (
	"log"
	"os"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"

	"jaribu-beats-backend/internal/db"
	"jaribu-beats-backend/internal/game"
	"jaribu-beats-backend/internal/handlers"
	"jaribu-beats-backend/internal/music"
)

func main() {
	// Set Gin mode
	ginMode := os.Getenv("GIN_MODE")
	if ginMode == "release" {
		gin.SetMode(gin.ReleaseMode)
	}

	// Initialize Database
	database, err := db.InitDB()
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}

	// Initialize Deezer & iTunes Music client
	deezerClient := music.NewDeezerClient()

	// Initialize Game Engine
	gameEngine := game.NewEngine(database, deezerClient)

	// Initialize Room Manager
	roomManager := game.NewRoomManager(gameEngine)

	// Initialize Route Handler
	handler := handlers.NewHandler(database, deezerClient, gameEngine, roomManager)

	// Initialize Gin router
	r := gin.Default()

	// Configure CORS
	corsConfig := cors.DefaultConfig()
	corsConfig.AllowAllOrigins = true
	corsConfig.AllowHeaders = []string{"Origin", "Content-Length", "Content-Type", "Authorization", "Range", "Accept"}
	corsConfig.AllowMethods = []string{"GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"}
	corsConfig.ExposeHeaders = []string{"Content-Length", "Content-Range", "Accept-Ranges"}
	r.Use(cors.New(corsConfig))

	// Register all routes
	handler.RegisterRoutes(r)

	// Determine port
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Starting Jaribu Beats Server on port %s...", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("Server failed to run: %v", err)
	}
}
