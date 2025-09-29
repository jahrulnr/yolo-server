package domain

type BoundingBox struct {
	ObjectId       int       `json:"oid"`
	Classification string    `json:"classification"`
	Confidence     float64   `json:"confidence"`
	Box            []float64 `json:"box"`
}
