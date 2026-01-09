const SUPPORTED_LANGUAGES = {
    'en': { name: 'English', flag: '🇺🇸', native: 'English', translateCode: 'en' },
    'ar': { name: 'Arabic', flag: '<:Syria:1443915175379079208>', native: 'العربية', translateCode: 'ar' },
    'zh': { name: 'Chinese', flag: '🇨🇳', native: '中文', translateCode: 'zh-CN' },
    'es': { name: 'Spanish', flag: '🇪🇸', native: 'Español', translateCode: 'es' },
    'ru': { name: 'Russian', flag: '🇷🇺', native: 'Русский', translateCode: 'ru' },
    'tr': { name: 'Turkish', flag: '🇹🇷', native: 'Türkçe', translateCode: 'tr' },
    'fr': { name: 'French', flag: '🇫🇷', native: 'Français', translateCode: 'fr' },
    'de': { name: 'German', flag: '🇩🇪', native: 'Deutsch', translateCode: 'de' },
    'it': { name: 'Italian', flag: '🇮🇹', native: 'Italiano', translateCode: 'it' },
    'ja': { name: 'Japanese', flag: '🇯🇵', native: '日本語', translateCode: 'ja' },
    'ko': { name: 'Korean', flag: '🇰🇷', native: '한국어', translateCode: 'ko' },
    'pt': { name: 'Portuguese', flag: '🇵🇹', native: 'Português', translateCode: 'pt' }
};

const LEGACY_LANGUAGE_MAP = {
    'english': 'en',
    'arabic': 'ar',
    'chinese': 'zh',
    'spanish': 'es',
    'russian': 'ru',
    'turkish': 'tr',
    'french': 'fr',
    'german': 'de',
    'italian': 'it',
    'japanese': 'ja',
    'korean': 'ko',
    'portuguese': 'pt'
};

const COMMAND_DEFINITIONS = [
    {
        name: 'help',
        description: 'Get help about all ProEmoji commands'
    },
    {
        name: 'permission',
        description: 'Set permissions for emoji suggestions (Owner only)'
    },
    {
        name: 'emoji',
        description: 'Emoji management commands',
        options: [
            {
                name: 'search',
                description: 'Search for emojis by name',
                type: 1,
                options: [{ name: 'search', type: 3, description: 'Emoji name to search for', required: true }]
            },
            {
                name: 'pack',
                description: 'Get a pack of suggested emojis',
                type: 1
            },
            {
                name: 'add',
                description: 'Add an emoji to server',
                type: 1,
                options: [
                    { name: 'emoji', type: 3, description: 'The emoji to add', required: true },
                    { name: 'name', type: 3, description: 'Custom name (optional)', required: false }
                ]
            },
            {
                name: 'list',
                description: 'List all server emojis',
                type: 1
            },
            {
                name: 'delete',
                description: 'Delete an emoji',
                type: 1,
                options: [{ name: 'emoji', type: 3, description: 'Emoji to delete', required: true }]
            },
            {
                name: 'rename',
                description: 'Rename an emoji',
                type: 1,
                options: [
                    { name: 'emoji', type: 3, description: 'Emoji to rename', required: true },
                    { name: 'name', type: 3, description: 'New name', required: true }
                ]
            },
            {
                name: 'suggest',
                description: 'Get 5 emoji suggestions',
                type: 1
            }
        ]
    },
    {
        name: 'sticker',
        description: 'Sticker management commands',
        options: [
            {
                name: 'search',
                description: 'Search for a sticker and add it',
                type: 1,
                options: [{ name: 'search', type: 3, description: 'Sticker name to search for', required: true }]
            },
            {
                name: 'add',
                description: 'Add a sticker to server',
                type: 1,
                options: [{ name: 'name', type: 3, description: 'Custom sticker name (optional)', required: false }]
            },
            {
                name: 'list',
                description: 'List all server stickers',
                type: 1
            },
            {
                name: 'delete',
                description: 'Delete a sticker',
                type: 1
            },
            {
                name: 'rename',
                description: 'Rename a sticker',
                type: 1,
                options: [{ name: 'name', type: 3, description: 'New sticker name', required: true }]
            }
        ]
    },
    {
        name: 'image',
        description: 'Image conversion commands',
        options: [
            {
                name: 'to_emoji',
                description: 'Convert image to emoji',
                type: 1,
                options: [
                    { name: 'name', type: 3, description: 'Emoji name', required: true },
                    { name: 'attachment', type: 11, description: 'Upload an image', required: true },
                    { name: 'url', type: 3, description: 'Image URL', required: false }
                ]
            },
            {
                name: 'to_sticker',
                description: 'Convert image to sticker',
                type: 1,
                options: [
                    { name: 'name', type: 3, description: 'Sticker name', required: true },
                    { name: 'attachment', type: 11, description: 'Upload an image', required: true },
                    { name: 'url', type: 3, description: 'Image URL', required: false },
                    {
                        name: 'integration',
                        type: 3,
                        description: 'Enable official sticker integration (Yes/No)',
                        required: false,
                        choices: [{ name: 'Yes', value: 'true' }]
                    }
                ]
            }
        ]
    },
    {
        name: 'convert',
        description: 'Conversion commands',
        options: [
            {
                name: 'emoji_to_sticker',
                description: 'Convert emoji to sticker',
                type: 1,
                options: [
                    { name: 'emoji', type: 3, description: 'The emoji to convert', required: true },
                    { name: 'name', type: 3, description: 'Sticker name', required: true }
                ]
            },
            {
                name: 'sticker_to_emoji',
                description: 'Convert sticker to emoji',
                type: 1,
                options: [{ name: 'name', type: 3, description: 'Emoji name', required: true }]
            },
            {
                name: 'emoji_to_image',
                description: 'Convert an emoji to an image',
                type: 1,
                options: [{ name: 'emoji', type: 3, description: 'The emoji to convert', required: true }]
            },
            {
                name: 'sticker_to_image',
                description: 'Convert a sticker to an image',
                type: 1,
                options: [{ name: 'sticker', type: 3, description: 'The sticker to convert (ID or name)', required: true }]
            }
        ]
    },
    {
        name: 'enhance',
        description: 'Quality enhancement commands',
        options: [
            {
                name: 'emoji',
                description: 'Improve an emoji\'s quality',
                type: 1,
                options: [{ name: 'emoji', type: 3, description: 'The emoji to enhance', required: true }]
            },
            {
                name: 'sticker',
                description: 'Improve a sticker\'s quality',
                type: 1
            }
        ]
    },
    {
        name: 'delete_all',
        description: 'Bulk deletion commands',
        options: [
            { name: 'stickers', description: 'Delete all stickers', type: 1 },
            { name: 'emojis', description: 'Delete all emojis', type: 1 }
        ]
    },
    {
        name: 'language',
        description: 'Change bot language (Owner only)'
    },
    {
        name: 'status',
        description: 'Check bot status, vote status and ping'
    }
];

const OWNER_ONLY_COMMANDS = ['language', 'permission'];
const ADMIN_ONLY_COMMANDS = ['delete_all'];
const PUBLIC_COMMANDS = ['status', 'help'];
const EMOJI_PERMISSION_COMMANDS = [
    'emoji', 'sticker', 'image', 'convert', 'enhance', 'delete_all', 'status'
];

module.exports = {
    SUPPORTED_LANGUAGES,
    LEGACY_LANGUAGE_MAP,
    COMMAND_DEFINITIONS,
    OWNER_ONLY_COMMANDS,
    PUBLIC_COMMANDS,
    EMOJI_PERMISSION_COMMANDS
};
