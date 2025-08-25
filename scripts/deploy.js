const { ethers } = require("hardhat");

async function main() {
    console.log("🚀 Starting ChainTrust contract deployment...\n");
    
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());
    
    // Fee recipient (can be changed later)
    const feeRecipient = deployer.address;
    
    console.log("\n📋 Deploying ContentOwnershipRegistry...");
    const ContentOwnershipRegistry = await ethers.getContractFactory("ContentOwnershipRegistry");
    const contentRegistry = await ContentOwnershipRegistry.deploy();
    await contentRegistry.deployed();
    console.log("✅ ContentOwnershipRegistry deployed to:", contentRegistry.address);
    
    console.log("\n💼 Deploying FreelanceEscrow...");
    const FreelanceEscrow = await ethers.getContractFactory("FreelanceEscrow");
    const escrow = await FreelanceEscrow.deploy(feeRecipient);
    await escrow.deployed();
    console.log("✅ FreelanceEscrow deployed to:", escrow.address);
    
    console.log("\n👥 Deploying SubscriptionPool...");
    const SubscriptionPool = await ethers.getContractFactory("SubscriptionPool");
    const subscriptionPool = await SubscriptionPool.deploy(feeRecipient);
    await subscriptionPool.deployed();
    console.log("✅ SubscriptionPool deployed to:", subscriptionPool.address);
    
    // Add deployer as approved mediator for escrow
    console.log("\n⚖️ Adding deployer as approved mediator...");
    await escrow.addMediator(deployer.address);
    console.log("✅ Mediator added");
    
    console.log("\n🎉 Deployment Summary:");
    console.log("=".repeat(50));
    console.log(`ContentOwnershipRegistry: ${contentRegistry.address}`);
    console.log(`FreelanceEscrow:          ${escrow.address}`);
    console.log(`SubscriptionPool:         ${subscriptionPool.address}`);
    console.log(`Fee Recipient:            ${feeRecipient}`);
    console.log("=".repeat(50));
    
    // Save addresses to config file
    const addresses = {
        contentOwnershipRegistry: contentRegistry.address,
        freelanceEscrow: escrow.address,
        subscriptionPool: subscriptionPool.address,
        feeRecipient: feeRecipient,
        deployer: deployer.address,
        network: (await ethers.provider.getNetwork()).name,
        chainId: (await ethers.provider.getNetwork()).chainId
    };
    
    const fs = require('fs');
    fs.writeFileSync(
        'deployed-addresses.json', 
        JSON.stringify(addresses, null, 2)
    );
    
    console.log("\n📄 Contract addresses saved to deployed-addresses.json");
    
    // Verify deployment
    console.log("\n🔍 Verifying deployments...");
    
    try {
        const registryCode = await ethers.provider.getCode(contentRegistry.address);
        const escrowCode = await ethers.provider.getCode(escrow.address);
        const poolCode = await ethers.provider.getCode(subscriptionPool.address);
        
        if (registryCode !== '0x' && escrowCode !== '0x' && poolCode !== '0x') {
            console.log("✅ All contracts successfully deployed and verified!");
        } else {
            console.log("❌ Contract verification failed");
        }
    } catch (error) {
        console.log("❌ Verification error:", error.message);
    }
    
    console.log("\n🏁 Deployment complete! Ready for frontend integration.");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Deployment failed:", error);
        process.exit(1);
    });