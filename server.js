const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs-extra');
const path = require('path');
const serverless = require('serverless-http') ;

const app = express();
const router = express.Router();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(__dirname));

// Database file path - use /tmp for Netlify Functions
const DB_FILE = path.join('/tmp', 'pins.json');

// Initialize database if it doesn't exist
const initializeDatabase = async () => {
  try {
    const exists = await fs.pathExists(DB_FILE);
    if (!exists) {
      // Create initial database with sample pins
      const initialPins = [
        {
          id: 1,
          name: "University of Montana",
          location: [46.8619, -113.9847],
          description: "Just an FYI"
        }
      ];
      await fs.writeJson(DB_FILE, { pins: initialPins });
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
    await initializeDatabase(); // Ensure DB exists on each request
    const data = await fs.readJson(DB_FILE);
    res.json(data.pins);
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
    
    await initializeDatabase(); // Ensure DB exists
    const data = await fs.readJson(DB_FILE);
    
    // Generate a new ID
    const newId = data.pins.length > 0 
      ? Math.max(...data.pins.map(pin => pin.id)) + 1 
      : 1;
    
    const newPin = {
      id: newId,
      name,
      location,
      description: description || ''
    };
    
    data.pins.push(newPin);
    await fs.writeJson(DB_FILE, data);
    
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
    
    await initializeDatabase(); // Ensure DB exists
    const data = await fs.readJson(DB_FILE);
    
    const pinIndex = data.pins.findIndex(pin => pin.id === pinId);
    
    if (pinIndex === -1) {
      return res.status(404).json({ error: 'Pin not found' });
    }
    
    data.pins.splice(pinIndex, 1);
    await fs.writeJson(DB_FILE, data);
    
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
  });
}

// Initialize database on startup
initializeDatabase();

// Export for Netlify Functions
module.exports.handler = serverless(app);
