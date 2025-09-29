import sys
import json
import torch
from pathlib import Path
from ultralytics import YOLO

# Load the YOLO model
def load_model():
    model_path = "/app/model/yolo11n.pt"
    if not Path(model_path).exists():
        raise FileNotFoundError(f"Model file '{model_path}' not found.")
    return YOLO(model_path)

# Run inference on the given image
def run_inference(model, image_path):
    if not Path(image_path).exists():
        raise FileNotFoundError(f"Image file '{image_path}' not found.")
    
    results = model(image_path, save=False, verbose=False)[0]
    predictions = results.boxes.xyxy  # Extract predictions
    
    i = 0
    output = []
    for predict in predictions:
        box = predict.cpu().numpy().tolist()
        confidence = results.boxes.conf[i].cpu().numpy().tolist()
        oid = int(results.boxes.cls[i].cpu().numpy().tolist())
        classification = results.names[int(oid)]
        output.append({"box": box, "confidence": confidence, "oid": oid, "classification": classification})
        i+=1

    return output

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python yolo_infer.py <image_path>")
        sys.exit(1)

    image_path = sys.argv[1]

    try:
        model = load_model()
        results = run_inference(model, image_path)
        print(json.dumps(results, indent=None))
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)