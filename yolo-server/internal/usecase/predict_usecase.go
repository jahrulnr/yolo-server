package usecase

import (
	"yolo-server/internal/domain"
)

type Predictor interface {
	Predict(imagePath string) ([]domain.BoundingBox, error)
}

type PredictUseCase struct {
	Predictor Predictor
}

func NewPredictUseCase(predictor Predictor) *PredictUseCase {
	return &PredictUseCase{Predictor: predictor}
}

func (p *PredictUseCase) Execute(imagePath string) ([]domain.BoundingBox, error) {
	return p.Predictor.Predict(imagePath)
}
