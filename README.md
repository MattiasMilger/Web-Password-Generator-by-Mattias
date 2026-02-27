# Web Password Generator by Mattias

A browser-based password generator built with vanilla HTML, CSS, and JavaScript. Runs entirely client-side — no server or backend required. Designed for GitHub Pages.

## Try It Out

The live version is available at: **https://mattiasmilger.github.io/Web-Password-Generator-by-Mattias/**

### Run Locally

Open `index.html` in a modern browser. No build tools or dependencies required.

## Features

- **Custom Password Length** — Generate passwords up to 500 characters long.
- **Character Requirements** — Specify exact counts for punctuation, digits, capitals, and lowercase letters.
- **Batch Generation** — Create up to 500 passwords at once.
- **Word/Phrase Insertion** — Embed a custom word or phrase at a random position in each password.
- **Pronounceable Mode** — Alternating consonant-vowel patterns for easier memorization.
- **Disambiguate Mode** — Avoids confusing characters (I, l, 1, 0, O, o).
- **Simple Punctuation Mode** — Restricts punctuation to basic symbols (!, ?, ., _, @).
- **Password Strength Evaluator** — Entropy calculation, pattern detection, and detailed feedback.
- **Copy to Clipboard** — Copy selected or all generated passwords.
- **Dark / Light Theme** — Toggle between dark and light modes (dark by default).
- **Responsive Design** — Works on desktop and mobile devices.

## Project Structure

```
Web Password Generator by Mattias/
├── index.html              # Main HTML structure and form controls
├── style.css               # Styling, theming (CSS variables), responsive design
├── script.js               # Password generation logic, event handlers, input validation
├── password-strength.js    # Password strength analysis and scoring engine
└── README.md               # This file
```

### Module Responsibilities

| Module | Purpose |
|---|---|
| `script.js` | Password generation (regular + pronounceable), character shuffling, input validation, clipboard, theme toggle, UI control |
| `password-strength.js` | Entropy calculation, pattern detection (sequential, keyboard, temporal, leet-speak), strength scoring and feedback |

## How It Works

1. **Default settings** load on startup (length 14, 2 punctuation, 2 digits, 2 capitals, 1 password).
2. The user configures password requirements using the input fields and checkboxes.
3. Passwords are generated using the **Web Crypto API** (`crypto.getRandomValues()`) for cryptographically secure randomness.
4. In **regular mode**, character groups (lowercase, uppercase, digits, punctuation) are generated separately, then cryptographically shuffled.
5. In **pronounceable mode**, alternating consonant-vowel patterns are created, then digits and punctuation are inserted at random positions.
6. Optional **word/phrase insertion** places the text at a random position within each password.
7. The **strength evaluator** analyzes selected passwords for entropy, patterns, common words, keyboard sequences, and leet-speak variations, then gives a rating from Very Weak to Excellent.

## Technical Notes

- **No external dependencies** — pure vanilla HTML, CSS, and JavaScript.
- **Cryptographically secure** — Uses `window.crypto.getRandomValues()` with unbiased selection (no modulo bias).
- **Client-side only** — No data is transmitted to any server. Passwords exist only in the browser DOM.
- **Input validation** — Maximum limits enforced (500 chars, 500 quantity, 100 word length) with auto-correction.

## Browser Support

Works in all modern browsers (Chrome, Firefox, Edge, Safari). Requires JavaScript enabled.
