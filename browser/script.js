const video = document.getElementById('livecam');
const canvas = document.getElementById('outputCanvas');
const ctx = canvas.getContext('2d');

let loading = { loading: true, progress: 0 };

// Define class labels (replace with actual labels for your model)
let labels = [];
const modelPath = 'https://raw.githubusercontent.com/jahrulnr/yolo-server/refs/heads/master/browser/yolo11n_web_model'

async function loadLabels() {
    const response = await fetch(modelPath + '/metadata.yaml');
    const metadata = jsyaml.load(await response.text()); // Use jsyaml from the global scope
    console.log(metadata.names)
    return metadata.names;
}

async function setupCamera() {
    const stream = await navigator.mediaDevices.getUserMedia({
        video: {
            frameRate: { max: 30 }, // Limit the webcam stream to 30 FPS
        },
    });
    video.srcObject = stream;
    return new Promise((resolve) => {
        video.onloadedmetadata = () => {
            resolve(video);
        };
    });
}

async function loadModel() {
    // Load the model with progress tracking
    const model = await tf.loadGraphModel(modelPath + '/model.json', {
        onProgress: (fractions) => {
            loading = { loading: true, progress: fractions };
            console.log(`Loading model... ${(fractions * 100).toFixed(2)}%`);
        },
    });

    // Warm up the model
    const dummyInput = tf.ones(model.inputs[0].shape);
    model.execute(dummyInput);
    tf.dispose(dummyInput);

    loading = { loading: false, progress: 1 };
    console.log('Model loaded successfully.');

    return model;
}

async function processPredictions(predictionsArray, imgWidth, imgHeight) {
    if (!Array.isArray(predictionsArray) || predictionsArray.length === 0) {
        console.error('Predictions array is not valid or empty:', predictionsArray);
        return { filteredBoxes: [], filteredScores: [], filteredClasses: [] };
    }

    const features = predictionsArray[0]; // Access the first batch

    // Extract bounding boxes, scores, and classes from the nested array
    const xc = features[0]; // Center x-coordinates
    const yc = features[1]; // Center y-coordinates
    const w = features[2]; // Widths
    const h = features[3]; // Heights
    const scores = features[4]; // Confidence scores
    const classes = features[5].map(cls => Math.round(cls)); // Cast class indices to integers

    if (!xc || !yc || !w || !h || !scores || !classes) {
        console.error('Bounding box data or scores are undefined:', { xc, yc, w, h, scores, classes });
        return { filteredBoxes: [], filteredScores: [], filteredClasses: [] };
    }

    const confidenceThreshold = 0.4; // Set a confidence threshold

    const boxes = [];
    const filteredScores = [];
    const filteredClasses = [];

    for (let i = 0; i < scores.length; i++) {
        if (scores[i] > confidenceThreshold) {
            // Normalize and decode bounding box coordinates
            const x1 = ((xc[i] - w[i] / 2) / 640) * imgWidth;
            const y1 = ((yc[i] - h[i] / 2) / 640) * imgHeight;
            const x2 = ((xc[i] + w[i] / 2) / 640) * imgWidth;
            const y2 = ((yc[i] + h[i] / 2) / 640) * imgHeight;

            boxes.push([x1, y1, x2, y2]);
            filteredScores.push(scores[i]);
            filteredClasses.push(classes[i]);
        }
    }

    // Apply Non-Maximum Suppression (NMS)
    const nmsIndices = tf.image.nonMaxSuppression(
        tf.tensor2d(boxes, [boxes.length, 4]), // Provide the correct shape for the boxes array
        tf.tensor1d(filteredScores),
        500, // Max number of boxes
        0.45, // IoU threshold
        0.2 // Score threshold
    );

    const nmsIndicesArray = await nmsIndices.array(); // Use asynchronous array method

    const filteredBoxes = nmsIndicesArray.map(index => boxes[index]);
    const finalScores = nmsIndicesArray.map(index => filteredScores[index]);
    const finalClasses = nmsIndicesArray.map(index => filteredClasses[index]);

    return { filteredBoxes, filteredScores: finalScores, filteredClasses: finalClasses };
}

function drawPredictions(boxes, scores, classes, labels) {
    if (boxes.length === 0) {
        // If no boxes, do not draw anything
        return;
    }

    // Clear the canvas before drawing
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Redraw the video frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    boxes.forEach((box, index) => {
        if (!Array.isArray(box) || box.length !== 4) {
            console.error('Invalid box format. Expected [y1, x1, y2, x2]:', box);
            return;
        }

        const [y1, x1, y2, x2] = box; // Assuming box format is [y1, x1, y2, x2]
        const score = scores[index];
        const classIndex = classes[index];
        const label = labels[classIndex] || `Unknown (${classIndex})`;

        // Draw bounding box
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 2;
        ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);

        // Draw label, index, and score
        ctx.fillStyle = 'red';
        ctx.font = '16px Arial';
        ctx.fillText(`${label} [${classIndex}] (${(score * 100).toFixed(1)}%)`, x1, y1 - 5);
    });
}

async function detectVideo(video, model, canvas) {
    const ctx = canvas.getContext('2d');
    canvas.width = model.inputs[0].shape[1];
    canvas.height = model.inputs[0].shape[2];

    const detectFrame = async () => {
        try {
            tf.tidy(() => {
                // Preprocess the image for the model
                const inputTensor = tf.browser.fromPixels(canvas).toFloat().div(255.0);
                const resizedTensor = tf.image.resizeBilinear(inputTensor, [640, 640]).expandDims(0);

                // Run inference
                const predictions = model.execute(resizedTensor);
                const predictionsData = predictions.dataSync();
                const predictionsShape = predictions.shape;
                const reshapedPredictions = tf.tensor(predictionsData, predictionsShape);
                reshapedPredictions.array().then(async (arr) => {

                    // Process predictions to extract bounding boxes and scores
                    const { filteredBoxes, filteredScores, filteredClasses } = await processPredictions(arr, canvas.width, canvas.height);

                    // Draw the filtered predictions on the canvas after the image
                    ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear canvas
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height); // Draw video frame
                    drawPredictions(filteredBoxes, filteredScores, filteredClasses, labels);

                })
            });
        } catch (error) {
            console.error('Error during frame processing:', error);
        }

        requestAnimationFrame(detectFrame);
    };

    requestAnimationFrame(detectFrame);
}

async function main() {
    labels = await loadLabels(); // Load labels dynamically
    console.log('Loaded Labels:', labels);

    await setupCamera();
    video.play();

    const model = await loadModel();
    detectVideo(video, model, canvas);
}

main();