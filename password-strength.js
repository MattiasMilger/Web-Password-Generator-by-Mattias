/**
 * Advanced Password Strength Evaluator
 * Analyzes passwords for various weaknesses including:
 * - Common patterns and sequences
 * - Dictionary words and common passwords
 * - Repeated characters and patterns
 * - Keyboard patterns
 * - Character distribution
 * - Temporal patterns (years, dates)
 */

// Generate sequential patterns dynamically
function generateSequentialPatterns() {
    const patterns = [];
    
    // Alphabetic sequences (forward and backward)
    for (let i = 0; i < 24; i++) {
        const start = String.fromCharCode(97 + i); // 'a' = 97
        const seq = start + String.fromCharCode(98 + i) + String.fromCharCode(99 + i);
        patterns.push(seq);
        patterns.push(seq.split('').reverse().join('')); // reversed
    }
    
    // Numeric sequences (forward and backward)
    for (let i = 0; i <= 7; i++) {
        patterns.push(`${i}${i+1}${i+2}`);
        patterns.push(`${i+2}${i+1}${i}`);
    }
    
    return patterns;
}

// Generate keyboard patterns for common layouts
function generateKeyboardPatterns() {
    const layouts = {
        qwerty: [
            ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'],
            ['1234567890']
        ],
        qwertz: [
            ['qwertzuiop', 'asdfghjkl', 'yxcvbnm']
        ],
        azerty: [
            ['azertyuiop', 'qsdfghjklm', 'wxcvbn']
        ]
    };
    
    const patterns = [];
    
    // Generate patterns from each layout
    for (const layout of Object.values(layouts)) {
        for (const row of layout) {
            for (const line of row) {
                // Generate all substrings of length 4-6
                for (let len = 4; len <= 6; len++) {
                    for (let i = 0; i <= line.length - len; i++) {
                        const pattern = line.substring(i, i + len);
                        patterns.push(pattern);
                        patterns.push(pattern.split('').reverse().join(''));
                    }
                }
            }
        }
    }
    
    // Add diagonal and column patterns
    const diagonals = [
        'qazwsx', 'edcrfv', 'tgbyhn', 'ujmik',
        'wsxedc', 'rfvtgb', 'yhnujm',
        'qweasd', 'asdzxc', 'zxccvb'
    ];
    
    patterns.push(...diagonals);
    
    return [...new Set(patterns)]; // Remove duplicates
}

// Generate year patterns dynamically based on current date
function generateYearPatterns() {
    const currentYear = new Date().getFullYear();
    const years = [];
    
    // Recent years (last 10 years)
    for (let i = 0; i <= 10; i++) {
        years.push(String(currentYear - i));
    }
    
    // Common birth year range (people aged 18-80)
    const oldestYear = currentYear - 80;
    const youngestYear = currentYear - 18;
    
    for (let year = youngestYear; year >= oldestYear; year--) {
        years.push(String(year));
    }
    
    // Future years (next 5 years - people often use future dates)
    for (let i = 1; i <= 5; i++) {
        years.push(String(currentYear + i));
    }
    
    // Also add 2-digit year formats for recent years
    for (let i = 0; i <= 30; i++) {
        const year = currentYear - i;
        years.push(String(year).slice(-2));
    }
    
    return [...new Set(years)]; // Remove duplicates
}

// Detect date patterns (MM/DD/YYYY, DD-MM-YYYY, etc.)
function detectDatePatterns(password) {
    const datePatterns = [
        // Various date formats
        /\b(0?[1-9]|1[0-2])[\/\-\.](0?[1-9]|[12][0-9]|3[01])[\/\-\.](\d{2,4})\b/,  // MM/DD/YYYY
        /\b(0?[1-9]|[12][0-9]|3[01])[\/\-\.](0?[1-9]|1[0-2])[\/\-\.](\d{2,4})\b/,  // DD/MM/YYYY
        /\b(\d{4})[\/\-\.](0?[1-9]|1[0-2])[\/\-\.](0?[1-9]|[12][0-9]|3[01])\b/,    // YYYY/MM/DD
        /\b(0?[1-9]|1[0-2])(0?[1-9]|[12][0-9]|3[01])(\d{2,4})\b/,                  // MMDDYYYY
        /\b(\d{2,4})(0?[1-9]|1[0-2])(0?[1-9]|[12][0-9]|3[01])\b/                   // YYYYMMDD
    ];
    
    for (const pattern of datePatterns) {
        if (pattern.test(password)) {
            return true;
        }
    }
    return false;
}

// Common password patterns (these are timeless)
const COMMON_WORDS = [
    'password', 'pass', 'admin', 'user', 'login', 'welcome',
    'letmein', 'monkey', 'dragon', 'master', 'sunshine',
    'princess', 'qwerty', 'abc', 'iloveyou', 'root', 
    'test', 'guest', 'hello', 'access', 'secret',
    'trustno', 'baseball', 'football', 'batman', 'superman',
    'shadow', 'michael', 'jennifer', 'computer', 'internet'
];

// Initialize patterns (cached for performance)
let SEQUENTIAL_PATTERNS = null;
let KEYBOARD_PATTERNS = null;
let YEAR_PATTERNS = null;

function initializePatterns() {
    if (!SEQUENTIAL_PATTERNS) {
        SEQUENTIAL_PATTERNS = generateSequentialPatterns();
    }
    if (!KEYBOARD_PATTERNS) {
        KEYBOARD_PATTERNS = generateKeyboardPatterns();
    }
    if (!YEAR_PATTERNS) {
        YEAR_PATTERNS = generateYearPatterns();
    }
}

/**
 * Main password evaluation function
 * @param {string} password - The password to evaluate
 * @returns {Object} Detailed strength analysis
 */
function evaluatePasswordStrength(password) {
    if (!password) {
        return {
            score: 0,
            entropy: 0,
            rating: "No password provided",
            details: [],
            strength: "none"
        };
    }

    // Initialize patterns if needed
    initializePatterns();

    const length = password.length;
    const details = [];
    let penalties = 0;
    let bonuses = 0;

    // 1. Calculate base entropy
    const charsetSize = calculateCharsetSize(password);
    let entropy = length * Math.log2(charsetSize);

    // 2. Check for patterns and weaknesses
    const patternPenalty = checkPatterns(password, details);
    penalties += patternPenalty;

    // 3. Check for repeated characters
    const repeatPenalty = checkRepeatedChars(password, details);
    penalties += repeatPenalty;

    // 4. Check character distribution
    const distributionBonus = checkCharDistribution(password, details);
    bonuses += distributionBonus;

    // 5. Check length bonus
    if (length >= 16) {
        bonuses += 10;
        details.push({ type: 'bonus', message: 'Excellent length (16+ characters)' });
    } else if (length >= 12) {
        bonuses += 5;
        details.push({ type: 'bonus', message: 'Good length (12+ characters)' });
    }

    // 6. Check for common substitutions (l33t speak)
    const leetPenalty = checkLeetSpeak(password, details);
    penalties += leetPenalty;

    // 7. Check for keyboard patterns
    const keyboardPenalty = checkKeyboardPatterns(password, details);
    penalties += keyboardPenalty;

    // 8. Check entropy concentration
    const concentrationPenalty = checkEntropyConcentration(password, details);
    penalties += concentrationPenalty;

    // 9. Check for temporal patterns (years, dates)
    const temporalPenalty = checkTemporalPatterns(password, details);
    penalties += temporalPenalty;

    // 10. Check for numeric patterns
    const numericPenalty = checkNumericPatterns(password, details);
    penalties += numericPenalty;

    // Calculate final score (0-100 scale)
    const baseScore = Math.min(100, (entropy / 128) * 100);
    const finalScore = Math.max(0, Math.min(100, baseScore - penalties + bonuses));

    // Adjust entropy based on penalties
    const adjustedEntropy = Math.max(0, entropy - (penalties * 2));

    // Determine rating
    const { rating, strength } = getRating(finalScore, adjustedEntropy);

    return {
        score: Math.round(finalScore),
        entropy: parseFloat(adjustedEntropy.toFixed(2)),
        rating: rating,
        details: details,
        strength: strength,
        charsetSize: charsetSize,
        length: length
    };
}

/**
 * Calculate the effective charset size based on characters used
 */
function calculateCharsetSize(password) {
    let size = 0;
    if (/[a-z]/.test(password)) size += 26;
    if (/[A-Z]/.test(password)) size += 26;
    if (/[0-9]/.test(password)) size += 10;
    if (/[!"#$%&'()*+,\-./:;<=>?@\[\\\]^_`{|}~]/.test(password)) size += 32;
    return size || 1;
}

/**
 * Check for common patterns and sequences
 */
function checkPatterns(password, details) {
    let penalty = 0;
    const lower = password.toLowerCase();

    // Check for sequential characters
    const sequentialFound = SEQUENTIAL_PATTERNS.find(seq => lower.includes(seq));
    if (sequentialFound) {
        penalty += 15;
        details.push({ type: 'warning', message: `Contains sequential pattern: "${sequentialFound}"` });
    }

    // Check for common words
    const commonWordFound = COMMON_WORDS.find(word => lower.includes(word));
    if (commonWordFound) {
        penalty += 25;
        details.push({ type: 'critical', message: `Contains common word: "${commonWordFound}"` });
    }

    return penalty;
}

/**
 * Check for temporal patterns (years, dates)
 */
function checkTemporalPatterns(password, details) {
    let penalty = 0;

    // Check for date patterns
    if (detectDatePatterns(password)) {
        penalty += 15;
        details.push({ type: 'warning', message: 'Contains date pattern' });
    }

    // Check for year patterns
    const yearFound = YEAR_PATTERNS.find(year => password.includes(year));
    if (yearFound && yearFound.length === 4) { // Only flag 4-digit years prominently
        const currentYear = new Date().getFullYear();
        const yearNum = parseInt(yearFound);
        
        if (yearNum >= currentYear - 5 && yearNum <= currentYear) {
            penalty += 12;
            details.push({ type: 'warning', message: `Contains recent year: ${yearFound}` });
        } else if (yearNum > currentYear && yearNum <= currentYear + 5) {
            penalty += 12;
            details.push({ type: 'warning', message: `Contains near-future year: ${yearFound}` });
        } else if (yearNum >= currentYear - 80 && yearNum <= currentYear - 18) {
            penalty += 10;
            details.push({ type: 'warning', message: `Contains probable birth year: ${yearFound}` });
        }
    }

    return penalty;
}

/**
 * Check for numeric patterns (sequences, repetitions)
 */
function checkNumericPatterns(password, details) {
    let penalty = 0;
    
    // Extract all numeric sequences
    const numericSequences = password.match(/\d{3,}/g);
    
    if (numericSequences) {
        for (const seq of numericSequences) {
            // Check for ascending/descending sequences
            let isSequence = true;
            let isReverse = true;
            
            for (let i = 1; i < seq.length; i++) {
                const diff = parseInt(seq[i]) - parseInt(seq[i-1]);
                if (diff !== 1) isSequence = false;
                if (diff !== -1) isReverse = false;
            }
            
            if (isSequence || isReverse) {
                penalty += 10;
                details.push({ type: 'warning', message: `Contains numeric sequence: "${seq}"` });
                break;
            }
            
            // Check for repeated digits (111, 222, etc.)
            if (/(\d)\1{2,}/.test(seq)) {
                penalty += 8;
                details.push({ type: 'warning', message: `Contains repeated digits: "${seq}"` });
                break;
            }
        }
    }
    
    return penalty;
}

/**
 * Check for repeated characters and patterns
 */
function checkRepeatedChars(password, details) {
    let penalty = 0;

    // Check for immediate repetitions (aa, 111, etc.)
    const immediateRepeats = password.match(/(.)\1{2,}/g);
    if (immediateRepeats) {
        penalty += immediateRepeats.length * 10;
        const examples = immediateRepeats.slice(0, 2).join(', '); // Show max 2 examples
        details.push({ 
            type: 'warning', 
            message: `Contains ${immediateRepeats.length} repeated character sequence(s): ${examples}${immediateRepeats.length > 2 ? '...' : ''}` 
        });
    }

    // Check for repeated patterns (abcabc, 123123)
    for (let len = 2; len <= Math.floor(password.length / 2); len++) {
        for (let i = 0; i <= password.length - len * 2; i++) {
            const pattern = password.substring(i, i + len);
            const next = password.substring(i + len, i + len * 2);
            if (pattern === next && pattern.length >= 2) {
                penalty += 15;
                details.push({ 
                    type: 'warning', 
                    message: `Contains repeated pattern: "${pattern}"` 
                });
                return penalty; // Only count first major repetition
            }
        }
    }

    return penalty;
}

/**
 * Check character distribution and diversity
 */
function checkCharDistribution(password, details) {
    let bonus = 0;
    const charTypes = {
        lowercase: /[a-z]/.test(password),
        uppercase: /[A-Z]/.test(password),
        digits: /[0-9]/.test(password),
        symbols: /[!"#$%&'()*+,\-./:;<=>?@\[\\\]^_`{|}~]/.test(password)
    };

    const typesUsed = Object.values(charTypes).filter(Boolean).length;

    if (typesUsed === 4) {
        bonus += 10;
        details.push({ type: 'bonus', message: 'Uses all character types (lowercase, uppercase, digits, symbols)' });
    } else if (typesUsed === 3) {
        bonus += 5;
        details.push({ type: 'info', message: 'Uses 3 character types' });
    } else if (typesUsed <= 2) {
        details.push({ type: 'warning', message: 'Limited character variety' });
    }

    // Check for good distribution (no single char type dominates)
    const counts = {
        lower: (password.match(/[a-z]/g) || []).length,
        upper: (password.match(/[A-Z]/g) || []).length,
        digit: (password.match(/[0-9]/g) || []).length,
        symbol: (password.match(/[!"#$%&'()*+,\-./:;<=>?@\[\\\]^_`{|}~]/g) || []).length
    };

    const maxCount = Math.max(...Object.values(counts));
    const distribution = maxCount / password.length;

    if (distribution > 0.8) {
        details.push({ type: 'warning', message: 'Poor character distribution (one type dominates)' });
    } else if (distribution < 0.5) {
        bonus += 5;
        details.push({ type: 'bonus', message: 'Excellent character distribution' });
    }

    return bonus;
}

/**
 * Check for common leet speak substitutions
 */
function checkLeetSpeak(password, details) {
    let penalty = 0;
    const lower = password.toLowerCase();

    // Build dynamic leet patterns from common words
    const leetWords = ['password', 'admin', 'login', 'welcome', 'letmein'];
    
    for (const word of leetWords) {
        // Create leet speak regex for each word
        const leetPattern = word
            .replace(/a/g, '[a4@]')
            .replace(/e/g, '[e3]')
            .replace(/i/g, '[i1!]')
            .replace(/o/g, '[o0]')
            .replace(/s/g, '[s5$]')
            .replace(/t/g, '[t7]')
            .replace(/l/g, '[l1]');
        
        const regex = new RegExp(leetPattern, 'i');
        
        if (regex.test(password)) {
            penalty += 20;
            details.push({ 
                type: 'critical', 
                message: `Contains common word with substitutions (leet speak): "${word}"` 
            });
            break;
        }
    }

    return penalty;
}

/**
 * Check for keyboard patterns
 */
function checkKeyboardPatterns(password, details) {
    let penalty = 0;
    const lower = password.toLowerCase();

    const patternFound = KEYBOARD_PATTERNS.find(pattern => 
        pattern.length >= 4 && lower.includes(pattern)
    );
    
    if (patternFound) {
        penalty += 15;
        details.push({ type: 'warning', message: `Contains keyboard pattern: "${patternFound}"` });
    }

    return penalty;
}

/**
 * Check entropy concentration (is randomness well distributed?)
 */
function checkEntropyConcentration(password, details) {
    let penalty = 0;

    if (password.length <= 8) return penalty; // Too short to meaningfully check

    // Divide password into thirds
    const thirdLen = Math.floor(password.length / 3);
    const firstThird = password.substring(0, thirdLen);
    const middleThird = password.substring(thirdLen, thirdLen * 2);
    const lastThird = password.substring(thirdLen * 2);
    
    // Check complexity in each section (capitals, digits, symbols)
    const complexityRegex = /[A-Z0-9!"#$%&'()*+,\-./:;<=>?@\[\\\]^_`{|}~]/;
    
    const firstComplex = complexityRegex.test(firstThird);
    const middleComplex = complexityRegex.test(middleThird);
    const lastComplex = complexityRegex.test(lastThird);

    // If complexity only in first and last thirds, penalize
    if ((firstComplex || lastComplex) && !middleComplex) {
        penalty += 5;
        details.push({ type: 'info', message: 'Complexity concentrated at edges' });
    }

    return penalty;
}

/**
 * Get rating based on score and entropy
 */
function getRating(score, entropy) {
    if (score >= 90 || entropy >= 100) {
        return { 
            rating: "Excellent - Virtually uncrackable with current technology",
            strength: "excellent"
        };
    } else if (score >= 75 || entropy >= 80) {
        return { 
            rating: "Very Strong - Would take centuries to crack",
            strength: "very-strong"
        };
    } else if (score >= 60 || entropy >= 60) {
        return { 
            rating: "Strong - Would take years to crack",
            strength: "strong"
        };
    } else if (score >= 45 || entropy >= 45) {
        return { 
            rating: "Moderate - Could be cracked in months",
            strength: "moderate"
        };
    } else if (score >= 30 || entropy >= 30) {
        return { 
            rating: "Weak - Could be cracked in days or weeks",
            strength: "weak"
        };
    } else {
        return { 
            rating: "Very Weak - Could be cracked instantly or in minutes",
            strength: "very-weak"
        };
    }
}

/**
 * Format the evaluation result for display
 */
function formatEvaluationMessage(result) {
    let message = `STRENGTH: ${result.rating}\n`;
    message += `Score: ${result.score}/100 | Entropy: ${result.entropy} bits\n`;
    message += `Charset Size: ${result.charsetSize} | Length: ${result.length}\n\n`;
    
    if (result.details.length > 0) {
        message += 'Analysis:\n';
        result.details.forEach(detail => {
            const icon = detail.type === 'critical' ? '⚠️' : 
                        detail.type === 'warning' ? '⚡' : 
                        detail.type === 'bonus' ? '✓' : 'ℹ️';
            message += `${icon} ${detail.message}\n`;
        });
    }
    
    return message;
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { evaluatePasswordStrength, formatEvaluationMessage };
}