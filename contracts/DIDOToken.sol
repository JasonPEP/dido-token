// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title DIDOToken
 * @dev DIDO Token (DDT) - 生产级 ERC20 代币合约
 * 
 * 功能特性：
 * - 标准 ERC20 功能（转账、余额查询等）
 * - 可暂停功能（紧急情况下可冻结所有转账）
 * - 可销毁功能（持币者可自行销毁代币）
 * - 黑名单功能（可禁止特定地址进行转账）
 * - 固定总供应量（1,000,000 DDT，不可增发）
 * - 权限管理（只有 owner 可执行管理操作）
 * - 防重入攻击保护
 * 
 * 代币分配：
 * - 总供应量：1,000,000 DDT
 * - 流动性池：400,000 DDT (40%)
 * - 团队：300,000 DDT (30%) - 锁定在 TokenVesting 合约
 * - 社区：200,000 DDT (20%)
 * - 预留：100,000 DDT (10%)
 * 
 * 安全考虑：
 * - 使用 OpenZeppelin 审计过的标准库
 * - 没有自定义的复杂逻辑，降低漏洞风险
 * - 所有管理函数都有权限控制
 * - 防重入攻击保护
 * - 暂停机制应对紧急情况
 * 
 * @author DIDO Token Team
 * @notice 此合约已通过基本安全审查，建议在生产环境部署前进行专业审计
 */
contract DIDOToken is ERC20, ERC20Burnable, ERC20Pausable, Ownable, ReentrancyGuard {
    
    // ===========================================
    // 状态变量
    // ===========================================
    
    /// @dev 代币的最大供应量（固定为 1,000,000 DDT）
    uint256 public constant MAX_SUPPLY = 1_000_000 * 10**18; // 1,000,000 DDT，18位小数
    
    /// @dev 黑名单映射，被列入黑名单的地址无法进行转账
    mapping(address => bool) private _blacklisted;
    
    /// @dev 黑名单事件
    event Blacklisted(address indexed account, bool isBlacklisted);
    
    // ===========================================
    // 构造函数
    // ===========================================
    
    /**
     * @dev 构造函数，初始化代币
     * @param liquidityPool 流动性池地址，接收 400,000 DDT
     * @param teamWallet 团队钱包地址，接收 300,000 DDT
     * @param communityWallet 社区钱包地址，接收 200,000 DDT
     * @param reserveWallet 预留钱包地址，接收 100,000 DDT
     * 
     * 注意：
     * - 部署者将成为合约的 owner
     * - 代币将按照预定义比例分配给各个地址
     * - 总供应量固定，无法增发
     */
    constructor(
        address liquidityPool,
        address teamWallet,
        address communityWallet,
        address reserveWallet
    ) ERC20("DIDO Token", "DDT") Ownable(msg.sender) {
        // 验证地址有效性
        require(liquidityPool != address(0), "DIDOToken: liquidity pool address cannot be zero");
        require(teamWallet != address(0), "DIDOToken: team wallet address cannot be zero");
        require(communityWallet != address(0), "DIDOToken: community wallet address cannot be zero");
        require(reserveWallet != address(0), "DIDOToken: reserve wallet address cannot be zero");
        
        // 验证地址不重复
        require(liquidityPool != teamWallet, "DIDOToken: addresses must be unique");
        require(liquidityPool != communityWallet, "DIDOToken: addresses must be unique");
        require(liquidityPool != reserveWallet, "DIDOToken: addresses must be unique");
        require(teamWallet != communityWallet, "DIDOToken: addresses must be unique");
        require(teamWallet != reserveWallet, "DIDOToken: addresses must be unique");
        require(communityWallet != reserveWallet, "DIDOToken: addresses must be unique");
        
        // 按照预定义比例铸造代币
        _mint(liquidityPool, 400_000 * 10**18);    // 40% - 流动性池
        _mint(teamWallet, 300_000 * 10**18);       // 30% - 团队
        _mint(communityWallet, 200_000 * 10**18);  // 20% - 社区
        _mint(reserveWallet, 100_000 * 10**18);    // 10% - 预留
        
        // 验证总供应量
        require(totalSupply() == MAX_SUPPLY, "DIDOToken: total supply mismatch");
    }
    
    // ===========================================
    // 暂停功能（继承自 ERC20Pausable）
    // ===========================================
    
    /**
     * @dev 暂停所有转账操作
     * @notice 只有 owner 可以调用此函数
     * @notice 暂停后，所有转账、授权等操作都会被阻止
     * @notice 这是一个紧急功能，用于应对安全漏洞或异常情况
     */
    function pause() public onlyOwner {
        _pause();
    }
    
    /**
     * @dev 恢复所有转账操作
     * @notice 只有 owner 可以调用此函数
     * @notice 恢复后，所有转账、授权等操作将正常工作
     */
    function unpause() public onlyOwner {
        _unpause();
    }
    
    // ===========================================
    // 黑名单功能
    // ===========================================
    
    /**
     * @dev 将地址加入黑名单
     * @param account 要加入黑名单的地址
     * @notice 只有 owner 可以调用此函数
     * @notice 被列入黑名单的地址无法进行转账操作
     * @notice 此功能用于应对监管要求或恶意行为
     */
    function blacklist(address account) public onlyOwner {
        require(account != address(0), "DIDOToken: cannot blacklist zero address");
        require(account != owner(), "DIDOToken: cannot blacklist owner");
        require(!_blacklisted[account], "DIDOToken: account already blacklisted");
        
        _blacklisted[account] = true;
        emit Blacklisted(account, true);
    }
    
    /**
     * @dev 将地址从黑名单中移除
     * @param account 要从黑名单中移除的地址
     * @notice 只有 owner 可以调用此函数
     */
    function unblacklist(address account) public onlyOwner {
        require(account != address(0), "DIDOToken: cannot unblacklist zero address");
        require(_blacklisted[account], "DIDOToken: account not blacklisted");
        
        _blacklisted[account] = false;
        emit Blacklisted(account, false);
    }
    
    /**
     * @dev 检查地址是否在黑名单中
     * @param account 要检查的地址
     * @return 如果地址在黑名单中返回 true，否则返回 false
     */
    function isBlacklisted(address account) public view returns (bool) {
        return _blacklisted[account];
    }
    
    // ===========================================
    // 重写 ERC20 函数以添加安全检查
    // ===========================================
    
    /**
     * @dev 重写 _update 函数以添加黑名单检查
     * @param from 发送方地址
     * @param to 接收方地址
     * @param value 转账金额
     * @notice 此函数会在每次转账前被调用
     * @notice 检查发送方和接收方是否在黑名单中
     * @notice 如果任一方在黑名单中，转账将被拒绝
     */
    function _update(
        address from,
        address to,
        uint256 value
    ) internal override(ERC20, ERC20Pausable) nonReentrant {
        // 检查黑名单
        require(!_blacklisted[from], "DIDOToken: sender is blacklisted");
        require(!_blacklisted[to], "DIDOToken: recipient is blacklisted");
        
        // 调用父类的 _update 函数
        super._update(from, to, value);
    }
    
    // ===========================================
    // 销毁功能（继承自 ERC20Burnable）
    // ===========================================
    
    /**
     * @dev 销毁指定数量的代币
     * @param value 要销毁的代币数量
     * @notice 调用者必须拥有足够的代币余额
     * @notice 销毁后，代币将从总供应量中永久移除
     * @notice 这是一个不可逆操作
     */
    function burn(uint256 value) public override {
        require(!_blacklisted[msg.sender], "DIDOToken: blacklisted address cannot burn");
        super.burn(value);
    }
    
    /**
     * @dev 从指定地址销毁指定数量的代币
     * @param from 要销毁代币的地址
     * @param value 要销毁的代币数量
     * @notice 调用者必须有足够的授权额度
     * @notice 这是一个不可逆操作
     */
    function burnFrom(address from, uint256 value) public override {
        require(!_blacklisted[from], "DIDOToken: cannot burn from blacklisted address");
        require(!_blacklisted[msg.sender], "DIDOToken: blacklisted address cannot burn");
        super.burnFrom(from, value);
    }
    
    // ===========================================
    // 查询函数
    // ===========================================
    
    /**
     * @dev 获取代币的详细信息
     * @return tokenName 代币名称
     * @return tokenSymbol 代币符号
     * @return tokenDecimals 小数位数
     * @return tokenTotalSupply 总供应量
     * @return tokenMaxSupply 最大供应量
     * @return tokenOwner 合约所有者
     * @return tokenPaused 是否暂停
     */
    function getTokenInfo() public view returns (
        string memory tokenName,
        string memory tokenSymbol,
        uint8 tokenDecimals,
        uint256 tokenTotalSupply,
        uint256 tokenMaxSupply,
        address tokenOwner,
        bool tokenPaused
    ) {
        return (
            name(),
            symbol(),
            decimals(),
            totalSupply(),
            MAX_SUPPLY,
            owner(),
            paused()
        );
    }
    
    // ===========================================
    // 紧急功能
    // ===========================================
    
    /**
     * @dev 紧急情况下转移合约所有权
     * @param newOwner 新的合约所有者
     * @notice 只有当前 owner 可以调用此函数
     * @notice 建议将所有权转移给多签钱包以提高安全性
     */
    function transferOwnership(address newOwner) public override onlyOwner {
        require(newOwner != address(0), "DIDOToken: new owner cannot be zero address");
        require(newOwner != owner(), "DIDOToken: new owner must be different");
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
}
