# Split Bubble Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Einen „Split-Modus" implementieren, der Benutzername und Nachricht in zwei unabhängig konfigurierbare Bubbles aufteilt, inklusive konfigurierbarer Avatar-Position.

**Architecture:** Sechs neue URL-Parameter werden in `chat.js` eingelesen und als CSS Custom Properties gesetzt. `showMessage()` verzweigt abhängig von `CONFIG.splitBubble` in zwei Rendering-Pfade. In `settings.html` steuert ein Toggle einen neuen bedingten Einstellungsbereich; `updatePreview()` ruft `rebuildPreviewStructure()` auf, das die Preview-DOM-Struktur bei Bedarf neu aufbaut.

**Tech Stack:** Vanilla JS, CSS Custom Properties, keine Build-Pipeline.

---

### Task 1: CONFIG-Parameter + CSS-Vars + overlay.html CSS-Defaults

**Files:**
- Modify: `chat.js:6-57` (CONFIG IIFE)
- Modify: `chat.js:87-126` (applyConfig)
- Modify: `overlay.html:9-30` (`:root` defaults)

- [ ] **Schritt 1: 6 neue Parameter ans CONFIG-Objekt anhängen**

  In `chat.js`, das `return { ... }` des CONFIG IIFE. Nach `hideDeleted: getBool(...)` und vor `blocklist:` einfügen:

  ```js
    // Split Bubble
    splitBubble:       getBool('splitBubble', false),
    nameBubbleColor:   get('nameBubbleColor', '9b5de580'),
    nameBubbleRadius:  getNum('nameBubbleRadius', 8),
    nameBubbleOffsetX: getNum('nameBubbleOffsetX', 0),
    nameBubbleOffsetY: getNum('nameBubbleOffsetY', 0),
    avatarPos:         get('avatarPos', 'before'), // 'before' | 'in-name' | 'in-message'
  ```

- [ ] **Schritt 2: 4 CSS Custom Properties in applyConfig() setzen**

  In `chat.js`, am Ende von `applyConfig()`, direkt vor dem `loadGoogleFonts`-Aufruf einfügen:

  ```js
    root.style.setProperty('--name-bubble-bg',       '#' + CONFIG.nameBubbleColor);
    root.style.setProperty('--name-bubble-radius',   CONFIG.nameBubbleRadius + 'px');
    root.style.setProperty('--name-bubble-offset-x', CONFIG.nameBubbleOffsetX + 'px');
    root.style.setProperty('--name-bubble-offset-y', CONFIG.nameBubbleOffsetY + 'px');
  ```

- [ ] **Schritt 3: Neue CSS-Variablen-Defaults im `:root` von overlay.html ergänzen**

  In `overlay.html` nach `--bubble-fit: 0;` (Zeile 29) einfügen:

  ```css
      /* Split Bubble */
      --name-bubble-bg: #9b5de580;
      --name-bubble-radius: 8px;
      --name-bubble-offset-x: 0px;
      --name-bubble-offset-y: 0px;
  ```

- [ ] **Schritt 4: Commit**

  ```bash
  git add chat.js overlay.html
  git commit -m "feat: split-bubble CONFIG params and CSS custom properties"
  ```

---

### Task 2: Split-Layout-CSS in overlay.html

**Files:**
- Modify: `overlay.html` (CSS-Block, nach Zeile 207 vor `</style>`)

- [ ] **Schritt 1: Split-Klassen-CSS ans Ende des `<style>`-Blocks anhängen**

  Direkt vor `</style>` (Zeile 226) einfügen:

  ```css
    /* ── Split Bubble Layout ── */
    .chat-message.split {
      background: transparent !important;
      padding: 0;
      gap: 0;
    }

    .split-group {
      display: flex;
      flex-direction: column;
      flex: 1;
    }

    .name-bubble {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: var(--name-bubble-bg);
      border-radius: var(--name-bubble-radius);
      padding: 5px 10px;
      margin-left: var(--name-bubble-offset-x);
      margin-bottom: var(--name-bubble-offset-y);
      position: relative;
      z-index: 1;
      max-width: 100%;
    }

    .name-bubble .avatar {
      width: calc(var(--avatar-size) * 0.75);
      height: calc(var(--avatar-size) * 0.75);
      margin-top: 0;
    }

    .chat-message.split .message-body {
      background: var(--bg-color);
      border-radius: var(--corner-radius);
      padding: 6px 10px;
      display: flex;
      align-items: flex-start;
      gap: 8px;
    }

    .chat-message.split .message-body .message-header {
      display: none;
    }
  ```

- [ ] **Schritt 2: Commit**

  ```bash
  git add overlay.html
  git commit -m "feat: split-bubble CSS layout classes"
  ```

---

### Task 3: showMessage() für Split-Modus refaktorieren

**Files:**
- Modify: `chat.js:379-439` (showMessage)

- [ ] **Schritt 1: showMessage() mit Split-Verzweigung ersetzen**

  Die gesamte Funktion `showMessage` (Zeilen 379–439) ersetzen durch:

  ```js
  async function showMessage(msg) {
    const el = document.createElement('div');
    el.className = 'chat-message';
    el.dataset.id = msg.id;
    el.dataset.username = msg.username;

    const makeAvatar = () => {
      const av = document.createElement('img');
      av.className = 'avatar';
      av.alt = msg.username;
      av.onerror = () => { av.src = FALLBACK_AVATAR; };
      getAvatar(msg.username).then(url => { av.src = url; });
      return av;
    };

    const makeNameEl = () => {
      const nameEl = document.createElement('span');
      nameEl.className = 'username';
      nameEl.textContent = msg.displayName || msg.username;
      const color = CONFIG.overrideNameColor ? '#' + CONFIG.nameColor : (msg.color || '#9b9b9b');
      nameEl.style.color = color;
      if (CONFIG.nameShadow) nameEl.style.textShadow = `0 0 8px ${color}60`;
      return nameEl;
    };

    if (CONFIG.splitBubble) {
      el.classList.add('split');

      if (CONFIG.showAvatar && CONFIG.avatarPos === 'before') {
        el.appendChild(makeAvatar());
      }

      const splitGroup = document.createElement('div');
      splitGroup.className = 'split-group';

      // Name bubble
      const nameBubble = document.createElement('div');
      nameBubble.className = 'name-bubble';
      if (CONFIG.showAvatar && CONFIG.avatarPos === 'in-name') {
        nameBubble.appendChild(makeAvatar());
      }
      nameBubble.appendChild(buildBadges(msg.badges, msg.badgeInfo));
      nameBubble.appendChild(makeNameEl());
      splitGroup.appendChild(nameBubble);

      // Message body
      const body = document.createElement('div');
      body.className = 'message-body';
      if (CONFIG.showAvatar && CONFIG.avatarPos === 'in-message') {
        body.appendChild(makeAvatar());
      }
      const textEl = document.createElement('div');
      textEl.className = 'message-text';
      textEl.appendChild(renderTextWithTwitchEmotes(msg.message, msg.emotes));
      body.appendChild(textEl);
      splitGroup.appendChild(body);

      el.appendChild(splitGroup);

    } else {
      // Unified (original layout)
      if (CONFIG.showAvatar) el.appendChild(makeAvatar());

      const body = document.createElement('div');
      body.className = 'message-body';

      const header = document.createElement('div');
      header.className = 'message-header';
      header.appendChild(buildBadges(msg.badges, msg.badgeInfo));
      header.appendChild(makeNameEl());
      body.appendChild(header);

      const textEl = document.createElement('div');
      textEl.className = 'message-text';
      textEl.appendChild(renderTextWithTwitchEmotes(msg.message, msg.emotes));
      body.appendChild(textEl);

      el.appendChild(body);
    }

    container.appendChild(el);
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('visible')));
    displayedMessages.set(msg.id, el);

    const all = container.querySelectorAll('.chat-message');
    if (all.length > CONFIG.maxMessages) {
      const oldest = all[0];
      oldest.classList.add('removing');
      oldest.addEventListener('transitionend', () => oldest.remove(), { once: true });
      setTimeout(() => oldest.remove(), 600);
    }
  }
  ```

- [ ] **Schritt 2: Commit**

  ```bash
  git add chat.js
  git commit -m "feat: split-bubble rendering in showMessage()"
  ```

---

### Task 4: settings.html – Infrastruktur + UI

**Files:**
- Modify: `settings.html` (DEFAULTS, LABELS, URL-Felder, syncColor, update(), loadState/resetAll, HTML)

- [ ] **Schritt 1: 6 neue Defaults in DEFAULTS-Objekt eintragen**

  In `settings.html`, das `DEFAULTS`-Objekt (Zeile ~1116). Nach `blocklist: '...'` einfügen:

  ```js
    splitBubble: false,
    nameBubbleColor: '9b5de580',
    nameBubbleRadius: 8,
    nameBubbleOffsetX: 0,
    nameBubbleOffsetY: 0,
    avatarPos: 'before',
  ```

- [ ] **Schritt 2: Neue Felder in LABELS und URL-Generierung eintragen**

  In `settings.html`, das `LABELS`-Objekt erweitern:

  ```js
    nameBubbleRadius:  v => v + 'px',
    nameBubbleOffsetX: v => v + 'px',
    nameBubbleOffsetY: v => v + 'px',
  ```

  In `generateUrl()` die drei Feldlisten anpassen:

  ```js
  const numFields = ['delay','maxMessages','offsetX','offsetY','width','messageGap','cornerRadius','fontSize','avatarSize','nameFontSize','msgFontSize','nameBubbleRadius','nameBubbleOffsetX','nameBubbleOffsetY'];
  const boolFields = ['showAvatar','showBadges','bubbleFit','alternating','nameShadow','bttv','sevenTv','overrideNameColor','splitBubble'];
  const strFields  = ['fontFamily','bgColor','textColor','animation','blocklist','nameFontFamily','nameFontWeight','msgFontFamily','msgFontWeight','nameColor','nameBubbleColor','avatarPos'];
  ```

- [ ] **Schritt 3: syncColor() um nameBubble-Alpha-Fall erweitern**

  In `syncColor(which)` die Bedingung für die Alpha-Behandlung anpassen:

  ```js
  // alt:
  if (which === 'bg') {
  // neu:
  if (which === 'bg' || which === 'nameBubble') {
  ```

- [ ] **Schritt 4: syncColorFromText('nameBubble') in loadState() und resetAll() ergänzen**

  In `loadState()`, nach `syncColorFromText('name');`:

  ```js
        syncColorFromText('nameBubble');
  ```

  In `resetAll()`, nach `syncColorFromText('name');`:

  ```js
    syncColorFromText('nameBubble');
  ```

- [ ] **Schritt 5: updateSplitVisibility() hinzufügen und in update() aufrufen**

  Neue Funktion direkt vor der `update()`-Funktion einfügen:

  ```js
  function updateSplitVisibility() {
    const isSplit = get('splitBubble');
    const splitSection = document.getElementById('splitBubbleSection');
    if (splitSection) splitSection.style.display = isSplit ? '' : 'none';
    const avatarPosField = document.getElementById('avatarPosField');
    if (avatarPosField) avatarPosField.style.display = (isSplit && get('showAvatar')) ? '' : 'none';
  }
  ```

  In `update()` als erste Zeile nach `updateLabels()` aufrufen:

  ```js
  function update() {
    updateLabels();
    updateSplitVisibility();
    // ... Rest unverändert
  ```

- [ ] **Schritt 6: Split-Bubble-UI-HTML in die Avatar & Badges Card einfügen**

  In `settings.html`, nach dem alternating-Toggle-`</div>`-Block (nach Zeile ~709) und vor dem `nameShadow`-Toggle einfügen:

  ```html
      <div class="field">
        <div class="toggle-row">
          <span class="toggle-label">Getrennte Bubbles</span>
          <label class="toggle">
            <input type="checkbox" id="splitBubble" onchange="update()">
            <span class="toggle-track"></span>
          </label>
        </div>
      </div>

      <div id="splitBubbleSection" style="display:none">
        <div class="field">
          <label class="subsection-label">// Namens-Bubble</label>
        </div>
        <div class="field">
          <label>Hintergrundfarbe (Namens-Bubble)</label>
          <div class="color-row">
            <input type="color" id="nameBubbleColorPicker" value="#9b5de5" oninput="syncColor('nameBubble')">
            <input type="text" id="nameBubbleColor" value="9b5de580" placeholder="RRGGBBAA" oninput="syncColorFromText('nameBubble'); update()">
          </div>
          <div class="opacity-hint">Format: RRGGBBAA – letzten 2 Stellen = Transparenz</div>
        </div>
        <div class="field">
          <label>
            Corner Radius
            <span class="value-badge" id="lbl-nameBubbleRadius">8px</span>
          </label>
          <input type="range" id="nameBubbleRadius" min="0" max="24" step="1" value="8" oninput="update()">
        </div>
        <div class="field">
          <label>
            Versatz X (positiv = rechts)
            <span class="value-badge" id="lbl-nameBubbleOffsetX">0px</span>
          </label>
          <input type="range" id="nameBubbleOffsetX" min="-20" max="80" step="1" value="0" oninput="update()">
        </div>
        <div class="field">
          <label>
            Versatz Y (negativ = Überlappung)
            <span class="value-badge" id="lbl-nameBubbleOffsetY">0px</span>
          </label>
          <input type="range" id="nameBubbleOffsetY" min="-20" max="20" step="1" value="0" oninput="update()">
        </div>
        <div class="field" id="avatarPosField" style="display:none">
          <label>Avatar-Position</label>
          <select id="avatarPos" onchange="update()">
            <option value="before">Vor beiden Bubbles</option>
            <option value="in-name">In der Namens-Bubble</option>
            <option value="in-message">In der Nachrichten-Bubble</option>
          </select>
        </div>
      </div>
  ```

- [ ] **Schritt 7: Commit**

  ```bash
  git add settings.html
  git commit -m "feat: split-bubble settings UI and infrastructure"
  ```

---

### Task 5: settings.html – Preview für Split-Modus

**Files:**
- Modify: `settings.html` (neue Funktion `rebuildPreviewStructure`, Patch `updatePreview`)

- [ ] **Schritt 1: Split-Preview-CSS in den `<style>`-Block einfügen**

  In `settings.html`, nach `.preview-emote { ... }` (nach Zeile ~436) einfügen:

  ```css
    .preview-msg--split {
      background: transparent !important;
      padding: 0 !important;
      gap: 8px;
    }
    .preview-split-group {
      display: flex;
      flex-direction: column;
      flex: 1;
    }
    .preview-name-bubble {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 4px 10px;
      border-radius: 8px;
    }
    .preview-name-bubble .preview-avatar {
      border-radius: 50%;
      object-fit: cover;
      flex-shrink: 0;
    }
    .preview-msg--split .preview-body {
      padding: 6px 10px;
      border-radius: 8px;
      display: flex;
      align-items: flex-start;
      gap: 8px;
    }
    .preview-msg--split .preview-body .preview-avatar {
      flex-shrink: 0;
      border-radius: 50%;
      object-fit: cover;
    }
  ```

- [ ] **Schritt 2: PREVIEW_DATA-Array und rebuildPreviewStructure() vor updatePreview() einfügen**

  Direkt vor `function updatePreview()` einfügen:

  ```js
  const PREVIEW_AV = 'https://static-cdn.jtvnw.net/user-default-pictures-uv/ebe4cd89-b4f4-4cd9-adac-2f30151b4209-profile_image-70x70.png';
  const PREVIEW_DATA = [
    { id: 1, name: 'StreamerFan99', color: '#9b5de5',
      badgeSrc: 'https://static-cdn.jtvnw.net/badges/v1/5d9f2208-5dd8-11e7-8513-2ff4adfae661/2', badgeAlt: 'sub',
      textHtml: 'Dieses Overlay sieht mega aus <img class="preview-emote" src="https://cdn.betterttv.net/emote/54fa8f1401e468494b85b537/2x" alt="Pog" title="Pog">' },
    { id: 2, name: 'CoolViewer',    color: '#f15bb5',
      badgeSrc: 'https://static-cdn.jtvnw.net/badges/v1/3267646d-33f0-4b17-b3df-f923a41db1d0/2', badgeAlt: 'mod',
      textHtml: 'LUL ja richtig nice!! <img class="preview-emote" src="https://cdn.betterttv.net/emote/567b00c61ddbe1786688a6f0/2x" alt="LUL" title="LUL">' },
    { id: 3, name: 'TwitchNerd',    color: '#00f5d4',
      badgeSrc: null,
      textHtml: 'Wann kommt der nächste Stream? 👀' },
  ];

  function rebuildPreviewStructure() {
    const isSplit   = get('splitBubble');
    const avatarPos = get('avatarPos');
    const showAv    = get('showAvatar');
    const showBadge = get('showBadges');

    PREVIEW_DATA.forEach(data => {
      const msgEl = document.getElementById('prev' + data.id);
      if (!msgEl) return;

      const avHtml = `<img class="preview-avatar" id="prev-av${data.id}" src="${PREVIEW_AV}" alt="" style="${showAv ? '' : 'display:none'}">`;
      const badgeHtml = (showBadge && data.badgeSrc)
        ? `<img class="preview-badge" src="${data.badgeSrc}" alt="${data.badgeAlt}" title="${data.badgeAlt}">`
        : '';
      const nameHtml = `<span class="preview-name" style="color:${data.color}">${data.name}</span>`;
      const textHtml = `<div class="preview-text">${data.textHtml}</div>`;

      if (isSplit) {
        const avBefore    = avatarPos === 'before'     ? avHtml : '';
        const avInName    = avatarPos === 'in-name'    ? avHtml : '';
        const avInMessage = avatarPos === 'in-message' ? avHtml : '';
        msgEl.innerHTML = `
          ${avBefore}
          <div class="preview-split-group">
            <div class="preview-name-bubble">${avInName}${badgeHtml}${nameHtml}</div>
            <div class="preview-body">${avInMessage}${textHtml}</div>
          </div>`;
        msgEl.classList.add('preview-msg--split');
      } else {
        msgEl.innerHTML = `
          ${avHtml}
          <div class="preview-body">
            <div class="preview-header">${badgeHtml}${nameHtml}</div>
            ${textHtml}
          </div>`;
        msgEl.classList.remove('preview-msg--split');
      }
    });
  }
  ```

- [ ] **Schritt 3: updatePreview() – rebuildPreviewStructure() am Anfang aufrufen**

  In `updatePreview()`, als erste Zeile nach der öffnenden `{` einfügen:

  ```js
  rebuildPreviewStructure();
  ```

- [ ] **Schritt 4: updatePreview() – msgs.forEach-Block für Split erweitern**

  Den `msgs.forEach((el, i) => {`-Block (derzeit setzt er `el.style.background = bg` und `el.style.borderRadius = cr`) ersetzen durch:

  ```js
    const isSplit = get('splitBubble');
    msgs.forEach((el, i) => {
      el.style.color = tc;
      if (isSplit) {
        el.style.background = 'transparent';
        el.style.borderRadius = '0';
        el.style.padding = '0';
        const body = el.querySelector('.preview-body');
        if (body) { body.style.background = bg; body.style.borderRadius = cr; }
        const nb = el.querySelector('.preview-name-bubble');
        if (nb) {
          nb.style.background  = '#' + (get('nameBubbleColor') || '9b5de580');
          nb.style.borderRadius = get('nameBubbleRadius') + 'px';
          nb.style.marginLeft   = get('nameBubbleOffsetX') + 'px';
          nb.style.marginBottom = get('nameBubbleOffsetY') + 'px';
        }
      } else {
        el.style.background   = bg;
        el.style.borderRadius = cr;
        el.style.padding      = '';
      }

      // Avatar (works for all positions – getElementById finds the element regardless of nesting)
      avs[i].style.display = showAv ? 'block' : 'none';
      avs[i].style.width   = avSize;
      avs[i].style.height  = avSize;
      avs[i].src           = FALLBACK_AV;

      // Badges
      const badge = el.querySelector('.preview-badge');
      if (badge) badge.style.display = showBadges ? '' : 'none';
    });
  ```

  > **Hinweis:** Die `avs`-Array-Einträge werden nach dem `rebuildPreviewStructure()`-Aufruf via `getElementById` neu abgefragt, also findet das Array die neuen Elemente korrekt.

- [ ] **Schritt 5: Commit**

  ```bash
  git add settings.html
  git commit -m "feat: split-bubble live preview rebuild"
  ```

---

## Spec-Coverage-Check

| Spec-Abschnitt | Abgedeckt in |
|---|---|
| 6 neue CONFIG-Parameter | Task 1 |
| 4 CSS Custom Properties in applyConfig() | Task 1 |
| CSS-Defaults in overlay.html `:root` | Task 1 |
| Split-Layout-CSS (.split-group, .name-bubble) | Task 2 |
| Avatar-in-message-body Flexbox | Task 2 |
| showMessage() Split-Rendering (3 Avatar-Positionen) | Task 3 |
| settings.html DEFAULTS + URL-Felder | Task 4 |
| Toggle + bedingter Einstellungsbereich | Task 4 |
| syncColor alpha für nameBubble | Task 4 |
| updateSplitVisibility (avatarPos nur wenn showAvatar) | Task 4 |
| Preview-CSS (.preview-name-bubble etc.) | Task 5 |
| rebuildPreviewStructure() | Task 5 |
| updatePreview() Split-Hintergrundfarben | Task 5 |
| Edge Case: splitBubble=false → avatarPos ignoriert | Task 3 (unified-Branch) |
| Edge Case: showAvatar=false + split | Task 3 + Task 4 (updateSplitVisibility) |
