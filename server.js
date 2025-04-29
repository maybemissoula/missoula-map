const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');
const serverless = require('serverless-http');

const app = express();
const router = express.Router();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(__dirname));

// Initialize Firebase
// For Netlify deployment, we'll use environment variables
// For local development, you can use a local service account key file
let firebaseConfig = {};

// Check if running in Netlify environment
if (process.env.FIREBASE_DATABASE_URL) {
  // Use environment variables from Netlify
  firebaseConfig = {
    databaseURL: process.env.FIREBASE_DATABASE_URL,
  };
  
  // If service account credentials are provided as environment variables
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      firebaseConfig.credential = admin.credential.cert(serviceAccount);
    } catch (error) {
      console.error('Error parsing Firebase service account:', error);
    }
  }
} else {
  // Default to the provided database URL for development
  firebaseConfig = {
    databaseURL: 'https://uncontrolled-missoula-default-rtdb.firebaseio.com/',
  };
  
  // For development, you can uncomment this to use a local service account key
  // try {
  //   const serviceAccount = require('./serviceAccountKey.json');
  //   firebaseConfig.credential = admin.credential.cert(serviceAccount);
  // } catch (error) {
  //   console.error('No service account key found, using default credentials');
  // }
}

// Initialize the Firebase app
if (!admin.apps.length) {
  admin.initializeApp(firebaseConfig);
}

// Get a reference to the database
const db = admin.database();
const pinsRef = db.ref('pins');

// Initialize database with sample pins if empty
const initializeDatabase = async () => {
  try {
    // Check if pins already exist
    const snapshot = await pinsRef.once('value');
    if (!snapshot.exists()) {
      // Create initial database with sample pins
      const initialPins = [
        {
          id: 1,
          name: "University of Montana",
          location: [46.8619, -113.9847],
          description: "Home of the Grizzlies!"
        },
        {
          id: 2,
          name: "Caras Park",
          location: [46.8701, -113.9957],
          description: "Riverside park with events and a carousel"
        },
        {
          id: 3,
          name: "Mount Sentinel",
          location: [46.8574, -113.9776],
          description: "Hike to the M for great views!"
        }
      ];
      
      // Convert array to object with IDs as keys for Firebase
      const pinsObject = {};
      initialPins.forEach(pin => {
        pinsObject[pin.id] = pin;
      });
      
      await pinsRef.set(pinsObject);
      console.log('Database initialized with sample pins');
    }
  } catch (err) {
    console.error('Error initializing database:', err);
  }
};

// API Routes

// Get all pins
router.get('/pins', async (req, res) => {
  try {
    // Ensure database is initialized
    await initializeDatabase();
    
    // Get all pins from Firebase
    const snapshot = await pinsRef.once('value');
    const pinsObject = snapshot.val() || {};
    
    // Convert object to array for client compatibility
    const pinsArray = Object.keys(pinsObject).map(key => pinsObject[key]);
    
    res.json(pinsArray);
  } catch (err) {
    console.error('Error reading pins:', err);
    res.status(500).json({ error: 'Failed to retrieve pins' });
  }
});

// Add a new pin
router.post('/pins', async (req, res) => {
  try {
    const { name, location, description } = req.body;
    
    if (!name || !location) {
      return res.status(400).json({ error: 'Name and location are required' });
    }
    
    // Ensure database is initialized
    await initializeDatabase();
    
    // Get current pins to determine next ID
    const snapshot = await pinsRef.once('value');
    const pinsObject = snapshot.val() || {};
    
    // Generate a new ID
    const existingIds = Object.keys(pinsObject).map(key => parseInt(key));
    const newId = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;
    
    // Create new pin object
    const newPin = {
      id: newId,
      name,
      location,
      description: description || ''
    };
    
    // Add to Firebase
    await pinsRef.child(newId).set(newPin);
    
    res.status(201).json(newPin);
  } catch (err) {
    console.error('Error adding pin:', err);
    res.status(500).json({ error: 'Failed to add pin' });
  }
});

// Delete a pin
router.delete('/pins/:id', async (req, res) => {
  try {
    const pinId = parseInt(req.params.id);
    
    // Check if pin exists
    const pinRef = pinsRef.child(pinId);
    const snapshot = await pinRef.once('value');
    
    if (!snapshot.exists()) {
      return res.status(404).json({ error: 'Pin not found' });
    }
    
    // Delete from Firebase
    await pinRef.remove();
    
    res.json({ message: 'Pin deleted successfully' });
  } catch (err) {
    console.error('Error deleting pin:', err);
    res.status(500).json({ error: 'Failed to delete pin' });
  }
});

app.use('/api', router);

// For local testing
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    // Initialize database on startup for local development
    initializeDatabase();
  });
}

// Export for Netlify Functions
module.exports.handler = serverless(app);
