const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const { ethers } = require('ethers');
const Joi = require('joi');
const blockchainService = require('../services/blockchain');
const ipfsService = require('../services/ipfs');
const router = express.Router();

// File upload configuration
const storage = multer.memoryStorage();
const upload = multer({ 
    storage,
    limits: { 
        fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 // 10MB
    },
    fileFilter: (req, file, cb) => {
        // Allow all file types for proof of ownership
        cb(null, true);
    }
});

// Validation schemas
const registerContentSchema = Joi.object({
    title: Joi.string().min(1).max(200).required(),
    description: Joi.string().max(1000).optional(),
    isTransferable: Joi.boolean().default(true)
});

const transferOwnershipSchema = Joi.object({
    contentHash: Joi.string().required(),
    newOwner: Joi.string().custom((value, helpers) => {
        if (!ethers.utils.isAddress(value)) {
            return helpers.error('any.invalid');
        }
        return value;
    }).required(),
    walletAddress: Joi.string().custom((value, helpers) => {
        if (!ethers.utils.isAddress(value)) {
            return helpers.error('any.invalid');
        }
        return value;
    }).required()
});

const verifyContentSchema = Joi.object({
    contentHash: Joi.string().required()
});

// Routes

/**
 * POST /api/ownership/register
 * Register content ownership on blockchain
 */
router.post('/register', upload.single('file'), async (req, res) => {
    try {
        // Validate request
        const { error, value } = registerContentSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ 
                error: 'Validation Error',
                message: error.details[0].message 
            });
        }

        if (!req.file) {
            return res.status(400).json({ 
                error: 'File Required',
                message: 'Please upload a file to register' 
            });
        }

        const { title, description, isTransferable } = value;

        // Generate content hash
        const contentHash = crypto
            .createHash('sha256')
            .update(req.file.buffer)
            .digest('hex');

        // Check if content already registered
        const existingContent = await blockchainService.verifyContent(contentHash);
        if (existingContent.exists) {
            return res.status(409).json({
                error: 'Content Already Registered',
                message: 'This content has already been registered on the blockchain',
                contentHash,
                owner: existingContent.owner,
                registeredAt: new Date(existingContent.timestamp * 1000).toISOString()
            });
        }

        // Upload to IPFS
        const ipfsResult = await ipfsService.uploadFile(req.file.buffer, {
            filename: req.file.originalname,
            contentType: req.file.mimetype,
            title,
            description
        });

        // Register on blockchain
        const blockchainResult = await blockchainService.registerContent(
            contentHash,
            ipfsResult.hash,
            title,
            description || '',
            isTransferable
        );

        // Return success response
        res.status(201).json({
            success: true,
            message: 'Content successfully registered on blockchain',
            data: {
                contentHash,
                ipfsHash: ipfsResult.hash,
                ipfsUrl: ipfsResult.url,
                title,
                description,
                isTransferable,
                owner: blockchainResult.owner,
                registeredAt: new Date(blockchainResult.timestamp * 1000).toISOString(),
                txHash: blockchainResult.txHash,
                gasUsed: blockchainResult.gasUsed,
                verificationUrl: `${req.protocol}://${req.get('host')}/api/ownership/verify/${contentHash}`
            }
        });

    } catch (error) {
        console.error('Content registration error:', error);
        res.status(500).json({
            error: 'Registration Failed',
            message: error.message
        });
    }
});

/**
 * GET /api/ownership/verify/:contentHash
 * Verify content ownership
 */
router.get('/verify/:contentHash', async (req, res) => {
    try {
        const { contentHash } = req.params;

        if (!contentHash) {
            return res.status(400).json({
                error: 'Content Hash Required',
                message: 'Please provide a content hash to verify'
            });
        }

        const result = await blockchainService.verifyContent(contentHash);

        if (!result.exists) {
            return res.status(404).json({
                error: 'Content Not Found',
                message: 'This content has not been registered on the blockchain',
                verified: false
            });
        }

        // Get IPFS metadata if available
        let ipfsMetadata = null;
        try {
            ipfsMetadata = await ipfsService.getFileMetadata(result.ipfsHash);
        } catch (ipfsError) {
            console.warn('Could not retrieve IPFS metadata:', ipfsError.message);
        }

        res.json({
            verified: true,
            contentHash,
            data: {
                owner: result.owner,
                ipfsHash: result.ipfsHash,
                ipfsUrl: ipfsService.getPublicUrl(result.ipfsHash),
                title: result.title,
                description: result.description,
                registeredAt: new Date(result.timestamp * 1000).toISOString(),
                ipfsMetadata
            }
        });

    } catch (error) {
        console.error('Content verification error:', error);
        res.status(500).json({
            error: 'Verification Failed',
            message: error.message
        });
    }
});

/**
 * POST /api/ownership/transfer
 * Transfer content ownership
 */
router.post('/transfer', async (req, res) => {
    try {
        const { error, value } = transferOwnershipSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ 
                error: 'Validation Error',
                message: error.details[0].message 
            });
        }

        const { contentHash, newOwner, walletAddress } = value;

        // Verify content exists
        const content = await blockchainService.verifyContent(contentHash);
        if (!content.exists) {
            return res.status(404).json({
                error: 'Content Not Found',
                message: 'This content has not been registered on the blockchain'
            });
        }

        // Create user wallet (in production, this would be handled client-side)
        const userWallet = new ethers.Wallet(process.env.PRIVATE_KEY, blockchainService.provider);
        
        // Verify the wallet address matches the content owner
        if (content.owner.toLowerCase() !== walletAddress.toLowerCase()) {
            return res.status(403).json({
                error: 'Unauthorized',
                message: 'Only the content owner can transfer ownership'
            });
        }

        // Transfer ownership
        const result = await blockchainService.transferContentOwnership(
            contentHash, 
            newOwner, 
            userWallet
        );

        res.json({
            success: true,
            message: 'Ownership transferred successfully',
            data: {
                contentHash: result.contentHash,
                previousOwner: result.previousOwner,
                newOwner: result.newOwner,
                transferredAt: new Date(result.timestamp * 1000).toISOString(),
                txHash: result.txHash,
                gasUsed: result.gasUsed
            }
        });

    } catch (error) {
        console.error('Ownership transfer error:', error);
        res.status(500).json({
            error: 'Transfer Failed',
            message: error.message
        });
    }
});

/**
 * GET /api/ownership/owner/:address
 * Get all content owned by an address
 */
router.get('/owner/:address', async (req, res) => {
    try {
        const { address } = req.params;

        if (!ethers.utils.isAddress(address)) {
            return res.status(400).json({
                error: 'Invalid Address',
                message: 'Please provide a valid Ethereum address'
            });
        }

        const contentHashes = await blockchainService.getOwnerContent(address);
        
        // Get details for each content
        const contentDetails = await Promise.all(
            contentHashes.map(async (hash) => {
                try {
                    const details = await blockchainService.verifyContent(hash);
                    return {
                        contentHash: hash,
                        ...details,
                        registeredAt: new Date(details.timestamp * 1000).toISOString(),
                        ipfsUrl: ipfsService.getPublicUrl(details.ipfsHash),
                        verificationUrl: `${req.protocol}://${req.get('host')}/api/ownership/verify/${hash}`
                    };
                } catch (error) {
                    console.warn(`Could not get details for content ${hash}:`, error.message);
                    return {
                        contentHash: hash,
                        error: 'Could not retrieve details'
                    };
                }
            })
        );

        res.json({
            owner: address,
            totalContent: contentHashes.length,
            content: contentDetails
        });

    } catch (error) {
        console.error('Owner content retrieval error:', error);
        res.status(500).json({
            error: 'Retrieval Failed',
            message: error.message
        });
    }
});

/**
 * POST /api/ownership/hash
 * Generate hash for a file (without registering)
 */
router.post('/hash', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ 
                error: 'File Required',
                message: 'Please upload a file to hash' 
            });
        }

        const contentHash = crypto
            .createHash('sha256')
            .update(req.file.buffer)
            .digest('hex');

        // Check if already registered
        const existingContent = await blockchainService.verifyContent(contentHash);

        res.json({
            contentHash,
            filename: req.file.originalname,
            size: req.file.size,
            mimeType: req.file.mimetype,
            alreadyRegistered: existingContent.exists,
            ...(existingContent.exists && {
                owner: existingContent.owner,
                registeredAt: new Date(existingContent.timestamp * 1000).toISOString()
            })
        });

    } catch (error) {
        console.error('File hashing error:', error);
        res.status(500).json({
            error: 'Hashing Failed',
            message: error.message
        });
    }
});

module.exports = router;