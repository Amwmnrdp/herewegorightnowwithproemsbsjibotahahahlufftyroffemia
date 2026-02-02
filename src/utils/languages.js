const translate = require('google-translate-api-x');
const { readLanguagesFile, writeLanguagesFile } = require('./storage');
const { SUPPORTED_LANGUAGES, LEGACY_LANGUAGE_MAP } = require('./constants');

const serverLanguages = new Map();
const translationCache = new Map();

function loadServerLanguages() {
    const languages = readLanguagesFile();
    let needsSave = false;
    
    for (const [guildId, langCode] of Object.entries(languages)) {
        const normalizedCode = LEGACY_LANGUAGE_MAP[langCode.toLowerCase()] || langCode;
        if (normalizedCode !== langCode) {
            languages[guildId] = normalizedCode;
            needsSave = true;
        }
        serverLanguages.set(guildId, normalizedCode);
    }
    
    if (needsSave) {
        writeLanguagesFile(languages);
        console.log('✅ Migrated legacy language codes to ISO format');
    }
}

function saveServerLanguage(guildId, langCode) {
    const languages = readLanguagesFile();
    languages[guildId] = langCode;
    writeLanguagesFile(languages);
    serverLanguages.set(guildId, langCode);
}

function getServerLanguage(guildId) {
    return serverLanguages.get(guildId) || 'en';
}

async function t(text, langCode) {
    if (!text || !langCode || langCode === 'en') return text;
    
    // Add basic support for placeholders like {time}
    let originalText = text;
    let placeholders = {};
    // This is a simple regex to find things like {time} or {user}
    const placeholderRegex = /\{(\w+)\}/g;
    let match;
    while ((match = placeholderRegex.exec(text)) !== null) {
        placeholders[match[0]] = match[0];
    }

    const translateCode = SUPPORTED_LANGUAGES[langCode]?.translateCode || langCode;
    if (translateCode === 'en') return text;

    const cacheKey = `${translateCode}:${text}`;
    if (translationCache.has(cacheKey)) {
        return translationCache.get(cacheKey);
    }
    
    try {
        const result = await translate(text, { from: 'en', to: translateCode });
        let translatedText = result.text;
        
        // Ensure placeholders are preserved (google translate sometimes messes them up)
        for (const [key, value] of Object.entries(placeholders)) {
            if (!translatedText.includes(key)) {
                // If the placeholder was lost or mangled, we might have issues, but for now we just log
                console.warn(`⚠️ Placeholder ${key} might have been mangled in translation to ${langCode}`);
            }
        }
        
        translationCache.set(cacheKey, translatedText);
        return translatedText;
    } catch (error) {
        console.error(`❌ Translation error (${langCode}):`, error.message);
        return text;
    }
}

async function preWarmCache() {
    const commonMessages = [
        'Pong!', 'Gateway latency:', 'Response time:', 'Permission Settings', 'Allow', 'Refuse'
    ];
    
    setImmediate(async () => {
        for (const lang of Object.keys(SUPPORTED_LANGUAGES)) {
            if (lang !== 'en') {
                for (const msg of commonMessages) {
                    t(msg, lang).catch(() => {});
                }
            }
        }
        console.log('✅ Cache pre-warming in progress (non-blocking)');
    });
}

module.exports = {
    serverLanguages,
    translationCache,
    loadServerLanguages,
    saveServerLanguage,
    getServerLanguage,
    t,
    preWarmCache
};
