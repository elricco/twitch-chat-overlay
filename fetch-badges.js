#!/usr/bin/env node
// Verwendung: node fetch-badges.js <kanalname>
// Speichert badges.json im selben Ordner – wird vom Overlay direkt geladen.
const https = require('https');
const fs    = require('fs');
const path  = require('path');

const channel = process.argv[2];
if (!channel) {
  console.error('Verwendung: node fetch-badges.js <kanalname>');
  process.exit(1);
}

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'twitch-chat-overlay/1.0' } }, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch (e) { reject(new Error(`JSON-Fehler (${url}): ${body.slice(0, 120)}`)); }
      });
    }).on('error', reject);
  });
}

async function main() {
  const badgeInfo = {};

  console.log(`Channel-ID für "${channel}" auflösen…`);
  const userData = await get(`https://api.ivr.fi/v2/twitch/user?login=${encodeURIComponent(channel)}`);
  const channelId = Array.isArray(userData) ? userData[0]?.id : userData?.id;
  if (!channelId) { console.error('Channel nicht gefunden.'); process.exit(1); }
  console.log(`Channel-ID: ${channelId}`);

  console.log('Globale Badges laden…');
  const globalData = await get('https://api.ivr.fi/v2/twitch/badges/global');
  for (const set of (Array.isArray(globalData) ? globalData : [])) {
    const versions = {};
    for (const v of (set.versions || [])) versions[v.id] = v;
    badgeInfo[set.set_id] = versions;
  }

  console.log('Kanal-Badges laden…');
  const channelData = await get(`https://api.ivr.fi/v2/twitch/badges/channel?id=${channelId}`);
  for (const set of (Array.isArray(channelData) ? channelData : [])) {
    const versions = {};
    for (const v of (set.versions || [])) versions[v.id] = v;
    badgeInfo[set.set_id] = { ...(badgeInfo[set.set_id] || {}), ...versions };
  }

  const outPath = path.join(__dirname, 'badges.json');
  fs.writeFileSync(outPath, JSON.stringify(badgeInfo));
  console.log(`✓ ${Object.keys(badgeInfo).length} Badge-Sets → badges.json`);
}

main().catch(e => { console.error(e.message); process.exit(1); });
