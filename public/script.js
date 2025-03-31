// Global variables
let currentUser = null;
let videoStream = null;
let currentLocation = null;
let faceDetectionInterval = null;

// DOM Elements
const loginForm = document.getElementById('loginForm');
const registerLink = document.getElementById('registerLink');
const videoElement = document.getElementById('video');
const canvasElement = document.getElementById('canvas');
const captureBtn = document.getElementById('captureBtn');
const submitBtn = document.getElementById('submitBtn');
const locationStatus = document.getElementById('locationStatus');
const coordinates = document.getElementById('coordinates');
const latitude = document.getElementById('latitude');
const longitude = document.getElementById('longitude');

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
  // Check authentication status
  checkAuth();

  // Setup event listeners
  if (loginForm) setupLoginForm();
  if (registerLink) setupRegisterLink();
  if (captureBtn) setupFaceCapture();
  if (submitBtn) setupAttendanceSubmission();

  // Setup tab system for settings page
  setupTabs();

  // Initialize webcam if on attendance or settings page
  if (window.location.pathname.includes('attendance.html') || 
      window.location.pathname.includes('settings.html')) {
    initWebcam();
    startFaceDetection();
  }

  // Get geolocation if on attendance page
  if (window.location.pathname.includes('attendance.html')) {
    getGeolocation();
  }
});

// Start face detection
function startFaceDetection() {
  faceDetectionInterval = setInterval(async () => {
    if (videoElement.readyState === videoElement.HAVE_ENOUGH_DATA) {
      const canvas = document.createElement('canvas');
      canvas.width = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
      
      // Show face detection in progress
      if (captureBtn) {
        captureBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin mr-2"></i> Detecting Face...';
        captureBtn.disabled = true;
      }
    }
  }, 1000);
}

// Stop face detection
function stopFaceDetection() {
  if (faceDetectionInterval) {
    clearInterval(faceDetectionInterval);
    faceDetectionInterval = null;
  }
}

// Authentication functions
async function checkAuth() {
  const token = localStorage.getItem('token');
  if (token && !window.location.pathname.includes('login.html')) {
    try {
      const response = await fetch('/api/verify', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Invalid token');
      
      const data = await response.json();
      currentUser = data.user;
      
      if (document.getElementById('userEmail')) {
        document.getElementById('userEmail').textContent = currentUser.email;
      }
    } catch (error) {
      localStorage.removeItem('token');
      window.location.href = '/login.html';
    }
  } else if (!token && !window.location.pathname.includes('login.html')) {
    window.location.href = '/login.html';
  }
}

function setupLoginForm() {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();
      if (response.ok) {
        localStorage.setItem('token', data.token);
        window.location.href = '/dashboard.html';
      } else {
        showAlert('error', data.message || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      showAlert('error', 'An error occurred during login');
    }
  });
}

// Face Recognition functions
function initWebcam() {
  navigator.mediaDevices.getUserMedia({ 
    video: { width: 640, height: 480, facingMode: 'user' }
  }).then(stream => {
    videoStream = stream;
    videoElement.srcObject = stream;
  }).catch(err => {
    console.error('Webcam error:', err);
    showAlert('error', 'Could not access webcam. Please check permissions.');
  });
}

async function captureFace() {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
    
    const blob = await new Promise(resolve => 
      canvas.toBlob(resolve, 'image/jpeg', 0.9)
    );
    
    return blob;
  } catch (error) {
    console.error('Face capture error:', error);
    throw error;
  }
}

// Attendance functions
async function submitAttendance() {
  try {
    showLoader(submitBtn, 'Processing...');
    
    const faceBlob = await captureFace();
    const formData = new FormData();
    formData.append('faceImage', faceBlob, 'face.jpg');
    formData.append('latitude', currentLocation.latitude);
    formData.append('longitude', currentLocation.longitude);

    const response = await fetch('/api/attendance', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: formData
    });

    const data = await response.json();
    if (response.ok) {
      showAlert('success', data.message);
      setTimeout(() => window.location.href = '/dashboard.html', 1500);
    } else {
      showAlert('error', data.error || 'Attendance failed');
    }
  } catch (error) {
    console.error('Attendance error:', error);
    showAlert('error', 'Failed to submit attendance');
  } finally {
    hideLoader(submitBtn, 'Submit Attendance');
  }
}

// Helper functions
function showAlert(type, message) {
  const alertDiv = document.createElement('div');
  alertDiv.className = `fixed top-4 right-4 p-4 rounded-md shadow-lg ${
    type === 'error' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
  }`;
  alertDiv.textContent = message;
  document.body.appendChild(alertDiv);
  
  setTimeout(() => {
    alertDiv.classList.add('opacity-0', 'transition-opacity', 'duration-500');
    setTimeout(() => alertDiv.remove(), 500);
  }, 3000);
}

function showLoader(button, text) {
  button.disabled = true;
  button.innerHTML = `<i class="fas fa-circle-notch fa-spin mr-2"></i>${text}`;
}

function hideLoader(button, text) {
  button.disabled = false;
  button.textContent = text;
}

// Initialize on page load
if (document.getElementById('logoutBtn')) {
  document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('token');
    window.location.href = '/login.html';
  });
}
