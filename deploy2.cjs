// Deploy via Netlify file-digest API with functions
const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const zlib = require('zlib');

const token = 'nfc_xuWyV6N8S1Di2fXEkK4Qabc8MTuxFJxfe653';
const siteId = '9e025eef-1c02-4c4d-b9ac-29601b150419';

function makeCRCTable() {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    table[i] = c;
  }
  return table;
}
const CRC_TABLE = makeCRCTable();

function computeCRC32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ buf[i]) & 0xFF];
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function createZipBuffer(fileName, fileContent) {
  const compressed = zlib.deflateRawSync(fileContent);
  const crc32 = computeCRC32(fileContent);
  const nameBuffer = Buffer.from(fileName, 'utf8');
  const now = new Date();
  const dosTime = ((now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1));
  const dosDate = (((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate());

  const localHeader = Buffer.alloc(30 + nameBuffer.length);
  localHeader.writeUInt32LE(0x04034b50, 0);
  localHeader.writeUInt16LE(20, 4);
  localHeader.writeUInt16LE(0, 6);
  localHeader.writeUInt16LE(8, 8);
  localHeader.writeUInt16LE(dosTime, 10);
  localHeader.writeUInt16LE(dosDate, 12);
  localHeader.writeUInt32LE(crc32, 14);
  localHeader.writeUInt32LE(compressed.length, 18);
  localHeader.writeUInt32LE(fileContent.length, 22);
  localHeader.writeUInt16LE(nameBuffer.length, 26);
  localHeader.writeUInt16LE(0, 28);
  nameBuffer.copy(localHeader, 30);

  const centralDirOffset = localHeader.length + compressed.length;

  const centralHeader = Buffer.alloc(46 + nameBuffer.length);
  centralHeader.writeUInt32LE(0x02014b50, 0);
  centralHeader.writeUInt16LE(20, 4);
  centralHeader.writeUInt16LE(20, 6);
  centralHeader.writeUInt16LE(0, 8);
  centralHeader.writeUInt16LE(8, 10);
  centralHeader.writeUInt16LE(dosTime, 12);
  centralHeader.writeUInt16LE(dosDate, 14);
  centralHeader.writeUInt32LE(crc32, 16);
  centralHeader.writeUInt32LE(compressed.length, 20);
  centralHeader.writeUInt32LE(fileContent.length, 24);
  centralHeader.writeUInt16LE(nameBuffer.length, 28);
  centralHeader.writeUInt16LE(0, 30);
  centralHeader.writeUInt16LE(0, 32);
  centralHeader.writeUInt16LE(0, 34);
  centralHeader.writeUInt16LE(0, 36);
  centralHeader.writeUInt32LE(0, 38);
  centralHeader.writeUInt32LE(0, 42);
  nameBuffer.copy(centralHeader, 46);

  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(1, 8);
  eocd.writeUInt16LE(1, 10);
  eocd.writeUInt32LE(centralHeader.length, 12);
  eocd.writeUInt32LE(centralDirOffset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([localHeader, compressed, centralHeader, eocd]);
}

function apiJson(method, urlPath, body) {
  return new Promise((resolve, reject) => {
    const bodyStr = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: 'api.netlify.com',
      path: urlPath,
      method,
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json',
        ...(bodyStr ? {'Content-Length': Buffer.byteLength(bodyStr)} : {})
      }
    };
    const req = https.request(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({status: res.statusCode, body: JSON.parse(d)}); }
        catch { resolve({status: res.statusCode, body: d}); }
      });
    });
    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

function uploadRaw(urlPath, buffer, contentType) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'api.netlify.com',
      path: urlPath,
      method: 'PUT',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': contentType,
        'Content-Length': buffer.length
      }
    };
    const req = https.request(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({status: res.statusCode, body: d}));
    });
    req.on('error', reject);
    req.write(buffer);
    req.end();
  });
}

async function deploy() {
  const webFiles = [
    '404.html', 'algemene-voorwaarden.html', 'annuleer.html', 'bevestiging.html', 'boeken.html',
    'detailer-dashboard.html', 'detailer-registratie.html', 'deto-homepage.html',
    'deto-logo.png', 'login.html', 'privacy.html', 'profiel.html'
  ];

  // Compute static file digests
  const staticFiles = {};
  const fileContents = {};
  for (const f of webFiles) {
    const content = fs.readFileSync(f);
    const sha1 = crypto.createHash('sha1').update(content).digest('hex');
    staticFiles['/' + f] = sha1;
    fileContents['/' + f] = content;
  }

  // Create function zip with both the JS file and a package.json
  const funcContent = fs.readFileSync('netlify/functions/send-email.js');
  const pkgJson = Buffer.from(JSON.stringify({name: 'send-email', version: '1.0.0', main: 'send-email.js', engines: {node: '>=18'}}));

  // Build a multi-file zip
  function buildMultiZip(entries) {
    const parts = [];
    const centralDirs = [];
    for (const [name, content] of entries) {
      const nameBuffer = Buffer.from(name, 'utf8');
      const compressed = zlib.deflateRawSync(content);
      const crc32 = computeCRC32(content);
      const now = new Date();
      const dosTime = ((now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1));
      const dosDate = (((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate());
      const localOffset = parts.reduce((s, p) => s + p.length, 0);

      const lh = Buffer.alloc(30 + nameBuffer.length);
      lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(0, 6);
      lh.writeUInt16LE(8, 8); lh.writeUInt16LE(dosTime, 10); lh.writeUInt16LE(dosDate, 12);
      lh.writeUInt32LE(crc32, 14); lh.writeUInt32LE(compressed.length, 18);
      lh.writeUInt32LE(content.length, 22); lh.writeUInt16LE(nameBuffer.length, 26);
      lh.writeUInt16LE(0, 28); nameBuffer.copy(lh, 30);
      parts.push(lh); parts.push(compressed);

      const ch = Buffer.alloc(46 + nameBuffer.length);
      ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6);
      ch.writeUInt16LE(0, 8); ch.writeUInt16LE(8, 10); ch.writeUInt16LE(dosTime, 12);
      ch.writeUInt16LE(dosDate, 14); ch.writeUInt32LE(crc32, 16); ch.writeUInt32LE(compressed.length, 20);
      ch.writeUInt32LE(content.length, 24); ch.writeUInt16LE(nameBuffer.length, 28);
      ch.writeUInt16LE(0, 30); ch.writeUInt16LE(0, 32); ch.writeUInt16LE(0, 34);
      ch.writeUInt16LE(0, 36); ch.writeUInt32LE(0, 38); ch.writeUInt32LE(localOffset, 42);
      nameBuffer.copy(ch, 46); centralDirs.push(ch);
    }
    const cdOffset = parts.reduce((s, p) => s + p.length, 0);
    const cdSize = centralDirs.reduce((s, p) => s + p.length, 0);
    const eocd = Buffer.alloc(22);
    eocd.writeUInt32LE(0x06054b50, 0); eocd.writeUInt16LE(0, 4); eocd.writeUInt16LE(0, 6);
    eocd.writeUInt16LE(centralDirs.length, 8); eocd.writeUInt16LE(centralDirs.length, 10);
    eocd.writeUInt32LE(cdSize, 12); eocd.writeUInt32LE(cdOffset, 16); eocd.writeUInt16LE(0, 20);
    return Buffer.concat([...parts, ...centralDirs, eocd]);
  }

  const funcZip = buildMultiZip([['send-email.js', funcContent], ['package.json', pkgJson]]);
  const funcSha1 = crypto.createHash('sha1').update(funcZip).digest('hex');
  console.log('Function zip size:', funcZip.length, 'SHA1:', funcSha1);

  // Create deploy with functions using object format {sha, runtime}
  console.log('Creating deploy...');
  const result = await apiJson('POST', '/api/v1/sites/' + siteId + '/deploys', {
    files: staticFiles,
    functions: {
      'send-email': {
        sha: funcSha1,
        runtime: 'js'
      }
    },
    async: false
  });

  if (result.status !== 200) {
    console.error('Failed:', result.status, JSON.stringify(result.body).slice(0, 500));
    return;
  }

  const deploy = result.body;
  console.log('Deploy ID:', deploy.id, 'State:', deploy.state);
  console.log('Required static:', deploy.required ? deploy.required.length : 0);
  console.log('Required functions:', deploy.required_functions ? deploy.required_functions.length : 0);
  if (deploy.required_functions) console.log('Required function SHAs:', deploy.required_functions);

  // Upload required static files
  for (const sha1 of (deploy.required || [])) {
    const rel = Object.keys(staticFiles).find(k => staticFiles[k] === sha1);
    if (rel) {
      console.log('Uploading static:', rel);
      const r = await uploadRaw('/api/v1/deploys/' + deploy.id + '/files' + rel, fileContents[rel], 'application/octet-stream');
      console.log('  Status:', r.status);
    }
  }

  // Upload required function zips
  for (const funcEntry of (deploy.required_functions || [])) {
    // funcEntry can be { sha, runtime } or just a sha string
    const sha1 = typeof funcEntry === 'object' ? funcEntry.sha : funcEntry;
    console.log('Uploading function zip, sha1:', sha1);
    const r = await uploadRaw('/api/v1/deploys/' + deploy.id + '/functions/' + sha1, funcZip, 'application/zip');
    console.log('  Status:', r.status, r.body.slice(0, 200));
  }

  await new Promise(r => setTimeout(r, 5000));
  const check = await apiJson('GET', '/api/v1/deploys/' + deploy.id);
  console.log('\nFinal state:', check.body.state);
  console.log('Functions:', JSON.stringify(check.body.build_settings));

  // Check functions list
  const funcs = await apiJson('GET', '/api/v1/deploys/' + deploy.id + '/functions');
  console.log('Functions in deploy:', JSON.stringify(funcs.body).slice(0, 300));
}

deploy().catch(console.error);
