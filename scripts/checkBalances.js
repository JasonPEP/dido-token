const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * DIDO Token 余额查询脚本
 * 
 * 功能：
 * - 查询各地址的代币余额
 * - 查询时间锁合约的释放信息
 * - 显示代币分配情况
 * 
 * 使用方法：
 * - 测试网：npx hardhat run scripts/checkBalances.js --network sepolia
 * - 主网：npx hardhat run scripts/checkBalances.js --network mainnet
 */

async function main() {
    console.log("💰 查询 DIDO Token 余额信息...\n");
    
    // 读取部署信息
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
        // 获取合约实例
        const DIDOToken = await ethers.getContractFactory("DIDOToken");
        const TokenVesting = await ethers.getContractFactory("TokenVesting");
        
        const didoToken = DIDOToken.attach(deploymentInfo.contracts.DIDOToken.address);
        const tokenVesting = TokenVesting.attach(deploymentInfo.contracts.TokenVesting.address);
        
        // 1. 查询代币基本信息
        console.log("🔍 代币基本信息:");
        const tokenInfo = await didoToken.getTokenInfo();
        console.log("   代币名称:", tokenInfo.name);
        console.log("   代币符号:", tokenInfo.symbol);
        console.log("   小数位数:", tokenInfo.decimals);
        console.log("   总供应量:", ethers.formatEther(tokenInfo.totalSupply), "DDT");
        console.log("   最大供应量:", ethers.formatEther(tokenInfo.maxSupply), "DDT");
        console.log("   合约所有者:", tokenInfo.owner);
        console.log("   是否暂停:", tokenInfo.paused);
        console.log("");
        
        // 2. 查询各地址余额
        console.log("💰 代币分配情况:");
        console.log("=".repeat(60));
        
        const addresses = [
            { name: "流动性池", address: deploymentInfo.tokenAllocation.liquidityPool.address, percentage: "40%" },
            { name: "团队钱包", address: deploymentInfo.tokenAllocation.team.address, percentage: "30%" },
            { name: "社区钱包", address: deploymentInfo.tokenAllocation.community.address, percentage: "20%" },
            { name: "预留钱包", address: deploymentInfo.tokenAllocation.reserve.address, percentage: "10%" }
        ];
        
        for (const addr of addresses) {
            const balance = await didoToken.balanceOf(addr.address);
            const formattedBalance = ethers.formatEther(balance);
            console.log(`   ${addr.name} (${addr.percentage}):`);
            console.log(`      地址: ${addr.address}`);
            console.log(`      余额: ${formattedBalance} DDT`);
            console.log("");
        }
        
        // 3. 查询时间锁合约信息
        console.log("🔒 时间锁合约信息:");
        console.log("=".repeat(60));
        
        const vestingInfo = await tokenVesting.getContractInfo();
        const vestingDetails = await tokenVesting.getVestingInfo();
        const timeInfo = await tokenVesting.getTimeInfo();
        
        console.log("   合约地址:", vestingInfo.tokenAddress);
        console.log("   受益人地址:", vestingInfo.beneficiaryAddress);
        console.log("   总锁定数量:", ethers.formatEther(vestingInfo.totalAmount), "DDT");
        console.log("   已释放数量:", ethers.formatEther(vestingInfo.releasedAmount), "DDT");
        console.log("   开始时间:", new Date(Number(vestingInfo.startTime) * 1000).toLocaleString());
        console.log("   是否暂停:", vestingInfo.paused);
        console.log("   合约所有者:", vestingInfo.owner);
        console.log("");
        
        // 4. 查询释放进度
        console.log("📊 释放进度信息:");
        console.log("   已归属数量:", ethers.formatEther(vestingDetails.vestedAmount), "DDT");
        console.log("   已释放数量:", ethers.formatEther(vestingDetails.releasedAmount), "DDT");
        console.log("   可释放数量:", ethers.formatEther(vestingDetails.releasableAmount), "DDT");
        console.log("   剩余锁定数量:", ethers.formatEther(vestingDetails.remainingAmount), "DDT");
        console.log("   释放进度:", vestingDetails.progressPercent + "%");
        console.log("");
        
        // 5. 查询时间信息
        console.log("⏰ 时间信息:");
        const currentTime = new Date();
        const startTime = new Date(Number(timeInfo.startTime) * 1000);
        const cliffEndTime = new Date(Number(timeInfo.cliffEndTime) * 1000);
        const vestingEndTime = new Date(Number(timeInfo.vestingEndTime) * 1000);
        
        console.log("   开始时间:", startTime.toLocaleString());
        console.log("   悬崖期结束时间:", cliffEndTime.toLocaleString());
        console.log("   释放期结束时间:", vestingEndTime.toLocaleString());
        console.log("   当前时间:", currentTime.toLocaleString());
        console.log("");
        
        // 计算时间差
        const timeUntilCliff = Number(timeInfo.timeUntilCliff);
        const timeUntilVestingEnd = Number(timeInfo.timeUntilVestingEnd);
        
        if (timeUntilCliff > 0) {
            const daysUntilCliff = Math.ceil(timeUntilCliff / (24 * 60 * 60));
            console.log("   距离悬崖期结束:", daysUntilCliff, "天");
        } else {
            console.log("   ✅ 悬崖期已结束，可以开始释放代币");
        }
        
        if (timeUntilVestingEnd > 0) {
            const daysUntilVestingEnd = Math.ceil(timeUntilVestingEnd / (24 * 60 * 60));
            console.log("   距离释放期结束:", daysUntilVestingEnd, "天");
        } else {
            console.log("   ✅ 释放期已结束，可以提取全部代币");
        }
        console.log("");
        
        // 6. 查询合约余额
        console.log("🏦 合约余额:");
        const contractBalance = await didoToken.balanceOf(deploymentInfo.contracts.TokenVesting.address);
        console.log("   时间锁合约余额:", ethers.formatEther(contractBalance), "DDT");
        console.log("");
        
        // 7. 查询黑名单状态
        console.log("🚫 黑名单状态:");
        for (const addr of addresses) {
            const isBlacklisted = await didoToken.isBlacklisted(addr.address);
            console.log(`   ${addr.name}: ${isBlacklisted ? "❌ 已列入黑名单" : "✅ 正常"}`);
        }
        console.log("");
        
        // 8. 总结
        console.log("📋 查询总结:");
        console.log("=".repeat(60));
        console.log("   网络:", network.name);
        console.log("   查询时间:", new Date().toLocaleString());
        console.log("   代币合约:", deploymentInfo.contracts.DIDOToken.address);
        console.log("   时间锁合约:", deploymentInfo.contracts.TokenVesting.address);
        console.log("");
        
        // 9. 下一步建议
        console.log("💡 下一步建议:");
        if (vestingDetails.releasableAmount > 0) {
            console.log("   - 团队可以调用 release() 函数提取可释放的代币");
        } else if (timeUntilCliff > 0) {
            console.log("   - 团队代币仍在悬崖期内，无法提取");
        } else {
            console.log("   - 团队代币可以开始释放");
        }
        
        if (vestingDetails.progressPercent < 100) {
            console.log("   - 代币释放仍在进行中");
        } else {
            console.log("   - 所有代币已释放完成");
        }
        
        console.log("   - 建议定期检查余额和释放进度");
        console.log("");
        
    } catch (error) {
        console.error("❌ 查询失败:", error.message);
        console.error("错误详情:", error);
        process.exit(1);
    }
}

// 执行查询
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ 查询脚本执行失败:", error);
        process.exit(1);
    });
