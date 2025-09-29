package interfaces

import (
	"net/http"

	"yolo-server/internal/usecase"

	"github.com/gin-gonic/gin"
)

type PredictHandler struct {
	UseCase *usecase.PredictUseCase
}

func NewPredictHandler(useCase *usecase.PredictUseCase) *PredictHandler {
	return &PredictHandler{UseCase: useCase}
}

func (h *PredictHandler) Predict(c *gin.Context) {
	// Parse multipart form
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to parse file: " + err.Error()})
		return
	}

	// Save the uploaded file temporarily
	tempFilePath := "tmp/" + file.Filename
	if err := c.SaveUploadedFile(file, tempFilePath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save file: " + err.Error()})
		return
	}

	// Execute prediction
	results, err := h.UseCase.Execute(tempFilePath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, results)
}
