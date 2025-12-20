// --- CONFIGURATION CONSTANTS ---
const MAX_PASSWORD_LENGTH = 500;
const MAX_PASSWORDS = 500;
const MAX_SPECIFIC_WORD_LENGTH = 100;

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
    no_password_selected: "Please select a password from the list to evaluate its strength.",
    
    // UPDATED ERROR MESSAGES (for blank or 0)
    positive_length: "Password length must be a positive whole number.",
    positive_num_passwords: "Number of Passwords must be a positive whole number.",
    positive_combined: "Password length and number of passwords must be positive whole numbers.", 
    
    // NEW ERROR MESSAGE
    exceeds_min_requirement: "Meeting the requirements would exceed the password length limit.",
    
    // NEW MESSAGE ADDED HERE
    all_fields_empty: "Please add entries to the fields."
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

// Input Restriction function for numeric fields (prevents '.', 'e', etc.)
function restrictInput(event) {
    const key = event.key;
    
    // Allow navigation and control keys (e.g., Backspace, Delete, Tab, Arrows, Ctrl+A/C/V)
    if (event.ctrlKey || event.altKey || event.metaKey || 
        ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(key)) {
        return;
    }

    // Explicitly block characters that can be typed in a type="number" field but are not integers: 
    // '.', 'e', 'E', ',', '+', '-'
    if (['.', 'e', 'E', ',', '+', '-'].includes(key)) {
        event.preventDefault();
    }
}

/**
 * Parses raw text input into a validated non-negative integer. 
 * For auxiliary fields (punct, digits, caps), blank returns 0.
 * For primary fields (length, num_passwords), blank/zero validation is handled by the caller.
 */
function getEntryValueFromText(rawText, key, maxValue) {
    const raw = rawText.trim();

    // Auxiliary fields: treat blank as 0.
    if (raw === "") {
        if (['punctuation', 'digits', 'capitals'].includes(key)) {
            return 0;
        }
        // For 'length' and 'num_passwords', the caller handles the blank string.
    }

    // Must be a non-negative whole number (this implicitly catches blank for primary fields if the caller didn't)
    if (!/^\d+$/.test(raw)) {
        throw new Error(ERROR_MESSAGES.invalid_number);
    }
    
    const value = parseInt(raw, 10);
    
    // Check for negative values
    if (value < 0) {
        throw new Error(ERROR_MESSAGES.negative_value);
    }
    
    // Check maximum bounds
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
    // Check all text/number inputs. Ignoring checkboxes as they control behavior.
    return ui.length.value.trim() === "" &&
           ui.punctuation.value.trim() === "" &&
           ui.digits.value.trim() === "" &&
           ui.capitals.value.trim() === "" &&
           ui.specificWord.value.trim() === "" &&
           ui.numPasswords.value.trim() === "";
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
        "•  Reset Fields: Clears all input values. If pressed again, it loads the default values.\n" +
        "• Specific Word: Inserts the specified word or phrase randomly somewhere into the generated password(s)."+
        "\n" +
        "Maximum Limits:\n" + 
        `• Max Password Length: ${MAX_PASSWORD_LENGTH}\n` +
        `• Max Number of Passwords: ${MAX_PASSWORDS}\n` +
        `• Max Specific Word Length: ${MAX_SPECIFIC_WORD_LENGTH}\n`

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
        // NEW CODE: Check if all fields are blank
        if (areInputsBlank()) {
             throw new Error(ERROR_MESSAGES.all_fields_empty);
        }
        
        let specificWord = ui.specificWord.value.trim();

        if (specificWord.length > MAX_SPECIFIC_WORD_LENGTH) {
            throw new Error(`Specific word length exceeds maximum of ${MAX_SPECIFIC_WORD_LENGTH}.`);
        }
        
        // 1. Get auxiliary inputs and calculate minLen early
        const punct = getEntryValueFromText(ui.punctuation.value, 'punctuation', MAX_PASSWORDS);
        const digits = getEntryValueFromText(ui.digits.value, 'digits', MAX_PASSWORDS);
        const caps = getEntryValueFromText(ui.capitals.value, 'capitals', MAX_PASSWORDS);
        
        const minLen = punct + digits + caps + specificWord.length;

        // Check if requirements exceed max allowed length
        if (minLen > MAX_PASSWORD_LENGTH) {
            showMessage(ERROR_MESSAGES.exceeds_min_requirement, 'error');
            return;
        }

        // 2. Get Raw Inputs
        const lengthRaw = ui.length.value.trim();
        const numPwRaw = ui.numPasswords.value.trim();
        let length, numPw;
        
        const isLengthInvalid = lengthRaw === "" || lengthRaw === "0";
        const isNumPwInvalid = numPwRaw === "" || numPwRaw === "0";

        // Number of Passwords Validation (Must be positive)
        if (isNumPwInvalid) {
            // Note: The original 'positive_combined' error is implicitly covered here if numPw is 0/blank.
            throw new Error(ERROR_MESSAGES.positive_num_passwords);
        }
        numPw = getEntryValueFromText(numPwRaw, 'num_passwords', MAX_PASSWORDS);

        // --- PASSWORD LENGTH VALIDATION/AUTO-CORRECTION (Unified Logic) ---
        let currentLength;

        if (isLengthInvalid) {
            if (minLen > 0) {
                // Case A: Length is blank/zero, but requirements exist.
                // Auto-correct to minLen, show warning, and stop execution.
                ui.length.value = minLen; 
                showMessage(ERROR_MESSAGES.short_password(minLen), 'warning');
                return; 
            } else {
                // Case B: Length is blank/zero, and no requirements exist.
                // This must be a hard error (Password length must be positive).
                throw new Error(ERROR_MESSAGES.positive_length);
            }
        } else {
            // Case C: Length is not blank/zero, parse it.
            currentLength = getEntryValueFromText(lengthRaw, 'length', MAX_PASSWORD_LENGTH);
            
            // Check if valid, but too short
            if (currentLength < minLen) {
                // Case D: Length is too short compared to requirements.
                // Auto-correct to minLen, show warning, and stop execution.
                ui.length.value = minLen; 
                showMessage(ERROR_MESSAGES.short_password(minLen), 'warning');
                return; 
            }
            
            // If we reach here, length is valid and meets/exceeds requirements.
            length = currentLength;
        }

        // --- PASSWORD GENERATION ---
        
        const passwords = [];
        for (let i = 0; i < numPw; i++) {
            passwords.push(passwordCreation(
                length, punct, digits, caps, specificWord,
                ui.disambiguate.checked, ui.simplePunc.checked
            ));
        }
        
        updatePasswordList(passwords);
        // Hide message area if generation was successful
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

// Function to attach keyboard restriction listeners
function addInputRestrictions() {
    [ui.length, ui.punctuation, ui.digits, ui.capitals, ui.numPasswords].forEach(input => {
        input.addEventListener('keydown', restrictInput);
    });
}
addInputRestrictions();

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
    // Roll a password per default on page load
    generatePasswordHandler();
});