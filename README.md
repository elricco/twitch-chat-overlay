# Twitch Chat Overlay

Ein vollständig konfigurierbares Twitch-Chat-Overlay für OBS/Streamlabs.

## Features

- **Twitch-Emotes** – native Twitch-Emotes werden inline dargestellt
- **BetterTTV (BTTV)** – globale und Kanal-Emotes
- **7TV** – globale und Kanal-Emotes (WebP)
- **Nachrichten-Verzögerung** – Nachrichten erscheinen erst nach X Sekunden
- **Moderation** – gelöschte/gebannte Nachrichten werden entfernt (auch aus der Queue)
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
| `fontSize` | 15 | Schriftgröße in px |
| `fontFamily` | Inter | CSS-Schriftfamilie |
| `bgColor` | 00000080 | Hintergrund als RRGGBBAA (Hex) |
| `textColor` | ffffff | Textfarbe als RRGGBB (Hex) |
| `showAvatar` | true | Avatare anzeigen |
| `avatarSize` | 36 | Avatar-Größe in px |
| `showBadges` | true | Badges anzeigen |
| `nameShadow` | true | Glow-Effekt auf Benutzernamen |
| `animation` | slide | slide / fade / pop / none |
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
- Das Overlay läuft komplett lokal – keine Daten werden an externe Server gesendet (außer den API-Requests für Emotes).
