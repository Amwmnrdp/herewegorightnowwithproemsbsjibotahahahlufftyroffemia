const translate = require('google-translate-api-x');
const db = require('./database');
const { SUPPORTED_LANGUAGES, LEGACY_LANGUAGE_MAP } = require('./constants');

const serverLanguages = new Map();
const translationCache = new Map();

async function loadServerLanguages() {
    // We now use DB for this, but we can pre-warm cache if needed
    console.log('✅ Language system initialized (using PostgreSQL)');
}

async function saveServerLanguage(guildId, langCode) {
    await db.setServerLanguage(guildId, langCode);
    serverLanguages.set(guildId, langCode);
}

async function getServerLanguage(guildId) {
    if (serverLanguages.has(guildId)) return serverLanguages.get(guildId);
    const lang = await db.getServerLanguage(guildId);
    serverLanguages.set(guildId, lang || 'en');
    return lang || 'en';
}

async function t(text, langCode) {
    if (!text || !langCode || langCode === 'en') return text;
    
    const translateCode = SUPPORTED_LANGUAGES[langCode]?.translateCode || langCode;
    if (translateCode === 'en') return text;

    const cacheKey = `${translateCode}:${text}`;
    if (translationCache.has(cacheKey)) {
        return translationCache.get(cacheKey);
    }
    
    try {
        const result = await translate(text, { from: 'en', to: translateCode });
        let translatedText = result.text;
        
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
