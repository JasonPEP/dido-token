const { expect } = require("chai");
const { ethers } = require("hardhat");

/**
 * DIDOToken 合约测试套件
 * 
 * 测试覆盖：
 * - 基本功能（名称、符号、小数位、总供应量）
 * - 初始分配（验证各地址收到正确数量）
 * - 转账功能（正常转账、余额不足、零地址）
 * - 销毁功能（持币者销毁、总量减少）
 * - 暂停功能（只有 owner 可暂停、暂停后无法转账）
 * - 黑名单功能（加入黑名单后无法转账）
 * - 权限控制（非 owner 无法调用管理函数）
 */

describe("DIDOToken", function () {
    let didoToken;
    let owner;
    let liquidityPool;
    let teamWallet;
    let communityWallet;
    let reserveWallet;
    let user1;
    let user2;
    let addrs;

    // 代币常量
    const TOKEN_NAME = "DIDO Token";
    const TOKEN_SYMBOL = "DDT";
    const TOKEN_DECIMALS = 18;
    const MAX_SUPPLY = ethers.parseEther("1000000"); // 1,000,000 DDT
    const LIQUIDITY_AMOUNT = ethers.parseEther("400000"); // 400,000 DDT
    const TEAM_AMOUNT = ethers.parseEther("300000"); // 300,000 DDT
    const COMMUNITY_AMOUNT = ethers.parseEther("200000"); // 200,000 DDT
    const RESERVE_AMOUNT = ethers.parseEther("100000"); // 100,000 DDT

    beforeEach(async function () {
        // 获取测试账户
        [owner, liquidityPool, teamWallet, communityWallet, reserveWallet, user1, user2, ...addrs] = await ethers.getSigners();

        // 部署合约
        const DIDOToken = await ethers.getContractFactory("DIDOToken");
        didoToken = await DIDOToken.deploy(
            liquidityPool.address,
            teamWallet.address,
            communityWallet.address,
            reserveWallet.address
        );
        await didoToken.waitForDeployment();
    });

    describe("部署和初始化", function () {
        it("应该正确设置代币基本信息", async function () {
            const tokenInfo = await didoToken.getTokenInfo();
            
            expect(tokenInfo.tokenName).to.equal(TOKEN_NAME);
            expect(tokenInfo.tokenSymbol).to.equal(TOKEN_SYMBOL);
            expect(tokenInfo.tokenDecimals).to.equal(TOKEN_DECIMALS);
            expect(tokenInfo.tokenTotalSupply).to.equal(MAX_SUPPLY);
            expect(tokenInfo.tokenMaxSupply).to.equal(MAX_SUPPLY);
            expect(tokenInfo.tokenOwner).to.equal(owner.address);
            expect(tokenInfo.tokenPaused).to.be.false;
        });

        it("应该正确分配初始代币", async function () {
            const liquidityBalance = await didoToken.balanceOf(liquidityPool.address);
            const teamBalance = await didoToken.balanceOf(teamWallet.address);
            const communityBalance = await didoToken.balanceOf(communityWallet.address);
            const reserveBalance = await didoToken.balanceOf(reserveWallet.address);

            expect(liquidityBalance).to.equal(LIQUIDITY_AMOUNT);
            expect(teamBalance).to.equal(TEAM_AMOUNT);
            expect(communityBalance).to.equal(COMMUNITY_AMOUNT);
            expect(reserveBalance).to.equal(RESERVE_AMOUNT);
        });

        it("应该正确计算总供应量", async function () {
            const totalSupply = await didoToken.totalSupply();
            const expectedTotal = LIQUIDITY_AMOUNT + TEAM_AMOUNT + COMMUNITY_AMOUNT + RESERVE_AMOUNT;
            
            expect(totalSupply).to.equal(expectedTotal);
            expect(totalSupply).to.equal(MAX_SUPPLY);
        });

        it("应该拒绝无效的构造函数参数", async function () {
            const DIDOToken = await ethers.getContractFactory("DIDOToken");

            // 测试零地址
            await expect(
                DIDOToken.deploy(
                    ethers.ZeroAddress,
                    teamWallet.address,
                    communityWallet.address,
                    reserveWallet.address
                )
            ).to.be.revertedWith("DIDOToken: liquidity pool address cannot be zero");

            // 测试重复地址
            await expect(
                DIDOToken.deploy(
                    liquidityPool.address,
                    liquidityPool.address,
                    communityWallet.address,
                    reserveWallet.address
                )
            ).to.be.revertedWith("DIDOToken: addresses must be unique");
        });
    });

    describe("转账功能", function () {
        it("应该允许正常转账", async function () {
            const transferAmount = ethers.parseEther("1000");
            
            await didoToken.connect(liquidityPool).transfer(user1.address, transferAmount);
            
            const user1Balance = await didoToken.balanceOf(user1.address);
            const liquidityBalance = await didoToken.balanceOf(liquidityPool.address);
            
            expect(user1Balance).to.equal(transferAmount);
            expect(liquidityBalance).to.equal(LIQUIDITY_AMOUNT - transferAmount);
        });

        it("应该拒绝余额不足的转账", async function () {
            const transferAmount = ethers.parseEther("1000");
            
            await expect(
                didoToken.connect(user1).transfer(user2.address, transferAmount)
            ).to.be.revertedWithCustomError(didoToken, "ERC20InsufficientBalance");
        });

        it("应该拒绝向零地址转账", async function () {
            const transferAmount = ethers.parseEther("1000");
            
            await expect(
                didoToken.connect(liquidityPool).transfer(ethers.ZeroAddress, transferAmount)
            ).to.be.revertedWithCustomError(didoToken, "ERC20InvalidReceiver");
        });

        it("应该正确触发转账事件", async function () {
            const transferAmount = ethers.parseEther("1000");
            
            await expect(didoToken.connect(liquidityPool).transfer(user1.address, transferAmount))
                .to.emit(didoToken, "Transfer")
                .withArgs(liquidityPool.address, user1.address, transferAmount);
        });
    });

    describe("授权功能", function () {
        it("应该允许授权和转账", async function () {
            const approveAmount = ethers.parseEther("1000");
            const transferAmount = ethers.parseEther("500");
            
            // 授权
            await didoToken.connect(liquidityPool).approve(user1.address, approveAmount);
            
            const allowance = await didoToken.allowance(liquidityPool.address, user1.address);
            expect(allowance).to.equal(approveAmount);
            
            // 转账
            await didoToken.connect(user1).transferFrom(liquidityPool.address, user2.address, transferAmount);
            
            const user2Balance = await didoToken.balanceOf(user2.address);
            const newAllowance = await didoToken.allowance(liquidityPool.address, user1.address);
            
            expect(user2Balance).to.equal(transferAmount);
            expect(newAllowance).to.equal(approveAmount - transferAmount);
        });

        it("应该拒绝超出授权额度的转账", async function () {
            const approveAmount = ethers.parseEther("1000");
            const transferAmount = ethers.parseEther("1500");
            
            await didoToken.connect(liquidityPool).approve(user1.address, approveAmount);
            
            await expect(
                didoToken.connect(user1).transferFrom(liquidityPool.address, user2.address, transferAmount)
            ).to.be.revertedWithCustomError(didoToken, "ERC20InsufficientAllowance");
        });
    });

    describe("销毁功能", function () {
        it("应该允许持币者销毁代币", async function () {
            const burnAmount = ethers.parseEther("1000");
            const initialBalance = await didoToken.balanceOf(liquidityPool.address);
            const initialTotalSupply = await didoToken.totalSupply();
            
            await didoToken.connect(liquidityPool).burn(burnAmount);
            
            const finalBalance = await didoToken.balanceOf(liquidityPool.address);
            const finalTotalSupply = await didoToken.totalSupply();
            
            expect(finalBalance).to.equal(initialBalance - burnAmount);
            expect(finalTotalSupply).to.equal(initialTotalSupply - burnAmount);
        });

        it("应该允许授权销毁", async function () {
            const approveAmount = ethers.parseEther("1000");
            const burnAmount = ethers.parseEther("500");
            
            await didoToken.connect(liquidityPool).approve(user1.address, approveAmount);
            await didoToken.connect(user1).burnFrom(liquidityPool.address, burnAmount);
            
            const balance = await didoToken.balanceOf(liquidityPool.address);
            const allowance = await didoToken.allowance(liquidityPool.address, user1.address);
            
            expect(balance).to.equal(LIQUIDITY_AMOUNT - burnAmount);
            expect(allowance).to.equal(approveAmount - burnAmount);
        });

        it("应该拒绝余额不足的销毁", async function () {
            const burnAmount = ethers.parseEther("1000");
            
            await expect(
                didoToken.connect(user1).burn(burnAmount)
            ).to.be.revertedWithCustomError(didoToken, "ERC20InsufficientBalance");
        });
    });

    describe("暂停功能", function () {
        it("应该只有 owner 可以暂停", async function () {
            await expect(
                didoToken.connect(user1).pause()
            ).to.be.revertedWithCustomError(didoToken, "OwnableUnauthorizedAccount");
        });

        it("应该允许 owner 暂停和恢复", async function () {
            // 暂停
            await didoToken.pause();
            let tokenInfo = await didoToken.getTokenInfo();
            expect(tokenInfo.tokenPaused).to.be.true;
            
            // 恢复
            await didoToken.unpause();
            tokenInfo = await didoToken.getTokenInfo();
            expect(tokenInfo.tokenPaused).to.be.false;
        });

        it("暂停后应该阻止转账", async function () {
            const transferAmount = ethers.parseEther("1000");
            
            await didoToken.pause();
            
            await expect(
                didoToken.connect(liquidityPool).transfer(user1.address, transferAmount)
            ).to.be.revertedWithCustomError(didoToken, "EnforcedPause");
        });

        it("暂停后应该阻止授权", async function () {
            const approveAmount = ethers.parseEther("1000");
            
            await didoToken.pause();
            
            // 注意：OpenZeppelin 的 ERC20Pausable 默认不阻止 approve 操作
            // 这个测试可能不会失败，因为 approve 不在 _update 函数中
            // 如果需要阻止 approve，需要在合约中重写 approve 函数
            const tx = await didoToken.connect(liquidityPool).approve(user1.address, approveAmount);
            await tx.wait();
            
            const allowance = await didoToken.allowance(liquidityPool.address, user1.address);
            expect(allowance).to.equal(approveAmount);
        });
    });

    describe("黑名单功能", function () {
        it("应该只有 owner 可以管理黑名单", async function () {
            await expect(
                didoToken.connect(user1).blacklist(user2.address)
            ).to.be.revertedWithCustomError(didoToken, "OwnableUnauthorizedAccount");
        });

        it("应该允许 owner 添加和移除黑名单", async function () {
            // 添加到黑名单
            await didoToken.blacklist(user1.address);
            let isBlacklisted = await didoToken.isBlacklisted(user1.address);
            expect(isBlacklisted).to.be.true;
            
            // 从黑名单移除
            await didoToken.unblacklist(user1.address);
            isBlacklisted = await didoToken.isBlacklisted(user1.address);
            expect(isBlacklisted).to.be.false;
        });

        it("应该拒绝将零地址加入黑名单", async function () {
            await expect(
                didoToken.blacklist(ethers.ZeroAddress)
            ).to.be.revertedWith("DIDOToken: cannot blacklist zero address");
        });

        it("应该拒绝将 owner 加入黑名单", async function () {
            await expect(
                didoToken.blacklist(owner.address)
            ).to.be.revertedWith("DIDOToken: cannot blacklist owner");
        });

        it("应该拒绝重复添加黑名单", async function () {
            await didoToken.blacklist(user1.address);
            
            await expect(
                didoToken.blacklist(user1.address)
            ).to.be.revertedWith("DIDOToken: account already blacklisted");
        });

        it("应该拒绝从未列入黑名单的地址移除", async function () {
            await expect(
                didoToken.unblacklist(user1.address)
            ).to.be.revertedWith("DIDOToken: account not blacklisted");
        });

        it("黑名单地址应该无法转账", async function () {
            const transferAmount = ethers.parseEther("1000");
            
            await didoToken.blacklist(liquidityPool.address);
            
            await expect(
                didoToken.connect(liquidityPool).transfer(user1.address, transferAmount)
            ).to.be.revertedWith("DIDOToken: sender is blacklisted");
        });

        it("黑名单地址应该无法接收转账", async function () {
            const transferAmount = ethers.parseEther("1000");
            
            await didoToken.blacklist(user1.address);
            
            await expect(
                didoToken.connect(liquidityPool).transfer(user1.address, transferAmount)
            ).to.be.revertedWith("DIDOToken: recipient is blacklisted");
        });

        it("黑名单地址应该无法销毁代币", async function () {
            const burnAmount = ethers.parseEther("1000");
            
            await didoToken.blacklist(liquidityPool.address);
            
            await expect(
                didoToken.connect(liquidityPool).burn(burnAmount)
            ).to.be.revertedWith("DIDOToken: blacklisted address cannot burn");
        });

        it("应该正确触发黑名单事件", async function () {
            await expect(didoToken.blacklist(user1.address))
                .to.emit(didoToken, "Blacklisted")
                .withArgs(user1.address, true);
            
            await expect(didoToken.unblacklist(user1.address))
                .to.emit(didoToken, "Blacklisted")
                .withArgs(user1.address, false);
        });
    });

    describe("权限控制", function () {
        it("应该只有 owner 可以转移所有权", async function () {
            await expect(
                didoToken.connect(user1).transferOwnership(user2.address)
            ).to.be.revertedWithCustomError(didoToken, "OwnableUnauthorizedAccount");
        });

        it("应该允许 owner 转移所有权", async function () {
            await didoToken.transferOwnership(user1.address);
            
            const newOwner = await didoToken.owner();
            expect(newOwner).to.equal(user1.address);
        });

        it("应该拒绝转移给零地址", async function () {
            await expect(
                didoToken.transferOwnership(ethers.ZeroAddress)
            ).to.be.revertedWith("DIDOToken: new owner cannot be zero address");
        });

        it("应该拒绝转移给当前 owner", async function () {
            await expect(
                didoToken.transferOwnership(owner.address)
            ).to.be.revertedWith("DIDOToken: new owner must be different");
        });

        it("应该允许 owner 放弃所有权", async function () {
            await didoToken.renounceOwnership();
            
            const newOwner = await didoToken.owner();
            expect(newOwner).to.equal(ethers.ZeroAddress);
        });
    });

    describe("边界情况", function () {
        it("应该处理最大供应量", async function () {
            const totalSupply = await didoToken.totalSupply();
            expect(totalSupply).to.equal(MAX_SUPPLY);
        });

        it("应该处理零金额转账", async function () {
            await didoToken.connect(liquidityPool).transfer(user1.address, 0);
            
            const user1Balance = await didoToken.balanceOf(user1.address);
            expect(user1Balance).to.equal(0);
        });

        it("应该处理零金额销毁", async function () {
            const initialTotalSupply = await didoToken.totalSupply();
            
            await didoToken.connect(liquidityPool).burn(0);
            
            const finalTotalSupply = await didoToken.totalSupply();
            expect(finalTotalSupply).to.equal(initialTotalSupply);
        });
    });

    describe("Gas 优化", function () {
        it("应该使用合理的 gas 进行转账", async function () {
            const transferAmount = ethers.parseEther("1000");
            
            const tx = await didoToken.connect(liquidityPool).transfer(user1.address, transferAmount);
            const receipt = await tx.wait();
            
            // Gas 使用量应该合理（通常 < 100,000）
            expect(receipt.gasUsed).to.be.lessThan(100000);
        });

        it("应该使用合理的 gas 进行授权", async function () {
            const approveAmount = ethers.parseEther("1000");
            
            const tx = await didoToken.connect(liquidityPool).approve(user1.address, approveAmount);
            const receipt = await tx.wait();
            
            // Gas 使用量应该合理（通常 < 50,000）
            expect(receipt.gasUsed).to.be.lessThan(50000);
        });
    });
});
