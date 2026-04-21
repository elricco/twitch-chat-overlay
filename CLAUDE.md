# Twitch Chat Overlay – CLAUDE.md

## Projektübersicht

OBS/Streamlabs-kompatibles Twitch-Chat-Overlay als reine Browser-Source. Keine Build-Pipeline, keine Abhängigkeiten – drei Dateien, die direkt im Browser laufen.

```
overlay.html    ← OBS Browser Source (Haupt-Einstiegspunkt)
chat.js         ← Gesamte Logik (IRC, Emotes, Rendering, Queue)
settings.html   ← Konfigurations-UI, generiert eine URL mit Query-Parametern
```

## Architektur

- **Verbindung**: Native WebSocket → `wss://irc-ws.chat.twitch.tv:443` (anonym via `justinfan*`-Nick, kein OAuth)
- **Konfiguration**: Ausschließlich über URL-Query-Parameter; `CONFIG`-Objekt in `chat.js` liest diese beim Start
- **CSS**: Alle Design-Werte werden als CSS Custom Properties auf `:root` gesetzt (`applyConfig()`)
- **Delay-Queue**: Nachrichten warten `CONFIG.delay` Sekunden vor dem Rendern; erlaubt nachträgliche Moderation
- **Moderation**: `CLEARMSG` / `CLEARCHAT` entfernen Nachrichten aus Queue **und** DOM

## Externe APIs (kein OAuth)

| Dienst | Zweck | Endpunkt |
|--------|-------|----------|
| IVR.fi v2 | Avatar-URLs | `https://api.ivr.fi/v2/twitch/user?login={name}` |
| BTTV | Globale + Kanal-Emotes | `https://api.betterttv.net/3/cached/...` |
| 7TV | Globale + Kanal-Emotes | `https://7tv.io/v3/...` |
| Twitch CDN | Emote-Bilder, Fallback-Avatar | `static-cdn.jtvnw.net` |

Kanal-spezifische BTTV/7TV-Emotes benötigen die Twitch-User-ID; ohne OAuth werden nur globale Emotes geladen (oder `channelId=` als URL-Parameter übergeben).

## Wichtige Implementierungsdetails

- `unavatar.io` wird **nicht** verwendet – in OBS-Browser-Sources unzuverlässig; stattdessen IVR.fi
- Avatar-`<img>`-Elemente haben immer ein `onerror`-Fallback auf den Twitch-Standard-Avatar
- Badges werden aus dem IRC-Tag `badges=` geparsed; `BADGE_INFO` wird momentan nicht dynamisch befüllt (Badges zeigen nur, wenn der API-Response Bild-URLs liefert)
- Animationen (`slide`/`fade`/`pop`/`none`) werden über `data-animation`-Attribut am Container gesteuert, CSS macht die Arbeit

## Bekannte Einschränkungen

- Twitch-User-ID ist ohne OAuth nicht auflösbar → Kanal-Emotes nur mit manuellem `channelId=`-Parameter
- Badge-Bilder fehlen (BADGE_INFO wird nicht per API befüllt) – hier wäre ein unauthentifizierter Badges-Endpunkt nötig
