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
    
    const translateCode = SUPPORTED_LANGUAGES[langCode]?.translateCode || langCode;
    if (translateCode === 'en') return text;

    const cacheKey = `${translateCode}:${text}`;
    if (translationCache.has(cacheKey)) {
        return translationCache.get(cacheKey);
    }
    
    // Non-blocking background translation to avoid latency
    const translationPromise = translate(text, { from: 'en', to: translateCode }).then(result => {
        translationCache.set(cacheKey, result.text);
        return result.text;
    }).catch(error => {
        console.error(`❌ Translation error (${langCode}):`, error.message);
        return text;
    });

    // For critical strings, we might wait, but for help menus we return the original if it takes too long
    // However, to keep it simple and fix the latency, we'll just wait for the first time
    return await translationPromise;
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
