// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title TokenVesting
 * @dev 代币时间锁合约，用于锁定团队代币
 * 
 * 功能特性：
 * - 线性释放机制
 * - 悬崖期（cliff period）
 * - 防重入攻击保护
 * - 权限管理
 * - 紧急停止功能
 * 
 * 释放时间表：
 * - 悬崖期：6 个月（180 天）
 * - 释放期：18 个月（540 天）
 * - 总锁定时间：24 个月（720 天）
 * 
 * 释放机制：
 * - 前 6 个月：无法提取任何代币
 * - 6-24 个月：线性释放，每天释放 1/540 的代币
 * - 24 个月后：可提取全部剩余代币
 * 
 * 安全考虑：
 * - 使用 OpenZeppelin 的安全库
 * - 防重入攻击保护
 * - 权限控制
 * - 紧急停止功能
 * 
 * @author DIDO Token Team
 * @notice 此合约用于锁定团队代币，增加项目可信度
 */
contract TokenVesting is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    // ===========================================
    // 状态变量
    // ===========================================
    
    /// @dev 被锁定的代币合约
    IERC20 public immutable token;
    
    /// @dev 受益人地址
    address public immutable beneficiary;
    
    /// @dev 锁定的代币总量
    uint256 public immutable totalAmount;
    
    /// @dev 开始时间（部署时间）
    uint256 public immutable startTime;
    
    /// @dev 悬崖期（秒）
    uint256 public constant CLIFF_DURATION = 180 days; // 6 个月
    
    /// @dev 释放期（秒）
    uint256 public constant RELEASE_DURATION = 540 days; // 18 个月
    
    /// @dev 总锁定时间（秒）
    uint256 public constant TOTAL_DURATION = 720 days; // 24 个月
    
    /// @dev 已释放的代币数量
    uint256 public released;
    
    /// @dev 是否已暂停
    bool public paused;
    
    // ===========================================
    // 事件
    // ===========================================
    
    /// @dev 代币释放事件
    event TokensReleased(uint256 amount, uint256 timestamp);
    
    /// @dev 合约暂停事件
    event VestingPaused(bool paused, uint256 timestamp);
    
    /// @dev 紧急提取事件
    event EmergencyWithdrawal(uint256 amount, uint256 timestamp);
    
    // ===========================================
    // 修饰符
    // ===========================================
    
    /// @dev 检查合约是否未暂停
    modifier whenNotPaused() {
        require(!paused, "TokenVesting: vesting is paused");
        _;
    }
    
    /// @dev 检查合约是否已暂停
    modifier whenPaused() {
        require(paused, "TokenVesting: vesting is not paused");
        _;
    }
    
    // ===========================================
    // 构造函数
    // ===========================================
    
    /**
     * @dev 构造函数
     * @param _token 被锁定的代币合约地址
     * @param _beneficiary 受益人地址
     * @param _totalAmount 锁定的代币总量
     * 
     * 注意：
     * - 部署者将成为合约的 owner
     * - 开始时间设置为部署时间
     * - 代币必须预先转入此合约
     */
    constructor(
        address _token,
        address _beneficiary,
        uint256 _totalAmount
    ) Ownable(msg.sender) {
        require(_token != address(0), "TokenVesting: token address cannot be zero");
        require(_beneficiary != address(0), "TokenVesting: beneficiary address cannot be zero");
        require(_totalAmount > 0, "TokenVesting: total amount must be greater than zero");
        
        token = IERC20(_token);
        beneficiary = _beneficiary;
        totalAmount = _totalAmount;
        startTime = block.timestamp;
        
        // 注意：代币应该在部署后转入此合约
        // 验证将在第一次 release 时进行
    }
    
    // ===========================================
    // 主要功能
    // ===========================================
    
    /**
     * @dev 释放可提取的代币
     * @notice 只有受益人可调用此函数
     * @notice 根据时间计算可释放的代币数量
     * @notice 释放的代币将转入受益人地址
     */
    function release() external nonReentrant whenNotPaused {
        require(msg.sender == beneficiary, "TokenVesting: only beneficiary can release");
        
        uint256 releasableAmount = getReleasableAmount();
        require(releasableAmount > 0, "TokenVesting: no tokens to release");
        
        released += releasableAmount;
        token.safeTransfer(beneficiary, releasableAmount);
        
        emit TokensReleased(releasableAmount, block.timestamp);
    }
    
    /**
     * @dev 计算当前可释放的代币数量
     * @return 可释放的代币数量
     */
    function getReleasableAmount() public view returns (uint256) {
        return getVestedAmount() - released;
    }
    
    /**
     * @dev 计算当前已归属的代币数量
     * @return 已归属的代币数量
     */
    function getVestedAmount() public view returns (uint256) {
        uint256 currentTime = block.timestamp;
        
        // 如果还在悬崖期内，返回 0
        if (currentTime < startTime + CLIFF_DURATION) {
            return 0;
        }
        
        // 如果超过总锁定时间，返回全部代币
        if (currentTime >= startTime + TOTAL_DURATION) {
            return totalAmount;
        }
        
        // 计算线性释放的代币数量
        uint256 timeSinceCliff = currentTime - (startTime + CLIFF_DURATION);
        uint256 vestedAmount = (totalAmount * timeSinceCliff) / RELEASE_DURATION;
        
        return vestedAmount;
    }
    
    /**
     * @dev 获取释放进度信息
     * @return vestedAmount 已归属的代币数量
     * @return releasedAmount 已释放的代币数量
     * @return releasableAmount 可释放的代币数量
     * @return remainingAmount 剩余锁定的代币数量
     * @return progressPercent 释放进度百分比（0-100）
     */
    function getVestingInfo() external view returns (
        uint256 vestedAmount,
        uint256 releasedAmount,
        uint256 releasableAmount,
        uint256 remainingAmount,
        uint256 progressPercent
    ) {
        vestedAmount = getVestedAmount();
        releasedAmount = released;
        releasableAmount = getReleasableAmount();
        remainingAmount = totalAmount - released;
        
        // 计算进度百分比
        if (totalAmount > 0) {
            progressPercent = (vestedAmount * 100) / totalAmount;
        }
    }
    
    /**
     * @dev 获取时间信息
     * @return contractStartTime 开始时间
     * @return cliffEndTime 悬崖期结束时间
     * @return vestingEndTime 释放期结束时间
     * @return currentTime 当前时间
     * @return timeUntilCliff 距离悬崖期结束的秒数
     * @return timeUntilVestingEnd 距离释放期结束的秒数
     */
    function getTimeInfo() external view returns (
        uint256 contractStartTime,
        uint256 cliffEndTime,
        uint256 vestingEndTime,
        uint256 currentTime,
        uint256 timeUntilCliff,
        uint256 timeUntilVestingEnd
    ) {
        contractStartTime = startTime;
        cliffEndTime = startTime + CLIFF_DURATION;
        vestingEndTime = startTime + TOTAL_DURATION;
        currentTime = block.timestamp;
        
        if (currentTime < cliffEndTime) {
            timeUntilCliff = cliffEndTime - currentTime;
        } else {
            timeUntilCliff = 0;
        }
        
        if (currentTime < vestingEndTime) {
            timeUntilVestingEnd = vestingEndTime - currentTime;
        } else {
            timeUntilVestingEnd = 0;
        }
    }
    
    // ===========================================
    // 管理功能
    // ===========================================
    
    /**
     * @dev 暂停释放功能
     * @notice 只有 owner 可以调用此函数
     * @notice 暂停后，受益人无法释放代币
     * @notice 这是一个紧急功能，用于应对异常情况
     */
    function pause() external onlyOwner whenNotPaused {
        paused = true;
        emit VestingPaused(true, block.timestamp);
    }
    
    /**
     * @dev 恢复释放功能
     * @notice 只有 owner 可以调用此函数
     */
    function unpause() external onlyOwner whenPaused {
        paused = false;
        emit VestingPaused(false, block.timestamp);
    }
    
    /**
     * @dev 紧急提取功能
     * @param amount 要提取的代币数量
     * @notice 只有 owner 可以调用此函数
     * @notice 这是一个紧急功能，用于应对极端情况
     * @notice 提取的代币将转入 owner 地址
     */
    function emergencyWithdraw(uint256 amount) external onlyOwner nonReentrant {
        require(amount > 0, "TokenVesting: amount must be greater than zero");
        require(amount <= token.balanceOf(address(this)), "TokenVesting: insufficient balance");
        
        token.safeTransfer(owner(), amount);
        emit EmergencyWithdrawal(amount, block.timestamp);
    }
    
    /**
     * @dev 转移合约所有权
     * @param newOwner 新的合约所有者
     * @notice 只有当前 owner 可以调用此函数
     * @notice 建议将所有权转移给多签钱包
     */
    function transferOwnership(address newOwner) public override onlyOwner {
        require(newOwner != address(0), "TokenVesting: new owner cannot be zero address");
        require(newOwner != owner(), "TokenVesting: new owner must be different");
        super.transferOwnership(newOwner);
    }
    
    /**
     * @dev 放弃合约所有权
     * @notice 只有当前 owner 可以调用此函数
     * @notice 放弃后，将无法再执行任何管理操作
     * @notice 这是一个不可逆操作，请谨慎使用
     */
    function renounceOwnership() public override onlyOwner {
        super.renounceOwnership();
    }
    
    // ===========================================
    // 查询函数
    // ===========================================
    
    /**
     * @dev 获取合约的详细信息
     * @return tokenAddress 代币合约地址
     * @return beneficiaryAddress 受益人地址
     * @return contractTotalAmount 总锁定数量
     * @return releasedAmount 已释放数量
     * @return contractStartTime 开始时间
     * @return contractPaused 是否暂停
     * @return contractOwner 合约所有者
     */
    function getContractInfo() external view returns (
        address tokenAddress,
        address beneficiaryAddress,
        uint256 contractTotalAmount,
        uint256 releasedAmount,
        uint256 contractStartTime,
        bool contractPaused,
        address contractOwner
    ) {
        return (
            address(token),
            beneficiary,
            totalAmount,
            released,
            startTime,
            paused,
            owner()
        );
    }
}
