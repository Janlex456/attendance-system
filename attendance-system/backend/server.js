const express = require('express');
const dotenv = require('dotenv');
const db = require('./config/db'); // Import the database pool

// Load environment variables from .env file for local development
dotenv.config({ path: '../.env' }); // Adjust path as necessary based on your project structure

const app = express();

// Middleware to parse JSON bodies
app.use(express.json());

// Basic route to test database connection
app.get('/test-db', async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT 1 + 1 AS solution');
    res.status(200).json({ message: 'Database connected successfully!', solution: rows[0].solution });
  } catch (error) {
    console.error('Database connection error:', error);
    res.status(500).json({ message: 'Database connection failed', error: error.message });
  }
});

// Define the port to listen on, using process.env.PORT for Railway
const PORT = process.env.PORT || 5000; // Default to 5000 for local development

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});