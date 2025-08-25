# 🔗 ChainTrust - Blockchain Proof of Ownership Platform

ChainTrust is a revolutionary blockchain-powered SaaS platform that provides immutable proof of ownership for digital content. Register your creative works on the Polygon blockchain with IPFS storage for permanent, tamper-proof ownership verification.

## ✨ Features

### 🛡️ Proof of Ownership Module (MVP - Complete)
- **Instant Registration**: Upload any file type and register ownership in seconds
- **SHA-256 Hashing**: Cryptographic content fingerprinting 
- **Blockchain Storage**: Immutable records on Polygon network
- **IPFS Integration**: Decentralized file storage with Infura
- **Public Verification**: Anyone can verify ownership with content hash
- **Ownership Certificates**: Beautiful, shareable proof certificates
- **Transfer Support**: Transfer ownership between wallets
- **Dashboard**: Manage all your registered content in one place

### 🚀 Coming Soon
- **Smart Contract Escrow**: Secure freelance transactions
- **Subscription Sharing**: Group payment management
- **API Access**: Developer integration tools
- **White-label Solutions**: Custom branding options

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   Blockchain    │
│   (Next.js)     │◄──►│   (Node.js)     │◄──►│   (Polygon)     │
│                 │    │                 │    │                 │
│ • React UI      │    │ • Express API   │    │ • Smart         │
│ • Web3 Wallet   │    │ • File Upload   │    │   Contracts     │
│ • File Upload   │    │ • IPFS Service  │    │ • Ownership     │
│ • Verification  │    │ • Blockchain    │    │   Registry      │
│ • Dashboard     │    │   Integration   │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │                       │
                                ▼                       ▼
                       ┌─────────────────┐    ┌─────────────────┐
                       │      IPFS       │    │   PostgreSQL    │
                       │  (File Storage) │    │   (Metadata)    │
                       └─────────────────┘    └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Git
- Polygon wallet with MATIC tokens
- Infura IPFS project (optional)

### 1. Clone Repository
```bash
git clone https://github.com/your-username/chaintrust.git
cd chaintrust
```

### 2. Environment Setup
```bash
# Copy environment template
cp .env.example .env

# Edit with your configuration
nano .env
```

**Required Environment Variables:**
```bash
# Blockchain
PRIVATE_KEY=your_wallet_private_key
POLYGON_MUMBAI_RPC=https://rpc-mumbai.maticvigil.com
POLYGONSCAN_API_KEY=your_polygonscan_api_key

# IPFS (Optional - uses public gateway if not set)
IPFS_PROJECT_ID=your_infura_project_id
IPFS_PROJECT_SECRET=your_infura_secret

# API
JWT_SECRET=your_secure_jwt_secret
```

### 3. Install Dependencies
```bash
# Root dependencies (Hardhat, deployment)
npm install

# Backend dependencies
cd backend && npm install && cd ..

# Frontend dependencies  
cd frontend && npm install && cd ..
```

### 4. Deploy Smart Contracts
```bash
# Compile contracts
npm run compile

# Deploy to Polygon Mumbai testnet
npm run deploy:mumbai

# Or deploy locally for development
npm run node  # Terminal 1
npm run deploy:local  # Terminal 2
```

### 5. Start Services
```bash
# Start backend API (Terminal 1)
npm run backend:dev

# Start frontend (Terminal 2) 
cd frontend && npm run dev
```

### 6. Open Application
Navigate to `http://localhost:3000` and connect your Web3 wallet!

## 🐳 Docker Deployment

### Quick Deploy with Docker Compose
```bash
# Set environment variables
cp .env.example .env
# Edit .env with your values

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Production Deployment
```bash
# Build and deploy
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# SSL with Let's Encrypt
docker-compose -f docker-compose.yml -f docker-compose.ssl.yml up -d
```

## 📖 API Documentation

### Authentication
Most endpoints require a connected wallet. The frontend handles this automatically.

### Ownership Endpoints

#### Register Content
```bash
POST /api/ownership/register
Content-Type: multipart/form-data

# Form data
file: [binary file]
title: "My Creative Work"
description: "Description of the work"
isTransferable: true
```

#### Verify Content
```bash
GET /api/ownership/verify/{contentHash}

Response:
{
  "verified": true,
  "contentHash": "abc123...",
  "data": {
    "owner": "0x123...",
    "title": "My Creative Work",
    "registeredAt": "2024-01-01T00:00:00Z",
    "ipfsHash": "Qm456...",
    "ipfsUrl": "https://ipfs.io/ipfs/Qm456..."
  }
}
```

#### Get Owner's Content
```bash
GET /api/ownership/owner/{walletAddress}

Response:
{
  "owner": "0x123...",
  "totalContent": 5,
  "content": [...]
}
```

### Upload Endpoints

#### Upload to IPFS
```bash
POST /api/upload/ipfs
Content-Type: multipart/form-data

# Upload files without blockchain registration
```

#### Check IPFS Status
```bash
GET /api/upload/status/{ipfsHash}

Response:
{
  "available": true,
  "hash": "Qm456...",
  "publicUrl": "https://ipfs.io/ipfs/Qm456...",
  "metadata": {...}
}
```

## 🔧 Development Guide

### Project Structure
```
chaintrust/
├── contracts/              # Smart contracts (Solidity)
│   ├── ContentOwnershipRegistry.sol
│   ├── FreelanceEscrow.sol
│   └── SubscriptionPool.sol
├── backend/                # Node.js API server
│   ├── routes/             # API endpoints
│   ├── services/           # Business logic
│   └── server.js          # Express app
├── frontend/              # Next.js React app
│   ├── components/        # React components
│   ├── pages/            # Next.js pages
│   ├── lib/              # Utilities
│   └── styles/           # CSS styles
├── scripts/              # Deployment scripts
├── test/                # Contract tests
└── docker-compose.yml   # Docker configuration
```

### Smart Contract Development
```bash
# Compile contracts
npm run compile

# Run tests
npm test

# Deploy locally
npm run node          # Start local blockchain
npm run deploy:local  # Deploy contracts

# Deploy to testnet
npm run deploy:mumbai

# Verify on Polygonscan
npm run verify -- --network polygon 0xCONTRACT_ADDRESS
```

### Frontend Development
```bash
cd frontend

# Start development server
npm run dev

# Build for production
npm run build
npm start

# Type checking
npm run type-check

# Linting
npm run lint
```

### Backend Development
```bash
cd backend

# Start with auto-reload
npm run dev

# Start production server
npm start

# Run with debugger
npm run debug
```

## 🧪 Testing

### Smart Contract Tests
```bash
# Run all contract tests
npm test

# Run specific test file
npx hardhat test test/ContentOwnership.test.js

# Run with gas reporting
REPORT_GAS=true npm test

# Test coverage
npm run coverage
```

### Integration Tests
```bash
# Backend API tests
cd backend && npm test

# Frontend component tests  
cd frontend && npm test

# End-to-end tests
npm run test:e2e
```

## 🌍 Deployment

### Polygon Mumbai Testnet
1. Get Mumbai MATIC from [faucet](https://faucet.polygon.technology/)
2. Configure `POLYGON_MUMBAI_RPC` in `.env`
3. Run `npm run deploy:mumbai`
4. Update frontend with contract addresses

### Polygon Mainnet
1. Fund wallet with MATIC for gas fees
2. Configure `POLYGON_MAINNET_RPC` in `.env`  
3. Set `NODE_ENV=production`
4. Run `npm run deploy:polygon`
5. Verify contracts on Polygonscan

### Vercel (Frontend)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
# NEXT_PUBLIC_API_URL=https://your-api.com/api
```

### Railway/Render (Backend)
1. Connect GitHub repository
2. Set environment variables
3. Deploy with `npm run backend:start`

## 📊 Monitoring & Analytics

### Health Checks
- Backend: `GET /health`  
- IPFS: `GET /api/upload/health`
- Smart contracts: Monitor on Polygonscan

### Logs
```bash
# View application logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Database logs
docker-compose logs -f postgres

# All services
docker-compose logs -f
```

## 🔐 Security

### Smart Contract Security
- ✅ OpenZeppelin contracts used
- ✅ ReentrancyGuard implemented
- ✅ Access control modifiers
- ✅ Input validation
- ⏳ Audit scheduled (Q2 2024)

### API Security
- ✅ Rate limiting
- ✅ CORS configuration
- ✅ Input validation (Joi)
- ✅ File upload restrictions
- ✅ Webhook signature verification

### Frontend Security
- ✅ CSP headers
- ✅ XSS protection
- ✅ Wallet connection security
- ✅ No sensitive data in localStorage

## 🐛 Troubleshooting

### Common Issues

**"Transaction failed" errors:**
- Check wallet has MATIC for gas fees
- Verify network (Mumbai vs Mainnet)
- Increase gas limit if needed

**"File upload failed":**
- Check file size (max 10MB)
- Verify IPFS service status
- Check CORS configuration

**"Wallet not connecting":**
- Clear browser cache
- Disable conflicting wallet extensions
- Check network settings

**"Smart contract not found":**
- Verify deployed addresses in `deployed-addresses.json`
- Check correct network selected
- Redeploy contracts if needed

### Debug Mode
```bash
# Enable debug logging
DEBUG=chaintrust:* npm run backend:dev

# Frontend debug mode
NODE_ENV=development npm run dev
```

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Development Workflow
1. Fork repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

### Code Style
- ESLint + Prettier for JavaScript/TypeScript
- Solhint for Solidity
- Conventional commits for messages

## 📄 License

This project is licensed under the MIT License - see [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: [docs.chaintrust.app](https://docs.chaintrust.app)
- **Discord**: [discord.gg/chaintrust](https://discord.gg/chaintrust)
- **Email**: support@chaintrust.app
- **GitHub Issues**: [Create an issue](https://github.com/your-username/chaintrust/issues)

## 🗺️ Roadmap

### ✅ Phase 1: MVP (Q1 2024)
- [x] Proof of Ownership Module
- [x] Web3 Wallet Integration  
- [x] IPFS File Storage
- [x] Public Verification
- [x] Basic UI/UX

### 🚧 Phase 2: Core Platform (Q2 2024)
- [ ] Smart Contract Escrow
- [ ] Subscription Sharing Manager
- [ ] API Access & Documentation
- [ ] Mobile App (React Native)
- [ ] Batch Operations

### 🔮 Phase 3: Scale (Q3 2024)
- [ ] Multi-chain Support (Ethereum, BSC)
- [ ] NFT Integration
- [ ] Advanced Analytics
- [ ] White-label Solutions
- [ ] Enterprise Features

---

<div align="center">

**Made with ❤️ by the ChainTrust Team**

[Website](https://chaintrust.app) • [Twitter](https://twitter.com/chaintrustapp) • [Discord](https://discord.gg/chaintrust)

*Empowering creators with blockchain-verified ownership since 2024*

</div>