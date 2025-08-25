const express = require('express');
const multer = require('multer');
const { ethers } = require('ethers');
const Joi = require('joi');
const blockchainService = require('../services/blockchain');
const ipfsService = require('../services/ipfs');
const router = express.Router();

// File upload for work delivery
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE) || 50 * 1024 * 1024, // 50MB for deliverables
        files: 10
    },
    fileFilter: (req, file, cb) => {
        // Allow most file types for work deliverables
        cb(null, true);
    }
});

// Validation schemas
const createEscrowSchema = Joi.object({
    freelancer: Joi.string().custom((value, helpers) => {
        if (!ethers.utils.isAddress(value)) {
            return helpers.error('any.invalid');
        }
        return value;
    }).required(),
    mediator: Joi.string().custom((value, helpers) => {
        if (!ethers.utils.isAddress(value)) {
            return helpers.error('any.invalid');
        }
        return value;
    }).optional(),
    amount: Joi.number().positive().required(),
    token: Joi.string().custom((value, helpers) => {
        if (value !== 'ETH' && !ethers.utils.isAddress(value)) {
            return helpers.error('any.invalid');
        }
        return value === 'ETH' ? ethers.constants.AddressZero : value;
    }).default('ETH'),
    deadline: Joi.date().min('now').required(),
    workDescription: Joi.string().min(10).max(2000).required(),
    title: Joi.string().min(1).max(200).required(),
    category: Joi.string().valid('design', 'development', 'writing', 'marketing', 'other').default('other'),
    milestones: Joi.array().items(Joi.object({
        description: Joi.string().required(),
        amount: Joi.number().positive().required(),
        dueDate: Joi.date().min('now').required()
    })).optional(),
    clientWallet: Joi.string().custom((value, helpers) => {
        if (!ethers.utils.isAddress(value)) {
            return helpers.error('any.invalid');
        }
        return value;
    }).required()
});

const fundEscrowSchema = Joi.object({
    walletAddress: Joi.string().custom((value, helpers) => {
        if (!ethers.utils.isAddress(value)) {
            return helpers.error('any.invalid');
        }
        return value;
    }).required()
});

const submitWorkSchema = Joi.object({
    workDescription: Joi.string().max(1000).optional(),
    walletAddress: Joi.string().custom((value, helpers) => {
        if (!ethers.utils.isAddress(value)) {
            return helpers.error('any.invalid');
        }
        return value;
    }).required()
});

const actionSchema = Joi.object({
    walletAddress: Joi.string().custom((value, helpers) => {
        if (!ethers.utils.isAddress(value)) {
            return helpers.error('any.invalid');
        }
        return value;
    }).required()
});

const disputeResolutionSchema = Joi.object({
    clientAmount: Joi.number().min(0).required(),
    freelancerAmount: Joi.number().min(0).required(),
    walletAddress: Joi.string().custom((value, helpers) => {
        if (!ethers.utils.isAddress(value)) {
            return helpers.error('any.invalid');
        }
        return value;
    }).required()
});

/**
 * POST /api/escrow/create
 * Create a new escrow contract
 */
router.post('/create', async (req, res) => {
    try {
        const { error, value } = createEscrowSchema.validate(req.body);
        if (error) {
            return res.status(400).json({
                error: 'Validation Error',
                message: error.details[0].message
            });
        }

        const {
            freelancer,
            mediator,
            amount,
            token,
            deadline,
            workDescription,
            title,
            category,
            milestones,
            clientWallet
        } = value;

        // Use default mediator if none provided
        const finalMediator = mediator || process.env.DEFAULT_MEDIATOR || blockchainService.wallet.address;

        // Create escrow on blockchain
        const result = await blockchainService.createEscrow(
            freelancer,
            finalMediator,
            amount,
            token,
            Math.floor(new Date(deadline).getTime() / 1000),
            workDescription
        );

        // Store additional metadata on IPFS
        const metadata = {
            escrowId: result.escrowId,
            title,
            category,
            workDescription,
            amount: amount.toString(),
            token: token === ethers.constants.AddressZero ? 'ETH' : token,
            deadline: deadline,
            milestones: milestones || [],
            createdAt: new Date().toISOString(),
            client: clientWallet,
            freelancer,
            mediator: finalMediator
        };

        const ipfsResult = await ipfsService.uploadJSON(metadata);

        res.status(201).json({
            success: true,
            message: 'Escrow contract created successfully',
            data: {
                escrowId: result.escrowId,
                txHash: result.txHash,
                client: result.client,
                freelancer: result.freelancer,
                amount: result.amount,
                token: result.token,
                gasUsed: result.gasUsed,
                metadataHash: ipfsResult.hash,
                metadataUrl: ipfsResult.url,
                contractUrl: `${req.protocol}://${req.get('host')}/escrow/${result.escrowId}`
            }
        });

    } catch (error) {
        console.error('Escrow creation error:', error);
        res.status(500).json({
            error: 'Creation Failed',
            message: error.message
        });
    }
});

/**
 * POST /api/escrow/:id/fund
 * Fund an escrow contract
 */
router.post('/:id/fund', async (req, res) => {
    try {
        const escrowId = parseInt(req.params.id);
        if (isNaN(escrowId)) {
            return res.status(400).json({
                error: 'Invalid Escrow ID',
                message: 'Please provide a valid escrow ID'
            });
        }

        const { error, value } = fundEscrowSchema.validate(req.body);
        if (error) {
            return res.status(400).json({
                error: 'Validation Error',
                message: error.details[0].message
            });
        }

        const { walletAddress } = value;

        // Get escrow details first
        const escrowDetails = await blockchainService.getEscrowDetails(escrowId);
        
        if (!escrowDetails) {
            return res.status(404).json({
                error: 'Escrow Not Found',
                message: 'The specified escrow contract does not exist'
            });
        }

        if (escrowDetails.client.toLowerCase() !== walletAddress.toLowerCase()) {
            return res.status(403).json({
                error: 'Unauthorized',
                message: 'Only the client can fund this escrow'
            });
        }

        if (escrowDetails.status !== 0) { // 0 = Created
            return res.status(400).json({
                error: 'Invalid Status',
                message: 'Escrow is already funded or completed'
            });
        }

        // Create user wallet for transaction
        const userWallet = new ethers.Wallet(process.env.PRIVATE_KEY, blockchainService.provider);

        // Fund the escrow
        const result = await blockchainService.fundEscrow(
            escrowId,
            parseFloat(escrowDetails.amount),
            escrowDetails.token,
            userWallet
        );

        res.json({
            success: true,
            message: 'Escrow funded successfully',
            data: {
                escrowId: result.escrowId,
                amount: result.amount,
                txHash: result.txHash,
                gasUsed: result.gasUsed
            }
        });

    } catch (error) {
        console.error('Escrow funding error:', error);
        res.status(500).json({
            error: 'Funding Failed',
            message: error.message
        });
    }
});

/**
 * POST /api/escrow/:id/submit
 * Submit work for an escrow
 */
router.post('/:id/submit', upload.array('deliverables', 10), async (req, res) => {
    try {
        const escrowId = parseInt(req.params.id);
        if (isNaN(escrowId)) {
            return res.status(400).json({
                error: 'Invalid Escrow ID',
                message: 'Please provide a valid escrow ID'
            });
        }

        const { error, value } = submitWorkSchema.validate(req.body);
        if (error) {
            return res.status(400).json({
                error: 'Validation Error',
                message: error.details[0].message
            });
        }

        const { workDescription, walletAddress } = value;

        // Get escrow details
        const escrowDetails = await blockchainService.getEscrowDetails(escrowId);
        
        if (!escrowDetails) {
            return res.status(404).json({
                error: 'Escrow Not Found',
                message: 'The specified escrow contract does not exist'
            });
        }

        if (escrowDetails.freelancer.toLowerCase() !== walletAddress.toLowerCase()) {
            return res.status(403).json({
                error: 'Unauthorized',
                message: 'Only the freelancer can submit work for this escrow'
            });
        }

        if (escrowDetails.status !== 1) { // 1 = Funded
            return res.status(400).json({
                error: 'Invalid Status',
                message: 'Escrow must be funded before work can be submitted'
            });
        }

        // Check deadline
        if (Date.now() / 1000 > escrowDetails.deadline) {
            return res.status(400).json({
                error: 'Deadline Passed',
                message: 'The deadline for this escrow has passed'
            });
        }

        // Upload deliverables to IPFS
        let deliverables = [];
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                try {
                    const uploadResult = await ipfsService.uploadFile(file.buffer, {
                        filename: file.originalname,
                        contentType: file.mimetype,
                        title: `Deliverable for Escrow ${escrowId}`,
                        description: workDescription || 'Work deliverable'
                    });

                    deliverables.push({
                        filename: file.originalname,
                        ipfsHash: uploadResult.hash,
                        ipfsUrl: uploadResult.url,
                        size: file.size,
                        contentType: file.mimetype
                    });
                } catch (uploadError) {
                    console.error(`Failed to upload ${file.originalname}:`, uploadError);
                }
            }
        }

        // Create delivery package metadata
        const deliveryPackage = {
            escrowId,
            submittedAt: new Date().toISOString(),
            workDescription: workDescription || 'Work completed as per agreement',
            deliverables,
            freelancer: walletAddress,
            status: 'submitted'
        };

        // Upload delivery package to IPFS
        const packageResult = await ipfsService.uploadJSON(deliveryPackage);

        // Create user wallet for transaction
        const userWallet = new ethers.Wallet(process.env.PRIVATE_KEY, blockchainService.provider);

        // Submit work on blockchain
        const result = await blockchainService.submitWork(
            escrowId,
            packageResult.hash,
            userWallet
        );

        res.json({
            success: true,
            message: 'Work submitted successfully',
            data: {
                escrowId: result.escrowId,
                deliveryHash: result.deliveryHash,
                deliveryUrl: packageResult.url,
                deliverables: deliverables.length,
                txHash: result.txHash,
                gasUsed: result.gasUsed
            }
        });

    } catch (error) {
        console.error('Work submission error:', error);
        res.status(500).json({
            error: 'Submission Failed',
            message: error.message
        });
    }
});

/**
 * POST /api/escrow/:id/approve
 * Approve submitted work
 */
router.post('/:id/approve', async (req, res) => {
    try {
        const escrowId = parseInt(req.params.id);
        if (isNaN(escrowId)) {
            return res.status(400).json({
                error: 'Invalid Escrow ID',
                message: 'Please provide a valid escrow ID'
            });
        }

        const { error, value } = actionSchema.validate(req.body);
        if (error) {
            return res.status(400).json({
                error: 'Validation Error',
                message: error.details[0].message
            });
        }

        const { walletAddress } = value;

        // Get escrow details
        const escrowDetails = await blockchainService.getEscrowDetails(escrowId);
        
        if (!escrowDetails) {
            return res.status(404).json({
                error: 'Escrow Not Found',
                message: 'The specified escrow contract does not exist'
            });
        }

        if (escrowDetails.client.toLowerCase() !== walletAddress.toLowerCase()) {
            return res.status(403).json({
                error: 'Unauthorized',
                message: 'Only the client can approve work for this escrow'
            });
        }

        if (escrowDetails.status !== 2) { // 2 = WorkSubmitted
            return res.status(400).json({
                error: 'Invalid Status',
                message: 'No work has been submitted for approval'
            });
        }

        // Create user wallet for transaction
        const userWallet = new ethers.Wallet(process.env.PRIVATE_KEY, blockchainService.provider);

        // Approve work on blockchain
        const result = await blockchainService.approveWork(escrowId, userWallet);

        res.json({
            success: true,
            message: 'Work approved and payment released',
            data: {
                escrowId,
                txHash: result.txHash,
                gasUsed: result.gasUsed
            }
        });

    } catch (error) {
        console.error('Work approval error:', error);
        res.status(500).json({
            error: 'Approval Failed',
            message: error.message
        });
    }
});

/**
 * POST /api/escrow/:id/dispute
 * Raise a dispute
 */
router.post('/:id/dispute', async (req, res) => {
    try {
        const escrowId = parseInt(req.params.id);
        if (isNaN(escrowId)) {
            return res.status(400).json({
                error: 'Invalid Escrow ID',
                message: 'Please provide a valid escrow ID'
            });
        }

        const { error, value } = actionSchema.validate(req.body);
        if (error) {
            return res.status(400).json({
                error: 'Validation Error',
                message: error.details[0].message
            });
        }

        const { walletAddress } = value;

        // Get escrow details
        const escrowDetails = await blockchainService.getEscrowDetails(escrowId);
        
        if (!escrowDetails) {
            return res.status(404).json({
                error: 'Escrow Not Found',
                message: 'The specified escrow contract does not exist'
            });
        }

        const isClient = escrowDetails.client.toLowerCase() === walletAddress.toLowerCase();
        const isFreelancer = escrowDetails.freelancer.toLowerCase() === walletAddress.toLowerCase();

        if (!isClient && !isFreelancer) {
            return res.status(403).json({
                error: 'Unauthorized',
                message: 'Only the client or freelancer can raise a dispute'
            });
        }

        if (escrowDetails.status !== 1 && escrowDetails.status !== 2) { // 1 = Funded, 2 = WorkSubmitted
            return res.status(400).json({
                error: 'Invalid Status',
                message: 'Dispute can only be raised for funded or work-submitted escrows'
            });
        }

        // Create user wallet for transaction
        const userWallet = new ethers.Wallet(process.env.PRIVATE_KEY, blockchainService.provider);

        // Raise dispute on blockchain
        const result = await blockchainService.raiseDispute(escrowId, userWallet);

        res.json({
            success: true,
            message: 'Dispute raised successfully',
            data: {
                escrowId: result.escrowId,
                raisedBy: result.raisedBy,
                txHash: result.txHash,
                gasUsed: result.gasUsed
            }
        });

    } catch (error) {
        console.error('Dispute raising error:', error);
        res.status(500).json({
            error: 'Dispute Failed',
            message: error.message
        });
    }
});

/**
 * POST /api/escrow/:id/resolve
 * Resolve a dispute (mediator only)
 */
router.post('/:id/resolve', async (req, res) => {
    try {
        const escrowId = parseInt(req.params.id);
        if (isNaN(escrowId)) {
            return res.status(400).json({
                error: 'Invalid Escrow ID',
                message: 'Please provide a valid escrow ID'
            });
        }

        const { error, value } = disputeResolutionSchema.validate(req.body);
        if (error) {
            return res.status(400).json({
                error: 'Validation Error',
                message: error.details[0].message
            });
        }

        const { clientAmount, freelancerAmount, walletAddress } = value;

        // Get escrow details
        const escrowDetails = await blockchainService.getEscrowDetails(escrowId);
        
        if (!escrowDetails) {
            return res.status(404).json({
                error: 'Escrow Not Found',
                message: 'The specified escrow contract does not exist'
            });
        }

        if (escrowDetails.mediator.toLowerCase() !== walletAddress.toLowerCase()) {
            return res.status(403).json({
                error: 'Unauthorized',
                message: 'Only the assigned mediator can resolve disputes'
            });
        }

        if (escrowDetails.status !== 4) { // 4 = Disputed
            return res.status(400).json({
                error: 'Invalid Status',
                message: 'No active dispute to resolve'
            });
        }

        // Validate amounts
        const totalAmount = parseFloat(escrowDetails.amount);
        const resolvedTotal = clientAmount + freelancerAmount;
        
        if (Math.abs(resolvedTotal - totalAmount) > 0.0001) { // Allow for small floating point errors
            return res.status(400).json({
                error: 'Invalid Amounts',
                message: `Total resolution amount (${resolvedTotal}) must equal escrow amount (${totalAmount})`
            });
        }

        // Create mediator wallet for transaction
        const mediatorWallet = new ethers.Wallet(process.env.PRIVATE_KEY, blockchainService.provider);

        // Resolve dispute on blockchain
        const result = await blockchainService.resolveDispute(
            escrowId,
            Math.floor(clientAmount * 10**18), // Convert to wei
            Math.floor(freelancerAmount * 10**18),
            mediatorWallet
        );

        res.json({
            success: true,
            message: 'Dispute resolved successfully',
            data: {
                escrowId,
                clientAmount,
                freelancerAmount,
                winner: result.winner,
                txHash: result.txHash,
                gasUsed: result.gasUsed
            }
        });

    } catch (error) {
        console.error('Dispute resolution error:', error);
        res.status(500).json({
            error: 'Resolution Failed',
            message: error.message
        });
    }
});

/**
 * GET /api/escrow/:id
 * Get escrow details
 */
router.get('/:id', async (req, res) => {
    try {
        const escrowId = parseInt(req.params.id);
        if (isNaN(escrowId)) {
            return res.status(400).json({
                error: 'Invalid Escrow ID',
                message: 'Please provide a valid escrow ID'
            });
        }

        const details = await blockchainService.getEscrowDetails(escrowId);
        
        if (!details) {
            return res.status(404).json({
                error: 'Escrow Not Found',
                message: 'The specified escrow contract does not exist'
            });
        }

        // Get delivery details if work was submitted
        let deliveryData = null;
        if (details.deliveryHash && details.deliveryHash !== '') {
            try {
                // Fetch delivery package from IPFS
                const deliveryContent = await ipfsService.getFile(details.deliveryHash);
                deliveryData = JSON.parse(deliveryContent.toString());
            } catch (error) {
                console.warn('Could not fetch delivery data:', error);
            }
        }

        res.json({
            success: true,
            data: {
                ...details,
                deliveryData,
                statusText: getEscrowStatusText(details.status),
                deadlineFormatted: new Date(details.deadline * 1000).toISOString(),
                createdAtFormatted: new Date(details.createdAt * 1000).toISOString(),
                lastUpdatedFormatted: new Date(details.lastUpdated * 1000).toISOString()
            }
        });

    } catch (error) {
        console.error('Escrow details error:', error);
        res.status(500).json({
            error: 'Retrieval Failed',
            message: error.message
        });
    }
});

/**
 * GET /api/escrow/user/:address
 * Get all escrows for a user (client or freelancer)
 */
router.get('/user/:address', async (req, res) => {
    try {
        const { address } = req.params;
        const { type } = req.query; // 'client' or 'freelancer'

        if (!ethers.utils.isAddress(address)) {
            return res.status(400).json({
                error: 'Invalid Address',
                message: 'Please provide a valid Ethereum address'
            });
        }

        let escrowIds = [];
        
        if (!type || type === 'client') {
            try {
                const clientEscrows = await blockchainService.escrow.getClientEscrows(address);
                escrowIds = [...escrowIds, ...clientEscrows.map(id => ({ id: id.toNumber(), role: 'client' }))];
            } catch (error) {
                console.warn('Error fetching client escrows:', error);
            }
        }
        
        if (!type || type === 'freelancer') {
            try {
                const freelancerEscrows = await blockchainService.escrow.getFreelancerEscrows(address);
                escrowIds = [...escrowIds, ...freelancerEscrows.map(id => ({ id: id.toNumber(), role: 'freelancer' }))];
            } catch (error) {
                console.warn('Error fetching freelancer escrows:', error);
            }
        }

        // Get details for each escrow
        const escrowDetails = await Promise.all(
            escrowIds.map(async ({ id, role }) => {
                try {
                    const details = await blockchainService.getEscrowDetails(id);
                    return {
                        ...details,
                        role,
                        statusText: getEscrowStatusText(details.status),
                        deadlineFormatted: new Date(details.deadline * 1000).toISOString(),
                        createdAtFormatted: new Date(details.createdAt * 1000).toISOString()
                    };
                } catch (error) {
                    console.warn(`Could not get details for escrow ${id}:`, error);
                    return { id, role, error: 'Could not retrieve details' };
                }
            })
        );

        // Filter out errored escrows and sort by creation date
        const validEscrows = escrowDetails
            .filter(escrow => !escrow.error)
            .sort((a, b) => b.createdAt - a.createdAt);

        res.json({
            address,
            totalEscrows: validEscrows.length,
            escrows: validEscrows
        });

    } catch (error) {
        console.error('User escrows retrieval error:', error);
        res.status(500).json({
            error: 'Retrieval Failed',
            message: error.message
        });
    }
});

/**
 * GET /api/escrow/stats
 * Get platform escrow statistics
 */
router.get('/stats', async (req, res) => {
    try {
        // These would typically come from a database with indexed data
        // For now, we'll return basic stats
        res.json({
            success: true,
            data: {
                totalEscrows: 'N/A - Implement with database indexing',
                totalValue: 'N/A - Implement with database indexing',
                completedEscrows: 'N/A - Implement with database indexing',
                activeEscrows: 'N/A - Implement with database indexing',
                disputedEscrows: 'N/A - Implement with database indexing',
                note: 'Statistics require database integration for efficient querying'
            }
        });

    } catch (error) {
        console.error('Stats retrieval error:', error);
        res.status(500).json({
            error: 'Stats Failed',
            message: error.message
        });
    }
});

// Helper functions
function getEscrowStatusText(status) {
    const statusMap = {
        0: 'Created',
        1: 'Funded',
        2: 'Work Submitted',
        3: 'Completed',
        4: 'Disputed',
        5: 'Cancelled',
        6: 'Refunded'
    };
    return statusMap[status] || 'Unknown';
}

module.exports = router;