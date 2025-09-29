package interfaces

import (
	"encoding/json"
	"log"
	"net/http"

	"yolo-server/internal/usecase"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

type WebSocketHandler struct {
	UseCase *usecase.PredictUseCase
}

func NewWebSocketHandler(useCase *usecase.PredictUseCase) *WebSocketHandler {
	return &WebSocketHandler{UseCase: useCase}
}

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

func (h *WebSocketHandler) HandleWebSocket(c *gin.Context) {
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("Failed to upgrade to WebSocket: %v", err)
		return
	}
	defer conn.Close()

	for {
		// Read message from client
		_, message, err := conn.ReadMessage()
		if err != nil {
			log.Printf("Error reading message: %v", err)
			break
		}

		// Execute prediction
		results, err := h.UseCase.Execute(string(message))
		if err != nil {
			log.Printf("Error executing prediction: %v", err)
			conn.WriteMessage(websocket.TextMessage, []byte("Error: "+err.Error()))
			continue
		}

		// Send results back to client
		response, err := json.Marshal(results)
		if err != nil {
			log.Printf("Error marshalling response: %v", err)
			conn.WriteMessage(websocket.TextMessage, []byte("Error: "+err.Error()))
			continue
		}

		if err := conn.WriteMessage(websocket.TextMessage, response); err != nil {
			log.Printf("Error writing message: %v", err)
			break
		}
	}
}
