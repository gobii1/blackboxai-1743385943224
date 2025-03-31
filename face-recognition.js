const tf = require('@tensorflow/tfjs-node');
const faceapi = require('face-api.js');
const canvas = require('canvas');
const { Canvas, Image, ImageData } = canvas;
const fs = require('fs');
const path = require('path');

// Configure face-api.js to use canvas
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

// Load models
async function loadModels() {
  const modelPath = path.join(__dirname, 'models');
  await faceapi.nets.ssdMobilenetv1.loadFromDisk(modelPath);
  await faceapi.nets.faceLandmark68Net.loadFromDisk(modelPath);
  await faceapi.nets.faceRecognitionNet.loadFromDisk(modelPath);
}

// Initialize models
loadModels().catch(err => console.error('Error loading models:', err));

// Function to detect and extract face
async function detectFace(imagePath) {
  try {
    // Read image
    const img = await canvas.loadImage(imagePath);
    
    // Detect faces
    const detections = await faceapi.detectAllFaces(img)
      .withFaceLandmarks()
      .withFaceDescriptors();
    
    if (detections.length === 0) {
      throw new Error('No face detected');
    }
    
    // Get the first face descriptor
    const descriptor = detections[0].descriptor;
    
    return descriptor;
  } catch (error) {
    throw error;
  }
}

// Function to compare faces using Euclidean distance
function compareFaces(descriptor1, descriptor2) {
  const threshold = 0.6; // Similarity threshold
  const distance = faceapi.euclideanDistance(descriptor1, descriptor2);
  return distance <= threshold;
}

module.exports = {
  detectFace,
  compareFaces,
  loadModels
};