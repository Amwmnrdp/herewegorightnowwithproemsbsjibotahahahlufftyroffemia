const express = require('express');
const path = require('path');
const app = express();
const { Client, GatewayIntentBits, EmbedBuilder, PermissionsBitField, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const prefix = '+';
const db = require('./src/utils/database');
const sharp = require('sharp');
const axios = require('axios');
const { SUPPORTED_LANGUAGES, COMMAND_DEFINITIONS, OWNER_ONLY_COMMANDS, ADMIN_ONLY_COMMANDS = [], PUBLIC_COMMANDS, EMOJI_PERMISSION_COMMANDS } = require('./src/utils/constants');
const { t, preWarmCache, getServerLanguage, serverLanguages } = require('./src/utils/languages');

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json({ limit: '10mb' }));

const deleteallemojis = require('./src/commands/emoji/deleteallemojis');
const deleteallstickers = require('./src/commands/sticker/deleteallstickers');
const addemojiCmd = require('./src/commands/emoji/addemoji');
const listemoji = require('./src/commands/emoji/listemoji');
const deletemoji = require('./src/commands/emoji/deletemoji');
const renameemoji = require('./src/commands/emoji/renameemoji');
const emojisearch = require('./src/commands/emoji/emojisearch');
const emojipack = require('./src/commands/emoji/emojipack');
const addtopack = require('./src/commands/emoji/addtopack');
const deletefrompack = require('./src/commands/emoji/deletefrompack');
const imagetoemoji = require('./src/commands/emoji/imagetoemoji');
const emojiTosticker = require('./src/commands/emoji/emojiTosticker');
const emojitoimage = require('./src/commands/emoji/emojitoimage');
const enhanceemoji = require('./src/commands/emoji/enhanceemoji');
const suggestemojis = require('./src/commands/emoji/suggestemojis');

const addsticker = require('./src/commands/sticker/addsticker');
const deletesticker = require('./src/commands/sticker/deletesticker');
const renamesticker = require('./src/commands/sticker/renamesticker');
const stickertoemi = require('./src/commands/sticker/stickertoemi');
const imagetosticker = require('./src/commands/sticker/imagetosticker');
const stickertoimage = require('./src/commands/sticker/stickertoimage');
const enhancesticker = require('./src/commands/sticker/enhancesticker');
const liststicker = require('./src/commands/sticker/liststicker');
const searchsticker = require('./src/commands/sticker/searchsticker');
const suggeststicker = require('./src/commands/sticker/suggeststicker');

const help = require('./src/commands/storage/help');
const deletepermission = require('./src/commands/storage/deletepermission');
const status = require('./src/commands/storage/status');
const vote = require('./src/commands/storage/vote');
const language = require('./src/commands/storage/language');
const verify = require('./src/commands/storage/verify');
const emojiPermission = require('./src/commands/storage/emoji_permission');
const stickerPermission = require('./src/commands/storage/sticker_permission');

const getemojiid = require('./src/commands/emoji/getemojiid');
const getstickerid = require('./src/commands/sticker/getstickerid');

const LOADING_MESSAGES = {
    'ping': 'Checking connection',
    'status': 'Checking status',
    'help': 'Loading help',
    'vote': 'Loading vote',
    'language': 'Changing language',
    'delete_all_emojis': 'Deleting all emojis',
    'delete_all_stickers': 'Deleting all stickers',
    'delete_permission': 'Updating permissions',
    'emoji_permission': 'Updating emoji permissions',
    'sticker_permission': 'Updating sticker permissions',
    'emoji_search': 'Searching emojis',
    'search_sticker': 'Searching stickers',
    'emoji_pack': 'Loading emoji pack',
    'add_to_pack': 'Adding to pack',
    'delete_from_pack': 'Deleting from pack',
    'suggest_emojis': 'Suggesting emojis',
    'suggest_sticker': 'Suggesting stickers',
    'enhance_sticker': 'Enhancing sticker',
    'enhance_emoji': 'Enhancing emoji',
    'add_emoji': 'Adding emoji',
    'image_to_emoji': 'Converting image to emoji',
    'emoji_to_sticker': 'Converting emoji to sticker',
    'list_emojis': 'Loading emojis',
    'list_stickers': 'Loading stickers',
    'delete_emoji': 'Deleting emoji',
    'rename_emoji': 'Renaming emoji',
    'emoji_to_image': 'Converting emoji to image',
    'get_emoji_id': 'Getting emoji ID',
    'add_sticker': 'Adding sticker',
    'image_to_sticker': 'Converting image to sticker',
    'sticker_to_emoji': 'Converting sticker to emoji',
    'sticker_to_image': 'Converting sticker to image',
    'delete_sticker': 'Deleting sticker',
    'rename_sticker': 'Renaming sticker',
    'get_sticker_id': 'Getting sticker ID',
    'update': 'Updating bot',
    'verify': 'Verifying vote'
};

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildEmojisAndStickers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions,
    ],
});

process.on('unhandledRejection', error => {
    console.error('Unhandled promise rejection:', error);
});

process.on('uncaughtException', error => {
    console.error('Uncaught exception:', error);
});

client.on('emojiDelete', async emoji => {
    try {
        await db.removeEmojiFromPacksById(emoji.id);
        console.log(`🗑️ Removed deleted emoji ${emoji.name} (${emoji.id}) from all packs.`);
    } catch (error) {
        console.error('❌ Error handling emojiDelete event:', error.message);
    }
});

client.on('error', error => {
    console.error('Discord client error:', error);
});

const usedUrls = {};
const stickerDeletionSessions = new Map();
const activeStickerSessions = new Map();

// Export sessions for use in command files
module.exports = { activeStickerSessions };
const stickerToEmojiSessions = new Map();
const stickerRenameSessions = new Map();
const stickerAddSessions = new Map();
const stickerEnhanceSessions = new Map();
const emojiEnhanceSessions = new Map();
const convertedEmojisToStickers = new Map();
const convertedImagesToStickers = new Map();
const convertedStickersToEmojis = new Map();

async function checkPermissions(interaction, langCode) {
    if (!interaction.guild) {
        const embed = new EmbedBuilder()
            .setTitle('🚫 ' + await t('Error', langCode))
            .setDescription(await t('Commands can only be used in servers.', langCode))
            .setColor('#FF0000');
        
        if (interaction.deferred || interaction.replied) {
            await interaction.editReply({ embeds: [embed] });
        } else {
            await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        }
        return false;
    }
    const commandName = interaction.commandName;
    
    if (commandName === 'permission') {
        if (interaction.user.id !== interaction.guild.ownerId) {
            const embed = new EmbedBuilder()
                .setTitle('🚫 ' + await t('Permission Denied', langCode))
                .setDescription(await t('Only the server owner can use this command.', langCode))
                .setColor('#FF0000');
            
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply({ embeds: [embed] });
            } else {
                await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
            }
            return false;
        }
        return true;
    }
    
    if (commandName === 'language') {
        const isOwner = interaction.user.id === interaction.guild.ownerId;
        const isAdministrator = interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);
        
        if (!isOwner && !isAdministrator) {
            const embed = new EmbedBuilder()
                .setTitle('🚫 ' + await t('Permission Denied', langCode))
                .setDescription(await t('Only administrators or the server owner can use this command.', langCode))
                .setColor('#FF0000');
            
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply({ embeds: [embed] });
            } else {
                await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
            }
            return false;
        }
        return true;
    }
    
    const hasManageEmoji = interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuildExpressions) ||
                           interaction.member.permissions.has(PermissionsBitField.Flags.ManageEmojisAndStickers);
    
    if (ADMIN_ONLY_COMMANDS.includes(commandName)) {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            const embed = new EmbedBuilder()
                .setTitle('🚫 ' + await t('Permission Denied', langCode))
                .setDescription(await t('Only administrators can use this command.', langCode))
                .setColor('#FF0000');
            
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply({ embeds: [embed] });
            } else {
                await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
            }
            return false;
        }
        return true;
    }

    if (commandName === 'suggest_emojis' || commandName === 'suggest_sticker') {
        const isVerified = await db.isUserVerifiedDb(interaction.user.id);
        if (!isVerified) {
            const TOP_GG_BOT_ID = process.env.TOP_GG_BOT_ID || client.user?.id;
            const embed = new EmbedBuilder()
                .setTitle('🗳️ ' + await t('Vote Required', langCode))
                .setDescription(await t('To use this premium feature, you must vote for the bot [here]. After voting, use `/verify` to unlock access for 12 hours.', langCode).replace('[here]', `[${await t('here', langCode)}](https://top.gg/bot/${TOP_GG_BOT_ID}/vote)`))
                .setColor('#FF6B6B');
            
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply({ embeds: [embed] });
            } else {
                await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
            }
            return false;
        }
    }

    if (!hasManageEmoji) {
        const embed = new EmbedBuilder()
            .setTitle('🚫 ' + await t('Permission Denied', langCode))
            .setDescription(await t('You need the "Manage Emojis and Stickers" permission to use this command.', langCode))
            .setColor('#FF0000');
        
        if (interaction.deferred || interaction.replied) {
            await interaction.editReply({ embeds: [embed] });
        } else {
            await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        }
        return false;
    }
    
    return true;
}

const cooldowns = new Map();

client.on('interactionCreate', async interaction => {
    let langCode = 'en';
    if (interaction.guild) {
        try {
            langCode = await db.getServerLanguage(interaction.guild.id);
            if (!langCode) langCode = 'en';
        } catch (e) {
            console.error('Error fetching langCode:', e);
            langCode = 'en';
        }
    }
    
    const interactionId = interaction.isCommand() ? interaction.commandName : (interaction.customId || 'N/A');

    if (interaction.isCommand()) {
        const commandName = interaction.commandName;
        
        if (commandName === 'verify') {
            const TOP_GG_BOT_ID = process.env.TOP_GG_BOT_ID || client.user?.id;
            const embed = new EmbedBuilder()
                .setTitle('🛡️ ' + await t('Vote Verification', langCode))
                .setDescription(await t('Click the button below to verify your vote on Top.gg and unlock premium features for 12 hours.', langCode) + 
                    `\n\n🔗 [${await t('Vote here', langCode)}](https://top.gg/bot/${TOP_GG_BOT_ID}/vote)`)
                .setColor('#0099ff');
            
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('verify_vote')
                    .setLabel(await t('Verify', langCode))
                    .setStyle(ButtonStyle.Success)
            );

            return await interaction.reply({ embeds: [embed], components: [row], flags: MessageFlags.Ephemeral });
        }

        const userId = interaction.user.id;
        const now = Date.now();
        const cooldownAmount = 3000;
        if (cooldowns.has(userId)) {
            const expirationTime = cooldowns.get(userId) + cooldownAmount;
            if (now < expirationTime) {
                const timeLeft = (expirationTime - now) / 1000;
                const cooldownEmbed = new EmbedBuilder()
                    .setDescription(await t(`❌ Please wait {time} more second(s) before using commands again.`, langCode).then(text => text.replace('{time}', timeLeft.toFixed(1))))
                    .setColor('#FF0000');
                
                try {
                    if (interaction.deferred || interaction.replied) {
                        return await interaction.editReply({ embeds: [cooldownEmbed] });
                    } else {
                        return await interaction.reply({ embeds: [cooldownEmbed], flags: MessageFlags.Ephemeral });
                    }
                } catch (e) {}
                return;
            }
        }
        cooldowns.set(userId, now);
        setTimeout(() => cooldowns.delete(userId), cooldownAmount);
    }

    if (interaction.isButton() && interaction.customId === 'verify_vote') {
        try {
            await interaction.deferUpdate();
            const userId = interaction.user.id;
            const TOP_GG_API_KEY = process.env.TOP_GG_API_KEY;
            const TOP_GG_BOT_ID = process.env.TOP_GG_BOT_ID || client.user?.id;
            
            let voted = false;
            if (TOP_GG_API_KEY && TOP_GG_BOT_ID) {
                const response = await axios.get(`https://top.gg/api/bots/${TOP_GG_BOT_ID}/check?userId=${userId}`, {
                    headers: { 'Authorization': TOP_GG_API_KEY }
                }).catch(() => null);
                voted = response?.data?.voted === 1;
            } else {
                voted = true; 
            }

            if (voted) {
                await db.verifyUserDb(userId, interaction.user.username, interaction.user.displayAvatarURL());
                const embed = new EmbedBuilder()
                    .setTitle('✅ ' + await t('Success', langCode))
                    .setDescription(await t('Your vote has been verified! You can now use `/suggest_emoji` and `/suggest_sticker` for the next 12 hours.', langCode))
                    .setColor('#00FF00');
                return await interaction.editReply({ embeds: [embed], components: [] });
            } else {
                const embed = new EmbedBuilder()
                    .setTitle('❌ ' + await t('Not Voted', langCode))
                    .setDescription(await t('Verification failed. You must vote on Top.gg first before verifying.', langCode) + 
                        `\n\n🔗 [${await t('Vote here', langCode)}](https://top.gg/bot/${TOP_GG_BOT_ID}/vote)`)
                    .setColor('#FF0000');
                return await interaction.editReply({ embeds: [embed] });
            }
        } catch (e) {
            console.error('Error in verification button:', e);
            const embed = new EmbedBuilder()
                .setTitle('❌ ' + await t('Error', langCode))
                .setDescription(await t('Verification failed. Please try again later.', langCode))
                .setColor('#FF0000');
            return await interaction.editReply({ embeds: [embed] });
        }
    }

    if (interaction.isStringSelectMenu() && interaction.customId === 'help_category') {
        try {
            if (!interaction.deferred && !interaction.replied) {
                await interaction.deferUpdate().catch(() => {});
            }

            const row = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('help_category')
                    .setPlaceholder(await t('Select a category', langCode))
                    .addOptions([
                        { label: await t('Sticker Commands', langCode), value: 'sticker_help', emoji: '✨' },
                        { label: await t('Emoji Commands', langCode), value: 'emoji_help', emoji: '😀' },
                        { label: await t('Info Commands', langCode), value: 'info_help', emoji: 'ℹ️' }
                    ])
            );

            const pages = [];
            let title = '';
            let currentPage = 0;
            const category = interaction.values[0];
            
            const createHelpEmbed = (idx) => {
                const desc = pages[idx] || '...';
                return new EmbedBuilder()
                    .setTitle('📖 ' + title)
                    .setDescription(desc)
                    .setColor('#0099ff')
                    .setFooter({ text: `${idx + 1}/${pages.length}` });
            };

            const createHelpRow = (idx) => {
                const rowComponents = [
                    new ButtonBuilder().setCustomId('prev_help').setEmoji('⬅️').setStyle(ButtonStyle.Primary).setDisabled(idx === 0),
                    new ButtonBuilder().setCustomId('next_help').setEmoji('➡️').setStyle(ButtonStyle.Primary).setDisabled(idx === pages.length - 1)
                ];
                return new ActionRowBuilder().addComponents(rowComponents);
            };

            if (category === 'sticker_help') {
                title = await t('Sticker Commands', langCode);
                const stickerCommands = [
                    { cmd: '/add_sticker', desc: 'Add a new sticker to your server with a custom name' },
                    { cmd: '/image_to_sticker', desc: 'Convert an image attachment into a server sticker instantly' },
                    { cmd: '/rename_sticker', desc: 'Change the name of an existing server sticker' },
                    { cmd: '/delete_sticker', desc: 'Permanently remove a specific sticker from your server' },
                    { cmd: '/delete_all_stickers', desc: 'Remove all stickers from your server (Admin only, requires confirmation)' },
                    { cmd: '/list_stickers', desc: 'View a complete list of all stickers currently in your server' },
                    { cmd: '/sticker_to_emoji', desc: 'Transform any existing server sticker into a custom emoji' },
                    { cmd: '/sticker_to_image', desc: 'Convert a server sticker into a downloadable image file' },
                    { cmd: '/enhance_sticker', desc: 'Improve a sticker\'s resolution and quality before saving it to the server' },
                    { cmd: '/suggest_sticker', desc: 'Suggests 5 random stickers from other servers (useful if you don\'t have Nitro)' },
                    { cmd: '/get_sticker_id', desc: 'Get the ID of a specific sticker' }
                ];
                for (let i = 0; i < stickerCommands.length; i += 5) {
                    let pageContent = `**${await t('Commands related to stickers', langCode)}**\n\n`;
                    const chunk = stickerCommands.slice(i, i + 5);
                    for (const item of chunk) { pageContent += `${await t(item.desc, langCode)}: **${item.cmd}**\n\n`; }
                    pages.push(pageContent);
                }
            } else if (category === 'emoji_help') {
                title = await t('Emoji Commands', langCode);
                const emojiCommands = [
                    { cmd: '/emoji_search', desc: 'Search for specific emojis by name across multiple servers' },
                    { cmd: '/add_emoji', desc: 'Add a new emoji to your server using a custom name or ID' },
                    { cmd: '/image_to_emoji', desc: 'Convert an image attachment into a server emoji instantly' },
                    { cmd: '/rename_emoji', desc: 'Change the name of an existing server emoji' },
                    { cmd: '/delete_emoji', desc: 'Permanently remove a specific emoji from your server' },
                    { cmd: '/delete_all_emojis', desc: 'Remove all emojis from your server (Admin only, requires confirmation)' },
                    { cmd: '/list_emojis', desc: 'View a complete list of all emojis currently in your server' },
                    { cmd: '/enhance_emoji', desc: 'Improve an emoji\'s resolution and quality before adding it to the server' },
                    { cmd: '/emoji_to_sticker', desc: 'Transform any existing server emoji into a high-quality sticker' },
                    { cmd: '/emoji_to_image', desc: 'Convert any emoji into a downloadable image file' },
                    { cmd: '/emoji_pack', desc: 'Get a curated pack of suggested emojis to enhance your server' },
                    { cmd: '/get_emoji_id', desc: 'Get the ID of a specific emoji' }
                ];
                for (let i = 0; i < emojiCommands.length; i += 5) {
                    let pageContent = `**${await t('Commands related to emojis', langCode)}**\n\n`;
                    const chunk = emojiCommands.slice(i, i + 5);
                    for (const item of chunk) { pageContent += `${await t(item.desc, langCode)}: **${item.cmd}**\n\n`; }
                    if (i + 5 >= emojiCommands.length) { pageContent += `💡 *${await t('If you do not have Nitro, you can use /suggest_emojis and the bot will suggest 5 random emojis from other servers it is in.', langCode)}*`; }
                    pages.push(pageContent);
                }
            } else if (category === 'info_help') {
                title = await t('Info Commands', langCode);
                const pageContent = `**${await t('Utility and status commands', langCode)}**\n\n` +
                    `${await t('Set permissions for emoji suggestions (Owner only)', langCode)}: **/emoji_permission**\n\n` +
                    `${await t('Set permissions for sticker suggestions (Owner only)', langCode)}: **/sticker_permission**\n\n` +
                    `${await t('Set mass deletion approval requirement (Owner only)', langCode)}: **/delete_permission**\n\n` +
                    `${await t('Change the bot\'s language setting (Owner only)', langCode)}: **/language**\n\n` +
                    `${await t('View bot status, latency, and vote status', langCode)}: **/status**\n\n` +
                    `🔗 [${await t('Vote ProEmoji', langCode)}](https://top.gg/bot/1009426679061553162/vote)`;
                pages.push(pageContent);
            }

            if (pages.length === 0) { pages.push(await t('No commands found in this category.', langCode)); }

            await interaction.editReply({ 
                embeds: [createHelpEmbed(0)], 
                components: pages.length > 1 ? [row, createHelpRow(0)] : [row]
            }).catch(e => console.error('Error editing help reply:', e));

            if (pages.length > 1) {
                const collector = interaction.message.createMessageComponentCollector({ 
                    filter: i => i.user.id === interaction.user.id && (i.customId === 'prev_help' || i.customId === 'next_help'),
                    time: 60000 
                });
                collector.on('collect', async i => {
                    try {
                        if (!i.deferred && !i.replied) await i.deferUpdate().catch(() => {});
                        const currentMessage = await interaction.fetchReply();
                        const currentFooter = currentMessage.embeds[0]?.footer?.text;
                        const currentTitle = currentMessage.embeds[0]?.title;
                        if (currentTitle !== '📖 ' + title) { collector.stop(); return; }
                        if (currentFooter) { const [pagePart] = currentFooter.split('/'); currentPage = parseInt(pagePart) - 1; }
                        if (i.customId === 'prev_help') currentPage--; else currentPage++;
                        if (currentPage < 0) currentPage = 0;
                        if (currentPage >= pages.length) currentPage = pages.length - 1;
                        const newEmbed = createHelpEmbed(currentPage);
                        const newRow = createHelpRow(currentPage);
                        await i.editReply({ embeds: [newEmbed], components: pages.length > 1 ? [row, newRow] : [row] }).catch(() => {});
                    } catch (e) { console.error('Error in help collector:', e); }
                });
            }
        } catch (e) { console.error('Error in help interaction handler:', e); }
        return;
    }

    if (interaction.isStringSelectMenu() && interaction.customId === 'language_select') {
        const selectedLang = interaction.values[0];
        const langInfo = SUPPORTED_LANGUAGES[selectedLang];
        await db.setServerLanguage(interaction.guild.id, selectedLang);
        serverLanguages.set(interaction.guild.id, selectedLang);
        const successTitle = await t('Language Updated!', selectedLang);
        const embed = new EmbedBuilder().setTitle(successTitle).setDescription(`${langInfo.flag} ${langInfo.native} (${langInfo.name})`).setColor('#00FFFF');
        try { if (!interaction.deferred && !interaction.replied) { await interaction.update({ embeds: [embed], components: [] }); } } catch (e) {}
        return;
    }
    
    if (!interaction.isCommand()) return;
    
    const hasPermission = await checkPermissions(interaction, langCode);
    if (!hasPermission) return;

    const safeDefer = async (ephemeral = false) => {
        if (!interaction.deferred && !interaction.replied) {
            await interaction.deferReply({ flags: ephemeral ? MessageFlags.Ephemeral : 0 }).catch(() => {});
        }
    };

    const showLoading = async (cmdName) => {
        const loadingText = LOADING_MESSAGES[cmdName] || 'Processing';
        const loadingEmbed = new EmbedBuilder().setDescription('⏳ ' + await t(loadingText + '... please wait.', langCode)).setColor('#FFFF00');
        await interaction.editReply({ embeds: [loadingEmbed] }).catch(() => {});
    };

    try {
        if (interaction.commandName === 'ping') {
            await safeDefer(); await showLoading('ping');
            const ping = require('./src/commands/storage/ping');
            await ping.execute(interaction, langCode).catch(async err => {
                console.error(`Error in ping: ${err.message}`);
                const errMsg = '❌ ' + await t('An error occurred while executing this command.', langCode);
                await interaction.editReply({ content: errMsg, embeds: [] }).catch(() => {});
            });
        }
        else if (interaction.commandName === 'get_emoji_id') {
            await safeDefer(); await showLoading('get_emoji_id');
            await getemojiid.execute(interaction, langCode).catch(async err => {
                console.error(`Error in get_emoji_id: ${err.message}`);
                const errMsg = '❌ ' + await t('An error occurred while executing this command.', langCode);
                await interaction.editReply({ content: errMsg, embeds: [] }).catch(() => {});
            });
        }
        else if (interaction.commandName === 'get_sticker_id') {
            await safeDefer(); await showLoading('get_sticker_id');
            const response = await getstickerid.execute(interaction, langCode).catch(async err => {
                console.error(`Error in get_sticker_id: ${err.message}`);
                const errMsg = '❌ ' + await t('An error occurred while executing this command.', langCode);
                await interaction.editReply({ content: errMsg, embeds: [] }).catch(() => {});
            });
            if (response && response.id) {
                stickerDeletionSessions.set(response.id, { guildId: interaction.guild.id, userId: interaction.user.id, langCode: langCode, messageId: response.id, channelId: response.channel.id, isIdRetrieval: true });
                setTimeout(() => stickerDeletionSessions.has(response.id) && stickerDeletionSessions.delete(response.id), 180000);
            }
        }
        else if (interaction.commandName === 'status') {
            await safeDefer(); await showLoading('status');
            await status.execute(interaction, langCode).catch(async err => {
                console.error(`Error in status: ${err.message}`);
                const errMsg = '❌ ' + await t('An error occurred while executing this command.', langCode);
                await interaction.editReply({ content: errMsg, embeds: [] }).catch(() => {});
            });
        }
        else if (interaction.commandName === 'verify') {
            await interaction.deferReply({ flags: 64 });
            await verify.execute(interaction, langCode).catch(async err => {
                console.error(`Error in verify: ${err.message}`);
                try { await interaction.editReply({ content: '❌ ' + await t('An error occurred while executing this command.', langCode) }).catch(() => {}); } catch (e) {}
            });
        }
        else if (interaction.commandName === 'help') {
            const help = require('./src/commands/storage/help');
            await help.execute(interaction, langCode).catch(async err => {
                console.error(`Error in help: ${err.message}`);
                const errMsg = '❌ ' + await t('An error occurred while executing this command.', langCode);
                if (interaction.replied || interaction.deferred) { await interaction.editReply({ content: errMsg, embeds: [] }).catch(() => {}); }
                else { await interaction.reply({ content: errMsg, flags: MessageFlags.Ephemeral }).catch(() => {}); }
            });
        }
        else if (interaction.commandName === 'vote') { await safeDefer(); await showLoading('vote'); await vote.execute(interaction, langCode); }
        else if (interaction.commandName === 'language') { await safeDefer(true); await showLoading('language'); await language.execute(interaction, langCode); }
        else if (interaction.commandName === 'delete_all_emojis') { await safeDefer(true); await showLoading('delete_all_emojis'); await deleteallemojis.execute(interaction, langCode); }
        else if (interaction.commandName === 'delete_all_stickers') { await safeDefer(true); await showLoading('delete_all_stickers'); await deleteallstickers.execute(interaction, langCode); }
        else if (interaction.commandName === 'delete_permission') { await safeDefer(true); await showLoading('delete_permission'); await deletepermission.execute(interaction, langCode); }
        else if (interaction.commandName === 'emoji_permission') { await safeDefer(true); await showLoading('emoji_permission'); await emojiPermission.execute(interaction, langCode); }
        else if (interaction.commandName === 'sticker_permission') { await safeDefer(true); await showLoading('sticker_permission'); await stickerPermission.execute(interaction, langCode); }
        else if (interaction.commandName === 'emoji_search') { await safeDefer(); await showLoading('emoji_search'); await emojisearch.execute(interaction, langCode); }
        else if (interaction.commandName === 'search_sticker') { await safeDefer(); await showLoading('search_sticker'); await searchsticker.execute(interaction, langCode); }
        else if (interaction.commandName === 'emoji_pack') { await safeDefer(); await showLoading('emoji_pack'); await emojipack.execute(interaction, langCode); }
        else if (interaction.commandName === 'add_to_pack') { await safeDefer(true); await showLoading('add_to_pack'); await addtopack.execute(interaction, langCode); }
        else if (interaction.commandName === 'delete_from_pack') { await safeDefer(true); await showLoading('delete_from_pack'); await deletefrompack.execute(interaction, langCode); }
        else if (interaction.commandName === 'suggest_emojis') { await safeDefer(); await showLoading('suggest_emojis'); await suggestemojis.execute(interaction, langCode); }
        else if (interaction.commandName === 'suggest_sticker') { await safeDefer(); await showLoading('suggest_sticker'); await suggeststicker.execute(interaction, langCode); }
        else if (interaction.commandName === 'enhance_sticker') { await safeDefer(); await showLoading('enhance_sticker'); const response = await enhancesticker.execute(interaction, langCode); if (response && response.id) { stickerEnhanceSessions.set(response.id, { guildId: interaction.guild.id, userId: interaction.user.id, langCode: langCode, messageId: response.id, channelId: response.channel.id, stickerUrl: response.url }); setTimeout(() => stickerEnhanceSessions.delete(response.id), 300000); } }
        else if (interaction.commandName === 'enhance_emoji') { await safeDefer(); await showLoading('enhance_emoji'); const response = await enhanceemoji.execute(interaction, langCode); if (response && response.id) { emojiEnhanceSessions.set(response.id, { guildId: interaction.guild.id, userId: interaction.user.id, langCode: langCode, messageId: response.id, channelId: response.channel.id, emojiUrl: response.url }); setTimeout(() => emojiEnhanceSessions.delete(response.id), 300000); } }
        else if (interaction.commandName === 'add_emoji') { await safeDefer(); await showLoading('add_emoji'); await addemojiCmd.execute(interaction, langCode); }
        else if (interaction.commandName === 'image_to_emoji') { await safeDefer(); await showLoading('image_to_emoji'); await imagetoemoji.execute(interaction, langCode); }
        else if (interaction.commandName === 'emoji_to_sticker') { await safeDefer(); await showLoading('emoji_to_sticker'); await emojiTosticker.execute(interaction, langCode); }
        else if (interaction.commandName === 'list_emojis') { await safeDefer(); await showLoading('list_emojis'); await listemoji.execute(interaction, langCode); }
        else if (interaction.commandName === 'list_stickers') { await safeDefer(); await showLoading('list_stickers'); await liststicker.execute(interaction, langCode); }
        else if (interaction.commandName === 'delete_emoji') { await safeDefer(); await showLoading('delete_emoji'); await deletemoji.execute(interaction, langCode); }
        else if (interaction.commandName === 'rename_emoji') { await safeDefer(); await showLoading('rename_emoji'); await renameemoji.execute(interaction, langCode); }
        else if (interaction.commandName === 'emoji_to_image') { await safeDefer(); await showLoading('emoji_to_image'); await emojitoimage.execute(interaction, langCode); }
        else if (interaction.commandName === 'add_sticker') { await safeDefer(); await showLoading('add_sticker'); const response = await addsticker.execute(interaction, langCode); if (response && response.id) { stickerAddSessions.set(response.id, { guildId: interaction.guild.id, userId: interaction.user.id, langCode: langCode, messageId: response.id, channelId: response.channel.id, stickerId: response.stickerId, stickerName: response.stickerName }); setTimeout(() => stickerAddSessions.delete(response.id), 300000); } }
        else if (interaction.commandName === 'image_to_sticker') { await safeDefer(); await showLoading('image_to_sticker'); await imagetosticker.execute(interaction, langCode); }
        else if (interaction.commandName === 'sticker_to_emoji') { await safeDefer(); await showLoading('sticker_to_emoji'); const response = await stickertoemi.execute(interaction, langCode); if (response && response.id) { stickerToEmojiSessions.set(response.id, { guildId: interaction.guild.id, userId: interaction.user.id, langCode: langCode, messageId: response.id, channelId: response.channel.id, stickerUrl: response.url, emojiName: response.emojiName }); setTimeout(() => stickerToEmojiSessions.delete(response.id), 300000); } }
        else if (interaction.commandName === 'sticker_to_image') {
            await safeDefer();
            await showLoading('sticker_to_image');
            await stickertoimage.execute(interaction, langCode).catch(async err => {
                console.error(`Error in sticker_to_image: ${err.message}`);
                const errMsg = '❌ ' + await t('An error occurred while executing this command.', langCode);
                await interaction.editReply({ content: errMsg, embeds: [] }).catch(() => {});
            });
        }
        else if (interaction.commandName === 'delete_sticker') { await safeDefer(); await showLoading('delete_sticker'); const response = await deletesticker.execute(interaction, langCode); if (response && response.id) { stickerDeletionSessions.set(response.id, { guildId: interaction.guild.id, userId: interaction.user.id, langCode: langCode, messageId: response.id, channelId: response.channel.id, stickerId: response.stickerId }); setTimeout(() => stickerDeletionSessions.delete(response.id), 300000); } }
        else if (interaction.commandName === 'rename_sticker') { await safeDefer(); await showLoading('rename_sticker'); const response = await renamesticker.execute(interaction, langCode); if (response && response.id) { stickerRenameSessions.set(response.id, { guildId: interaction.guild.id, userId: interaction.user.id, langCode: langCode, messageId: response.id, channelId: response.channel.id, stickerId: response.stickerId, newName: response.newName }); setTimeout(() => stickerRenameSessions.delete(response.id), 300000); } }
        else if (interaction.commandName === 'update') {
            if (interaction.user.id !== '815701106235670558') { return await interaction.reply({ content: 'Only the bot owner can use this command.', flags: MessageFlags.Ephemeral }); }
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });
            const { REST, Routes } = require('discord.js');
            const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN || process.env.token || process.env.DISCORD_TOKEN);
            try { await rest.put(Routes.applicationCommands(client.user.id), { body: COMMAND_DEFINITIONS }); await interaction.editReply('✅ Commands updated successfully!'); }
            catch (error) { console.error(error); await interaction.editReply('❌ Failed to update commands.'); }
        }
    } catch (error) {
        console.error('Interaction error:', error);
        const errMsg = '❌ ' + await t('An error occurred while processing this command.', langCode);
        try { if (interaction.deferred || interaction.replied) { await interaction.editReply({ content: errMsg, embeds: [] }).catch(() => {}); } else { await interaction.reply({ content: errMsg, flags: MessageFlags.Ephemeral }).catch(() => {}); } } catch (e) {}
    }
});

client.on('messageCreate', async message => {
    if (message.author.bot) return;

    const session = activeStickerSessions.get(message.author.id);
    if (!session) return;

    if (message.channelId !== session.channelId) return;

    const sticker = message.stickers.first();
    if (!sticker) return;

    const langCode = session.langCode || 'en';

    try {
        if (session.type === 'sticker_to_image') {
            const embed = new EmbedBuilder()
                .setTitle('🖼️ ' + await t('Sticker to Image', langCode))
                .setDescription(await t('Here is your sticker as an image:', langCode))
                .setImage(sticker.url)
                .setColor('#00FFFF');
            
            await message.reply({ embeds: [embed] });
            activeStickerSessions.delete(message.author.id);
        } else if (session.type === 'delete_sticker') {
            if (sticker.guild.id !== message.guild.id) {
                return message.reply('❌ ' + await t('You can only delete stickers from this server.', langCode));
            }
            await sticker.delete();
            await message.reply('✅ ' + await t('Sticker deleted successfully.', langCode));
            activeStickerSessions.delete(message.author.id);
        } else if (session.type === 'add_sticker') {
            await message.guild.stickers.create({
                file: sticker.url,
                name: session.stickerName || sticker.name,
                tags: sticker.tags || 'emoji'
            });
            await message.reply('✅ ' + await t('Sticker added successfully.', langCode));
            activeStickerSessions.delete(message.author.id);
        } else if (session.type === 'rename_sticker') {
            if (sticker.guild.id !== message.guild.id) {
                return message.reply('❌ ' + await t('You can only rename stickers from this server.', langCode));
            }
            await sticker.edit({ name: session.newName });
            await message.reply('✅ ' + await t('Sticker renamed successfully.', langCode));
            activeStickerSessions.delete(message.author.id);
        }
    } catch (error) {
        console.error('Session error:', error);
        await message.reply('❌ ' + await t('An error occurred:', langCode) + ' ' + error.message);
    }
});

client.once('clientReady', async () => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`🤖 Bot: ${client.user.tag}`);
    console.log('✅ Status: Online and Ready!');
    console.log(`📊 Servers: ${client.guilds.cache.size}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    try {
        const { REST, Routes } = require('discord.js');
        const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN || process.env.token || process.env.DISCORD_TOKEN);
        const ownerId = '815701106235670558';
        const targetGuildId = '1118153648938160191';
        const restrictedCommands = COMMAND_DEFINITIONS.filter(cmd => ['update', 'add_to_pack', 'delete_from_pack'].includes(cmd.name));
        await rest.put(Routes.applicationGuildCommands(client.user.id, targetGuildId), { body: restrictedCommands });
        console.log('✅ Restricted commands (/update, /add_to_pack, /delete_from_pack) registered');
        console.log('✅ Cache pre-warming in progress (non-blocking)');
        preWarmCache().catch(err => console.error('Cache pre-warming error:', err));
    } catch (err) {
        console.error('Error during startup:', err);
    }
});

async function startServer() {
    try {
        await db.initDatabase();
        console.log('✅ Database initialized');
        const PORT = process.env.PORT || 5000;
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`🌐 Web server running on port ${PORT}`);
        });
        await client.login(process.env.DISCORD_BOT_TOKEN || process.env.token || process.env.DISCORD_TOKEN);
    } catch (error) {
        console.error('❌ Failed to start bot:', error);
        process.exit(1);
    }
}

startServer();
