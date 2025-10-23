const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

/**
 * TokenVesting 合约测试套件
 * 
 * 测试覆盖：
 * - 初始状态（受益人、总量、开始时间正确）
 * - 悬崖期（6 个月内无法提取）
 * - 线性释放（时间推移后可提取对应数量）
 * - 重复提取（已提取的不能再提取）
 * - 完全释放（24 个月后可提取全部）
 * - 暂停功能
 * - 紧急提取功能
 * - 权限控制
 */

describe("TokenVesting", function () {
    let didoToken;
    let tokenVesting;
    let owner;
    let beneficiary;
    let user1;
    let user2;
    let addrs;

    // 时间常量
    const CLIFF_DURATION = 180 * 24 * 60 * 60; // 6 个月（秒）
    const RELEASE_DURATION = 540 * 24 * 60 * 60; // 18 个月（秒）
    const TOTAL_DURATION = 720 * 24 * 60 * 60; // 24 个月（秒）
    
    // 代币常量
    const VESTING_AMOUNT = ethers.parseEther("300000"); // 300,000 DDT

    beforeEach(async function () {
        // 获取测试账户
        [owner, beneficiary, user1, user2, ...addrs] = await ethers.getSigners();

        // 部署 DIDOToken 合约
        const DIDOToken = await ethers.getContractFactory("DIDOToken");
        didoToken = await DIDOToken.deploy(
            user1.address, // 流动性池
            beneficiary.address, // 团队钱包
            user2.address, // 社区钱包
            owner.address // 预留钱包
        );
        await didoToken.waitForDeployment();

        // 部署 TokenVesting 合约
        const TokenVesting = await ethers.getContractFactory("TokenVesting");
        tokenVesting = await TokenVesting.deploy(
            await didoToken.getAddress(),
            beneficiary.address,
            VESTING_AMOUNT
        );
        await tokenVesting.waitForDeployment();

        // 将团队代币转入时间锁合约
        await didoToken.connect(beneficiary).transfer(await tokenVesting.getAddress(), VESTING_AMOUNT);
    });

    describe("部署和初始化", function () {
        it("应该正确设置合约基本信息", async function () {
            const contractInfo = await tokenVesting.getContractInfo();
            
            expect(contractInfo.tokenAddress).to.equal(await didoToken.getAddress());
            expect(contractInfo.beneficiaryAddress).to.equal(beneficiary.address);
            expect(contractInfo.contractTotalAmount).to.equal(VESTING_AMOUNT);
            expect(contractInfo.releasedAmount).to.equal(0);
            expect(contractInfo.contractOwner).to.equal(owner.address);
            expect(contractInfo.contractPaused).to.be.false;
        });

        it("应该正确设置时间信息", async function () {
            const timeInfo = await tokenVesting.getTimeInfo();
            const currentTime = await time.latest();
            
            expect(Number(timeInfo.contractStartTime)).to.be.closeTo(Number(currentTime), 1);
            expect(timeInfo.cliffEndTime).to.equal(Number(timeInfo.contractStartTime) + CLIFF_DURATION);
            expect(timeInfo.vestingEndTime).to.equal(Number(timeInfo.contractStartTime) + TOTAL_DURATION);
            expect(Number(timeInfo.currentTime)).to.be.closeTo(Number(currentTime), 1);
        });

        it("应该正确计算初始释放信息", async function () {
            const vestingInfo = await tokenVesting.getVestingInfo();
            
            expect(vestingInfo.vestedAmount).to.equal(0);
            expect(vestingInfo.releasedAmount).to.equal(0);
            expect(vestingInfo.releasableAmount).to.equal(0);
            expect(vestingInfo.remainingAmount).to.equal(VESTING_AMOUNT);
            expect(vestingInfo.progressPercent).to.equal(0);
        });

        it("应该拒绝无效的构造函数参数", async function () {
            const TokenVesting = await ethers.getContractFactory("TokenVesting");

            // 测试零地址
            await expect(
                TokenVesting.deploy(
                    ethers.ZeroAddress,
                    beneficiary.address,
                    VESTING_AMOUNT
                )
            ).to.be.revertedWith("TokenVesting: token address cannot be zero");

            await expect(
                TokenVesting.deploy(
                    await didoToken.getAddress(),
                    ethers.ZeroAddress,
                    VESTING_AMOUNT
                )
            ).to.be.revertedWith("TokenVesting: beneficiary address cannot be zero");

            // 测试零数量
            await expect(
                TokenVesting.deploy(
                    await didoToken.getAddress(),
                    beneficiary.address,
                    0
                )
            ).to.be.revertedWith("TokenVesting: total amount must be greater than zero");
        });
    });

    describe("悬崖期功能", function () {
        it("悬崖期内应该无法提取代币", async function () {
            // 快进到悬崖期中间
            await time.increase(CLIFF_DURATION / 2);
            
            const releasableAmount = await tokenVesting.getReleasableAmount();
            expect(releasableAmount).to.equal(0);
            
            await expect(
                tokenVesting.connect(beneficiary).release()
            ).to.be.revertedWith("TokenVesting: no tokens to release");
        });

        it("悬崖期结束时应该可以开始提取", async function () {
            // 快进到悬崖期结束
            await time.increase(CLIFF_DURATION);
            
            const releasableAmount = await tokenVesting.getReleasableAmount();
            expect(Number(releasableAmount)).to.be.closeTo(0, 1000000); // 允许小的计算误差
            
            // 快进一天
            await time.increase(24 * 60 * 60);
            
            const newReleasableAmount = await tokenVesting.getReleasableAmount();
            expect(newReleasableAmount).to.be.greaterThan(0);
        });
    });

    describe("线性释放功能", function () {
        it("应该正确计算线性释放的代币数量", async function () {
            // 快进到悬崖期结束
            await time.increase(CLIFF_DURATION);
            
            // 快进到释放期中间
            await time.increase(RELEASE_DURATION / 2);
            
            const vestingInfo = await tokenVesting.getVestingInfo();
            const expectedVested = VESTING_AMOUNT / 2n; // 应该释放一半
            
            expect(vestingInfo.vestedAmount).to.be.closeTo(expectedVested, ethers.parseEther("1"));
            expect(vestingInfo.progressPercent).to.be.closeTo(50, 1);
        });

        it("应该允许提取可释放的代币", async function () {
            // 快进到悬崖期结束 + 1 天
            await time.increase(CLIFF_DURATION + 24 * 60 * 60);
            
            const releasableAmount = await tokenVesting.getReleasableAmount();
            const initialBalance = await didoToken.balanceOf(beneficiary.address);
            
            await tokenVesting.connect(beneficiary).release();
            
            const finalBalance = await didoToken.balanceOf(beneficiary.address);
            const contractInfo = await tokenVesting.getContractInfo();
            
            expect(finalBalance - initialBalance).to.be.closeTo(releasableAmount, ethers.parseEther("0.1"));
            expect(contractInfo.releasedAmount).to.be.closeTo(releasableAmount, ethers.parseEther("0.1"));
        });

        it("应该正确触发释放事件", async function () {
            // 快进到悬崖期结束 + 1 天
            await time.increase(CLIFF_DURATION + 24 * 60 * 60);
            
            const releasableAmount = await tokenVesting.getReleasableAmount();
            
            await expect(tokenVesting.connect(beneficiary).release())
                .to.emit(tokenVesting, "TokensReleased")
                .withArgs(releasableAmount, await time.latest() + 1);
        });
    });

    describe("完全释放功能", function () {
        it("释放期结束后应该可以提取全部代币", async function () {
            // 快进到释放期结束
            await time.increase(TOTAL_DURATION);
            
            const vestingInfo = await tokenVesting.getVestingInfo();
            expect(vestingInfo.vestedAmount).to.equal(VESTING_AMOUNT);
            expect(vestingInfo.releasableAmount).to.equal(VESTING_AMOUNT);
            expect(vestingInfo.progressPercent).to.equal(100);
            
            const initialBalance = await didoToken.balanceOf(beneficiary.address);
            
            await tokenVesting.connect(beneficiary).release();
            
            const finalBalance = await didoToken.balanceOf(beneficiary.address);
            expect(finalBalance - initialBalance).to.equal(VESTING_AMOUNT);
        });

        it("完全释放后应该无法再次提取", async function () {
            // 快进到释放期结束
            await time.increase(TOTAL_DURATION);
            
            // 第一次提取
            await tokenVesting.connect(beneficiary).release();
            
            // 第二次提取应该失败
            await expect(
                tokenVesting.connect(beneficiary).release()
            ).to.be.revertedWith("TokenVesting: no tokens to release");
        });
    });

    describe("权限控制", function () {
        it("应该只有受益人可以释放代币", async function () {
            // 快进到悬崖期结束 + 1 天
            await time.increase(CLIFF_DURATION + 24 * 60 * 60);
            
            await expect(
                tokenVesting.connect(user1).release()
            ).to.be.revertedWith("TokenVesting: only beneficiary can release");
        });

        it("应该只有 owner 可以暂停", async function () {
            await expect(
                tokenVesting.connect(user1).pause()
            ).to.be.revertedWithCustomError(tokenVesting, "OwnableUnauthorizedAccount");
        });

        it("应该只有 owner 可以恢复", async function () {
            await tokenVesting.pause();
            
            await expect(
                tokenVesting.connect(user1).unpause()
            ).to.be.revertedWithCustomError(tokenVesting, "OwnableUnauthorizedAccount");
        });

        it("应该只有 owner 可以紧急提取", async function () {
            await expect(
                tokenVesting.connect(user1).emergencyWithdraw(ethers.parseEther("1000"))
            ).to.be.revertedWithCustomError(tokenVesting, "OwnableUnauthorizedAccount");
        });
    });

    describe("暂停功能", function () {
        it("应该允许 owner 暂停和恢复", async function () {
            // 暂停
            await tokenVesting.pause();
            let contractInfo = await tokenVesting.getContractInfo();
            expect(contractInfo.contractPaused).to.be.true;
            
            // 恢复
            await tokenVesting.unpause();
            contractInfo = await tokenVesting.getContractInfo();
            expect(contractInfo.contractPaused).to.be.false;
        });

        it("暂停后应该阻止释放代币", async function () {
            // 快进到悬崖期结束 + 1 天
            await time.increase(CLIFF_DURATION + 24 * 60 * 60);
            
            await tokenVesting.pause();
            
            await expect(
                tokenVesting.connect(beneficiary).release()
            ).to.be.revertedWith("TokenVesting: vesting is paused");
        });

        it("应该正确触发暂停事件", async function () {
            await expect(tokenVesting.pause())
                .to.emit(tokenVesting, "VestingPaused")
                .withArgs(true, await time.latest() + 1);
            
            await expect(tokenVesting.unpause())
                .to.emit(tokenVesting, "VestingPaused")
                .withArgs(false, await time.latest() + 1);
        });
    });

    describe("紧急提取功能", function () {
        it("应该允许 owner 紧急提取代币", async function () {
            const withdrawAmount = ethers.parseEther("1000");
            const initialBalance = await didoToken.balanceOf(owner.address);
            
            await tokenVesting.emergencyWithdraw(withdrawAmount);
            
            const finalBalance = await didoToken.balanceOf(owner.address);
            expect(finalBalance - initialBalance).to.equal(withdrawAmount);
        });

        it("应该拒绝提取零数量", async function () {
            await expect(
                tokenVesting.emergencyWithdraw(0)
            ).to.be.revertedWith("TokenVesting: amount must be greater than zero");
        });

        it("应该拒绝提取超过余额的数量", async function () {
            const contractBalance = await didoToken.balanceOf(await tokenVesting.getAddress());
            
            await expect(
                tokenVesting.emergencyWithdraw(contractBalance + 1n)
            ).to.be.revertedWith("TokenVesting: insufficient balance");
        });

        it("应该正确触发紧急提取事件", async function () {
            const withdrawAmount = ethers.parseEther("1000");
            
            await expect(tokenVesting.emergencyWithdraw(withdrawAmount))
                .to.emit(tokenVesting, "EmergencyWithdrawal")
                .withArgs(withdrawAmount, await time.latest() + 1);
        });
    });

    describe("所有权管理", function () {
        it("应该允许 owner 转移所有权", async function () {
            await tokenVesting.transferOwnership(user1.address);
            
            const newOwner = await tokenVesting.owner();
            expect(newOwner).to.equal(user1.address);
        });

        it("应该拒绝转移给零地址", async function () {
            await expect(
                tokenVesting.transferOwnership(ethers.ZeroAddress)
            ).to.be.revertedWith("TokenVesting: new owner cannot be zero address");
        });

        it("应该拒绝转移给当前 owner", async function () {
            await expect(
                tokenVesting.transferOwnership(owner.address)
            ).to.be.revertedWith("TokenVesting: new owner must be different");
        });

        it("应该允许 owner 放弃所有权", async function () {
            await tokenVesting.renounceOwnership();
            
            const newOwner = await tokenVesting.owner();
            expect(newOwner).to.equal(ethers.ZeroAddress);
        });
    });

    describe("边界情况", function () {
        it("应该处理精确的时间计算", async function () {
            // 快进到悬崖期结束
            await time.increase(CLIFF_DURATION);
            
            const vestingInfo = await tokenVesting.getVestingInfo();
            expect(Number(vestingInfo.vestedAmount)).to.be.closeTo(0, 1000000); // 允许小的计算误差
            
            // 快进到释放期结束
            await time.increase(RELEASE_DURATION);
            
            const finalVestingInfo = await tokenVesting.getVestingInfo();
            expect(finalVestingInfo.vestedAmount).to.be.closeTo(VESTING_AMOUNT, ethers.parseEther("0.001"));
        });

        it("应该处理多次部分释放", async function () {
            // 快进到悬崖期结束 + 1 天
            await time.increase(CLIFF_DURATION + 24 * 60 * 60);
            
            const firstReleasable = await tokenVesting.getReleasableAmount();
            await tokenVesting.connect(beneficiary).release();
            
            // 快进 1 天
            await time.increase(24 * 60 * 60);
            
            const secondReleasable = await tokenVesting.getReleasableAmount();
            await tokenVesting.connect(beneficiary).release();
            
            expect(secondReleasable).to.be.greaterThan(0);
        });
    });

    describe("Gas 优化", function () {
        it("应该使用合理的 gas 进行释放", async function () {
            // 快进到悬崖期结束 + 1 天
            await time.increase(CLIFF_DURATION + 24 * 60 * 60);
            
            const tx = await tokenVesting.connect(beneficiary).release();
            const receipt = await tx.wait();
            
            // Gas 使用量应该合理（通常 < 100,000）
            expect(receipt.gasUsed).to.be.lessThan(100000);
        });

        it("应该使用合理的 gas 进行查询", async function () {
            const tx = await tokenVesting.getVestingInfo();
            // 查询函数不消耗 gas，但我们可以测试它不会失败
            expect(tx).to.not.be.undefined;
        });
    });
});
