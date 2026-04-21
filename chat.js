// ============================================================
//  Twitch Chat Overlay – chat.js
//  Native WebSocket · BTTV · 7TV · Delay Queue · Moderation
// ============================================================

const CONFIG = (() => {
  const p = new URLSearchParams(window.location.search);
  const get = (k, d) => p.has(k) ? p.get(k) : d;
  const getNum = (k, d) => Number(get(k, d));
  const getBool = (k, d) => get(k, d === true ? 'true' : 'false') === 'true';

  return {
    channel:          get('channel', '').toLowerCase(),
    delay:            getNum('delay', 5),
    maxMessages:      getNum('maxMessages', 20),
    // Layout
    offsetX:          getNum('offsetX', 0),
    offsetY:          getNum('offsetY', 0),
    width:            getNum('width', 400),
    messageGap:       getNum('messageGap', 6),
    // Design
    cornerRadius:     getNum('cornerRadius', 8),
    fontSize:         getNum('fontSize', 15),
    fontFamily:       get('fontFamily', 'Inter, sans-serif'),
    // Name typography
    nameFontFamily:   get('nameFontFamily', ''),
    nameFontSize:     getNum('nameFontSize', 13),
    nameFontWeight:   get('nameFontWeight', '700'),   // may encode italic: "700italic"
    // Message typography
    msgFontFamily:    get('msgFontFamily', ''),
    msgFontSize:      getNum('msgFontSize', 15),
    msgFontWeight:    get('msgFontWeight', '400'),    // may encode italic: "400italic"
    bgColor:          get('bgColor', '00000080'),
    textColor:        get('textColor', 'ffffff'),
    overrideNameColor: getBool('overrideNameColor', false),
    nameColor:        get('nameColor', 'ffffff'),
    nameShadow:       getBool('nameShadow', true),
    // Avatar
    showAvatar:       getBool('showAvatar', true),
    avatarSize:       getNum('avatarSize', 36),
    // Badges
    showBadges:       getBool('showBadges', true),
    bubbleFit:        getBool('bubbleFit', false),
    // Animation
    animation:        get('animation', 'slide'), // slide | fade | pop | none
    // Emotes
    bttv:             getBool('bttv', true),
    sevenTv:          getBool('sevenTv', true),
    // Deleted messages
    hideDeleted:      getBool('hideDeleted', true),
    blocklist:        new Set(
      get('blocklist', 'streamelements,streamlabs,nightbot,moobot,fossabot,wizebot,botrix')
        .split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
    ),
  };
})();

// ─── Apply CSS variables from config ────────────────────────
// ─── Dynamic Google Fonts loader ─────────────────────────────
const SYSTEM_FONTS = new Set(['Arial','Helvetica','Georgia','Verdana','Tahoma',
  'sans-serif','serif','monospace','cursive','fantasy','system-ui']);

function loadGoogleFonts(...cssFamilies) {
  const names = new Set();
  for (const raw of cssFamilies) {
    const name = (raw || '').split(',')[0].trim().replace(/['"]/g, '');
    if (name && !SYSTEM_FONTS.has(name)) names.add(name);
  }
  if (!names.size) return;

  const families = [...names]
    .map(n => 'family=' + encodeURIComponent(n) + ':ital,wght@0,400;0,700;1,400;1,700')
    .join('&');
  const href = 'https://fonts.googleapis.com/css2?' + families + '&display=swap';

  let link = document.getElementById('gfont-link');
  if (!link) {
    link = document.createElement('link');
    link.id = 'gfont-link';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }
  if (link.href !== href) link.href = href;
}

function applyConfig() {
  const root = document.documentElement;
  root.style.setProperty('--corner-radius', CONFIG.cornerRadius + 'px');
  root.style.setProperty('--font-size', CONFIG.fontSize + 'px');
  root.style.setProperty('--font-family', CONFIG.fontFamily);
  root.style.setProperty('--bg-color', '#' + CONFIG.bgColor);
  root.style.setProperty('--text-color', '#' + CONFIG.textColor);
  root.style.setProperty('--avatar-size', CONFIG.avatarSize + 'px');
  root.style.setProperty('--msg-gap', CONFIG.messageGap + 'px');
  root.style.setProperty('--overlay-width', CONFIG.width + 'px');
  root.style.setProperty('--offset-x', CONFIG.offsetX + 'px');
  root.style.setProperty('--offset-y', CONFIG.offsetY + 'px');
  // Per-element typography
  const parseVariant = (raw) => ({
    weight: raw.replace('italic', '').trim() || '400',
    style:  raw.includes('italic') ? 'italic' : 'normal',
  });
  const nameV = parseVariant(CONFIG.nameFontWeight);
  const msgV  = parseVariant(CONFIG.msgFontWeight);
  const nameFam = CONFIG.nameFontFamily || CONFIG.fontFamily;
  const msgFam  = CONFIG.msgFontFamily  || CONFIG.fontFamily;
  root.style.setProperty('--name-font-family', nameFam);
  root.style.setProperty('--name-font-size', CONFIG.nameFontSize + 'px');
  root.style.setProperty('--name-font-weight', nameV.weight);
  root.style.setProperty('--name-font-style', nameV.style);
  root.style.setProperty('--msg-font-family', msgFam);
  root.style.setProperty('--msg-font-size', CONFIG.msgFontSize + 'px');
  root.style.setProperty('--msg-font-weight', msgV.weight);
  root.style.setProperty('--msg-font-style', msgV.style);

  // Load Google Fonts for all active font families
  loadGoogleFonts(CONFIG.fontFamily, nameFam, msgFam);

  const container = document.getElementById('chat-container');
  if (container) {
    container.dataset.animation = CONFIG.animation;
    container.classList.toggle('bubble-fit', CONFIG.bubbleFit);
  }
}

// ─── Emote cache ─────────────────────────────────────────────
const EMOTES = {
  bttv: {},   // name → url
  seventv: {} // name → url
};

async function loadBTTV(channelId) {
  try {
    // Global BTTV emotes
    const global = await fetch('https://api.betterttv.net/3/cached/emotes/global').then(r => r.json());
    for (const e of global) {
      EMOTES.bttv[e.code] = `https://cdn.betterttv.net/emote/${e.id}/2x`;
    }
    // Channel BTTV emotes
    if (channelId) {
      const ch = await fetch(`https://api.betterttv.net/3/cached/users/twitch/${channelId}`).then(r => r.json());
      const all = [...(ch.channelEmotes || []), ...(ch.sharedEmotes || [])];
      for (const e of all) {
        EMOTES.bttv[e.code] = `https://cdn.betterttv.net/emote/${e.id}/2x`;
      }
    }
  } catch (e) { console.warn('BTTV load failed', e); }
}

async function load7TV(channelId) {
  try {
    // Global 7TV emotes
    const global = await fetch('https://7tv.io/v3/emote-sets/global').then(r => r.json());
    for (const e of (global.emotes || [])) {
      const url = 'https:' + e.data?.host?.url + '/2x.webp';
      EMOTES.seventv[e.name] = url;
    }
    // Channel 7TV emotes
    if (channelId) {
      const ch = await fetch(`https://7tv.io/v3/users/twitch/${channelId}`).then(r => r.json());
      for (const e of (ch.emote_set?.emotes || [])) {
        const url = 'https:' + e.data?.host?.url + '/2x.webp';
        EMOTES.seventv[e.name] = url;
      }
    }
  } catch (e) { console.warn('7TV load failed', e); }
}

async function resolveTwitchUserId(channel) {
  try {
    const r = await fetch(`https://api.ivr.fi/v2/twitch/user?login=${encodeURIComponent(channel)}`);
    if (r.ok) {
      const data = await r.json();
      return (Array.isArray(data) ? data[0]?.id : data?.id) || null;
    }
  } catch (_) {}
  return null;
}

// ─── Message Queue ────────────────────────────────────────────
// Each entry: { id, username, color, badges, message, timestamp, timer }
const messageQueue = []; // pending (waiting for delay)
const displayedMessages = new Map(); // msgId → DOM element

function enqueue(msg) {
  if (CONFIG.delay <= 0) {
    showMessage(msg);
    return;
  }
  messageQueue.push(msg);
  msg._timer = setTimeout(() => {
    const idx = messageQueue.indexOf(msg);
    if (idx !== -1) {
      messageQueue.splice(idx, 1);
      showMessage(msg);
    }
  }, CONFIG.delay * 1000);
}

function removeFromQueue(predicate) {
  for (let i = messageQueue.length - 1; i >= 0; i--) {
    if (predicate(messageQueue[i])) {
      clearTimeout(messageQueue[i]._timer);
      messageQueue.splice(i, 1);
    }
  }
}

// ─── Rendering ───────────────────────────────────────────────
const container = document.getElementById('chat-container');

function renderText(text) {
  const words = text.split(' ');
  const fragment = document.createDocumentFragment();

  for (const word of words) {
    // Check 7TV first, then BTTV
    const emoteUrl = EMOTES.seventv[word] || EMOTES.bttv[word];
    if (emoteUrl) {
      const img = document.createElement('img');
      img.src = emoteUrl;
      img.alt = word;
      img.title = word;
      img.className = 'emote';
      fragment.appendChild(img);
    } else {
      const span = document.createElement('span');
      span.textContent = word + ' ';
      fragment.appendChild(span);
    }
  }
  return fragment;
}

function parseTwitchEmotes(text, emoteTag) {
  // emoteTag: "emoteid:start-end,start-end/emoteid2:start-end"
  if (!emoteTag) return null;

  const replacements = [];
  const parts = emoteTag.split('/');
  for (const part of parts) {
    const [id, positions] = part.split(':');
    for (const pos of positions.split(',')) {
      const [start, end] = pos.split('-').map(Number);
      replacements.push({ id, start, end });
    }
  }
  replacements.sort((a, b) => a.start - b.start);
  return replacements;
}

function renderTextWithTwitchEmotes(text, emoteTag) {
  const replacements = parseTwitchEmotes(text, emoteTag);
  const fragment = document.createDocumentFragment();

  if (!replacements || replacements.length === 0) {
    return renderText(text);
  }

  let cursor = 0;
  for (const { id, start, end } of replacements) {
    // Text before emote
    if (cursor < start) {
      const before = text.slice(cursor, start);
      const words = before.split(' ');
      for (const w of words) {
        const emoteUrl = EMOTES.seventv[w] || EMOTES.bttv[w];
        if (emoteUrl && w.trim()) {
          const img = document.createElement('img');
          img.src = emoteUrl; img.alt = w; img.title = w; img.className = 'emote';
          fragment.appendChild(img);
        } else {
          const span = document.createElement('span');
          span.textContent = w + ' ';
          fragment.appendChild(span);
        }
      }
    }
    // Twitch emote
    const emoteName = text.slice(start, end + 1);
    const img = document.createElement('img');
    img.src = `https://static-cdn.jtvnw.net/emoticons/v2/${id}/default/dark/2.0`;
    img.alt = emoteName; img.title = emoteName; img.className = 'emote';
    fragment.appendChild(img);
    cursor = end + 1;
  }

  // Remaining text after last emote
  if (cursor < text.length) {
    const remaining = text.slice(cursor);
    const words = remaining.split(' ');
    for (const w of words) {
      const emoteUrl = EMOTES.seventv[w] || EMOTES.bttv[w];
      if (emoteUrl && w.trim()) {
        const img = document.createElement('img');
        img.src = emoteUrl; img.alt = w; img.title = w; img.className = 'emote';
        fragment.appendChild(img);
      } else {
        const span = document.createElement('span');
        span.textContent = w + ' ';
        fragment.appendChild(span);
      }
    }
  }

  return fragment;
}

// Stable CDN UUIDs for standard Twitch badges.
// badges.twitch.tv blocks CORS from file:// — channel-specific sub/event badges are unavailable without OAuth.
const STATIC_BADGES = {
  broadcaster:    { 1: '5527c58c-fb7d-422d-b71b-f309dcb85cc1' },
  moderator:      { 1: '3267646d-33f0-4b17-b3df-f923a41db1d0' },
  lead_moderator: { 1: 'b8145d29-9eea-482f-a140-04ca06b52ea3' },
  vip:            { 1: 'b817aba4-fad8-49e2-b88a-7cc744dfa6ec' },
  partner:        { 1: 'd12a2e27-16f6-41d0-ab77-b780518f00a3' },
  staff:          { 1: 'd97c37be-d74d-11e2-8b8b-f23c91a7a2c5' },
  turbo:          { 1: 'bd444ec6-8f34-4bf9-91f4-af1e3428d80f' },
  premium:        { 1: 'a1dd5073-19c3-4911-8cb4-c464a7bc1510' },
  admin:          { 1: '9ef7e029-4cdf-4d4d-a0d5-e2b3fb2583fe' },
  global_mod:     { 1: '9384c428-e8d8-4c84-b3d7-8f76e2c4ca4a' },
  founder:        { 0: '511b78a9-ab37-472f-9569-457753bbe7d3' },
  bits: {
    1:     '73b5c3fb-24f9-4a82-a852-23f186078e57',
    100:   '09d93036-e7ce-431c-9a9e-7044297133f2',
    1000:  '0d85a29e-7ad9-4b5e-b984-a4d65d22ab9b',
    5000:  '57cd97fc-3e9e-4c6d-9d9f-e9b02c18bd11',
    10000: '68af213f-0e5b-49a3-b136-cc32460e2678',
  },
};

function staticBadgeUrl(name, ver) {
  const uuid = STATIC_BADGES[name]?.[ver];
  return uuid ? `https://static-cdn.jtvnw.net/badges/v1/${uuid}/2` : null;
}

function buildBadges(badgeStr, badgeInfo) {
  const wrapper = document.createElement('span');
  wrapper.className = 'badges';
  if (!CONFIG.showBadges || !badgeStr) return wrapper;

  const parts = badgeStr.split(',');
  for (const part of parts) {
    const [name, ver] = part.split('/');
    const imgUrl = badgeInfo?.[name]?.[ver]?.image_url_2x || staticBadgeUrl(name, ver);
    if (imgUrl) {
      const img = document.createElement('img');
      img.src = imgUrl;
      img.alt = name;
      img.title = name;
      img.className = 'badge';
      img.onerror = () => { console.warn('[badges] img failed:', name, ver, imgUrl); img.remove(); };
      wrapper.appendChild(img);
    }
  }
  return wrapper;
}

const FALLBACK_AVATAR = 'https://static-cdn.jtvnw.net/user-default-pictures-uv/ebe4cd89-b4f4-4cd9-adac-2f30151b4209-profile_image-70x70.png';
let avatarCache = {};

async function getAvatar(username) {
  if (avatarCache[username]) return avatarCache[username];
  try {
    const r = await fetch(`https://api.ivr.fi/v2/twitch/user?login=${encodeURIComponent(username)}`);
    if (r.ok) {
      const data = await r.json();
      const url = (Array.isArray(data) ? data[0]?.logo : data?.logo) || FALLBACK_AVATAR;
      avatarCache[username] = url;
      return url;
    }
  } catch (_) {}
  avatarCache[username] = FALLBACK_AVATAR;
  return FALLBACK_AVATAR;
}

async function showMessage(msg) {
  const el = document.createElement('div');
  el.className = 'chat-message';
  el.dataset.id = msg.id;
  el.dataset.username = msg.username;

  // Avatar
  if (CONFIG.showAvatar) {
    const avatar = document.createElement('img');
    avatar.className = 'avatar';
    avatar.alt = msg.username;
    avatar.onerror = () => { avatar.src = FALLBACK_AVATAR; };
    getAvatar(msg.username).then(url => { avatar.src = url; });
    el.appendChild(avatar);
  }

  // Message body
  const body = document.createElement('div');
  body.className = 'message-body';

  // Header: badges + name
  const header = document.createElement('div');
  header.className = 'message-header';
  header.appendChild(buildBadges(msg.badges, msg.badgeInfo));

  const nameEl = document.createElement('span');
  nameEl.className = 'username';
  nameEl.textContent = msg.displayName || msg.username;
  const resolvedColor = CONFIG.overrideNameColor
    ? '#' + CONFIG.nameColor
    : (msg.color || '#9b9b9b');
  nameEl.style.color = resolvedColor;
  if (CONFIG.nameShadow) {
    nameEl.style.textShadow = `0 0 8px ${resolvedColor}60`;
  }
  header.appendChild(nameEl);
  body.appendChild(header);

  // Text
  const textEl = document.createElement('div');
  textEl.className = 'message-text';
  textEl.appendChild(renderTextWithTwitchEmotes(msg.message, msg.emotes));
  body.appendChild(textEl);

  el.appendChild(body);
  container.appendChild(el);

  // Trigger animation: double-rAF ensures initial state is painted before transition
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('visible')));

  displayedMessages.set(msg.id, el);

  // Trim old messages
  const all = container.querySelectorAll('.chat-message');
  if (all.length > CONFIG.maxMessages) {
    const oldest = all[0];
    oldest.classList.add('removing');
    oldest.addEventListener('transitionend', () => oldest.remove(), { once: true });
    setTimeout(() => oldest.remove(), 600);
  }
}

function removeDisplayed(predicate) {
  for (const [id, el] of displayedMessages.entries()) {
    if (predicate(id, el)) {
      el.classList.add('removing');
      el.addEventListener('transitionend', () => { el.remove(); displayedMessages.delete(id); }, { once: true });
      setTimeout(() => { el.remove(); displayedMessages.delete(id); }, 600);
    }
  }
}

// ─── Twitch IRC via WebSocket ─────────────────────────────────
let ws;
let reconnectTimeout;
const TWITCH_WS = 'wss://irc-ws.chat.twitch.tv:443';

function connect() {
  if (!CONFIG.channel) {
    showError('Kein Channel angegeben. Füge ?channel=deinname zur URL hinzu.');
    return;
  }

  ws = new WebSocket(TWITCH_WS);

  ws.onopen = () => {
    ws.send('CAP REQ :twitch.tv/tags twitch.tv/commands twitch.tv/membership');
    ws.send('PASS oauth:anonymous_access');
    ws.send('NICK justinfan' + Math.floor(Math.random() * 99999));
    ws.send('JOIN #' + CONFIG.channel);
    console.log('Connected to #' + CONFIG.channel);
    hideError();
  };

  ws.onmessage = (event) => {
    const lines = event.data.split('\r\n').filter(Boolean);
    for (const line of lines) handleIRC(line);
  };

  ws.onerror = (e) => console.error('WS error', e);

  ws.onclose = () => {
    console.warn('WS closed, reconnecting in 5s…');
    reconnectTimeout = setTimeout(connect, 5000);
  };
}

// IRC tag parser
function parseTags(tagStr) {
  const tags = {};
  for (const part of tagStr.split(';')) {
    const [k, v] = part.split('=');
    tags[k] = v || '';
  }
  return tags;
}

const BADGE_INFO = {};

function parseBadgeSets(arr) {
  const result = {};
  for (const set of (Array.isArray(arr) ? arr : [])) {
    const versions = {};
    for (const v of (set.versions || [])) versions[v.id] = v;
    result[set.set_id] = versions;
  }
  return result;
}

async function loadBadges(channelId) {
  // Load global badges from IVR.fi (no OAuth needed)
  try {
    const r = await fetch('https://api.ivr.fi/v2/twitch/badges/global');
    if (r.ok) Object.assign(BADGE_INFO, parseBadgeSets(await r.json()));
  } catch (_) {}

  // Load channel-specific badges (sub badges etc.) if channelId is known
  if (channelId) {
    try {
      const r = await fetch(`https://api.ivr.fi/v2/twitch/badges/channel?id=${channelId}`);
      if (r.ok) {
        const channelSets = parseBadgeSets(await r.json());
        for (const [name, versions] of Object.entries(channelSets))
          BADGE_INFO[name] = { ...(BADGE_INFO[name] || {}), ...versions };
      }
    } catch (_) {}
  }

  // Optionally merge a local badges.json (generated by fetch-badges.js) on top.
  // Only attempted over HTTP(S) — file:// fetch is blocked by browsers (CORS).
  if (location.protocol !== 'file:') {
    try {
      const r = await fetch('badges.json');
      if (r.ok) Object.assign(BADGE_INFO, await r.json());
    } catch (_) {}
  }
}

function handleIRC(line) {
  // PING
  if (line.startsWith('PING')) {
    ws.send('PONG :tmi.twitch.tv');
    return;
  }

  // Parse tags
  let rest = line;
  let tags = {};
  if (rest.startsWith('@')) {
    const spaceIdx = rest.indexOf(' ');
    tags = parseTags(rest.slice(1, spaceIdx));
    rest = rest.slice(spaceIdx + 1);
  }

  // Parse prefix
  let prefix = '';
  if (rest.startsWith(':')) {
    const spaceIdx = rest.indexOf(' ');
    prefix = rest.slice(1, spaceIdx);
    rest = rest.slice(spaceIdx + 1);
  }

  const parts = rest.split(' ');
  const command = parts[0];

  if (command === 'PRIVMSG') {
    const colonIdx = rest.indexOf(' :');
    const message = colonIdx !== -1 ? rest.slice(colonIdx + 2) : '';
    const username = prefix.split('!')[0];

    if (CONFIG.blocklist.has(username.toLowerCase())) return;

    const msgObj = {
      id: tags['id'] || Math.random().toString(36).slice(2),
      username,
      displayName: tags['display-name'] || username,
      color: tags['color'] || randomColor(username),
      badges: tags['badges'] || '',
      badgeInfo: BADGE_INFO,
      emotes: tags['emotes'] || '',
      message,
    };
    enqueue(msgObj);
  }

  // Single message deletion
  if (command === 'CLEARMSG') {
    const targetId = tags['target-msg-id'];
    if (targetId) {
      removeFromQueue(m => m.id === targetId);
      removeDisplayed((id) => id === targetId);
    }
  }

  // User timeout / ban → remove all their messages
  if (command === 'CLEARCHAT') {
    const colonIdx = rest.indexOf(' :');
    const targetUser = colonIdx !== -1 ? rest.slice(colonIdx + 2).toLowerCase() : null;
    if (targetUser) {
      removeFromQueue(m => m.username === targetUser);
      removeDisplayed((id, el) => el.dataset.username === targetUser);
    } else {
      // Full chat clear
      removeFromQueue(() => true);
      removeDisplayed(() => true);
    }
  }
}

// Deterministic color for users without color set
function randomColor(username) {
  let hash = 0;
  for (const c of username) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffffff;
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 70%, 65%)`;
}

// ─── Error UI ─────────────────────────────────────────────────
function showError(msg) {
  let el = document.getElementById('error-notice');
  if (!el) {
    el = document.createElement('div');
    el.id = 'error-notice';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.style.display = 'block';
}
function hideError() {
  const el = document.getElementById('error-notice');
  if (el) el.style.display = 'none';
}

// ─── Init ─────────────────────────────────────────────────────
async function init() {
  applyConfig();

  if (!CONFIG.channel) {
    showError('Kein Channel angegeben. Öffne die Settings-Seite um das Overlay zu konfigurieren.');
    return;
  }

  // Resolve channel ID for BTTV/7TV channel emotes (uses IVR.fi, no OAuth needed)
  const channelId = await resolveTwitchUserId(CONFIG.channel);

  const promises = [loadBadges(channelId)];
  if (CONFIG.bttv) promises.push(loadBTTV(channelId));
  if (CONFIG.sevenTv) promises.push(load7TV(channelId));
  await Promise.allSettled(promises);

  connect();
}

document.addEventListener('DOMContentLoaded', init);
