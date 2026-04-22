# Twitch Chat Overlay

Ein vollständig konfigurierbares Twitch-Chat-Overlay für OBS/Streamlabs.

## Features

- **Twitch-Emotes** – native Twitch-Emotes werden inline dargestellt
- **BetterTTV (BTTV)** – globale und Kanal-Emotes
- **7TV** – globale und Kanal-Emotes (WebP)
- **Nachrichten-Verzögerung** – Nachrichten erscheinen erst nach X Sekunden
- **Moderation** – gelöschte/gebannte Nachrichten werden entfernt (auch aus der Queue)
- **Badges** – Twitch-Badges via IVR.fi API (kein OAuth nötig)
- **Separate Schrift-Einstellungen** für Benutzernamen und Nachrichtentext (Familie, Größe, Schnitt)
- **Globale Namensfarbe** – optionale Überschreibung der individuellen Twitch-Farben
- **Bubble fit-content** – Nachrichten-Bubbles optional so breit wie der Inhalt
- **Animationen** – slide-left, slide-right, fade, pop oder keine
- **Vollständig einstellbar** via Settings-UI

## Einrichtung

### 1. Dateien ablegen
Alle drei Dateien in einen gemeinsamen Ordner legen:
```
twitch-overlay/
├── overlay.html    ← OBS Browser Source
├── settings.html   ← Konfiguration
└── chat.js         ← Logik
```

### 2. Konfigurieren
`settings.html` im Browser öffnen, alle Einstellungen vornehmen, die generierte URL kopieren.

### 3. OBS Browser Source
- OBS → Quellen → `+` → **Browserfenster/Browser**
- URL: die kopierte URL einfügen
- Breite/Höhe: je nach Stream-Auflösung (z.B. 1920×1080)
- **"OBS-eigene Audioquelle steuern"** deaktivieren

## Einstellungen (URL-Parameter)

| Parameter | Standard | Beschreibung |
|-----------|---------|--------------|
| `channel` | – | Twitch-Kanalname (Pflichtfeld) |
| `delay` | 5 | Verzögerung in Sekunden (0–30) |
| `maxMessages` | 20 | Max. angezeigte Nachrichten |
| `offsetX` | 0 | Horizontaler Versatz in px |
| `offsetY` | 0 | Vertikaler Abstand vom unteren Rand |
| `width` | 400 | Breite des Overlays in px |
| `messageGap` | 6 | Abstand zwischen Nachrichten in px |
| `cornerRadius` | 8 | Eckenradius der Nachrichten-Boxen |
| `fontSize` | 15 | Globale Fallback-Schriftgröße in px |
| `fontFamily` | Inter | Globale Fallback-CSS-Schriftfamilie |
| `nameFontFamily` | (fontFamily) | Schriftfamilie Benutzername |
| `nameFontSize` | 13 | Schriftgröße Benutzername in px |
| `nameFontWeight` | 700 | Schriftschnitt Benutzername (400 / 700 / 400italic / 700italic) |
| `msgFontFamily` | (fontFamily) | Schriftfamilie Nachrichtentext |
| `msgFontSize` | 15 | Schriftgröße Nachrichtentext in px |
| `msgFontWeight` | 400 | Schriftschnitt Nachrichtentext |
| `bgColor` | 00000080 | Hintergrund als RRGGBBAA (Hex) |
| `textColor` | ffffff | Textfarbe als RRGGBB (Hex) |
| `overrideNameColor` | false | Globale Namensfarbe aktivieren |
| `nameColor` | ffffff | Globale Namensfarbe als RRGGBB |
| `showAvatar` | true | Avatare anzeigen |
| `avatarSize` | 36 | Avatar-Größe in px |
| `showBadges` | true | Badges anzeigen |
| `bubbleFit` | false | Bubble-Breite = Inhalt (fit-content) |
| `nameShadow` | true | Glow-Effekt auf Benutzernamen |
| `animation` | slide | slide / slide-right / fade / pop / none |
| `bttv` | true | BTTV-Emotes laden |
| `sevenTv` | true | 7TV-Emotes laden |

## Technische Details

- **Verbindung**: Native WebSocket zu `wss://irc-ws.chat.twitch.tv` (anonym, kein OAuth nötig)
- **Emotes**: Werden beim Start gecacht (globale Emotes), Kanal-Emotes erfordern keine Auth
- **Moderation**: `CLEARMSG` (einzelne Nachricht) und `CLEARCHAT` (User-Timeout/Ban/Fullclear) werden vollständig verarbeitet
- **Automatische Wiederverbindung** nach 5 Sekunden bei Verbindungsabbruch
- Keine externen Abhängigkeiten / CDNs nötig für das Overlay selbst

## Hinweise

- BTTV/7TV Kanal-Emotes benötigen die Twitch-User-ID. Ohne OAuth werden nur globale Emotes geladen.
- Für vollständige Kanal-Emotes kann die Twitch-User-ID manuell als Parameter `channelId=XXXXXXXX` übergeben werden.
- **Kanal-Badges** (Sub-Badges, Custom-Badges): Globale Badges werden automatisch zur Laufzeit geladen. Kanal-spezifische Badges können *optional* mit `node fetch-badges.js <kanalname>` vorgeladen werden – das Overlay funktioniert ohne diesen Schritt.
- Das Overlay läuft komplett lokal – keine Daten werden an externe Server gesendet (außer den API-Requests für Emotes).
