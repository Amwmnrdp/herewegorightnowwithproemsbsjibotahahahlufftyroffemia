const SUPPORTED_LANGUAGES = {
    'en': { name: 'English', flag: '🇺🇸', native: 'English', translateCode: 'en' },
    'ar': { name: 'Arabic', flag: '<:Arabic:1461636767185637511>', native: 'العربية', translateCode: 'ar' },
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
        name: 'ping',
        description: 'Check the bot\'s response speed'
    },
    {
        name: 'get_emoji_id',
        description: 'Get the ID of a specific emoji',
        options: [
            {
                name: 'emoji',
                type: 3,
                description: 'The emoji you want to get the ID for',
                required: true
            }
        ]
    },
    {
        name: 'get_sticker_id',
        description: 'Get the ID of a specific sticker'
    },
    {
        name: 'help',
        description: 'Get help about all ProEmoji commands'
    },
    {
        name: 'emoji_permission',
        description: 'Set permissions for emoji suggestions (Owner only)'
    },
    {
        name: 'sticker_permission',
        description: 'Set permissions for sticker suggestions (Owner only)'
    },
    {
        name: 'delete_permission',
        description: 'Set whether administrators can delete all emojis/stickers without approval (Owner only)'
    },
    {
        name: 'suggest_emojis',
        description: 'Suggests 5 random emojis from other servers (useful if you don\'t have Nitro)'
    },
    {
        name: 'emoji_search',
        description: 'Search for specific emojis by name across multiple servers',
        options: [
            {
                name: 'search',
                type: 3,
                description: 'The name of the emoji you are looking for',
                required: true
            }
        ]
    },
    {
        name: 'search_sticker',
        description: 'Search for a high-quality sticker and add it to your server',
        options: [
            {
                name: 'search',
                type: 3,
                description: 'The name of the sticker you are looking for',
                required: true
            }
        ]
    },
    {
        name: 'emoji_pack',
        description: 'Get a curated pack of suggested emojis to enhance your server'
    },
    {
        name: 'add_emoji',
        description: 'Add a new emoji to your server using a custom name or ID',
        options: [
            {
                name: 'emoji',
                type: 3,
                description: 'The emoji to add (can be an emoji, ID, or link)',
                required: true
            },
            {
                name: 'name',
                type: 3,
                description: 'Custom name for the new emoji (optional)',
                required: false
            }
        ]
    },
    {
        name: 'image_to_emoji',
        description: 'Convert an image URL or attachment into a server emoji instantly',
        options: [
            {
                name: 'name',
                type: 3,
                description: 'The name for your new emoji',
                required: true
            },
            {
                name: 'attachment',
                type: 11,
                description: 'Upload the image file here',
                required: true
            },
            {
                name: 'url',
                type: 3,
                description: 'Or provide a direct image URL link',
                required: false
            }
        ]
    },
    {
        name: 'image_to_sticker',
        description: 'Convert an image URL or attachment into a server sticker instantly',
        options: [
            {
                name: 'name',
                type: 3,
                description: 'The name for your new sticker',
                required: true
            },
            {
                name: 'attachment',
                type: 11,
                description: 'Upload the image file here',
                required: true
            },
            {
                name: 'url',
                type: 3,
                description: 'Or provide a direct image URL link',
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
        name: 'emoji_to_sticker',
        description: 'Transform any existing server emoji into a high-quality sticker',
        options: [
            {
                name: 'emoji',
                type: 3,
                description: 'The emoji you want to convert',
                required: true
            },
            {
                name: 'name',
                type: 3,
                description: 'The name for your new sticker',
                required: true
            }
        ]
    },
    {
        name: 'emoji_to_image',
        description: 'Convert any emoji into a downloadable image file',
        options: [
            {
                name: 'emoji',
                type: 3,
                description: 'The emoji you want to convert to an image',
                required: true
            }
        ]
    },
    {
        name: 'sticker_to_image',
        description: 'Convert a server sticker into a downloadable image file'
    },
    {
        name: 'enhance_emoji',
        description: 'Improve an emoji\'s resolution and quality before adding it to the server',
        options: [
            {
                name: 'emoji',
                type: 3,
                description: 'The emoji you want to enhance',
                required: true
            }
        ]
    },
    {
        name: 'enhance_sticker',
        description: 'Improve a sticker\'s resolution and quality before saving it to the server'
    },
    {
        name: 'delete_all_stickers',
        description: 'Remove all stickers from your server (Admin only, requires confirmation)'
    },
    {
        name: 'delete_all_emojis',
        description: 'Remove all emojis from your server (Admin only, requires confirmation)'
    },
    {
        name: 'list_emojis',
        description: 'View a complete list of all emojis currently in your server'
    },
    {
        name: 'language',
        description: 'Change the bot\'s language setting for this server (Admin/Owner only)'
    },
    {
        name: 'delete_emoji',
        description: 'Permanently remove one or more specific emojis from your server',
        options: [
            {
                name: 'emojis',
                type: 3,
                description: 'The emojis you want to delete (separate with spaces)',
                required: true
            }
        ]
    },
    {
        name: 'rename_emoji',
        description: 'Change the name of an existing server emoji',
        options: [
            {
                name: 'emoji',
                type: 3,
                description: 'The emoji you want to rename',
                required: true
            },
            {
                name: 'name',
                type: 3,
                description: 'The new name for the emoji',
                required: true
            }
        ]
    },
    {
        name: 'delete_sticker',
        description: 'Permanently remove a specific sticker from your server'
    },
    {
        name: 'rename_sticker',
        description: 'Change the name of an existing server sticker',
        options: [
            {
                name: 'name',
                type: 3,
                description: 'The new name for the sticker',
                required: true
            }
        ]
    },
    {
        name: 'sticker_to_emoji',
        description: 'Transform any existing server sticker into a custom emoji',
        options: [
            {
                name: 'name',
                type: 3,
                description: 'The name for your new emoji',
                required: true
            }
        ]
    },
    {
        name: 'list_stickers',
        description: 'View a complete list of all stickers currently in your server'
    },
    {
        name: 'add_sticker',
        description: 'Add a new sticker to your server with a custom name',
        options: [
            {
                name: 'name',
                type: 3,
                description: 'Custom name for the new sticker (optional)',
                required: false
            },
            {
                name: 'sticker_id',
                type: 3,
                description: 'The ID of the sticker you want to add (optional)',
                required: false
            }
        ]
    },
    {
        name: 'suggest_sticker',
        description: 'Suggests 5 random stickers from other servers (useful if you don\'t have Nitro)'
    },
    {
        name: 'status',
        description: 'Check bot status and ping'
    },
    {
        name: 'vote',
        description: 'Get links to vote and support the bot'
    },
    {
        name: 'add_to_pack',
        description: 'Add an emoji to a curated pack (Owner Only)',
        options: [
            {
                name: 'emoji',
                type: 3,
                description: 'The emoji to add',
                required: true
            },
            {
                name: 'pack_select',
                type: 3,
                description: 'Choose the pack to add it to',
                required: true,
                choices: [
                    { name: 'Anime Pack', value: 'anime' },
                    { name: 'Games Pack', value: 'game' },
                    { name: 'Romantic Pack', value: 'romantic' }
                ]
            }
        ]
    },
    {
        name: 'delete_from_pack',
        description: 'Remove an emoji from a curated pack (Owner Only)',
        options: [
            {
                name: 'emoji',
                type: 3,
                description: 'The emoji name or ID to remove',
                required: true
            },
            {
                name: 'pack_select',
                type: 3,
                description: 'Choose the pack where the emoji exists',
                required: true,
                choices: [
                    { name: 'Anime Pack', value: 'anime' },
                    { name: 'Games Pack', value: 'game' },
                    { name: 'Romantic Pack', value: 'romantic' }
                ]
            }
        ]
    },
    {
        name: 'update',
        description: 'Hot-reload commands without restarting the bot.'
    }
];

const OWNER_ONLY_COMMANDS = ['emoji_permission', 'sticker_permission', 'delete_permission'];
const ADMIN_ONLY_COMMANDS = ['delete_all_emojis', 'delete_all_stickers'];
const PUBLIC_COMMANDS = ['status', 'help', 'vote'];
const EMOJI_PERMISSION_COMMANDS = [
    'add_emoji', 'delete_emoji', 'rename_emoji', 'image_to_emoji', 
    'emoji_to_sticker', 'sticker_to_emoji', 'emoji_search', 'suggest_emojis',
    'list_emojis', 'delete_sticker', 'rename_sticker', 'image_to_sticker', 'list_stickers', 'add_sticker',
    'emoji_to_image', 'sticker_to_image', 'enhance_emoji', 'enhance_sticker',
    'status', 'search_sticker', 'emoji_pack', 'vote', 'suggest_sticker',
    'emoji_permission', 'sticker_permission', 'get_emoji_id', 'get_sticker_id'
];

module.exports = {
    SUPPORTED_LANGUAGES,
    LEGACY_LANGUAGE_MAP,
    COMMAND_DEFINITIONS,
    OWNER_ONLY_COMMANDS,
    PUBLIC_COMMANDS,
    EMOJI_PERMISSION_COMMANDS
};
