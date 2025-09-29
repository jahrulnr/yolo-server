package adapter

import (
	"encoding/json"
	"errors"
	"log"
	"os"
	"os/exec"
	"yolo-server/internal/domain"
)

type PythonInfer struct {
	ScriptPath string
}

func NewPythonInfer(scriptPath string) *PythonInfer {
	return &PythonInfer{ScriptPath: scriptPath}
}

func (p *PythonInfer) Predict(imagePath string) ([]domain.BoundingBox, error) {
	os.Setenv("YOLO_VERBOSE", "False")
	cmd := exec.Command("python3", p.ScriptPath, imagePath)
	output, err := cmd.Output()
	if err != nil {
		return nil, errors.New("failed to execute Python script: " + err.Error())
	}

	var boxes []domain.BoundingBox
	if err := json.Unmarshal(output, &boxes); err != nil {
		log.Println(string(output))
		return nil, errors.New("failed to parse JSON output: " + err.Error())
	}

	return boxes, nil
}
