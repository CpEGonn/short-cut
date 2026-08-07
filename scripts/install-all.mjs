import { spawn } from 'node:child_process';

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function run(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(npmCommand, args, {
      stdio: 'inherit',
      windowsHide: true
    });

    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed: ${npmCommand} ${args.join(' ')}`));
      }
    });
  });
}

try {
  await run(['install', '--prefix', 'server']);
  await run(['install', '--prefix', 'client']);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
