// Deploy entire site as a zip to Netlify
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
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  return table;
}
const CRC_TABLE = makeCRCTable();

function computeCRC32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ buf[i]) & 0xFF];
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function addFileToZip(parts, centralDirs, filePath, zipEntryName) {
  const content = fs.readFileSync(filePath);
  const compressed = zlib.deflateRawSync(content);
  const crc32 = computeCRC32(content);
  const nameBuffer = Buffer.from(zipEntryName, 'utf8');
  const now = new Date();
  const dosTime = ((now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1));
  const dosDate = (((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate());

  // Calculate current offset
  const localOffset = parts.reduce((sum, p) => sum + p.length, 0);

  const localHeader = Buffer.alloc(30 + nameBuffer.length);
  localHeader.writeUInt32LE(0x04034b50, 0);
  localHeader.writeUInt16LE(20, 4);
  localHeader.writeUInt16LE(0, 6);
  localHeader.writeUInt16LE(8, 8);
  localHeader.writeUInt16LE(dosTime, 10);
  localHeader.writeUInt16LE(dosDate, 12);
  localHeader.writeUInt32LE(crc32, 14);
  localHeader.writeUInt32LE(compressed.length, 18);
  localHeader.writeUInt32LE(content.length, 22);
  localHeader.writeUInt16LE(nameBuffer.length, 26);
  localHeader.writeUInt16LE(0, 28);
  nameBuffer.copy(localHeader, 30);

  parts.push(localHeader);
  parts.push(compressed);

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
  centralHeader.writeUInt32LE(content.length, 24);
  centralHeader.writeUInt16LE(nameBuffer.length, 28);
  centralHeader.writeUInt16LE(0, 30);
  centralHeader.writeUInt16LE(0, 32);
  centralHeader.writeUInt16LE(0, 34);
  centralHeader.writeUInt16LE(0, 36);
  centralHeader.writeUInt32LE(0, 38);
  centralHeader.writeUInt32LE(localOffset, 42);
  nameBuffer.copy(centralHeader, 46);

  centralDirs.push(centralHeader);
}

function buildZip(parts, centralDirs) {
  const centralDirOffset = parts.reduce((sum, p) => sum + p.length, 0);
  const centralDirSize = centralDirs.reduce((sum, p) => sum + p.length, 0);

  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(centralDirs.length, 8);
  eocd.writeUInt16LE(centralDirs.length, 10);
  eocd.writeUInt32LE(centralDirSize, 12);
  eocd.writeUInt32LE(centralDirOffset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...parts, ...centralDirs, eocd]);
}

async function deploy() {
  const parts = [];
  const centralDirs = [];

  // Static files
  const webFiles = [
    '404.html', 'algemene-voorwaarden.html', 'bevestiging.html', 'boeken.html',
    'detailer-dashboard.html', 'detailer-registratie.html', 'deto-homepage.html',
    'deto-logo.png', 'privacy.html'
  ];

  for (const f of webFiles) {
    console.log('Adding static:', f);
    addFileToZip(parts, centralDirs, f, f);
  }

  // netlify.toml
  console.log('Adding netlify.toml');
  addFileToZip(parts, centralDirs, 'netlify.toml', 'netlify.toml');

  // Function
  console.log('Adding function: send-email.js');
  addFileToZip(parts, centralDirs, 'netlify/functions/send-email.js', 'netlify/functions/send-email.js');

  const zipBuffer = buildZip(parts, centralDirs);
  console.log('Total zip size:', zipBuffer.length);

  // Deploy via zip
  console.log('Deploying...');
  const result = await new Promise((resolve, reject) => {
    const opts = {
      hostname: 'api.netlify.com',
      path: '/api/v1/sites/' + siteId + '/deploys',
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/zip',
        'Content-Length': zipBuffer.length
      }
    };
    const req = https.request(opts, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({status: res.statusCode, body: JSON.parse(data)}); }
        catch { resolve({status: res.statusCode, body: data}); }
      });
    });
    req.on('error', reject);
    req.write(zipBuffer);
    req.end();
  });

  if (result.status !== 200) {
    console.error('Deploy failed:', result.status, JSON.stringify(result.body).slice(0, 1000));
    return;
  }

  const deploy = result.body;
  console.log('\nDeploy ID:', deploy.id);
  console.log('State:', deploy.state);
  console.log('URL:', deploy.deploy_url || deploy.url);

  // Wait and check
  await new Promise(r => setTimeout(r, 5000));

  const check = await new Promise((resolve, reject) => {
    const opts = {
      hostname: 'api.netlify.com',
      path: '/api/v1/deploys/' + deploy.id,
      method: 'GET',
      headers: { 'Authorization': 'Bearer ' + token }
    };
    const req = https.request(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(JSON.parse(d)));
    });
    req.on('error', reject);
    req.end();
  });

  console.log('\nFinal state:', check.state);
  console.log('Deploy URL:', check.deploy_url);
  console.log('Site URL:', check.url);
}

deploy().catch(console.error);
