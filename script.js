// --- CONFIGURATION CONSTANTS ---
const MAX_PASSWORD_LENGTH = 999;
const MAX_PASSWORDS = 999;
const MAX_SPECIFIC_WORD_LENGTH = 50;

// Factory defaults for when input fields are left blank
const FACTORY_DEFAULTS = {
    length: 14,
    punctuation: 2,
    digits: 2,
    capitals: 2,
    specific_word: "",
    num_passwords: 1
};

// --- USER-FRIENDLY ERROR MESSAGES ---
const ERROR_MESSAGES = {
    invalid_number: "Please enter a valid whole number.",
    negative_value: "Please enter 0 or higher.",
    exceeds_max: (max) => `Value is too large. Maximum allowed: ${max}.`,
    short_password: (min) => `Password length is too short. You need at least ${min} characters to meet the requirements.`,
    max_password_length: `Maximum password length is ${MAX_PASSWORD_LENGTH}.`,
    max_passwords: `Maximum number of passwords allowed is ${MAX_PASSWORDS}.`,
    no_password_selected: "Please select a password from the list to evaluate its strength."
};

// --- CHARACTER SETS ---
const AMBIGUOUS_CHARS = new Set("Il0O1o");
const DEFAULT_CHARSETS = {
    lower: 'abcdefghijklmnopqrstuvwxyz',
    upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    digits: '0123456789',
    punctuation: '!"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~',
    simple_punctuation: '!?.@',
};

// --- DOM ELEMENTS ---
const ui = {
    body: document.body,
    length: document.getElementById('length-input'),
    punctuation: document.getElementById('punctuation-input'),
    digits: document.getElementById('digits-input'),
    capitals: document.getElementById('capitals-input'),
    specificWord: document.getElementById('specific-word-input'),
    numPasswords: document.getElementById('num-passwords-input'),
    disambiguate: document.getElementById('disambiguate-check'),
    simplePunc: document.getElementById('simple-punc-check'),
    btnCreate: document.getElementById('btn-create'),
    btnClear: document.getElementById('btn-clear'), 
    btnEvaluate: document.getElementById('btn-evaluate'),
    btnCopySelected: document.getElementById('btn-copy-selected'),
    btnCopyAll: document.getElementById('btn-copy-all'),
    btnToggleTheme: document.getElementById('btn-toggle-theme'),
    btnShowInfo: document.getElementById('btn-show-info'),
    passwordsSelect: document.getElementById('passwords-select'),
    messageArea: document.getElementById('message-area'),
    infoModal: document.getElementById('info-modal'),
    infoText: document.getElementById('info-text'),
    closeButtons: document.querySelectorAll('.close-button, .modal-close-button')
};

// --- HELPER FUNCTIONS ---

function showMessage(message, type = 'error') {
    ui.messageArea.textContent = message;
    ui.messageArea.className = `message-area ${type}`;
    setTimeout(() => {
        ui.messageArea.classList.add('hidden');
    }, 5000);
}

function secureChoice(charSet) {
    const array = new Uint8Array(1);
    const charSetLength = charSet.length;
    const limit = 256 - (256 % charSetLength);
    let randValue;

    do {
        window.crypto.getRandomValues(array);
        randValue = array[0];
    } while (randValue >= limit);

    return charSet[randValue % charSetLength];
}

function secureShuffle(array) {
    const buffer = new Uint32Array(1);
    for (let i = array.length - 1; i > 0; i--) {
        window.crypto.getRandomValues(buffer);
        const j = Math.floor(buffer[0] / (0xffffffff + 1) * (i + 1));
        
        [array[i], array[j]] = [array[j], array[i]];
    }
}

/**
 * Parses raw text input into a validated integer, using FACTORY_DEFAULTS if empty.
 */
function getEntryValueFromText(rawText, key, maxValue) {
    const raw = rawText.trim();
    const defaultValue = FACTORY_DEFAULTS[key];

    // If field is empty, use the factory default value for generation
    if (raw === "") {
        return defaultValue;
    }
    
    if (!/^\d+$/.test(raw)) {
        throw new Error(ERROR_MESSAGES.invalid_number);
    }
    
    const value = parseInt(raw, 10);
    
    if (value < 0) {
        throw new Error(ERROR_MESSAGES.negative_value);
    }
    
    if (value > maxValue) {
        throw new Error(ERROR_MESSAGES.exceeds_max(maxValue));
    }
    
    return value;
}

function createRandomCharacters(count, charSet, disambiguate) {
    const result = [];
    while (result.length < count) {
        const char = secureChoice(charSet);
        if (disambiguate && AMBIGUOUS_CHARS.has(char)) {
            continue;
        }
        result.push(char);
    }
    return result;
}

function passwordCreation(length, numPunct, numDigits, numCapitals, specificWord, disambiguateChars, simpleChars) {
    const minLength = numPunct + numDigits + numCapitals + specificWord.length;
    const numLowercase = length - minLength;

    if (length > MAX_PASSWORD_LENGTH) {
        throw new Error(ERROR_MESSAGES.max_password_length);
    }
    if (length < minLength) {
        throw new Error(ERROR_MESSAGES.short_password(minLength));
    }

    const punctuationSet = simpleChars ? DEFAULT_CHARSETS.simple_punctuation : DEFAULT_CHARSETS.punctuation;

    const components = [
        [numLowercase, DEFAULT_CHARSETS.lower],
        [numCapitals, DEFAULT_CHARSETS.upper],
        [numDigits, DEFAULT_CHARSETS.digits],
        [numPunct, punctuationSet],
    ];

    let charList = [];
    for (const [count, charSet] of components) {
        charList.push(...createRandomCharacters(count, charSet, disambiguateChars));
    }

    secureShuffle(charList);
    
    const buffer = new Uint32Array(1);
    window.crypto.getRandomValues(buffer);
    const insertPos = Math.floor(buffer[0] / (0xffffffff + 1) * (charList.length + 1)); 

    return charList.slice(0, insertPos).join('') + 
           specificWord + 
           charList.slice(insertPos).join('');
}

function evaluateStrength(password) {
    if (!password) {
        return { entropy: 0, rating: "No password provided." };
    }

    const length = password.length;
    let charsetSize = 0;

    const hasLower = /[a-z]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasDigits = /[0-9]/.test(password);
    const hasSymbols = /[!"#$%&'()*+,-./:;<=>?@\[\\\]^_`{|}~]/.test(password); 

    if (hasLower) {
        charsetSize += DEFAULT_CHARSETS.lower.length;
    }
    if (hasUpper) {
        charsetSize += DEFAULT_CHARSETS.upper.length;
    }
    if (hasDigits) {
        charsetSize += DEFAULT_CHARSETS.digits.length;
    }
    if (hasSymbols) {
        charsetSize += DEFAULT_CHARSETS.punctuation.length;
    }

    if (charsetSize === 0) {
        return { entropy: 0, rating: "Low (No recognizable characters)." };
    }

    const entropy = length * Math.log2(charsetSize);

    let rating;
    if (entropy < 28) {
        rating = "Very Weak (Instantly crackable)";
    } else if (entropy < 36) {
        rating = "Weak (Crackable in minutes/hours)";
    } else if (entropy < 60) {
        rating = "Reasonable (Crackable in days/weeks)";
    } else if (entropy < 80) {
        rating = "Strong (Crackable in months/years)";
    } else {
        rating = "Very Strong (Crackable in decades/centuries)";
    }

    return { entropy: parseFloat(entropy.toFixed(2)), rating: rating };
}

// --- MAIN APPLICATION LOGIC ---

function toggleDarkMode() {
    ui.body.classList.toggle('dark-mode');
}

// Helper to check if inputs are completely blank/default
function areInputsBlank() {
    return ui.length.value.trim() === "" &&
           ui.punctuation.value.trim() === "" &&
           ui.digits.value.trim() === "" &&
           ui.capitals.value.trim() === "" &&
           ui.specificWord.value.trim() === "" &&
           ui.numPasswords.value.trim() === "" &&
           !ui.disambiguate.checked &&
           !ui.simplePunc.checked;
}

function resetFieldsHandler() {
    const inputsAreBlank = areInputsBlank();

    if (inputsAreBlank) {
        // State 2: Load defaults
        ui.length.value = FACTORY_DEFAULTS.length;
        ui.punctuation.value = FACTORY_DEFAULTS.punctuation;
        ui.digits.value = FACTORY_DEFAULTS.digits;
        ui.capitals.value = FACTORY_DEFAULTS.capitals;
        ui.specificWord.value = FACTORY_DEFAULTS.specific_word;
        ui.numPasswords.value = FACTORY_DEFAULTS.num_passwords;
        
        ui.disambiguate.checked = false;
        ui.simplePunc.checked = false;

        updatePasswordList([]);
        showMessage('Default settings loaded.', 'info');
    } else {
        // State 1: Clear all fields (set to blank)
        ui.length.value = ""; 
        ui.punctuation.value = "";
        ui.digits.value = "";
        ui.capitals.value = "";
        ui.specificWord.value = "";
        ui.numPasswords.value = "";

        // Reset checkboxes
        ui.disambiguate.checked = false;
        ui.simplePunc.checked = false;
        
        // Clear passwords list and messages
        updatePasswordList([]);
        showMessage('All fields and generated passwords cleared.', 'info');
    }
}

function showInfoHandler() {
    const infoContent = 
        "Default Values (Used for generation when input fields are left blank):\n" +
        `• Length: ${FACTORY_DEFAULTS.length}\n` +
        `• Capitals: ${FACTORY_DEFAULTS.capitals}\n` +
        `• Digits: ${FACTORY_DEFAULTS.digits}\n` +
        `• Punctuation: ${FACTORY_DEFAULTS.punctuation}\n` +
        `• Number of Passwords: ${FACTORY_DEFAULTS.num_passwords}\n` +
        "\n" +
        "Maximum Limits:\n" + 
        `• Max Password Length: ${MAX_PASSWORD_LENGTH}\n` +
        `• Max Number of Passwords: ${MAX_PASSWORDS}\n` +
        `• Max Specific Word Length: ${MAX_SPECIFIC_WORD_LENGTH}\n` +
        "\n" +
        "Field Explanations:\n" +
        "• Specific Word: Inserts the specified word or phrase randomly somewhere into the generated password.\n" +
        "• Evaluate Strength: Select a password and click to see an estimated strength score (in bits of entropy).\n" +
        "• Disambiguate: Avoids confusing characters (I, l, 1, 0, O, o).\n" +
        "• Simple Punctuation: Uses only ! ? . _ @ instead of the full set of symbols.\n" +
        "• Reset Fields: Clears all input values and checkboxes. If pressed again when fields are empty, it loads the default numbers and clears the password list."; 

    ui.infoText.textContent = infoContent;
    ui.infoModal.classList.remove('hidden');
}

function closeInfoModal() {
    ui.infoModal.classList.add('hidden');
}

function updatePasswordList(passwords) {
    ui.passwordsSelect.innerHTML = '';
    ui.btnEvaluate.disabled = true;
    ui.btnCopySelected.disabled = true;
    ui.btnCopyAll.disabled = true;

    if (passwords.length === 0) {
        return;
    }

    passwords.forEach(pwd => {
        const option = document.createElement('option');
        option.textContent = pwd;
        option.value = pwd;
        ui.passwordsSelect.appendChild(option);
    });

    ui.passwordsSelect.options[0].selected = true;

    ui.btnEvaluate.disabled = false;
    ui.btnCopySelected.disabled = false;
    ui.btnCopyAll.disabled = false;
}

function generatePasswordHandler() {
    try {
        const length = getEntryValueFromText(ui.length.value, 'length', MAX_PASSWORD_LENGTH);
        const punct = getEntryValueFromText(ui.punctuation.value, 'punctuation', MAX_PASSWORDS);
        const digits = getEntryValueFromText(ui.digits.value, 'digits', MAX_PASSWORDS);
        const caps = getEntryValueFromText(ui.capitals.value, 'capitals', MAX_PASSWORDS);
        const numPw = getEntryValueFromText(ui.numPasswords.value, 'num_passwords', MAX_PASSWORDS);
        let specificWord = ui.specificWord.value.trim();

        if (specificWord.length > MAX_SPECIFIC_WORD_LENGTH) {
            throw new Error(ERROR_MESSAGES.invalid_specific_word);
        }
        
        const minLen = punct + digits + caps + specificWord.length;
        if (length < minLen) {
            showMessage(ERROR_MESSAGES.short_password(minLen), 'warning');
            return;
        }

        const passwords = [];
        for (let i = 0; i < numPw; i++) {
            passwords.push(passwordCreation(
                length, punct, digits, caps, specificWord,
                ui.disambiguate.checked, ui.simplePunc.checked
            ));
        }
        
        updatePasswordList(passwords);
        ui.messageArea.classList.add('hidden');
        
    } catch (e) {
        updatePasswordList([]);
        showMessage(e.message, 'error');
    }
}

function evaluateSelectedPasswordHandler() {
    const selectedOptions = Array.from(ui.passwordsSelect.selectedOptions);
    if (selectedOptions.length === 0) {
        showMessage(ERROR_MESSAGES.no_password_selected, 'warning');
        return;
    }

    const password = selectedOptions[0].value;
    const { entropy, rating } = evaluateStrength(password);

    // Updated: Display strength in the message area (info type) and removed the password itself.
    const evaluationMessage = `STRENGTH: ${rating} (${entropy} bits)`;
    
    showMessage(evaluationMessage, 'info');
}

function copyToClipboardHandler(copySelected) {
    let textToCopy = '';
    
    if (copySelected) {
        const selectedOptions = Array.from(ui.passwordsSelect.selectedOptions);
        if (selectedOptions.length === 0) {
            showMessage("Please select one or more passwords to copy.", 'warning');
            return;
        }
        textToCopy = selectedOptions.map(opt => opt.value).join('\n');
        // NEW: Info message for copying selected
        navigator.clipboard.writeText(textToCopy).then(() => {
            showMessage('Selected password(s) copied to clipboard.', 'info');
        }).catch(err => {
            showMessage('Failed to copy text. Check browser permissions.', 'error');
        });
    } else {
        const allOptions = Array.from(ui.passwordsSelect.options);
        if (allOptions.length === 0) {
            showMessage("No password to copy.", 'warning');
            return;
        }
        textToCopy = allOptions.map(opt => opt.value).join('\n');
        // NEW: Info message for copying all
        navigator.clipboard.writeText(textToCopy).then(() => {
            showMessage('All passwords copied to clipboard.', 'info');
        }).catch(err => {
            showMessage('Failed to copy text. Check browser permissions.', 'error');
        });
    }

    
}

// --- EVENT LISTENERS ---
ui.btnCreate.addEventListener('click', generatePasswordHandler);
ui.btnClear.addEventListener('click', resetFieldsHandler); 
ui.btnEvaluate.addEventListener('click', evaluateSelectedPasswordHandler);
ui.btnToggleTheme.addEventListener('click', toggleDarkMode);
ui.btnShowInfo.addEventListener('click', showInfoHandler);

// Close modal on click/key
ui.closeButtons.forEach(btn => btn.addEventListener('click', closeInfoModal));
window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !ui.infoModal.classList.contains('hidden')) {
        closeInfoModal();
    }
});

// Update button state on selection change
ui.passwordsSelect.addEventListener('change', () => {
    const hasSelection = ui.passwordsSelect.selectedOptions.length > 0;
    ui.btnEvaluate.disabled = !hasSelection;
    ui.btnCopySelected.disabled = !hasSelection;
});

ui.btnCopySelected.addEventListener('click', () => copyToClipboardHandler(true));
ui.btnCopyAll.addEventListener('click', () => copyToClipboardHandler(false));

// Initialize in Dark Mode AND generate a password on load
document.addEventListener('DOMContentLoaded', () => {
    updatePasswordList([]);
    ui.body.classList.add('dark-mode');
    // FIX: Roll a password per default on page load
    generatePasswordHandler();
});