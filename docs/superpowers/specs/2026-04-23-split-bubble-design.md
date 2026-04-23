# Split Bubble – Design Spec
_2026-04-23_

## Übersicht

Ein neuer „Split-Modus" erlaubt es, Benutzername und Nachricht in zwei voneinander unabhängig gestaltbaren Bubbles darzustellen. Ist der Modus deaktiviert, bleibt alles exakt wie bisher (unified bubble). Sämtliche neuen Parameter werden wie alle anderen als URL-Query-Parameter übertragen und in `chat.js` gelesen.

---

## Neue CONFIG-Parameter

| Parameter | Typ | Default | Beschreibung |
|---|---|---|---|
| `splitBubble` | bool | `false` | Split-Modus an/aus |
| `nameBubbleColor` | hex8 | `'9b5de580'` | Hintergrundfarbe der Namens-Bubble (RGBA wie `bgColor`) |
| `nameBubbleRadius` | number | `8` | Corner Radius der Namens-Bubble in px |
| `nameBubbleOffsetX` | number | `0` | Horizontaler Versatz der Namens-Bubble in px (positiv = rechts) |
| `nameBubbleOffsetY` | number | `0` | Vertikaler Versatz der Namens-Bubble in px (negativ = Überlappung mit Msg-Bubble) |
| `avatarPos` | string | `'before'` | Avatar-Position im Split-Modus: `'before'` \| `'in-name'` \| `'in-message'` |

`avatarPos` wird nur ausgewertet, wenn `splitBubble = true`. Im unified Modus ist der Avatar immer vor der Bubble.

---

## HTML-Struktur

### Unified Modus (unverändert)
```html
<div class="msg-row">
  <img class="avatar">
  <div class="bubble">
    <div class="name-row"><!-- badges + name --></div>
    <div class="msg-text"><!-- nachricht --></div>
  </div>
</div>
```

### Split Modus
```html
<div class="msg-row split">

  <!-- avatarPos === 'before' -->
  <img class="avatar">

  <div class="split-group">

    <div class="name-bubble">
      <!-- avatarPos === 'in-name' -->
      <img class="avatar">
      <!-- badges + name (keine msg-text hier) -->
    </div>

    <div class="bubble">
      <!-- avatarPos === 'in-message' -->
      <img class="avatar">
      <div class="msg-text"><!-- nachricht --></div>
    </div>

  </div>
</div>
```

Es ist immer genau ein `<img class="avatar">` vorhanden (oder keines, wenn `showAvatar = false`).

---

## CSS / Custom Properties

`applyConfig()` in `chat.js` setzt vier neue Custom Properties:

```css
--name-bubble-bg:       rgba(...)    /* aus nameBubbleColor hex8 */
--name-bubble-radius:   8px
--name-bubble-offset-x: 0px
--name-bubble-offset-y: 0px
```

### Neue CSS-Regeln in `overlay.html`

```css
/* Split-Gruppe: stapelt Name- und Msg-Bubble vertikal */
.split-group {
  display: flex;
  flex-direction: column;
  gap: 0;          /* Abstand wird via margin-bottom der name-bubble gesteuert */
  flex: 1;
}

/* Namens-Bubble */
.name-bubble {
  display: inline-flex;      /* fit-content */
  align-items: center;
  gap: 6px;
  background: var(--name-bubble-bg);
  border-radius: var(--name-bubble-radius);
  padding: 5px 10px;
  margin-left: var(--name-bubble-offset-x);
  margin-bottom: var(--name-bubble-offset-y);  /* negativ = Überlappung */
  position: relative;        /* bleibt im Flow, z-index für Überlappung */
  z-index: 1;
}

/* Avatar in Namens-Bubble: kleineres, eingebettetes Format */
.name-bubble .avatar {
  width: calc(var(--avatar-size) * 0.75);
  height: calc(var(--avatar-size) * 0.75);
}

/* Msg-Bubble im Split bekommt keinen name-row mehr */
.msg-row.split .bubble .name-row {
  display: none;
}

/* Avatar in Msg-Bubble: neben dem Text */
.msg-row.split .bubble {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}
```

### z-index bei Überlappung
Wenn `nameBubbleOffsetY` negativ ist, schiebt sich die Namens-Bubble nach unten und überlappt den oberen Rand der Msg-Bubble. `z-index: 1` auf `.name-bubble` stellt sicher, dass sie vor der Msg-Bubble liegt.

---

## Settings UI

### Neuer Toggle (im Bubbles-Bereich)
```
[Toggle] Getrennte Bubbles  →  splitBubble
```

### Neuer Einstellungsbereich (nur sichtbar wenn splitBubble = true)
```
// Namens-Bubble
[Farbpicker + Hex-Input]  Hintergrundfarbe (Namens-Bubble)  →  nameBubbleColor
[Slider 0–24]              Corner Radius                      →  nameBubbleRadius
[Slider -20..+80]          Versatz X                          →  nameBubbleOffsetX
[Slider -20..+20]          Versatz Y  (negativ = Überlappung) →  nameBubbleOffsetY

// Avatar-Position  (nur wenn showAvatar = true)
[Select]  Vor beiden Bubbles / In Namens-Bubble / In Nachrichten-Bubble  →  avatarPos
```

Der Bereich wird per `display: none / ''` ein-/ausgeblendet, wenn `splitBubble` getoggelt wird.

### URL-Generierung
`splitBubble` → `boolFields`, alle anderen neuen Felder → `strFields` bzw. `numFields`.

---

## Preview (settings.html)

Die drei Preview-Nachrichten (`prev1`/`prev2`/`prev3`) sind aktuell statisches HTML. `updatePreview()` muss bei Aktivierung des Split-Modus die Preview-Bubbles dynamisch umbauen:

- `splitBubble = false`: aktuelles HTML (`name-row` + `msg-text` in einer Bubble)
- `splitBubble = true`: `.name-bubble` + `.bubble` (ohne `name-row`) als zwei separate Elemente, Avatar-Position je nach `avatarPos`

Einfachste Umsetzung: `updatePreview()` erzeugt den Innen-HTML der Preview-Nachrichten neu statt ihn statisch zu lassen. Die gleichen CSS Custom Properties aus `chat.js` können in den Preview-Elementen direkt als inline-styles gesetzt werden.

---

## Edge Cases

| Situation | Verhalten |
|---|---|
| `splitBubble=false` | `avatarPos` wird ignoriert, Avatar immer vor der unified Bubble |
| `showAvatar=false` + `splitBubble=true` | Kein Avatar-Element wird gerendert; Layout funktioniert normal |
| `bubbleFit=true` + `splitBubble=true` | Msg-Bubble bleibt `fit-content`; Namens-Bubble ist ohnehin immer `fit-content` |
| `alternating=true` + `splitBubble=true` | Alternating wechselt die Seite des `msg-row`; `nameBubbleOffsetX` wird nicht gespiegelt (kein Support, Verhalten bleibt nutzbar aber nicht optimiert) |
| `nameBubbleOffsetY` sehr negativ | Name-Bubble überlappt Msg-Bubble stark; kein Clipping, liegt im Ermessen des Nutzers |

---

## Nicht im Scope

- Animationen speziell für die Namens-Bubble (erbt die bestehenden `data-animation`-Animationen des `msg-row`)
- Separate Schriftart/Größe für die Namens-Bubble im Split-Modus (wird von den bestehenden `nameFontFamily`/`nameFontSize`-Settings gesteuert)
