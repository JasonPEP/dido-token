# DIDO Token (DDT) - 生产级 ERC20 代币项目

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Solidity](https://img.shields.io/badge/Solidity-^0.8.20-blue.svg)](https://soliditylang.org/)
[![Hardhat](https://img.shields.io/badge/Hardhat-^2.19.0-orange.svg)](https://hardhat.org/)
[![OpenZeppelin](https://img.shields.io/badge/OpenZeppelin-^5.0.1-green.svg)](https://openzeppelin.com/)

## 📋 项目概述

DIDO Token (DDT) 是一个生产级的 ERC20 代币项目，专为交易所上币而设计。项目采用 OpenZeppelin 标准库，包含完整的安全机制、代币分配策略、时间锁合约和部署脚本。

### ✨ 核心特性

- 🛡️ **安全增强**: 暂停机制、黑名单功能、防重入攻击保护
- 🔒 **时间锁**: 团队代币锁定 24 个月，6 个月悬崖期 + 18 个月线性释放
- 📊 **固定供应**: 1,000,000 DDT 总供应量，不可增发
- 🔥 **可销毁**: 持币者可自行销毁代币，减少总供应量
- 🎯 **生产就绪**: 完整的测试覆盖、部署脚本和文档

### 🏗️ 项目结构

```
dido-token/
├── contracts/                 # 智能合约
│   ├── DIDOToken.sol         # 主代币合约
│   └── TokenVesting.sol      # 时间锁合约
├── scripts/                  # 部署脚本
│   ├── deploy.js            # 部署脚本
│   ├── verify.js            # 合约验证脚本
│   └── checkBalances.js     # 余额查询脚本
├── test/                    # 测试文件
│   ├── DIDOToken.test.js    # 代币合约测试
│   └── TokenVesting.test.js # 时间锁合约测试
├── docs/                    # 项目文档
│   ├── TOKENOMICS.md        # 代币经济学
│   ├── SECURITY.md          # 安全特性说明
│   └── DEPLOYMENT.md        # 部署指南
├── hardhat.config.js        # Hardhat 配置
├── package.json             # 依赖管理
├── env.example              # 环境变量模板
└── README.md                # 项目说明
```

## 🚀 快速开始

### 1. 环境要求

- Node.js >= 16.0.0
- npm 或 yarn
- Git

### 2. 安装依赖

```bash
# 克隆项目
git clone <repository-url>
cd dido-token

# 安装依赖
npm install
```

### 3. 配置环境变量

```bash
# 复制环境变量模板
cp env.example .env

# 编辑 .env 文件，填入以下信息：
# - PRIVATE_KEY: 部署者私钥
# - ALCHEMY_API_KEY: Alchemy API 密钥
# - ETHERSCAN_API_KEY: Etherscan API 密钥
# - 代币分配地址
```

### 4. 编译和测试

```bash
# 编译合约
npm run compile

# 运行测试
npm test

# 运行覆盖率测试
npm run test:coverage
```

### 5. 部署到测试网

```bash
# 部署到 Sepolia 测试网
npm run deploy:sepolia

# 验证合约
npm run verify:sepolia

# 检查余额
npm run check-balances
```

## 💰 代币分配

| 类型 | 数量 | 比例 | 用途 | 锁定情况 |
|------|------|------|------|----------|
| 流动性池 | 400,000 DDT | 40% | Uniswap/SushiSwap 交易对 | 建议锁定 LP Token |
| 团队 | 300,000 DDT | 30% | 核心团队激励 | 锁定 24 个月 |
| 社区 | 200,000 DDT | 20% | 空投、市场推广 | 无锁定 |
| 预留 | 100,000 DDT | 10% | 应急储备 | 无锁定 |

### 🔒 团队代币释放时间表

```
时间轴:
0 个月    ──────────────────────────────────────────────────────────────
          │ 部署完成，团队代币锁定
          │
6 个月    ──────────────────────────────────────────────────────────────
          │ 悬崖期结束，开始线性释放
          │ 每天释放: 300,000 DDT ÷ 540 天 ≈ 555.56 DDT
          │
24 个月   ──────────────────────────────────────────────────────────────
          │ 释放期结束，所有代币可提取
```

## 🛡️ 安全特性

### 合约安全
- ✅ 使用 OpenZeppelin 审计过的标准库
- ✅ 暂停机制（紧急情况下可冻结所有转账）
- ✅ 黑名单功能（可禁止特定地址转账）
- ✅ 防重入攻击保护
- ✅ 权限控制（只有 owner 可执行管理操作）

### 时间锁安全
- ✅ 固定锁定期限（24 个月）
- ✅ 悬崖期保护（前 6 个月无法提取）
- ✅ 线性释放机制（后 18 个月均匀释放）
- ✅ 受益人保护（只有受益人可提取）
- ✅ 紧急暂停功能

### 部署安全
- ✅ 多签钱包支持
- ✅ 合约源码验证
- ✅ 完整的测试覆盖
- ✅ 详细的部署文档

## 📚 文档

- **[代币经济学](docs/TOKENOMICS.md)** - 详细的代币分配和释放机制
- **[安全特性](docs/SECURITY.md)** - 完整的安全机制说明
- **[部署指南](docs/DEPLOYMENT.md)** - 从测试网到主网的完整部署流程

## 🧪 测试

项目包含完整的测试套件，覆盖所有核心功能：

### DIDOToken 测试
- ✅ 基本功能（名称、符号、总供应量）
- ✅ 初始分配验证
- ✅ 转账功能测试
- ✅ 销毁功能测试
- ✅ 暂停功能测试
- ✅ 黑名单功能测试
- ✅ 权限控制测试

### TokenVesting 测试
- ✅ 初始状态验证
- ✅ 悬崖期测试
- ✅ 线性释放测试
- ✅ 完全释放测试
- ✅ 暂停功能测试
- ✅ 紧急提取测试

### 运行测试

```bash
# 运行所有测试
npm test

# 运行覆盖率测试
npm run test:coverage

# 运行特定测试文件
npx hardhat test test/DIDOToken.test.js
npx hardhat test test/TokenVesting.test.js
```

## 🚀 部署

### 测试网部署

```bash
# 1. 获取测试网 ETH（从水龙头）
# 2. 配置 .env 文件
# 3. 部署到 Sepolia
npm run deploy:sepolia

# 4. 验证合约
npm run verify:sepolia

# 5. 检查部署结果
npm run check-balances
```

### 主网部署

```bash
# 1. 完成安全审计（推荐）
# 2. 准备足够的 ETH 支付 gas
# 3. 部署到主网
npm run deploy:mainnet

# 4. 验证合约
npm run verify:mainnet

# 5. 转移所有权给多签钱包
```

## 📊 合约信息

### DIDOToken 合约
- **标准**: ERC20
- **名称**: DIDO Token
- **符号**: DDT
- **小数位**: 18
- **总供应量**: 1,000,000 DDT
- **最大供应量**: 1,000,000 DDT（固定）

### TokenVesting 合约
- **锁定数量**: 300,000 DDT
- **悬崖期**: 6 个月
- **释放期**: 18 个月
- **总锁定时间**: 24 个月

## 🔧 可用脚本

```bash
# 编译合约
npm run compile

# 运行测试
npm test

# 运行覆盖率测试
npm run test:coverage

# 部署到 Sepolia
npm run deploy:sepolia

# 部署到主网
npm run deploy:mainnet

# 验证合约（Sepolia）
npm run verify:sepolia

# 验证合约（主网）
npm run verify:mainnet

# 检查余额
npm run check-balances

# 清理缓存
npm run clean

# 检查合约大小
npm run size
```

## 🌐 网络支持

- ✅ **Sepolia 测试网** - 用于开发和测试
- ✅ **以太坊主网** - 生产环境部署
- ✅ **Goerli 测试网** - 备用测试网

## 🔗 相关链接

- **Etherscan**: [待部署后更新]
- **Uniswap**: [待创建流动性池后更新]
- **官网**: [待定]
- **白皮书**: [待定]

## ⚠️ 重要提醒

### 安全注意事项
- 🔐 请妥善保管私钥，不要泄露给任何人
- 🛡️ 建议使用硬件钱包进行主网部署
- 🔍 部署前请进行充分测试
- 📋 建议进行专业安全审计

### 法律声明
- 📜 本代币仅用于技术演示和教育目的
- ⚖️ 请遵守当地法律法规
- 💼 不构成投资建议
- 🚫 不得用于非法活动

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

### 贡献指南
1. Fork 项目
2. 创建功能分支
3. 提交更改
4. 推送到分支
5. 创建 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 📞 联系方式

- **项目维护者**: DIDO Token Team
- **邮箱**: [待定]
- **GitHub**: [待定]
- **Discord**: [待定]
- **Twitter**: [待定]

---

**免责声明**: 本项目仅供学习和研究使用。投资有风险，请谨慎决策。使用本项目产生的任何损失，项目维护者不承担责任。
