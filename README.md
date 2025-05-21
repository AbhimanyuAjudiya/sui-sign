# 📄 SuiSign

**SuiSign** is a fully decentralized document signing platform leveraging the Sui blockchain and Walrus decentralized storage. It enables users to upload documents, define signers, and collect cryptographically verified signatures, all while ensuring data immutability and transparency.

---

## 🚀 Features

- **zkLogin Authentication**: Seamless login using Google accounts without compromising decentralization.
- **Multi-Signature Support**: Collect signatures from multiple parties with on-chain verification.
- **Immutable Storage**: Store documents permanently using Walrus decentralized storage.
- **Dynamic Fee Structure**: Flexible payment options where either the sender or signer can cover the agreement fees.
- **Public Agreement Explorer**: Browse publicly marked agreements for transparency and auditability.

---

## 🛠️ Installation

### Prerequisites

- **Node.js** (v16 or higher)
- **pnpm** package manager
- **Sui CLI** installed globally

### Steps

#### 1. Clone the Repository

```bash
git clone https://github.com/AbhimanyuAjudiya/sui-sign.git
cd suisign
```

#### 2. Install Dependencies

```bash
pnpm install
```

#### 3. Set Up Environment Variables

Create a `.env` file in the root directory and add the vars from `.env.example`


## 📦 Deploying Smart Contracts on Sui Testnet

### 1. Install Sui CLI
Follow the official Sui documentation to install the CLI:
👉 [Sui CLI Installation Guide](https://docs.sui.io/build/install)

### 2. Create a New Wallet Address

```bash
sui client new-address ed25519
```

Save the generated address for future use.

### 3. Request Testnet SUI Tokens

```bash
curl --location --request POST 'https://faucet.testnet.sui.io/v1/gas' \
--header 'Content-Type: application/json' \
--data-raw '{
  "FixedAmountRequest": {
    "recipient": "your_wallet_address"
  }
}'
```

Replace `your_wallet_address` with the one generated above.

### 4. Deploy Your Smart Contract

Navigate to your Move package directory and deploy:

```bash
sui client publish --gas-budget 20000000
```

From the output, note:
- Package ID
- Module Name
- Object ID

These are required to configure the frontend.

## 💻 Running the Application

Start the development server:

```bash
pnpm dev
```

The application will be accessible at:
👉 http://localhost:5173

## 📄 License

This project is licensed under the MIT License.
See the LICENSE file for details.

Feel free to contribute, report issues, or suggest features by creating an issue or pull request!

