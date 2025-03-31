// Global variables
let currentUser = null;
let videoStream = null;
let capturedFaceData = null;
let currentLocation = null;

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
  }

  // Get geolocation if on attendance page
  if (window.location.pathname.includes('attendance.html')) {
    getGeolocation();
  }
});

// Authentication functions
function checkAuth() {
  const token = localStorage.getItem('token');
  if (token && !window.location.pathname.includes('login.html')) {
    // Verify token with backend
    fetch('/api/verify', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    .then(response => {
      if (!response.ok) {
        localStorage.removeItem('token');
        window.location.href = '/login.html';
      }
      return response.json();
    })
    .then(data => {
      currentUser = data.user;
      if (document.getElementById('userEmail')) {
        document.getElementById('userEmail').textContent = currentUser.email;
      }
    })
    .catch(() => {
      localStorage.removeItem('token');
      window.location.href = '/login.html';
    });
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
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();
      if (response.ok) {
        localStorage.setItem('token', data.token);
        window.location.href = '/dashboard.html';
      } else {
        alert(data.message || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      alert('An error occurred during login');
    }
  });
}

function setupRegisterLink() {
  registerLink.addEventListener('click', (e) => {
    e.preventDefault();
    // Show registration modal or redirect to registration page
    alert('Registration functionality to be implemented');
  });
}

// Face Recognition functions
function initWebcam() {
  navigator.mediaDevices.getUserMedia({ video: true })
    .then(stream => {
      videoStream = stream;
      videoElement.srcObject = stream;
    })
    .catch(err => {
      console.error('Error accessing webcam:', err);
      alert('Could not access webcam. Please check permissions.');
    });
}

function setupFaceCapture() {
  captureBtn.addEventListener('click', (e) => {
    e.preventDefault();
    captureFace();
  });
}

function captureFace() {
  const context = canvasElement.getContext('2d');
  canvasElement.width = videoElement.videoWidth;
  canvasElement.height = videoElement.videoHeight;
  context.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
  
  // Convert canvas to base64 image
  capturedFaceData = canvasElement.toDataURL('image/jpeg');
  
  // Enable submit button
  submitBtn.disabled = false;
  alert('Face captured successfully!');
}

// Geolocation functions
function getGeolocation() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      position => {
        currentLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        };
        locationStatus.textContent = 'Location acquired';
        coordinates.classList.remove('hidden');
        latitude.textContent = currentLocation.latitude.toFixed(6);
        longitude.textContent = currentLocation.longitude.toFixed(6);
      },
      error => {
        console.error('Geolocation error:', error);
        locationStatus.textContent = 'Location access denied';
      }
    );
  } else {
    locationStatus.textContent = 'Geolocation not supported';
  }
}

// Attendance submission
function setupAttendanceSubmission() {
  submitBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    
    if (!capturedFaceData) {
      alert('Please capture your face first');
      return;
    }
    
    if (!currentLocation) {
      alert('Could not determine your location');
      return;
    }

    try {
      const response = await fetch('/api/attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          faceData: capturedFaceData,
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude
        })
      });

      const data = await response.json();
      if (response.ok) {
        alert('Attendance recorded successfully!');
        window.location.href = '/dashboard.html';
      } else {
        alert(data.message || 'Attendance recording failed');
      }
    } catch (error) {
      console.error('Attendance error:', error);
      alert('An error occurred while recording attendance');
    }
  });
}

// Settings page functions
function setupTabs() {
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      // Remove active class from all buttons and contents
      tabButtons.forEach(btn => {
        btn.classList.remove('border-blue-500', 'text-blue-600');
        btn.classList.add('border-transparent', 'text-gray-500');
      });
      tabContents.forEach(content => {
        content.classList.remove('active');
      });

      // Add active class to clicked button and corresponding content
      button.classList.add('border-blue-500', 'text-blue-600');
      button.classList.remove('border-transparent', 'text-gray-500');
      
      const target = button.id.replace('Tab', 'Content');
      document.getElementById(target).classList.add('active');
    });
  });
}

// Logout function
if (document.getElementById('logoutBtn')) {
  document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('token');
    window.location.href = '/login.html';
  });
}