const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * DIDO Token 部署脚本
 * 
 * 功能：
 * - 部署 DIDOToken 合约
 * - 部署 TokenVesting 合约
 * - 将团队代币转入时间锁合约
 * - 保存部署信息到文件
 * - 验证部署结果
 * 
 * 使用方法：
 * - 测试网：npx hardhat run scripts/deploy.js --network sepolia
 * - 主网：npx hardhat run scripts/deploy.js --network mainnet
 */

async function main() {
    console.log("🚀 开始部署 DIDO Token 项目...\n");
    
    // 获取部署者账户
    const [deployer] = await ethers.getSigners();
    console.log("📋 部署信息:");
    console.log("   部署者地址:", deployer.address);
    console.log("   部署者余额:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH");
    console.log("   网络:", network.name);
    console.log("   链 ID:", network.config.chainId);
    console.log("");
    
    // 检查环境变量
    const requiredEnvVars = [
        "LIQUIDITY_POOL_ADDRESS",
        "TEAM_WALLET_ADDRESS", 
        "COMMUNITY_WALLET_ADDRESS",
        "RESERVE_WALLET_ADDRESS"
    ];
    
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    if (missingVars.length > 0) {
        console.error("❌ 缺少必需的环境变量:", missingVars.join(", "));
        console.error("请检查 .env 文件中的配置");
        process.exit(1);
    }
    
    // 获取分配地址
    const liquidityPool = process.env.LIQUIDITY_POOL_ADDRESS;
    const teamWallet = process.env.TEAM_WALLET_ADDRESS;
    const communityWallet = process.env.COMMUNITY_WALLET_ADDRESS;
    const reserveWallet = process.env.RESERVE_WALLET_ADDRESS;
    
    console.log("📊 代币分配地址:");
    console.log("   流动性池:", liquidityPool);
    console.log("   团队钱包:", teamWallet);
    console.log("   社区钱包:", communityWallet);
    console.log("   预留钱包:", reserveWallet);
    console.log("");
    
    // 验证地址格式
    const addresses = [liquidityPool, teamWallet, communityWallet, reserveWallet];
    for (const addr of addresses) {
        if (!ethers.isAddress(addr)) {
            console.error("❌ 无效的地址格式:", addr);
            process.exit(1);
        }
    }
    
    // 检查地址重复
    const uniqueAddresses = new Set(addresses);
    if (uniqueAddresses.size !== addresses.length) {
        console.error("❌ 分配地址不能重复");
        process.exit(1);
    }
    
    try {
        // 1. 部署 DIDOToken 合约
        console.log("📦 正在部署 DIDOToken 合约...");
        const DIDOToken = await ethers.getContractFactory("DIDOToken");
        const didoToken = await DIDOToken.deploy(
            liquidityPool,
            teamWallet,
            communityWallet,
            reserveWallet
        );
        
        await didoToken.waitForDeployment();
        const didoTokenAddress = await didoToken.getAddress();
        
        console.log("✅ DIDOToken 合约部署成功!");
        console.log("   合约地址:", didoTokenAddress);
        console.log("   交易哈希:", didoToken.deploymentTransaction().hash);
        console.log("");
        
        // 2. 验证代币信息
        console.log("🔍 验证代币信息...");
        const tokenInfo = await didoToken.getTokenInfo();
        console.log("   代币名称:", tokenInfo.name);
        console.log("   代币符号:", tokenInfo.symbol);
        console.log("   小数位数:", tokenInfo.decimals);
        console.log("   总供应量:", ethers.formatEther(tokenInfo.totalSupply), "DDT");
        console.log("   最大供应量:", ethers.formatEther(tokenInfo.maxSupply), "DDT");
        console.log("   合约所有者:", tokenInfo.owner);
        console.log("   是否暂停:", tokenInfo.paused);
        console.log("");
        
        // 3. 验证代币分配
        console.log("💰 验证代币分配...");
        const balances = await Promise.all([
            didoToken.balanceOf(liquidityPool),
            didoToken.balanceOf(teamWallet),
            didoToken.balanceOf(communityWallet),
            didoToken.balanceOf(reserveWallet)
        ]);
        
        console.log("   流动性池余额:", ethers.formatEther(balances[0]), "DDT");
        console.log("   团队钱包余额:", ethers.formatEther(balances[1]), "DDT");
        console.log("   社区钱包余额:", ethers.formatEther(balances[2]), "DDT");
        console.log("   预留钱包余额:", ethers.formatEther(balances[3]), "DDT");
        console.log("");
        
        // 4. 部署 TokenVesting 合约
        console.log("📦 正在部署 TokenVesting 合约...");
        const TokenVesting = await ethers.getContractFactory("TokenVesting");
        const tokenVesting = await TokenVesting.deploy(
            didoTokenAddress,
            teamWallet,
            balances[1] // 团队代币数量
        );
        
        await tokenVesting.waitForDeployment();
        const tokenVestingAddress = await tokenVesting.getAddress();
        
        console.log("✅ TokenVesting 合约部署成功!");
        console.log("   合约地址:", tokenVestingAddress);
        console.log("   交易哈希:", tokenVesting.deploymentTransaction().hash);
        console.log("");
        
        // 5. 将团队代币转入时间锁合约
        console.log("🔄 正在转移团队代币到时间锁合约...");
        
        // 首先需要团队钱包授权
        const teamSigner = await ethers.getSigner(teamWallet);
        const teamTokenContract = didoToken.connect(teamSigner);
        
        // 授权时间锁合约使用团队代币
        const approveTx = await teamTokenContract.approve(tokenVestingAddress, balances[1]);
        await approveTx.wait();
        console.log("   授权交易哈希:", approveTx.hash);
        
        // 转移代币到时间锁合约
        const transferTx = await teamTokenContract.transfer(tokenVestingAddress, balances[1]);
        await transferTx.wait();
        console.log("   转移交易哈希:", transferTx.hash);
        
        // 验证转移结果
        const vestingBalance = await didoToken.balanceOf(tokenVestingAddress);
        const teamBalance = await didoToken.balanceOf(teamWallet);
        
        console.log("   时间锁合约余额:", ethers.formatEther(vestingBalance), "DDT");
        console.log("   团队钱包余额:", ethers.formatEther(teamBalance), "DDT");
        console.log("");
        
        // 6. 验证时间锁合约信息
        console.log("🔍 验证时间锁合约信息...");
        const vestingInfo = await tokenVesting.getContractInfo();
        console.log("   代币合约地址:", vestingInfo.tokenAddress);
        console.log("   受益人地址:", vestingInfo.beneficiaryAddress);
        console.log("   总锁定数量:", ethers.formatEther(vestingInfo.totalAmount), "DDT");
        console.log("   已释放数量:", ethers.formatEther(vestingInfo.releasedAmount), "DDT");
        console.log("   开始时间:", new Date(Number(vestingInfo.startTime) * 1000).toLocaleString());
        console.log("   是否暂停:", vestingInfo.paused);
        console.log("   合约所有者:", vestingInfo.owner);
        console.log("");
        
        // 7. 保存部署信息
        const deploymentInfo = {
            network: network.name,
            chainId: network.config.chainId,
            deployer: deployer.address,
            deploymentTime: new Date().toISOString(),
            contracts: {
                DIDOToken: {
                    address: didoTokenAddress,
                    transactionHash: didoToken.deploymentTransaction().hash,
                    blockNumber: await didoToken.deploymentTransaction().getBlockNumber()
                },
                TokenVesting: {
                    address: tokenVestingAddress,
                    transactionHash: tokenVesting.deploymentTransaction().hash,
                    blockNumber: await tokenVesting.deploymentTransaction().getBlockNumber()
                }
            },
            tokenAllocation: {
                liquidityPool: {
                    address: liquidityPool,
                    amount: ethers.formatEther(balances[0]),
                    percentage: "40%"
                },
                team: {
                    address: teamWallet,
                    amount: ethers.formatEther(balances[1]),
                    percentage: "30%",
                    vestingContract: tokenVestingAddress
                },
                community: {
                    address: communityWallet,
                    amount: ethers.formatEther(balances[2]),
                    percentage: "20%"
                },
                reserve: {
                    address: reserveWallet,
                    amount: ethers.formatEther(balances[3]),
                    percentage: "10%"
                }
            }
        };
        
        // 创建 deployments 目录
        const deploymentsDir = path.join(__dirname, "..", "deployments");
        if (!fs.existsSync(deploymentsDir)) {
            fs.mkdirSync(deploymentsDir);
        }
        
        // 保存部署信息
        const deploymentFile = path.join(deploymentsDir, `${network.name}-deployment.json`);
        fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
        
        console.log("💾 部署信息已保存到:", deploymentFile);
        console.log("");
        
        // 8. 部署总结
        console.log("🎉 部署完成!");
        console.log("=".repeat(50));
        console.log("📋 部署总结:");
        console.log("   网络:", network.name);
        console.log("   部署时间:", new Date().toLocaleString());
        console.log("   部署者:", deployer.address);
        console.log("");
        console.log("📦 合约地址:");
        console.log("   DIDOToken:", didoTokenAddress);
        console.log("   TokenVesting:", tokenVestingAddress);
        console.log("");
        console.log("💰 代币分配:");
        console.log("   流动性池 (40%):", ethers.formatEther(balances[0]), "DDT");
        console.log("   团队 (30%):", ethers.formatEther(balances[1]), "DDT (已锁定)");
        console.log("   社区 (20%):", ethers.formatEther(balances[2]), "DDT");
        console.log("   预留 (10%):", ethers.formatEther(balances[3]), "DDT");
        console.log("");
        console.log("🔗 下一步:");
        console.log("   1. 验证合约: npx hardhat run scripts/verify.js --network", network.name);
        console.log("   2. 检查余额: npx hardhat run scripts/checkBalances.js --network", network.name);
        console.log("   3. 运行测试: npm test");
        console.log("");
        
        // 9. 安全提醒
        console.log("⚠️  安全提醒:");
        console.log("   - 请妥善保管私钥，不要泄露");
        console.log("   - 建议将合约所有权转移给多签钱包");
        console.log("   - 在生产环境部署前，建议进行安全审计");
        console.log("   - 团队代币已锁定 24 个月，6 个月后开始线性释放");
        console.log("");
        
    } catch (error) {
        console.error("❌ 部署失败:", error.message);
        console.error("错误详情:", error);
        process.exit(1);
    }
}

// 执行部署
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ 部署脚本执行失败:", error);
        process.exit(1);
    });
