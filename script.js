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
    short_password: (min) => `Password length has been increased to ${min} to meet the requirements.`,
    max_password_length: `Maximum password length is ${MAX_PASSWORD_LENGTH}.`,
    max_passwords: `Maximum number of passwords allowed is ${MAX_PASSWORDS}.`,
    no_password_selected: "Please select a password from the list to evaluate its strength.",
    
    // Keeping these generic errors in case non-blank, non-numeric values are entered.
    positive_length: "Password length must be a positive whole number.",
    positive_num_passwords: "Number of Passwords must be a positive whole number.",
    positive_combined: "Password length and number of passwords must be positive whole numbers.", 
    
    // NEW ERROR MESSAGE
    exceeds_min_requirement: "Meeting the requirements would exceed the password length limit.",
    
    // AUTO-CORRECTION MESSAGES
    auto_set_num: "Number of Passwords has been set to 1 to allow password generation.",
    auto_set_one: "Number of Passwords and Password Length have been set to 1.",
    
    // NEW: Message for auto-loading defaults
    auto_load_defaults: "All fields were blank. Loaded default settings to allow password generation."
};

// --- CHARACTER SETS ---
const AMBIGUOUS_CHARS = new Set("Il0O1o");
const DEFAULT_CHARSETS = {
    lower: 'abcdefghijklmnopqrstuvwxyz',
    upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    digits: '0123456789',
    punctuation: '!"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~',
    simple_punctuation: '!?._@',
    // NEW: Pronounceable password character sets
    consonants: 'bcdfghjklmnpqrstvwxyz',
    vowels: 'aeiou'
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
    pronounceable: document.getElementById('pronounceable-check'),
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
    
    // Clear any existing timeout
    if (ui.messageArea.timeoutId) {
        clearTimeout(ui.messageArea.timeoutId);
    }
    
    // Only set timeout for non-evaluation messages
    if (!type.startsWith('evaluation-')) {
        ui.messageArea.timeoutId = setTimeout(() => {
            ui.messageArea.classList.add('hidden');
        }, 5000);
    }
    // Evaluation messages stay until something else is shown
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

// NEW: Generate pronounceable password base
function createPronounceableBase(length) {
    const result = [];
    let useConsonant = Math.random() > 0.5; // Randomly start with consonant or vowel
    
    while (result.length < length) {
        if (useConsonant) {
            result.push(secureChoice(DEFAULT_CHARSETS.consonants));
        } else {
            result.push(secureChoice(DEFAULT_CHARSETS.vowels));
        }
        useConsonant = !useConsonant; // Alternate
    }
    
    return result;
}

function passwordCreation(length, numPunct, numDigits, numCapitals, specificWord, disambiguateChars, simpleChars, pronounceable) {
    const minLength = numPunct + numDigits + numCapitals + specificWord.length;
    const numLowercase = length - minLength;

    if (length > MAX_PASSWORD_LENGTH) {
        throw new Error(ERROR_MESSAGES.max_password_length);
    }
    
    const punctuationSet = simpleChars ? DEFAULT_CHARSETS.simple_punctuation : DEFAULT_CHARSETS.punctuation;

    let charList = [];
    
    // NEW: Pronounceable mode generates alternating consonant-vowel pattern
    if (pronounceable) {
        charList = createPronounceableBase(numLowercase);
        
        // Add required capitals by capitalizing some letters
        for (let i = 0; i < numCapitals && i < charList.length; i++) {
            const buffer = new Uint32Array(1);
            window.crypto.getRandomValues(buffer);
            const randomIndex = Math.floor(buffer[0] / (0xffffffff + 1) * charList.length);
            charList[randomIndex] = charList[randomIndex].toUpperCase();
        }
        
        // Add digits
        charList.push(...createRandomCharacters(numDigits, DEFAULT_CHARSETS.digits, false));
        
        // Add punctuation
        charList.push(...createRandomCharacters(numPunct, punctuationSet, false));
        
        // Shuffle only the special characters (digits and punctuation) to distribute them
        const specialChars = charList.splice(numLowercase);
        secureShuffle(specialChars);
        
        // Insert special characters at random positions
        specialChars.forEach(char => {
            const buffer = new Uint32Array(1);
            window.crypto.getRandomValues(buffer);
            const insertPos = Math.floor(buffer[0] / (0xffffffff + 1) * (charList.length + 1));
            charList.splice(insertPos, 0, char);
        });
        
    } else {
        // Original random generation
        const components = [
            [numLowercase, DEFAULT_CHARSETS.lower],
            [numCapitals, DEFAULT_CHARSETS.upper],
            [numDigits, DEFAULT_CHARSETS.digits],
            [numPunct, punctuationSet],
        ];

        for (const [count, charSet] of components) {
            charList.push(...createRandomCharacters(count, charSet, disambiguateChars));
        }

        secureShuffle(charList);
    }
    
    // Insert specific word at random position
    const buffer = new Uint32Array(1);
    window.crypto.getRandomValues(buffer);
    const insertPos = Math.floor(buffer[0] / (0xffffffff + 1) * (charList.length + 1)); 

    return charList.slice(0, insertPos).join('') + 
           specificWord + 
           charList.slice(insertPos).join('');
}

// --- MAIN APPLICATION LOGIC ---

function toggleDarkMode() {
    ui.body.classList.toggle('dark-mode');
}

// Helper to check if inputs are completely blank/default
function areInputsBlank() {
    // Check all text/number inputs. Ignoring checkboxes as they control behavior.
    const allNumericInputsAreBlank = ui.length.value.trim() === "" || ui.length.value.trim() === "0" &&
                                     ui.punctuation.value.trim() === "" || ui.punctuation.value.trim() === "0" &&
                                     ui.digits.value.trim() === "" || ui.digits.value.trim() === "0" &&
                                     ui.capitals.value.trim() === "" || ui.capitals.value.trim() === "0" &&
                                     ui.numPasswords.value.trim() === "" || ui.numPasswords.value.trim() === "0";
                                     
    // Specific word can be non-empty, but we want to know if numeric fields are blank/zero
    return allNumericInputsAreBlank && ui.specificWord.value.trim() === "";
}

// NEW: Helper function to load factory defaults
function loadFactoryDefaults() {
    ui.length.value = FACTORY_DEFAULTS.length;
    ui.punctuation.value = FACTORY_DEFAULTS.punctuation;
    ui.digits.value = FACTORY_DEFAULTS.digits;
    ui.capitals.value = FACTORY_DEFAULTS.capitals;
    ui.specificWord.value = FACTORY_DEFAULTS.specific_word;
    ui.numPasswords.value = FACTORY_DEFAULTS.num_passwords;
}


function resetFieldsHandler() {
    const inputsAreBlank = areInputsBlank();

    if (inputsAreBlank) {
        // State 2: Load defaults
        loadFactoryDefaults(); // Use helper function
        
        // Checkboxes are intentionally NOT reset here.
        updatePasswordList([]);
        ui.messageArea.classList.add('hidden'); // Clear any visible message
        showMessage('Default settings loaded.', 'info');
    } else {
        // State 1: Clear all fields (set to blank)
        ui.length.value = ""; 
        ui.punctuation.value = "";
        ui.digits.value = "";
        ui.capitals.value = "";
        ui.specificWord.value = "";
        ui.numPasswords.value = "";

        // Checkboxes are intentionally NOT reset here.
        
        // Clear passwords list and messages
        updatePasswordList([]);
        ui.messageArea.classList.add('hidden'); // Clear any visible message
        showMessage('All fields and generated passwords cleared.', 'info');
    }
}

function showInfoHandler() {
    const infoContent = `
<h3>Maximum Limits</h3>

<div class="info-section">
    <ul class="info-list">
        <li>Password Length: ${MAX_PASSWORD_LENGTH}</li>
        <li>Number of Passwords: ${MAX_PASSWORDS}</li>
        <li>Specific Word Length: ${MAX_SPECIFIC_WORD_LENGTH}</li>
    </ul>
</div>

<h3>Features</h3>

<div class="info-section">
    <strong>Reset Fields</strong>
    <p>Clears all input values. Press again to load default settings. Does not include checkboxes.</p>
</div>

<div class="info-section">
    <strong>Auto-Default Loading (NEW)</strong>
    <p>If you press **Create Password(s)** when all primary fields are empty/zero, the factory defaults will automatically load and generate passwords.</p>
</div>

<div class="info-section">
    <strong>Specific Word</strong>
    <p>Inserts your chosen word or phrase randomly into the password(s).</p>
</div>

<div class="info-section">
    <strong>Password Length</strong>
    <p>If set too short, it will automatically increase to meet your requirements.</p>
</div>

<div class="info-section">
    <strong>Disambiguate</strong>
    <p>Avoids confusing characters like I, l, 1, 0, O, o that look similar.</p>
</div>

<div class="info-section">
    <strong>Simple Punctuation</strong>
    <p>Uses only basic symbols: ! ? . _ @</p>
</div>

<div class="info-section">
    <strong>Pronounceable Mode</strong>
    <p>Creates passwords using alternating consonants and vowels, making them easier to remember and type while maintaining security (e.g., "Ta2ko!Liv4").</p>
</div>

<div class="info-section">
    <strong>Evaluate Password</strong>
    <p>Analyzes password strength using advanced detection for patterns, common words, keyboard sequences, dates, and more. Shows detailed feedback on vulnerabilities and strengths.</p>
</div>
`;

    ui.infoText.innerHTML = infoContent;
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
    
    // Message is intentionally NOT hidden here to allow the warning to persist.
}

function generatePasswordHandler(showSuccessMessage = true) {
    try {
        let specificWord = ui.specificWord.value.trim();
        if (specificWord.length > MAX_SPECIFIC_WORD_LENGTH) {
            throw new Error(`Specific word length exceeds maximum of ${MAX_SPECIFIC_WORD_LENGTH}.`);
        }
        
        let requiresCorrection = false;
        let correctionMessage = "";

        // NEW: Check if all fields are blank/zero and auto-load defaults
        const inputsAreBlankOrZero = (
            ui.length.value.trim() === "" || ui.length.value.trim() === "0"
        ) && (
            ui.punctuation.value.trim() === "" || ui.punctuation.value.trim() === "0"
        ) && (
            ui.digits.value.trim() === "" || ui.digits.value.trim() === "0"
        ) && (
            ui.capitals.value.trim() === "" || ui.capitals.value.trim() === "0"
        ) && (
            ui.specificWord.value.trim() === ""
        ) && (
            ui.numPasswords.value.trim() === "" || ui.numPasswords.value.trim() === "0"
        );
        
        if (inputsAreBlankOrZero) {
            loadFactoryDefaults(); // Load defaults
            requiresCorrection = true;
            correctionMessage = ERROR_MESSAGES.auto_load_defaults;
            // Re-read specificWord after loading defaults
            specificWord = ui.specificWord.value.trim();
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
        
        // Re-check invalid state *after* the auto-default-load has run, if it did.
        const isLengthInvalid = lengthRaw === "" || lengthRaw === "0";
        const isNumPwInvalid = numPwRaw === "" || numPwRaw === "0";
        
        // --- AUTO-CORRECTION LOGIC (runs *only* if not handled by auto-default-load) ---

        // A. CORRECT 'Number of Passwords' (numPw) - only if not handled by auto-default-load
        if (isNumPwInvalid) {
            numPw = 1;
            ui.numPasswords.value = 1; // Update UI
            if (!inputsAreBlankOrZero) {
                requiresCorrection = true;
                correctionMessage = ERROR_MESSAGES.auto_set_num;
            }
        } else {
            // If not invalid, parse it.
            numPw = getEntryValueFromText(numPwRaw, 'num_passwords', MAX_PASSWORDS);
        }
        
        // B. CORRECT 'Password Length' (length) - only if not handled by auto-default-load
        if (isLengthInvalid) {
            if (!inputsAreBlankOrZero) {
                requiresCorrection = true;

                if (minLen > 0) {
                    // Case 1: Length is blank/zero, but requirements exist.
                    length = minLen;
                    ui.length.value = minLen; // Update UI
                    
                    // Prioritize the length correction message
                    correctionMessage = ERROR_MESSAGES.short_password(minLen); 

                } else {
                    // Case 2: Length is blank/zero, AND no requirements. Set to 1.
                    length = 1;
                    ui.length.value = 1; // Update UI
                    
                    if (isNumPwInvalid) {
                        // Case 2a: Both length and numPw were invalid. Show combined message.
                        correctionMessage = ERROR_MESSAGES.auto_set_one;
                    } else {
                        // Case 2b: Only length was invalid. 
                        correctionMessage = ERROR_MESSAGES.short_password(1);
                    }
                }
            } else {
                // If auto-default-load ran, length and numPw are already set to defaults (14 and 1)
                length = getEntryValueFromText(ui.length.value, 'length', MAX_PASSWORD_LENGTH);
            }
        } else {
            // If not invalid, parse it.
            length = getEntryValueFromText(lengthRaw, 'length', MAX_PASSWORD_LENGTH);

            // Case 3: Length is valid, but too short compared to requirements.
            if (length < minLen) {
                length = minLen;
                ui.length.value = minLen; // Update UI
                if (!inputsAreBlankOrZero) {
                    requiresCorrection = true;
                    
                    // Prioritize the length correction message
                    correctionMessage = ERROR_MESSAGES.short_password(minLen);
                }
            }
        }
        
        // C. DISPLAY CORRECTION MESSAGE AND DISABLE SUCCESS MESSAGE
        if (requiresCorrection) {
             showMessage(correctionMessage, 'warning');
             showSuccessMessage = false; // Prevent success message from overwriting warning
        }
        
        // Ensure length and numPw are correctly set for generation after all logic
        if (inputsAreBlankOrZero) {
            length = FACTORY_DEFAULTS.length;
            numPw = FACTORY_DEFAULTS.num_passwords;
        }

        // --- PASSWORD GENERATION ---
        
        const passwords = [];
        for (let i = 0; i < numPw; i++) {
            passwords.push(passwordCreation(
                length, punct, digits, caps, specificWord,
                ui.disambiguate.checked, ui.simplePunc.checked, ui.pronounceable.checked
            ));
        }
        
        updatePasswordList(passwords);
        
        // Show success message (only if showSuccessMessage is still true, meaning no auto-correction occurred)
        if (showSuccessMessage) {
            const passwordText = numPw === 1 ? 'password' : 'passwords';
            showMessage(`Generated ${numPw} ${passwordText} successfully`, 'success');
        }
        
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
    
    // Use the advanced evaluator from password-strength.js
    const result = evaluatePasswordStrength(password);
    const evaluationMessage = formatEvaluationMessage(result);
    
    // Determine message type based on strength - use 'evaluation' type for longer display
    let messageType = 'evaluation';
    if (result.strength === 'excellent' || result.strength === 'very-strong') {
        messageType = 'evaluation-success';
    } else if (result.strength === 'strong' || result.strength === 'moderate') {
        messageType = 'evaluation-info';
    } else if (result.strength === 'weak') {
        messageType = 'evaluation-warning';
    } else {
        messageType = 'evaluation-error';
    }
    
    showMessage(evaluationMessage, messageType);
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

// NEW: Handler for Enter key press
function handleEnterKey(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        generatePasswordHandler();
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
        input.addEventListener('keydown', handleEnterKey);
    });
    
    // Add Enter key support to text input as well
    ui.specificWord.addEventListener('keydown', handleEnterKey);
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
    // Roll a password per default on page load (without showing success message)
    generatePasswordHandler(false);
});