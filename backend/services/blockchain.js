const { ethers } = require('ethers');

// Load deployed addresses if available (produced by scripts/deploy.js)
let contractAddresses = {};
try {
    contractAddresses = require('../../deployed-addresses.json');
} catch (err) {
    console.warn('⚠️ deployed-addresses.json not found — running in degraded blockchain mode. Please run the deploy script to generate this file.');
}

// Try to load ABIs from artifacts; if missing, start in degraded mode and warn
let ContentRegistryABI = null;
let EscrowABI = null;
let SubscriptionPoolABI = null;
try {
    ContentRegistryABI = require('../../artifacts/contracts/ContentOwnershipRegistry.sol/ContentOwnershipRegistry.json').abi;
} catch (err) {
    console.warn('⚠️ ContentOwnershipRegistry ABI not found in artifacts/ — run `npx hardhat compile` to generate artifacts');
}
try {
    EscrowABI = require('../../artifacts/contracts/FreelanceEscrow.sol/FreelanceEscrow.json').abi;
} catch (err) {
    console.warn('⚠️ FreelanceEscrow ABI not found in artifacts/ — run `npx hardhat compile` to generate artifacts');
}
try {
    SubscriptionPoolABI = require('../../artifacts/contracts/SubscriptionPool.sol/SubscriptionPool.json').abi;
} catch (err) {
    console.warn('⚠️ SubscriptionPool ABI not found in artifacts/ — run `npx hardhat compile` to generate artifacts');
}

class BlockchainService {
    constructor() {
        this.provider = new ethers.providers.JsonRpcProvider(
            process.env.NODE_ENV === 'production' 
                ? process.env.POLYGON_MAINNET_RPC 
                : process.env.POLYGON_MUMBAI_RPC
        );
        
        if (process.env.PRIVATE_KEY) {
            try {
                this.wallet = new ethers.Wallet(process.env.PRIVATE_KEY, this.provider);
            } catch (err) {
                console.warn('⚠️ Could not initialize wallet from PRIVATE_KEY:', err.message);
                this.wallet = null;
            }
        } else {
            console.warn('⚠️ PRIVATE_KEY not set — blockchain write operations will be disabled');
            this.wallet = null;
        }

        this.initContracts();
    }

    initContracts() {
        try {
            // Initialize contracts only when both ABI and address are present
            if (contractAddresses.contentOwnershipRegistry && ContentRegistryABI) {
                this.contentRegistry = new ethers.Contract(
                    contractAddresses.contentOwnershipRegistry,
                    ContentRegistryABI,
                    this.wallet || this.provider
                );
            } else {
                this.contentRegistry = null;
                console.warn('⚠️ Content registry not initialized (missing ABI or address)');
            }

            if (contractAddresses.freelanceEscrow && EscrowABI) {
                this.escrow = new ethers.Contract(
                    contractAddresses.freelanceEscrow,
                    EscrowABI,
                    this.wallet || this.provider
                );
            } else {
                this.escrow = null;
                console.warn('⚠️ Escrow contract not initialized (missing ABI or address)');
            }

            if (contractAddresses.subscriptionPool && SubscriptionPoolABI) {
                this.subscriptionPool = new ethers.Contract(
                    contractAddresses.subscriptionPool,
                    SubscriptionPoolABI,
                    this.wallet || this.provider
                );
            } else {
                this.subscriptionPool = null;
                console.warn('⚠️ SubscriptionPool contract not initialized (missing ABI or address)');
            }

            console.log('ℹ️ Blockchain service initialized (some contracts may be unavailable)');
        } catch (error) {
            console.error('❌ Error initializing contracts:', error);
            throw new Error('Failed to initialize blockchain service');
        }
    }

    // Content Ownership Registry Methods
    async registerContent(contentHash, ipfsHash, title, description, isTransferable = true) {
        try {
            if (!this.contentRegistry) throw new Error('Content registry contract not initialized');
            const tx = await this.contentRegistry.registerContent(
                contentHash,
                ipfsHash,
                title,
                description,
                isTransferable
            );
            
            const receipt = await tx.wait();
            const event = receipt.events.find(e => e.event === 'ContentRegistered');
            
            return {
                txHash: tx.hash,
                contentHash: event.args.contentHash,
                owner: event.args.owner,
                ipfsHash: event.args.ipfsHash,
                timestamp: event.args.timestamp.toNumber(),
                gasUsed: receipt.gasUsed.toString()
            };
        } catch (error) {
            throw this.createBlockchainError('Failed to register content', error);
        }
    }

    async verifyContent(contentHash) {
        try {
            if (!this.contentRegistry) throw new Error('Content registry contract not initialized');
            const result = await this.contentRegistry.verifyContent(contentHash);
            return {
                owner: result.owner,
                ipfsHash: result.ipfsHash,
                timestamp: result.timestamp.toNumber(),
                title: result.title,
                description: result.description,
                exists: true
            };
        } catch (error) {
            if (error.message.includes('Content not found')) {
                return { exists: false };
            }
            throw this.createBlockchainError('Failed to verify content', error);
        }
    }

    async transferContentOwnership(contentHash, newOwner, userWallet) {
        try {
            if (!this.contentRegistry) throw new Error('Content registry contract not initialized');
            const contractWithUser = this.contentRegistry.connect(userWallet);
            const tx = await contractWithUser.transferOwnership(contentHash, newOwner);
            const receipt = await tx.wait();
            
            const event = receipt.events.find(e => e.event === 'OwnershipTransferred');
            
            return {
                txHash: tx.hash,
                contentHash: event.args.contentHash,
                previousOwner: event.args.previousOwner,
                newOwner: event.args.newOwner,
                timestamp: event.args.timestamp.toNumber(),
                gasUsed: receipt.gasUsed.toString()
            };
        } catch (error) {
            throw this.createBlockchainError('Failed to transfer ownership', error);
        }
    }

    async getOwnerContent(owner) {
        try {
            if (!this.contentRegistry) throw new Error('Content registry contract not initialized');
            const contentHashes = await this.contentRegistry.getOwnerContent(owner);
            return contentHashes;
        } catch (error) {
            throw this.createBlockchainError('Failed to get owner content', error);
        }
    }

    // Escrow Methods
    async createEscrow(freelancer, mediator, amount, token, deadline, workDescription) {
        try {
            if (!this.escrow) throw new Error('Escrow contract not initialized');
            const tx = await this.escrow.createEscrow(
                freelancer,
                mediator,
                ethers.utils.parseEther(amount.toString()),
                token || ethers.constants.AddressZero,
                deadline,
                workDescription
            );
            
            const receipt = await tx.wait();
            const event = receipt.events.find(e => e.event === 'EscrowCreated');
            
            return {
                txHash: tx.hash,
                escrowId: event.args.escrowId.toNumber(),
                client: event.args.client,
                freelancer: event.args.freelancer,
                amount: ethers.utils.formatEther(event.args.amount),
                token: event.args.token,
                gasUsed: receipt.gasUsed.toString()
            };
        } catch (error) {
            throw this.createBlockchainError('Failed to create escrow', error);
        }
    }

    async fundEscrow(escrowId, amount, token, userWallet) {
        try {
            if (!this.escrow) throw new Error('Escrow contract not initialized');
            const contractWithUser = this.escrow.connect(userWallet);
            const value = token === ethers.constants.AddressZero ? ethers.utils.parseEther(amount.toString()) : 0;
            
            const tx = await contractWithUser.fundEscrow(escrowId, { value });
            const receipt = await tx.wait();
            
            const event = receipt.events.find(e => e.event === 'EscrowFunded');
            
            return {
                txHash: tx.hash,
                escrowId: event.args.escrowId.toNumber(),
                amount: ethers.utils.formatEther(event.args.amount),
                gasUsed: receipt.gasUsed.toString()
            };
        } catch (error) {
            throw this.createBlockchainError('Failed to fund escrow', error);
        }
    }

    async submitWork(escrowId, deliveryHash, userWallet) {
        try {
            if (!this.escrow) throw new Error('Escrow contract not initialized');
            const contractWithUser = this.escrow.connect(userWallet);
            const tx = await contractWithUser.submitWork(escrowId, deliveryHash);
            const receipt = await tx.wait();
            
            const event = receipt.events.find(e => e.event === 'WorkSubmitted');
            
            return {
                txHash: tx.hash,
                escrowId: event.args.escrowId.toNumber(),
                deliveryHash: event.args.deliveryHash,
                gasUsed: receipt.gasUsed.toString()
            };
        } catch (error) {
            throw this.createBlockchainError('Failed to submit work', error);
        }
    }

    async approveWork(escrowId, userWallet) {
        try {
            if (!this.escrow) throw new Error('Escrow contract not initialized');
            const contractWithUser = this.escrow.connect(userWallet);
            const tx = await contractWithUser.approveWork(escrowId);
            const receipt = await tx.wait();
            
            return {
                txHash: tx.hash,
                escrowId: escrowId,
                gasUsed: receipt.gasUsed.toString()
            };
        } catch (error) {
            throw this.createBlockchainError('Failed to approve work', error);
        }
    }

    async raiseDispute(escrowId, userWallet) {
        try {
            if (!this.escrow) throw new Error('Escrow contract not initialized');
            const contractWithUser = this.escrow.connect(userWallet);
            const tx = await contractWithUser.raiseDispute(escrowId);
            const receipt = await tx.wait();
            
            const event = receipt.events.find(e => e.event === 'DisputeRaised');
            
            return {
                txHash: tx.hash,
                escrowId: event.args.escrowId.toNumber(),
                raisedBy: event.args.raisedBy,
                gasUsed: receipt.gasUsed.toString()
            };
        } catch (error) {
            throw this.createBlockchainError('Failed to raise dispute', error);
        }
    }

    async getEscrowDetails(escrowId) {
        try {
            if (!this.escrow) throw new Error('Escrow contract not initialized');
            const details = await this.escrow.getEscrowDetails(escrowId);
            return {
                id: details.id.toNumber(),
                client: details.client,
                freelancer: details.freelancer,
                mediator: details.mediator,
                amount: ethers.utils.formatEther(details.amount),
                token: details.token,
                status: details.status,
                deadline: details.deadline.toNumber(),
                workDescription: details.workDescription,
                deliveryHash: details.deliveryHash,
                createdAt: details.createdAt.toNumber(),
                lastUpdated: details.lastUpdated.toNumber(),
                clientApproved: details.clientApproved,
                freelancerSubmitted: details.freelancerSubmitted
            };
        } catch (error) {
            throw this.createBlockchainError('Failed to get escrow details', error);
        }
    }

    // Subscription Pool Methods
    async createSubscriptionPool(serviceName, monthlyAmount, token, maxMembers) {
        try {
            const tx = await this.subscriptionPool.createPool(
                serviceName,
                ethers.utils.parseEther(monthlyAmount.toString()),
                token || ethers.constants.AddressZero,
                maxMembers
            );
            
            const receipt = await tx.wait();
            const event = receipt.events.find(e => e.event === 'PoolCreated');
            
            return {
                txHash: tx.hash,
                poolId: event.args.poolId.toNumber(),
                owner: event.args.owner,
                serviceName: event.args.serviceName,
                monthlyAmount: ethers.utils.formatEther(event.args.monthlyAmount),
                maxMembers: event.args.maxMembers.toNumber(),
                gasUsed: receipt.gasUsed.toString()
            };
        } catch (error) {
            throw this.createBlockchainError('Failed to create subscription pool', error);
        }
    }

    async joinSubscriptionPool(poolId, userWallet) {
        try {
            const poolDetails = await this.getPoolDetails(poolId);
            const memberShare = ethers.utils.parseEther(poolDetails.monthlyAmount).div(poolDetails.maxMembers);
            
            const contractWithUser = this.subscriptionPool.connect(userWallet);
            const value = poolDetails.token === ethers.constants.AddressZero ? memberShare : 0;
            
            const tx = await contractWithUser.joinPool(poolId, { value });
            const receipt = await tx.wait();
            
            const event = receipt.events.find(e => e.event === 'MemberJoined');
            
            return {
                txHash: tx.hash,
                poolId: event.args.poolId.toNumber(),
                member: event.args.member,
                gasUsed: receipt.gasUsed.toString()
            };
        } catch (error) {
            throw this.createBlockchainError('Failed to join subscription pool', error);
        }
    }

    async leaveSubscriptionPool(poolId, userWallet) {
        try {
            const contractWithUser = this.subscriptionPool.connect(userWallet);
            const tx = await contractWithUser.leavePool(poolId);
            const receipt = await tx.wait();
            
            return {
                txHash: tx.hash,
                poolId: poolId,
                gasUsed: receipt.gasUsed.toString()
            };
        } catch (error) {
            throw this.createBlockchainError('Failed to leave subscription pool', error);
        }
    }

    async makeManualPayment(poolId, userWallet) {
        try {
            const poolDetails = await this.getPoolDetails(poolId);
            const memberShare = ethers.utils.parseEther(poolDetails.monthlyAmount).div(poolDetails.maxMembers);
            
            const contractWithUser = this.subscriptionPool.connect(userWallet);
            const value = poolDetails.token === ethers.constants.AddressZero ? memberShare : 0;
            
            const tx = await contractWithUser.manualPayment(poolId, { value });
            const receipt = await tx.wait();
            
            const event = receipt.events.find(e => e.event === 'PaymentCollected');
            
            return {
                txHash: tx.hash,
                poolId: event.args.poolId.toNumber(),
                member: event.args.member,
                amount: ethers.utils.formatEther(event.args.amount),
                gasUsed: receipt.gasUsed.toString()
            };
        } catch (error) {
            throw this.createBlockchainError('Failed to make manual payment', error);
        }
    }

    async getPoolDetails(poolId) {
        try {
            const details = await this.subscriptionPool.getPoolDetails(poolId);
            return {
                id: details.id.toNumber(),
                owner: details.owner,
                serviceName: details.serviceName,
                monthlyAmount: ethers.utils.formatEther(details.monthlyAmount),
                token: details.token,
                maxMembers: details.maxMembers.toNumber(),
                currentMembers: details.currentMembers.toNumber(),
                status: details.status,
                nextPaymentDue: details.nextPaymentDue.toNumber()
            };
        } catch (error) {
            throw this.createBlockchainError('Failed to get pool details', error);
        }
    }

    async getPoolMembers(poolId) {
        try {
            return await this.subscriptionPool.getPoolMembers(poolId);
        } catch (error) {
            throw this.createBlockchainError('Failed to get pool members', error);
        }
    }

    // Utility Methods
    createBlockchainError(message, originalError) {
        const error = new Error(message);
        error.type = 'BlockchainError';
        error.originalError = originalError;
        error.txHash = originalError.transactionHash || null;
        return error;
    }

    async getTransactionReceipt(txHash) {
        try {
            return await this.provider.getTransactionReceipt(txHash);
        } catch (error) {
            throw this.createBlockchainError('Failed to get transaction receipt', error);
        }
    }

    async estimateGas(contract, method, params, value = 0) {
        try {
            return await contract.estimateGas[method](...params, { value });
        } catch (error) {
            throw this.createBlockchainError('Failed to estimate gas', error);
        }
    }

    formatAddress(address) {
        return ethers.utils.getAddress(address.toLowerCase());
    }

    isValidAddress(address) {
        return ethers.utils.isAddress(address);
    }
}

module.exports = new BlockchainService();