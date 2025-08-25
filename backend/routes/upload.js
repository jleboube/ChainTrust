const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const Joi = require('joi');
const ipfsService = require('../services/ipfs');
const router = express.Router();

// File upload configuration
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB
        files: 5 // Max 5 files at once
    },
    fileFilter: (req, file, cb) => {
        // Allow most file types, but block potentially dangerous ones
        const blockedTypes = [
            'application/x-msdownload',
            'application/x-msdos-program',
            'application/x-msi',
            'application/x-ms-installer',
            'application/vnd.microsoft.portable-executable'
        ];
        
        if (blockedTypes.includes(file.mimetype)) {
            return cb(new Error('File type not allowed for security reasons'), false);
        }
        
        cb(null, true);
    }
});

// Validation schemas
const uploadMetadataSchema = Joi.object({
    title: Joi.string().min(1).max(200).optional(),
    description: Joi.string().max(1000).optional(),
    tags: Joi.array().items(Joi.string().max(50)).max(10).optional()
});

/**
 * POST /api/upload/ipfs
 * Upload files to IPFS without blockchain registration
 */
router.post('/ipfs', upload.array('files', 5), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                error: 'No Files',
                message: 'Please select files to upload'
            });
        }

        // Validate metadata if provided
        const { error, value } = uploadMetadataSchema.validate(req.body);
        if (error) {
            return res.status(400).json({
                error: 'Validation Error',
                message: error.details[0].message
            });
        }

        const uploadResults = [];

        // Process each file
        for (const file of req.files) {
            try {
                // Generate content hash
                const contentHash = crypto
                    .createHash('sha256')
                    .update(file.buffer)
                    .digest('hex');

                // Upload to IPFS
                const ipfsResult = await ipfsService.uploadFile(file.buffer, {
                    filename: file.originalname,
                    contentType: file.mimetype,
                    title: value.title || file.originalname,
                    description: value.description || '',
                    tags: value.tags || []
                });

                uploadResults.push({
                    filename: file.originalname,
                    contentHash,
                    ipfsHash: ipfsResult.hash,
                    ipfsUrl: ipfsResult.url,
                    size: file.size,
                    mimeType: file.mimetype,
                    metadata: ipfsResult.metadata
                });

            } catch (fileError) {
                console.error(`Error processing file ${file.originalname}:`, fileError);
                uploadResults.push({
                    filename: file.originalname,
                    error: fileError.message,
                    size: file.size,
                    mimeType: file.mimetype
                });
            }
        }

        res.json({
            success: true,
            message: `Successfully processed ${uploadResults.length} file(s)`,
            files: uploadResults
        });

    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({
            error: 'Upload Failed',
            message: error.message
        });
    }
});

/**
 * POST /api/upload/metadata
 * Upload JSON metadata to IPFS
 */
router.post('/metadata', async (req, res) => {
    try {
        const metadata = req.body;
        
        if (!metadata || typeof metadata !== 'object') {
            return res.status(400).json({
                error: 'Invalid Metadata',
                message: 'Please provide valid JSON metadata'
            });
        }

        // Add timestamp and version
        const enrichedMetadata = {
            ...metadata,
            uploadedAt: new Date().toISOString(),
            version: '1.0.0',
            source: 'ChainTrust'
        };

        const result = await ipfsService.uploadJSON(enrichedMetadata);

        res.json({
            success: true,
            message: 'Metadata uploaded to IPFS',
            data: {
                ipfsHash: result.hash,
                ipfsUrl: result.url,
                size: result.size,
                metadata: enrichedMetadata
            }
        });

    } catch (error) {
        console.error('Metadata upload error:', error);
        res.status(500).json({
            error: 'Upload Failed',
            message: error.message
        });
    }
});

/**
 * GET /api/upload/status/:hash
 * Check IPFS file status and availability
 */
router.get('/status/:hash', async (req, res) => {
    try {
        const { hash } = req.params;

        if (!hash) {
            return res.status(400).json({
                error: 'Hash Required',
                message: 'Please provide an IPFS hash'
            });
        }

        if (!ipfsService.isValidHash(hash)) {
            return res.status(400).json({
                error: 'Invalid Hash',
                message: 'Please provide a valid IPFS hash'
            });
        }

        // Check IPFS node status
        const nodeStatus = await ipfsService.isOnline();
        if (!nodeStatus.online) {
            return res.status(503).json({
                error: 'Service Unavailable',
                message: 'IPFS service is currently unavailable',
                details: nodeStatus.error
            });
        }

        // Get file metadata
        const metadata = await ipfsService.getFileMetadata(hash);

        res.json({
            available: true,
            hash,
            publicUrl: ipfsService.getPublicUrl(hash),
            infuraUrl: ipfsService.getInfuraUrl(hash),
            metadata,
            nodeStatus
        });

    } catch (error) {
        console.error('Status check error:', error);
        
        if (error.message.includes('not available')) {
            return res.status(404).json({
                available: false,
                hash: req.params.hash,
                error: 'File Not Available',
                message: 'The requested file could not be found on IPFS'
            });
        }

        res.status(500).json({
            error: 'Status Check Failed',
            message: error.message
        });
    }
});

/**
 * POST /api/upload/pin/:hash
 * Pin a file to ensure it stays available
 */
router.post('/pin/:hash', async (req, res) => {
    try {
        const { hash } = req.params;

        if (!hash || !ipfsService.isValidHash(hash)) {
            return res.status(400).json({
                error: 'Invalid Hash',
                message: 'Please provide a valid IPFS hash'
            });
        }

        const pinned = await ipfsService.pin(hash);

        if (pinned) {
            res.json({
                success: true,
                message: 'File pinned successfully',
                hash,
                pinned: true
            });
        } else {
            res.status(500).json({
                error: 'Pin Failed',
                message: 'Failed to pin file to IPFS',
                hash,
                pinned: false
            });
        }

    } catch (error) {
        console.error('Pin error:', error);
        res.status(500).json({
            error: 'Pin Failed',
            message: error.message
        });
    }
});

/**
 * DELETE /api/upload/unpin/:hash
 * Unpin a file (remove from permanent storage)
 */
router.delete('/unpin/:hash', async (req, res) => {
    try {
        const { hash } = req.params;

        if (!hash || !ipfsService.isValidHash(hash)) {
            return res.status(400).json({
                error: 'Invalid Hash',
                message: 'Please provide a valid IPFS hash'
            });
        }

        const unpinned = await ipfsService.unpin(hash);

        if (unpinned) {
            res.json({
                success: true,
                message: 'File unpinned successfully',
                hash,
                pinned: false
            });
        } else {
            res.status(500).json({
                error: 'Unpin Failed',
                message: 'Failed to unpin file from IPFS',
                hash
            });
        }

    } catch (error) {
        console.error('Unpin error:', error);
        res.status(500).json({
            error: 'Unpin Failed',
            message: error.message
        });
    }
});

/**
 * GET /api/upload/health
 * Check IPFS service health
 */
router.get('/health', async (req, res) => {
    try {
        const status = await ipfsService.isOnline();
        
        res.json({
            service: 'IPFS Upload Service',
            ...status,
            timestamp: new Date().toISOString(),
            endpoints: {
                upload: '/api/upload/ipfs',
                metadata: '/api/upload/metadata',
                status: '/api/upload/status/:hash',
                pin: '/api/upload/pin/:hash',
                unpin: '/api/upload/unpin/:hash'
            }
        });

    } catch (error) {
        console.error('Health check error:', error);
        res.status(500).json({
            service: 'IPFS Upload Service',
            online: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Error handling middleware for multer
router.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                error: 'File Too Large',
                message: `File size exceeds the ${Math.round((parseInt(process.env.MAX_FILE_SIZE) || 10485760) / 1024 / 1024)}MB limit`
            });
        }
        if (error.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({
                error: 'Too Many Files',
                message: 'Maximum 5 files allowed per upload'
            });
        }
        if (error.code === 'LIMIT_UNEXPECTED_FILE') {
            return res.status(400).json({
                error: 'Unexpected File',
                message: 'Unexpected file field in upload'
            });
        }
    }
    
    if (error.message.includes('File type not allowed')) {
        return res.status(400).json({
            error: 'File Type Not Allowed',
            message: error.message
        });
    }
    
    next(error);
});

module.exports = router;