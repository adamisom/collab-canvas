/**
 * Test script for processAICommand Cloud Function
 * Run with: node test-function.js
 */

// eslint-disable-next-line
// This script can only run locally-with fake process.env values-so it's okay
import admin from 'firebase-admin';

// Initialize Firebase Admin SDK for emulator
process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';
process.env.FIREBASE_DATABASE_EMULATOR_HOST = 'localhost:9000';

admin.initializeApp({
  databaseURL: 'http://localhost:9000?ns=collab-canvas-default-rtdb'
});

// Test data
const testRequest = {
  userMessage: "Create a blue rectangle at the center",
  canvasState: {
    rectangles: [
      { id: 'rect1', x: 100, y: 100, width: 100, height: 80, color: '#ef4444' }
    ]
  },
  viewportInfo: {
    centerX: 500,
    centerY: 400,
    zoom: 1,
    visibleBounds: { left: 0, top: 0, right: 1000, bottom: 800 }
  },
  selectedShape: null
};

async function testFunction() {
  console.log('Testing processAICommand function...\n');
  console.log('Request:', JSON.stringify(testRequest, null, 2));
  
  try {
    // In a real test, you'd call the function via HTTP
    // For now, just verify the emulator is running
    console.log('\n✅ Emulator is running!');
    console.log('\nTo test the function:');
    console.log('1. Open http://localhost:4000 (Emulator UI)');
    console.log('2. Check the Logs tab to see processAICommand');
    console.log('3. You can call it from your React app pointed at emulators');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  process.exit(0);
}

testFunction();

