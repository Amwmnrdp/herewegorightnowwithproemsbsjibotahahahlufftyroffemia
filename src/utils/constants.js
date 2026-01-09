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
        name: 'suggest emojis',
        description: 'Get 5 emoji suggestions'
    },
    {
        name: 'emoji search',
        description: 'Search for emojis by name',
        options: [
            {
                name: 'search',
                type: 3,
                description: 'Emoji name to search for',
                required: true
            }
        ]
    },
    {
        name: 'search sticker',
        description: 'Search for a sticker and add it',
        options: [
            {
                name: 'search',
                type: 3,
                description: 'Sticker name to search for',
                required: true
            }
        ]
    },
    {
        name: 'emoji pack',
        description: 'Get a pack of suggested emojis'
    },
    {
        name: 'add emoji',
        description: 'Add an emoji to server',
        options: [
            {
                name: 'emoji',
                type: 3,
                description: 'The emoji to add',
                required: true
            },
            {
                name: 'name',
                type: 3,
                description: 'Custom name (optional)',
                required: false
            }
        ]
    },
    {
        name: 'image to emoji',
        description: 'Convert image to emoji',
        options: [
            {
                name: 'name',
                type: 3,
                description: 'Emoji name',
                required: true
            },
            {
                name: 'attachment',
                type: 11,
                description: 'Upload an image',
                required: true
            },
            {
                name: 'url',
                type: 3,
                description: 'Image URL',
                required: false
            }
        ]
    },
    {
        name: 'image to sticker',
        description: 'Convert image to sticker',
        options: [
            {
                name: 'name',
                type: 3,
                description: 'Sticker name',
                required: true
            },
            {
                name: 'attachment',
                type: 11,
                description: 'Upload an image',
                required: true
            },
            {
                name: 'url',
                type: 3,
                description: 'Image URL',
                required: false
            },
            {
                name: 'integration',
                type: 3,
                description: 'Enable official sticker integration (Yes/No)',
                required: false,
                choices: [
                    { name: 'Yes', value: 'true' }
                ]
            }
        ]
    },
    {
        name: 'emoji to sticker',
        description: 'Convert emoji to sticker',
        options: [
            {
                name: 'emoji',
                type: 3,
                description: 'The emoji to convert',
                required: true
            },
            {
                name: 'name',
                type: 3,
                description: 'Sticker name',
                required: true
            }
        ]
    },
    {
        name: 'emoji to image',
        description: 'Convert an emoji to an image',
        options: [
            {
                name: 'emoji',
                type: 3,
                description: 'The emoji to convert',
                required: true
            }
        ]
    },
    {
        name: 'sticker to image',
        description: 'Convert a sticker to an image',
        options: [
            {
                name: 'sticker',
                type: 3,
                description: 'The sticker to convert (ID or name)',
                required: true
            }
        ]
    },
    {
        name: 'enhance emoji',
        description: 'Improve an emoji\'s quality and add it to the server',
        options: [
            {
                name: 'emoji',
                type: 3,
                description: 'The emoji to enhance',
                required: true
            }
        ]
    },
    {
        name: 'enhance sticker',
        description: 'Improve a sticker\'s quality and save it to the server'
    },
    {
        name: 'delete all stickers',
        description: 'Delete all stickers in the server'
    },
    {
        name: 'delete all emojis',
        description: 'Delete all emojis in the server'
    },
    {
        name: 'list emojis',
        description: 'List all server emojis'
    },
    {
        name: 'language',
        description: 'Change bot language (Owner only)'
    },
    {
        name: 'delete emoji',
        description: 'Delete an emoji',
        options: [
            {
                name: 'emoji',
                type: 3,
                description: 'Emoji to delete',
                required: true
            }
        ]
    },
    {
        name: 'rename emoji',
        description: 'Rename an emoji',
        options: [
            {
                name: 'emoji',
                type: 3,
                description: 'Emoji to rename',
                required: true
            },
            {
                name: 'name',
                type: 3,
                description: 'New name',
                required: true
            }
        ]
    },
    {
        name: 'delete sticker',
        description: 'Delete a sticker'
    },
    {
        name: 'rename sticker',
        description: 'Rename a sticker',
        options: [
            {
                name: 'name',
                type: 3,
                description: 'New sticker name',
                required: true
            }
        ]
    },
    {
        name: 'sticker to emoji',
        description: 'Convert sticker to emoji',
        options: [
            {
                name: 'name',
                type: 3,
                description: 'Emoji name',
                required: true
            }
        ]
    },
    {
        name: 'list stickers',
        description: 'List all server stickers'
    },
    {
        name: 'add sticker',
        description: 'Add a sticker to server',
        options: [
            {
                name: 'name',
                type: 3,
                description: 'Custom sticker name (optional)',
                required: false
            }
        ]
    },
    {
        name: 'status',
        description: 'Check bot status, vote status and ping'
    }
];

const OWNER_ONLY_COMMANDS = ['language', 'permission'];
const ADMIN_ONLY_COMMANDS = ['delete all emojis', 'delete all stickers'];
const PUBLIC_COMMANDS = ['status', 'help'];
const EMOJI_PERMISSION_COMMANDS = [
    'add emoji', 'delete emoji', 'rename emoji', 'image to emoji', 
    'emoji to sticker', 'sticker to emoji', 'emoji search', 'suggest emojis',
    'list emojis', 'delete sticker', 'rename sticker', 'image to sticker', 'list stickers', 'add sticker',
    'emoji to image', 'sticker to image', 'enhance emoji', 'enhance sticker',
    'status', 'search sticker', 'emoji pack'
];

module.exports = {
    SUPPORTED_LANGUAGES,
    LEGACY_LANGUAGE_MAP,
    COMMAND_DEFINITIONS,
    OWNER_ONLY_COMMANDS,
    PUBLIC_COMMANDS,
    EMOJI_PERMISSION_COMMANDS
};
