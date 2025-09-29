package main

import (
	"log"
	"yolo-server/internal/adapter"
	"yolo-server/internal/interfaces"
	"yolo-server/internal/usecase"

	"github.com/gin-gonic/gin"
)

func main() {
	// Initialize Python inference adapter
	pythonAdapter := adapter.NewPythonInfer("/app/yolo_infer.py")

	// Initialize use case
	predictUseCase := usecase.NewPredictUseCase(pythonAdapter)

	// Initialize HTTP handler
	httpHandler := interfaces.NewPredictHandler(predictUseCase)

	// Initialize WebSocket handler
	webSocketHandler := interfaces.NewWebSocketHandler(predictUseCase)

	// Set up Gin router
	r := gin.Default()

	// Define routes
	r.POST("/predict", httpHandler.Predict)
	// Define WebSocket route
	r.GET("/ws", webSocketHandler.HandleWebSocket)

	// Start server
	if err := r.Run(":8080"); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
