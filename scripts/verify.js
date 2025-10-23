const { run } = require("hardhat");

/**
 * DIDO Token 合约验证脚本
 * 
 * 功能：
 * - 验证 DIDOToken 合约源码
 * - 验证 TokenVesting 合约源码
 * - 在 Etherscan 上公开合约源码
 * 
 * 使用方法：
 * - 测试网：npx hardhat run scripts/verify.js --network sepolia
 * - 主网：npx hardhat run scripts/verify.js --network mainnet
 */

async function main() {
    console.log("🔍 开始验证 DIDO Token 合约...\n");
    
    // 检查网络
    if (network.name === "hardhat") {
        console.log("❌ 无法在本地网络验证合约");
        process.exit(1);
    }
    
    // 读取部署信息
    const fs = require("fs");
    const path = require("path");
    const deploymentFile = path.join(__dirname, "..", "deployments", `${network.name}-deployment.json`);
    
    if (!fs.existsSync(deploymentFile)) {
        console.error("❌ 找不到部署信息文件:", deploymentFile);
        console.error("请先运行部署脚本: npx hardhat run scripts/deploy.js --network", network.name);
        process.exit(1);
    }
    
    const deploymentInfo = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
    console.log("📋 部署信息:");
    console.log("   网络:", deploymentInfo.network);
    console.log("   部署时间:", deploymentInfo.deploymentTime);
    console.log("   部署者:", deploymentInfo.deployer);
    console.log("");
    
    try {
        // 1. 验证 DIDOToken 合约
        console.log("🔍 正在验证 DIDOToken 合约...");
        const didoTokenAddress = deploymentInfo.contracts.DIDOToken.address;
        
        await run("verify:verify", {
            address: didoTokenAddress,
            constructorArguments: [
                deploymentInfo.tokenAllocation.liquidityPool.address,
                deploymentInfo.tokenAllocation.team.address,
                deploymentInfo.tokenAllocation.community.address,
                deploymentInfo.tokenAllocation.reserve.address
            ],
        });
        
        console.log("✅ DIDOToken 合约验证成功!");
        console.log("   合约地址:", didoTokenAddress);
        console.log("   Etherscan 链接:", `https://${network.name === "mainnet" ? "" : network.name + "."}etherscan.io/address/${didoTokenAddress}`);
        console.log("");
        
        // 2. 验证 TokenVesting 合约
        console.log("🔍 正在验证 TokenVesting 合约...");
        const tokenVestingAddress = deploymentInfo.contracts.TokenVesting.address;
        
        await run("verify:verify", {
            address: tokenVestingAddress,
            constructorArguments: [
                didoTokenAddress,
                deploymentInfo.tokenAllocation.team.address,
                ethers.parseEther(deploymentInfo.tokenAllocation.team.amount)
            ],
        });
        
        console.log("✅ TokenVesting 合约验证成功!");
        console.log("   合约地址:", tokenVestingAddress);
        console.log("   Etherscan 链接:", `https://${network.name === "mainnet" ? "" : network.name + "."}etherscan.io/address/${tokenVestingAddress}`);
        console.log("");
        
        // 3. 验证总结
        console.log("🎉 合约验证完成!");
        console.log("=".repeat(50));
        console.log("📋 验证总结:");
        console.log("   网络:", network.name);
        console.log("   验证时间:", new Date().toLocaleString());
        console.log("");
        console.log("📦 已验证的合约:");
        console.log("   DIDOToken:", didoTokenAddress);
        console.log("   TokenVesting:", tokenVestingAddress);
        console.log("");
        console.log("🔗 Etherscan 链接:");
        console.log("   DIDOToken:", `https://${network.name === "mainnet" ? "" : network.name + "."}etherscan.io/address/${didoTokenAddress}`);
        console.log("   TokenVesting:", `https://${network.name === "mainnet" ? "" : network.name + "."}etherscan.io/address/${tokenVestingAddress}`);
        console.log("");
        console.log("✅ 合约源码已公开，可以在 Etherscan 上查看");
        console.log("✅ 合约已通过验证，符合交易所上币要求");
        console.log("");
        
    } catch (error) {
        console.error("❌ 验证失败:", error.message);
        
        // 检查是否是重复验证
        if (error.message.includes("Already Verified")) {
            console.log("ℹ️  合约已经验证过了");
        } else if (error.message.includes("Contract source code already verified")) {
            console.log("ℹ️  合约源码已经验证过了");
        } else {
            console.error("错误详情:", error);
        }
        
        process.exit(1);
    }
}

// 执行验证
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ 验证脚本执行失败:", error);
        process.exit(1);
    });
