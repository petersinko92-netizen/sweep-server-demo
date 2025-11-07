require('dotenv').config();
const { spawn } = require('child_process');

console.log('Starting Sweep Server Demo...');
console.log('⚠️  EDUCATIONAL USE ONLY - SEPOLIA TESTNET');
console.log('=====================================\n');

const backend = spawn('node', ['attacker-server.js'], {
  stdio: 'inherit',
  env: { ...process.env }
});

const frontend = spawn('node', ['frontend-server.js'], {
  stdio: 'inherit',
  env: { ...process.env }
});

backend.on('error', (err) => {
  console.error('Backend error:', err);
});

frontend.on('error', (err) => {
  console.error('Frontend error:', err);
});

backend.on('exit', (code) => {
  console.log(`Backend exited with code ${code}`);
  process.exit(code);
});

frontend.on('exit', (code) => {
  console.log(`Frontend exited with code ${code}`);
  process.exit(code);
});

process.on('SIGINT', () => {
  console.log('\nShutting down servers...');
  backend.kill();
  frontend.kill();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nShutting down servers...');
  backend.kill();
  frontend.kill();
  process.exit(0);
});
