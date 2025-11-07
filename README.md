# Sweep Server Demo - Educational Project

⚠️ **CRITICAL WARNING: FOR EDUCATIONAL USE ON SEPOLIA TESTNET ONLY**

This project demonstrates cryptocurrency "sweeper" attacks for educational and security awareness purposes. **DO NOT** deploy publicly or use with real funds.

## Overview

This is an educational demonstration showing how malicious actors can drain cryptocurrency wallets when users accidentally expose their private keys or seed phrases. It's designed to help developers and users understand blockchain security vulnerabilities.

## Features

- **Wallet Sweeping**: Automatically detects and sweeps funds from wallets when credentials are provided
- **Telegram Notifications**: Real-time alerts when seed phrases are received and funds are swept
- **Alchemy Integration**: Webhook support for monitoring blockchain transactions
- **Educational Interface**: Clean web interface demonstrating phishing attack vectors

## Architecture

### Backend (Port 3000)
- Express.js API server
- `/steal` endpoint - accepts private keys/mnemonics and sweeps funds to attacker address
- `/alchemy-webhook` endpoint - receives transaction notifications from Alchemy
- Gas fee calculation and optimization
- Telegram bot integration for notifications

### Frontend (Port 5000)
- Static file server with proxy to backend
- Landing page with project documentation
- Victim simulation page for testing
- Dashboard (requires Firebase authentication - optional)

## Setup

### Prerequisites
1. Alchemy API key for Sepolia testnet (get free at https://www.alchemy.com/)
2. Test Ethereum wallet address (for receiving swept funds)
3. Optional: Telegram bot token and chat ID for notifications

### Configuration

The following environment variables are configured in Replit Secrets:

**Required:**
- `ALCHEMY_URL` - Your Alchemy Sepolia testnet RPC endpoint
- `ATTACKER_ADDR` - Ethereum address to receive swept funds (lowercase)

**Optional:**
- `TELEGRAM_BOT_TOKEN` - Telegram bot token from @BotFather
- `TELEGRAM_CHAT_ID` - Your Telegram chat ID from @userinfobot
- `ALCHEMY_SIGNING_KEY` - Webhook signature verification key

### Running the Project

The project runs automatically when you start the Replit. It launches two servers:
1. Backend API on port 3000
2. Frontend on port 5000

Access the demo at the Replit webview URL.

## Usage

### Testing the Demo

1. Navigate to `/victim` to access the victim simulation page
2. Enter a **testnet seed phrase or private key** (NEVER use real credentials)
3. Click "Send seed to attacker (local)"
4. The server will:
   - Send immediate Telegram notification that credentials were received
   - Check the wallet balance
   - If balance > 0.0001 ETH, sweep funds to attacker address
   - Send another Telegram notification when sweep completes

### API Endpoints

**POST /steal**
```json
{
  "secret": "private key or mnemonic phrase"
}
```

Response:
```json
{
  "ok": true,
  "swept": true,
  "txHash": "0x...",
  "elapsedMs": 1234
}
```

## How It Works

1. Server receives wallet credentials (private key or 12-word mnemonic)
2. Sends immediate Telegram alert with wallet address
3. Creates ethers.js wallet instance from credentials
4. Checks wallet balance on Sepolia testnet
5. If balance meets minimum threshold (0.0001 ETH):
   - Calculates optimal gas fees
   - Sends transaction to sweep maximum amount to attacker address
   - Waits for confirmation
   - Sends Telegram notification with transaction details

## Security Education

This project demonstrates:
- Why you should NEVER enter your seed phrase on untrusted websites
- How quickly attackers can drain wallets once they have credentials
- The mechanics of blockchain transactions and gas fees
- Why hardware wallets and proper key management are critical

## Project Structure

```
├── attacker-server.js      # Main backend server
├── frontend-server.js      # Static file server with API proxy
├── start.js               # Launches both servers
├── index.html             # Landing page
├── victim.html            # Phishing simulation page
├── dashboard.html         # Optional Firebase-based wallet dashboard
├── package.json           # Node.js dependencies
└── .env.example          # Example environment configuration
```

## Deployment

This project is configured for Replit deployment using the VM deployment target. The deployment will run both servers automatically.

**Remember**: This is for educational purposes only. Do not deploy publicly or use with real funds.

## License

Educational use only. Not for production deployment.
