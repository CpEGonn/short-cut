import { spawn } from 'node:child_process';

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const children = new Map();

function startTask(label, args) {
  const child = spawn(npmCommand, args, {
    stdio: 'inherit',
    windowsHide: true
  });

  children.set(label, child);

  child.on('exit', (code, signal) => {
    children.delete(label);

    if (signal) {
      process.exitCode = 1;
    } else if (code && code !== 0) {
      process.exitCode = code;
    }

    if (children.size > 0 && (signal || (code && code !== 0))) {
      stopAll(signal ?? 'SIGTERM');
    }

    if (children.size === 0 && process.exitCode) {
      process.exit(process.exitCode);
    }
  });

  return child;
}

function stopAll(signal) {
  for (const child of children.values()) {
    if (!child.killed) {
      child.kill(signal);
    }
  }
}

startTask('server', ['run', 'dev', '--prefix', 'server']);
startTask('client', ['run', 'dev', '--prefix', 'client']);

process.on('SIGINT', () => stopAll('SIGINT'));
process.on('SIGTERM', () => stopAll('SIGTERM'));
