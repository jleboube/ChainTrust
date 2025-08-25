const { create } = require('ipfs-http-client');
const axios = require('axios');

class IPFSService {
    constructor() {
        // Initialize IPFS client with Infura
        this.client = create({
            host: 'ipfs.infura.io',
            port: 5001,
            protocol: 'https',
            headers: {
                authorization: this.getAuthHeader()
            }
        });
        
        this.publicGateway = 'https://ipfs.io/ipfs/';
        this.infuraGateway = 'https://chaintrust.infura-ipfs.io/ipfs/';
    }

    getAuthHeader() {
        const projectId = process.env.IPFS_PROJECT_ID;
        const projectSecret = process.env.IPFS_PROJECT_SECRET;
        
        if (!projectId || !projectSecret) {
            console.warn('⚠️ IPFS credentials not configured, using local IPFS node');
            return '';
        }
        
        const auth = Buffer.from(`${projectId}:${projectSecret}`).toString('base64');
        return `Basic ${auth}`;
    }

    async uploadFile(buffer, metadata = {}) {
        try {
            // Create file object with metadata
            const fileObject = {
                path: metadata.filename || `file-${Date.now()}`,
                content: buffer,
                mode: 0o644,
                mtime: { secs: Math.floor(Date.now() / 1000) }
            };

            // Upload file to IPFS
            const result = await this.client.add(fileObject, {
                pin: true,
                progress: (prog) => console.log(`IPFS upload progress: ${prog} bytes`)
            });

            const hash = result.cid.toString();

            // Create metadata object
            const metadataObject = {
                name: metadata.filename || 'Unknown',
                description: metadata.description || '',
                title: metadata.title || metadata.filename || 'Untitled',
                contentType: metadata.contentType || 'application/octet-stream',
                size: buffer.length,
                uploadedAt: new Date().toISOString(),
                ipfsHash: hash,
                originalFile: {
                    name: metadata.filename,
                    size: buffer.length,
                    type: metadata.contentType
                }
            };

            // Upload metadata as separate IPFS object
            let metadataHash;
            try {
                const metadataResult = await this.client.add(JSON.stringify(metadataObject, null, 2), {
                    pin: true
                });
                metadataHash = metadataResult.cid.toString();
            } catch (metaError) {
                console.warn('Could not upload metadata to IPFS:', metaError);
                metadataHash = null;
            }

            return {
                hash,
                metadataHash,
                url: this.getPublicUrl(hash),
                infuraUrl: this.getInfuraUrl(hash),
                size: result.size,
                metadata: metadataObject
            };

        } catch (error) {
            console.error('IPFS upload error:', error);
            throw new Error(`Failed to upload file to IPFS: ${error.message}`);
        }
    }

    async uploadJSON(jsonObject) {
        try {
            const content = JSON.stringify(jsonObject, null, 2);
            const result = await this.client.add(content, {
                pin: true
            });

            const hash = result.cid.toString();

            return {
                hash,
                url: this.getPublicUrl(hash),
                infuraUrl: this.getInfuraUrl(hash),
                size: result.size
            };

        } catch (error) {
            console.error('IPFS JSON upload error:', error);
            throw new Error(`Failed to upload JSON to IPFS: ${error.message}`);
        }
    }

    async getFile(hash) {
        try {
            const chunks = [];
            for await (const chunk of this.client.cat(hash)) {
                chunks.push(chunk);
            }
            return Buffer.concat(chunks);
        } catch (error) {
            console.error('IPFS file retrieval error:', error);
            throw new Error(`Failed to retrieve file from IPFS: ${error.message}`);
        }
    }

    async getFileMetadata(hash) {
        try {
            // Try to get the file info
            const stats = await this.client.files.stat(`/ipfs/${hash}`);
            
            return {
                hash,
                size: stats.size,
                type: stats.type,
                retrievedAt: new Date().toISOString()
            };
        } catch (error) {
            // If direct stat fails, try to fetch via HTTP
            try {
                const response = await axios.head(this.getPublicUrl(hash), {
                    timeout: 5000
                });
                
                return {
                    hash,
                    size: response.headers['content-length'],
                    type: response.headers['content-type'],
                    retrievedAt: new Date().toISOString(),
                    source: 'http'
                };
            } catch (httpError) {
                console.warn('Could not retrieve IPFS metadata:', error);
                return {
                    hash,
                    error: 'Metadata not available'
                };
            }
        }
    }

    async pin(hash) {
        try {
            await this.client.pin.add(hash);
            return true;
        } catch (error) {
            console.error('IPFS pin error:', error);
            return false;
        }
    }

    async unpin(hash) {
        try {
            await this.client.pin.rm(hash);
            return true;
        } catch (error) {
            console.error('IPFS unpin error:', error);
            return false;
        }
    }

    async isOnline() {
        try {
            const id = await this.client.id();
            return {
                online: true,
                peerId: id.id,
                agentVersion: id.agentVersion,
                protocolVersion: id.protocolVersion
            };
        } catch (error) {
            return {
                online: false,
                error: error.message
            };
        }
    }

    getPublicUrl(hash) {
        return `${this.publicGateway}${hash}`;
    }

    getInfuraUrl(hash) {
        return `${this.infuraGateway}${hash}`;
    }

    // Utility function to validate IPFS hash
    isValidHash(hash) {
        // Basic validation for IPFS CIDv0 and CIDv1
        const cidv0Regex = /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/;
        const cidv1Regex = /^b[A-Za-z2-7]{58,}$/;
        
        return cidv0Regex.test(hash) || cidv1Regex.test(hash);
    }

    // Create a shareable link for content verification
    createVerificationLink(contentHash, ipfsHash, baseUrl) {
        return {
            verificationUrl: `${baseUrl}/api/ownership/verify/${contentHash}`,
            ipfsUrl: this.getPublicUrl(ipfsHash),
            contentHash,
            ipfsHash
        };
    }
}

module.exports = new IPFSService();