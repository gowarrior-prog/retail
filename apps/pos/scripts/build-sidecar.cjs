const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const rootDir = path.resolve(__dirname, '../../..');
const apiDir = path.resolve(rootDir, 'apps/api');
const scriptPath = path.resolve(apiDir, 'build_sidecar.py');

// Candidates for python executable
const pythonCandidates = [
  path.resolve(apiDir, 'venv/Scripts/python.exe'),
  path.resolve(apiDir, 'venv/bin/python'),
  'python',
  'python3',
];

let pythonBin = 'python';
for (const cand of pythonCandidates) {
  if (fs.existsSync(cand)) {
    pythonBin = cand;
    break;
  }
}

console.log(`[Build Sidecar] Using Python: ${pythonBin}`);
console.log(`[Build Sidecar] Running: ${scriptPath}`);

const result = spawnSync(pythonBin, [scriptPath], {
  cwd: apiDir,
  stdio: 'inherit',
  shell: true,
});

if (result.status !== 0) {
  console.error(`[Build Sidecar] Error: build_sidecar.py exited with code ${result.status}`);
  process.exit(result.status || 1);
}

console.log('[Build Sidecar] Successfully finished sidecar compilation.');
