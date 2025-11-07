# Sweep Server Demo - Educational Project

## ⚠️ CRITICAL WARNINGS

**THIS IS AN EDUCATIONAL DEMO PROJECT FOR TESTING ON SEPOLIA TESTNET ONLY**

- **DO NOT** deploy this publicly
- **DO NOT** use with real funds or mainnet
- **DO NOT** paste real private keys or seed phrases
- This project demonstrates cryptocurrency security vulnerabilities for educational purposes
- Only use with Sepolia testnet and test wallets

## Overview

This project demonstrates how cryptocurrency "sweeper" attacks work by simulating a malicious server that can drain testnet wallets. It's designed for:

- Security education and awareness
- Understanding blockchain transaction mechanics
- Testing on Sepolia testnet only
- Local development and demonstration

## Project Structure

- `attacker-server.js` - Express server that simulates wallet sweeping
- `dashboard.html` - Web dashboard interface (frontend)
- `victim.html` - Simple test page to simulate phishing victim
- `package.json` - Node.js dependencies

## Architecture

**Backend (Port 3000)**:
- Express server with CORS enabled
- `/steal` endpoint - accepts private keys/mnemonics and sweeps funds
- `/alchemy-webhook` endpoint - receives Alchemy notifications
- Uses ethers.js for Ethereum interactions
- Optional Telegram notifications

**Frontend (Port 5000)**:
- Static HTML dashboard
- Modern crypto-themed UI
- Runs separately from backend API

## Required Environment Variables

Create a `.env` file with the following (see `.env.example`):

- `ALCHEMY_URL` - Sepolia testnet RPC URL (required)
- `ATTACKER_ADDR` - Ethereum address to receive swept funds (required)
- `PORT` - Backend server port (default: 3000)
- `TELEGRAM_BOT_TOKEN` - Optional Telegram bot token for notifications
- `TELEGRAM_CHAT_ID` - Optional Telegram chat ID for notifications
- `ALCHEMY_SIGNING_KEY` - Optional webhook signature verification

## Setup Instructions

1. Get a free Alchemy API key for Sepolia testnet at https://www.alchemy.com/
2. Create a test Ethereum wallet (DO NOT use a real wallet)
3. Configure environment variables in Replit Secrets
4. The server will start automatically on port 3000
5. Access the dashboard at the Replit web preview

## How It Works

1. Server listens for POST requests to `/steal` with a wallet secret
2. Creates wallet instance from private key or mnemonic
3. Checks wallet balance against minimum threshold (0.0001 ETH)
4. Calculates gas fees and determines sendable amount
5. Sends transaction to sweep funds to attacker address
6. Optionally sends Telegram alert

## Recent Changes

- 2025-11-07: Initial setup in Replit environment
- Configured for educational use with testnet only
- Added security warnings and documentation

## User Preferences

- Language: English
- Environment: Replit (Node.js)
- Purpose: Educational/Testing only
