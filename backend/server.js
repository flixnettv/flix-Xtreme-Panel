/**
 * Xtreme Panel - Server Entry Point
 * Updated for PostgreSQL (Replit)
 */

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import db from './config/database.js';
import { errorHandler } from './middleware/errorHandler.js';

dotenv.config();

const app = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(bodyParser.json({ limit: '1mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '1mb' }));

// Database Connection (PostgreSQL)
db.connect()
  .then((client) => {
    console.log('✅ Database connected successfully');
    client.release();
  })
  .catch((err) => {
    console.error('❌ Database connection failed:', err.message);
    process.exit(1);
  });

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

import authRoutes from './routes/auth.js';
app.use('/api/auth', authRoutes);

import apiRoutes from './routes/index.js';
app.use('/api', apiRoutes);

// Error Handling
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

app.use(errorHandler);

// Start Server
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use`);
  } else {
    console.error('❌ Server error:', err.message);
  }
  process.exit(1);
});