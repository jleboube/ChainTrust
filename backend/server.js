const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Route imports
const ownershipRoutes = require('./routes/ownership');
const escrowRoutes = require('./routes/escrow');
const subscriptionRoutes = require('./routes/subscription');
const uploadRoutes = require('./routes/upload');
const webhookRoutes = require('./routes/webhooks');

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Logging
app.use(morgan('combined'));

// Body parsing - webhook route needs raw body
app.use('/api/webhooks', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        version: require('../package.json').version
    });
});

// API Routes
app.use('/api/ownership', ownershipRoutes);
app.use('/api/escrow', escrowRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/webhooks', webhookRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    
    if (err.type === 'ValidationError') {
        return res.status(400).json({
            error: 'Validation Error',
            message: err.message,
            details: err.details
        });
    }
    
    if (err.type === 'BlockchainError') {
        return res.status(500).json({
            error: 'Blockchain Error',
            message: err.message,
            txHash: err.txHash
        });
    }
    
    res.status(500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('Received SIGINT, shutting down gracefully...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('Received SIGTERM, shutting down gracefully...');
    process.exit(0);
});

app.listen(PORT, () => {
    console.log(`🚀 ChainTrust API server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
});