const cv = require('opencv4nodejs');
const path = require('path');

// Load Haar Cascade classifier
const faceClassifier = new cv.CascadeClassifier(cv.HAAR_FRONTALFACE_ALT2);

// Function to detect and extract face
function detectFace(imagePath) {
  try {
    // Read image
    const img = cv.imread(imagePath);
    
    // Convert to grayscale
    const grayImg = img.bgrToGray();
    
    // Detect faces using Haar Cascade
    const faces = faceClassifier.detectMultiScale(grayImg);
    
    if (faces.objects.length === 0) {
      throw new Error('No face detected');
    }
    
    // Get the first face
    const faceRect = faces.objects[0];
    
    // Crop face
    const face = img.getRegion(faceRect);
    
    // Resize to standard size
    const resizedFace = face.resize(100, 100);
    
    // Convert to buffer
    const faceBuffer = cv.imencode('.jpg', resizedFace).toString('base64');
    
    return faceBuffer;
  } catch (error) {
    throw error;
  }
}

// Function to compare faces (simple Euclidean distance)
function compareFaces(face1, face2) {
  // Implementation would use more sophisticated comparison
  // This is a placeholder for actual face comparison logic
  const threshold = 0.6;
  return Math.random() > threshold; // Replace with actual comparison
}

module.exports = {
  detectFace,
  compareFaces
};