# DIDO Token 部署指南

## 概述

本指南详细说明如何部署 DIDO Token 项目到以太坊网络，包括测试网和主网部署的完整流程。

## 前置要求

### 1. 环境准备

#### Node.js 环境
```bash
# 检查 Node.js 版本（需要 >= 16.0.0）
node --version

# 如果版本过低，请升级 Node.js
# 推荐使用 nvm 管理 Node.js 版本
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18
```

#### 钱包准备
- **MetaMask**: 用于测试网部署
- **硬件钱包**: 推荐用于主网部署（Ledger/Trezor）
- **测试网 ETH**: 从水龙头获取测试网 ETH

### 2. 账户准备

#### 部署者账户
- 确保有足够的 ETH 支付 gas 费用
- 测试网：0.1 ETH 足够
- 主网：建议准备 0.5-1 ETH

#### 分配地址
准备以下地址用于代币分配：
- 流动性池地址
- 团队钱包地址
- 社区钱包地址
- 预留钱包地址

## 安装和配置

### 1. 安装依赖

```bash
# 克隆项目（如果从 Git 仓库）
git clone <repository-url>
cd dido-token

# 安装依赖包
npm install
```

### 2. 环境变量配置

```bash
# 复制环境变量模板
cp env.example .env

# 编辑 .env 文件
nano .env
```

#### 必需配置
```bash
# 部署者私钥（重要：使用测试钱包）
PRIVATE_KEY=0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef

# Alchemy API 密钥
ALCHEMY_API_KEY=your_alchemy_api_key_here

# Etherscan API 密钥
ETHERSCAN_API_KEY=your_etherscan_api_key_here

# 代币分配地址
LIQUIDITY_POOL_ADDRESS=0x1234567890123456789012345678901234567890
TEAM_WALLET_ADDRESS=0x1234567890123456789012345678901234567890
COMMUNITY_WALLET_ADDRESS=0x1234567890123456789012345678901234567890
RESERVE_WALLET_ADDRESS=0x1234567890123456789012345678901234567890
```

### 3. 获取测试网 ETH

#### Sepolia 测试网
```bash
# 访问以下水龙头获取测试网 ETH
# 1. https://sepoliafaucet.com/
# 2. https://faucet.sepolia.dev/
# 3. https://sepolia-faucet.pk910.de/

# 或者使用 Alchemy 水龙头
# https://sepoliafaucet.com/
```

## 测试网部署

### 1. 编译合约

```bash
# 编译智能合约
npm run compile

# 检查编译结果
ls artifacts/contracts/
```

### 2. 运行测试

```bash
# 运行所有测试
npm test

# 运行覆盖率测试
npm run test:coverage

# 检查测试结果
# 所有测试应该通过
```

### 3. 部署到 Sepolia

```bash
# 部署到 Sepolia 测试网
npm run deploy:sepolia

# 或者使用 hardhat 命令
npx hardhat run scripts/deploy.js --network sepolia
```

#### 部署输出示例
```
🚀 开始部署 DIDO Token 项目...

📋 部署信息:
   部署者地址: 0x1234567890123456789012345678901234567890
   部署者余额: 0.5 ETH
   网络: sepolia
   链 ID: 11155111

📊 代币分配地址:
   流动性池: 0x1111111111111111111111111111111111111111
   团队钱包: 0x2222222222222222222222222222222222222222
   社区钱包: 0x3333333333333333333333333333333333333333
   预留钱包: 0x4444444444444444444444444444444444444444

📦 正在部署 DIDOToken 合约...
✅ DIDOToken 合约部署成功!
   合约地址: 0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
   交易哈希: 0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB

🔍 验证代币信息...
   代币名称: DIDO Token
   代币符号: DDT
   小数位数: 18
   总供应量: 1000000.0 DDT
   最大供应量: 1000000.0 DDT
   合约所有者: 0x1234567890123456789012345678901234567890
   是否暂停: false

💰 验证代币分配...
   流动性池余额: 400000.0 DDT
   团队钱包余额: 300000.0 DDT
   社区钱包余额: 200000.0 DDT
   预留钱包余额: 100000.0 DDT

📦 正在部署 TokenVesting 合约...
✅ TokenVesting 合约部署成功!
   合约地址: 0xCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC
   交易哈希: 0xDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD

🔄 正在转移团队代币到时间锁合约...
   授权交易哈希: 0xEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE
   转移交易哈希: 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF

🔍 验证时间锁合约信息...
   代币合约地址: 0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
   受益人地址: 0x2222222222222222222222222222222222222222
   总锁定数量: 300000.0 DDT
   已释放数量: 0.0 DDT
   开始时间: 2024-01-01 12:00:00
   是否暂停: false
   合约所有者: 0x1234567890123456789012345678901234567890

💾 部署信息已保存到: deployments/sepolia-deployment.json

🎉 部署完成!
```

### 4. 验证合约

```bash
# 验证合约源码
npm run verify:sepolia

# 或者使用 hardhat 命令
npx hardhat run scripts/verify.js --network sepolia
```

### 5. 检查部署结果

```bash
# 检查各地址余额
npm run check-balances

# 或者使用 hardhat 命令
npx hardhat run scripts/checkBalances.js --network sepolia
```

## 主网部署

### 1. 安全审计

#### 推荐审计机构
- **CertiK**: https://www.certik.com/
- **OpenZeppelin**: https://openzeppelin.com/
- **ConsenSys Diligence**: https://consensys.net/diligence/

#### 审计准备
1. 完成所有测试
2. 准备审计材料
3. 联系审计机构
4. 等待审计报告

### 2. 部署前检查

#### 最终检查清单
- [ ] 所有测试通过
- [ ] 安全审计完成
- [ ] 环境变量正确配置
- [ ] 分配地址确认无误
- [ ] 有足够的 ETH 支付 gas
- [ ] 私钥安全存储
- [ ] 备份重要信息

### 3. 部署到主网

```bash
# 部署到以太坊主网
npm run deploy:mainnet

# 或者使用 hardhat 命令
npx hardhat run scripts/deploy.js --network mainnet
```

### 4. 验证合约

```bash
# 验证合约源码
npm run verify:mainnet

# 或者使用 hardhat 命令
npx hardhat run scripts/verify.js --network mainnet
```

### 5. 后部署操作

#### 所有权转移
```bash
# 将所有权转移给多签钱包（推荐）
# 这需要在部署后手动执行
```

#### 流动性池创建
1. 访问 Uniswap V3
2. 创建 DDT/ETH 交易对
3. 添加初始流动性
4. 锁定 LP Token

## 部署后管理

### 1. 监控合约

#### 监控工具
- **Etherscan**: 监控交易和合约状态
- **Tenderly**: 实时监控和调试
- **OpenZeppelin Defender**: 安全监控

#### 监控内容
- 合约余额变化
- 异常交易
- Gas 使用情况
- 错误日志

### 2. 用户支持

#### 支持渠道
- 官方文档
- 社区论坛
- 技术支持邮箱
- 社交媒体

#### 常见问题
- 如何购买代币
- 如何参与治理
- 如何提供流动性
- 如何销毁代币

### 3. 持续更新

#### 定期检查
- 合约状态
- 代币分配
- 释放进度
- 社区反馈

#### 版本更新
- 修复 bug
- 添加新功能
- 优化性能
- 安全更新

## 故障排除

### 1. 常见问题

#### 部署失败
```bash
# 检查网络连接
ping eth-sepolia.g.alchemy.com

# 检查私钥格式
# 确保私钥以 0x 开头，长度为 66 字符

# 检查余额
# 确保有足够的 ETH 支付 gas
```

#### 验证失败
```bash
# 检查 Etherscan API 密钥
# 确保 API 密钥有效且有足够配额

# 检查合约地址
# 确保合约地址正确

# 检查构造函数参数
# 确保参数与部署时一致
```

#### 测试失败
```bash
# 清理缓存
npm run clean

# 重新安装依赖
rm -rf node_modules package-lock.json
npm install

# 重新编译
npm run compile
```

### 2. 错误代码

#### 常见错误
- `insufficient funds`: 余额不足
- `nonce too low`: 交易 nonce 错误
- `gas price too low`: Gas 价格过低
- `contract already verified`: 合约已验证

#### 解决方案
- 检查账户余额
- 重置 nonce
- 提高 gas 价格
- 跳过重复验证

### 3. 获取帮助

#### 技术支持
- GitHub Issues
- Discord 社区
- Telegram 群组
- 邮件支持

#### 文档资源
- 官方文档
- 社区 Wiki
- 视频教程
- 最佳实践

## 安全提醒

### 1. 私钥安全
- 永远不要分享私钥
- 使用硬件钱包存储大额资金
- 定期备份钱包
- 使用强密码保护

### 2. 部署安全
- 在测试网充分测试
- 使用多签钱包管理
- 监控合约状态
- 建立应急响应机制

### 3. 运营安全
- 定期安全审计
- 及时更新依赖
- 监控异常活动
- 建立安全团队

---

**重要提醒**: 部署到主网是不可逆的操作，请务必在部署前进行充分测试和安全审计。
