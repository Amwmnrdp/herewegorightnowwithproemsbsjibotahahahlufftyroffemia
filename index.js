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
    'update': 'Updating bot'
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

const TOP_GG_API_KEY = process.env.TOP_GG_API_KEY;
const TOP_GG_BOT_ID = process.env.TOP_GG_BOT_ID;

async function checkVerification(interaction, langCode) {
    const userId = interaction.user.id;
    let hasVoted = false;
    try {
        if (TOP_GG_API_KEY && TOP_GG_BOT_ID) {
            const response = await axios.get(`https://top.gg/api/bots/${TOP_GG_BOT_ID}/check?userId=${userId}`, {
                headers: { 'Authorization': TOP_GG_API_KEY }
            });
            hasVoted = response.data.voted === 1;
        }
    } catch (error) {
        console.error('⚠️ Top.gg vote check failed:', error.message);
    }
    
    if (!hasVoted) {
        const embed = new EmbedBuilder()
            .setTitle('🔐 ' + await t('Verification Required', langCode))
            .setDescription(await t('You must vote for the bot on Top.gg to use this command.', langCode) + 
                `\n\n🔗 **${await t('Click here to vote:', langCode)}** https://top.gg/bot/${TOP_GG_BOT_ID}/vote`)
            .setColor('#FF6B6B')
            .setFooter({ text: await t('This message is only visible to you.', langCode) });
        
        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        return false;
    }
    return true;
}

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
    const langCode = interaction.guild ? await getServerLanguage(interaction.guild.id) : 'en';
    console.log(`[Interaction] type: ${interaction.type}, customId: ${interaction.customId}, guild: ${interaction.guild?.id}, lang: ${langCode}`);

    if (interaction.isCommand()) {
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

            if (interaction.values[0] === 'sticker_help') {
                title = await t('Sticker Commands', langCode);
                const stickerCommands = [
                    { cmd: '/add_sticker', desc: 'Add a new sticker to your server with a custom name' },
                    { cmd: '/image_to_sticker', desc: 'Convert an image URL or attachment into a server sticker instantly' },
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
                    for (const item of chunk) {
                        pageContent += `${await t(item.desc, langCode)}: **${item.cmd}**\n\n`;
                    }
                    pages.push(pageContent);
                }
            } else if (interaction.values[0] === 'emoji_help') {
                title = await t('Emoji Commands', langCode);
                const emojiCommands = [
                    { cmd: '/emoji_search', desc: 'Search for specific emojis by name across multiple servers' },
                    { cmd: '/add_emoji', desc: 'Add a new emoji to your server using a custom name or ID' },
                    { cmd: '/image_to_emoji', desc: 'Convert an image URL or attachment into a server emoji instantly' },
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
                    for (const item of chunk) {
                        pageContent += `${await t(item.desc, langCode)}: **${item.cmd}**\n\n`;
                    }
                    if (i + 5 >= emojiCommands.length) {
                        pageContent += `💡 *${await t('If you do not have Nitro, you can use /suggest_emojis and the bot will suggest 5 random emojis from other servers it is in.', langCode)}*`;
                    }
                    pages.push(pageContent);
                }
            } else if (interaction.values[0] === 'info_help') {
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

            if (pages.length === 0) {
                pages.push(await t('No commands found in this category.', langCode));
            }

            let currentPage = 0;
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

            await interaction.editReply({ 
                embeds: [createHelpEmbed(0)], 
                components: pages.length > 1 ? [row, createHelpRow(0)] : [row]
            }).catch(e => console.error('Error editing help reply:', e));

            if (pages.length > 1) {
                const collector = interaction.message.createMessageComponentCollector({ 
                    filter: i => i.user.id === interaction.user.id && (i.customId === 'prev_help' || i.customId === 'next_help'),
                    time: 180000 
                });

                collector.on('collect', async i => {
                    try {
                        if (!i.deferred && !i.replied) await i.deferUpdate().catch(() => {});
                        if (i.customId === 'prev_help') currentPage--;
                        else currentPage++;
                        await i.editReply({ embeds: [createHelpEmbed(currentPage)], components: [row, createHelpRow(currentPage)] });
                    } catch (e) {
                        console.error('Error in help collector:', e);
                    }
                });
            }
        } catch (e) {
            console.error('Error in help interaction handler:', e);
        }
        return;
    }

    if (interaction.isStringSelectMenu() && interaction.customId === 'language_select') {
        const selectedLang = interaction.values[0];
        const langInfo = SUPPORTED_LANGUAGES[selectedLang];
        await db.setServerLanguage(interaction.guild.id, selectedLang);
        
        // Update local cache so it's immediate
        serverLanguages.set(interaction.guild.id, selectedLang);
        
        const successTitle = await t('Language Updated!', selectedLang);
        const embed = new EmbedBuilder()
            .setTitle(successTitle)
            .setDescription(`${langInfo.flag} ${langInfo.native} (${langInfo.name})`)
            .setColor('#00FFFF');
        try {
            if (!interaction.deferred && !interaction.replied) {
                await interaction.update({ embeds: [embed], components: [] });
            }
        } catch (e) {}
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
        const loadingEmbed = new EmbedBuilder()
            .setDescription('⏳ ' + await t(loadingText + '... please wait.', langCode))
            .setColor('#FFFF00');
        await interaction.editReply({ embeds: [loadingEmbed] }).catch(() => {});
    };

    try {
        if (interaction.commandName === 'ping') {
            await safeDefer();
            await showLoading('ping');
            const ping = require('./src/commands/storage/ping');
            await ping.execute(interaction, langCode).catch(async err => {
                console.error(`Error in ping: ${err.message}`);
                const errMsg = '❌ ' + await t('An error occurred while executing this command.', langCode);
                await interaction.editReply({ content: errMsg, embeds: [] }).catch(() => {});
            });
        }
        else if (interaction.commandName === 'get_emoji_id') {
            await safeDefer();
            await showLoading('get_emoji_id');
            await getemojiid.execute(interaction, langCode).catch(async err => {
                console.error(`Error in get_emoji_id: ${err.message}`);
                const errMsg = '❌ ' + await t('An error occurred while executing this command.', langCode);
                await interaction.editReply({ content: errMsg, embeds: [] }).catch(() => {});
            });
        }
        else if (interaction.commandName === 'get_sticker_id') {
            await safeDefer();
            await showLoading('get_sticker_id');
            const response = await getstickerid.execute(interaction, langCode).catch(async err => {
                console.error(`Error in get_sticker_id: ${err.message}`);
                const errMsg = '❌ ' + await t('An error occurred while executing this command.', langCode);
                await interaction.editReply({ content: errMsg, embeds: [] }).catch(() => {});
            });
            if (response && response.id) {
                stickerDeletionSessions.set(response.id, {
                    guildId: interaction.guild.id,
                    userId: interaction.user.id,
                    langCode: langCode,
                    messageId: response.id,
                    channelId: response.channel.id,
                    isIdRetrieval: true
                });
                setTimeout(() => stickerDeletionSessions.has(response.id) && stickerDeletionSessions.delete(response.id), 180000);
            }
        }
        else if (interaction.commandName === 'status') {
            await safeDefer();
            await showLoading('status');
            await status.execute(interaction, langCode).catch(async err => {
                console.error(`Error in status: ${err.message}`);
                const errMsg = '❌ ' + await t('An error occurred while executing this command.', langCode);
                await interaction.editReply({ content: errMsg, embeds: [] }).catch(() => {});
            });
        }
        else if (interaction.commandName === 'help') {
            await safeDefer();
            await showLoading('help');
            await help.execute(interaction, langCode).catch(async err => {
                console.error(`Error in help: ${err.message}`);
                const errMsg = '❌ ' + await t('An error occurred while executing this command.', langCode);
                await interaction.editReply({ content: errMsg, embeds: [] }).catch(() => {});
            });
        }
        else if (interaction.commandName === 'vote') {
            await safeDefer();
            await showLoading('vote');
            await vote.execute(interaction, langCode).catch(async err => {
                console.error(`Error in vote: ${err.message}`);
                const errMsg = '❌ ' + await t('An error occurred while executing this command.', langCode);
                await interaction.editReply({ content: errMsg, embeds: [] }).catch(() => {});
            });
        }
        else if (interaction.commandName === 'delete_all_emojis') {
            await safeDefer();
            await showLoading('delete_all_emojis');
            
            const perms = await db.getServerPermissions(interaction.guild.id);
            const deletePermEnabled = perms ? perms.delete_permission_enabled : true;
            
            if (!deletePermEnabled && interaction.user.id !== interaction.guild.ownerId) {
                const approvalEmbed = new EmbedBuilder()
                    .setTitle('🛡️ ' + await t('Approval Required', langCode))
                    .setDescription(`**${interaction.user.displayName} (@${interaction.user.username})** ` + await t('wants to delete all emojis.', langCode) + `\n\n**${await t('Do you approve?', langCode)}**`)
                    .setColor('#FFA500')
                    .setFooter({ text: await t('3-minute timeout for owner to respond.', langCode) });

                const buttons = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('approve_delete_emojis').setLabel(await t('Allow', langCode)).setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId('deny_delete_emojis').setLabel(await t('Deny', langCode)).setStyle(ButtonStyle.Danger)
                );

                const approvalMsg = await interaction.channel.send({ content: `<@${interaction.guild.ownerId}>`, embeds: [approvalEmbed], components: [buttons] });
                
                const waitEmbed = new EmbedBuilder()
                    .setDescription('⏳ ' + await t('Approval request sent to the server owner.', langCode))
                    .setColor('#FFFF00');
                await interaction.editReply({ embeds: [waitEmbed] }).catch(() => {});
                
                const filter = i => i.user.id === interaction.guild.ownerId && (i.customId === 'approve_delete_emojis' || i.customId === 'deny_delete_emojis');
                const collector = approvalMsg.createMessageComponentCollector({ filter, time: 180000 });

                collector.on('collect', async i => {
                    if (!i.deferred && !i.replied) await i.deferUpdate().catch(() => {});
                    if (i.customId === 'approve_delete_emojis') {
                        const processingEmbed = new EmbedBuilder()
                            .setDescription('⏳ ' + await t('Processing request... Please wait.', langCode))
                            .setColor('#FFFF00');
                        await interaction.editReply({ embeds: [processingEmbed], components: [] }).catch(() => {});

                        await deleteallemojis.execute(interaction, langCode).catch(async err => {
                            console.error(`Error in delete_all_emojis: ${err.message}`);
                            const errorEmbed = new EmbedBuilder()
                                .setDescription('❌ ' + await t('An error occurred while executing this command.', langCode))
                                .setColor('#FF0000');
                            await interaction.editReply({ embeds: [errorEmbed], components: [] }).catch(() => {});
                        });
                        await interaction.followUp({ content: `<@${interaction.user.id}> ✅ ` + await t('Your request to delete all emojis was approved.', langCode) }).catch(() => {});
                    } else {
                        const denyEmbed = new EmbedBuilder()
                            .setDescription('❌ ' + await t('Mass deletion request rejected.', langCode))
                            .setColor('#FF0000');
                        await interaction.editReply({ embeds: [denyEmbed], components: [] }).catch(() => {});
                        
                        try {
                            const owner = await interaction.guild.fetchOwner();
                            const warningEmbed = new EmbedBuilder()
                                .setTitle('⚠️ ' + await t('Mass Deletion Denied', langCode))
                                .setDescription(await t('An administrator tried to delete all emojis, but the request was denied.', langCode) + `\n\n**Admin:** ${interaction.user.tag}`)
                                .setColor('#FF0000')
                                .setTimestamp();
                            await owner.send({ embeds: [warningEmbed] }).catch(() => {});
                        } catch (e) {
                            console.error('Failed to send DM to owner:', e.message);
                        }

                        await interaction.followUp({ content: `<@${interaction.user.id}> ❌ ` + await t('Your request to delete all emojis was rejected.', langCode) }).catch(() => {});
                    }
                    collector.stop();
                });
                return;
            }

            await showLoading('delete_all_emojis');

            await deleteallemojis.execute(interaction, langCode).catch(async err => {
                console.error(`Error in delete_all_emojis: ${err.message}`);
                const errorEmbed = new EmbedBuilder()
                    .setDescription('❌ ' + await t('An error occurred while executing this command.', langCode))
                    .setColor('#FF0000');
                await interaction.editReply({ embeds: [errorEmbed] }).catch(() => {});
            });
        }
        else if (interaction.commandName === 'delete_all_stickers') {
            await safeDefer();
            await showLoading('delete_all_stickers');

            const perms = await db.getServerPermissions(interaction.guild.id);
            const deletePermEnabled = perms ? perms.delete_permission_enabled : true;

            if (!deletePermEnabled && interaction.user.id !== interaction.guild.ownerId) {
                const approvalEmbed = new EmbedBuilder()
                    .setTitle('🛡️ ' + await t('Approval Required', langCode))
                    .setDescription(`**${interaction.user.displayName} (@${interaction.user.username})** ` + await t('wants to delete all stickers.', langCode) + `\n\n**${await t('Do you approve?', langCode)}**`)
                    .setColor('#FFA500')
                    .setFooter({ text: await t('3-minute timeout for owner to respond.', langCode) });

                const buttons = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('approve_delete_stickers').setLabel(await t('Allow', langCode)).setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId('deny_delete_stickers').setLabel(await t('Deny', langCode)).setStyle(ButtonStyle.Danger)
                );

                const approvalMsg = await interaction.channel.send({ content: `<@${interaction.guild.ownerId}>`, embeds: [approvalEmbed], components: [buttons] });
                
                const waitEmbed = new EmbedBuilder()
                    .setDescription('⏳ ' + await t('Approval request sent to the server owner.', langCode))
                    .setColor('#FFFF00');
                await interaction.editReply({ embeds: [waitEmbed] }).catch(() => {});
                
                const filter = i => i.user.id === interaction.guild.ownerId && (i.customId === 'approve_delete_stickers' || i.customId === 'deny_delete_stickers');
                const collector = approvalMsg.createMessageComponentCollector({ filter, time: 180000 });

                collector.on('collect', async i => {
                    if (!i.deferred && !i.replied) await i.deferUpdate().catch(() => {});
                    if (i.customId === 'approve_delete_stickers') {
                        const processingEmbed = new EmbedBuilder()
                            .setDescription('⏳ ' + await t('Processing request... Please wait.', langCode))
                            .setColor('#FFFF00');
                        await interaction.editReply({ embeds: [processingEmbed], components: [] }).catch(() => {});

                        await deleteallstickers.execute(interaction, langCode).catch(async err => {
                            console.error(`Error in delete_all_stickers: ${err.message}`);
                            const errorEmbed = new EmbedBuilder()
                                .setDescription('❌ ' + await t('An error occurred while executing this command.', langCode))
                                .setColor('#FF0000');
                            await interaction.editReply({ embeds: [errorEmbed], components: [] }).catch(() => {});
                        });
                        await interaction.followUp({ content: `<@${interaction.user.id}> ✅ ` + await t('Your request to delete all stickers was approved.', langCode) }).catch(() => {});
                    } else {
                        const denyEmbed = new EmbedBuilder()
                            .setDescription('❌ ' + await t('Mass deletion request rejected.', langCode))
                            .setColor('#FF0000');
                        await interaction.editReply({ embeds: [denyEmbed], components: [] }).catch(() => {});
                        
                        try {
                            const owner = await interaction.guild.fetchOwner();
                            const warningEmbed = new EmbedBuilder()
                                .setTitle('⚠️ ' + await t('Mass Deletion Denied', langCode))
                                .setDescription(await t('An administrator tried to delete all stickers, but the request was denied.', langCode) + `\n\n**Admin:** ${interaction.user.tag}`)
                                .setColor('#FF0000')
                                .setTimestamp();
                            await owner.send({ embeds: [warningEmbed] }).catch(() => {});
                        } catch (e) {
                            console.error('Failed to send DM to owner:', e.message);
                        }

                        await interaction.followUp({ content: `<@${interaction.user.id}> ❌ ` + await t('Your request to delete all stickers was rejected.', langCode) }).catch(() => {});
                    }
                    collector.stop();
                });
                return;
            }

            await showLoading('delete_all_stickers');

            await deleteallstickers.execute(interaction, langCode).catch(async err => {
                console.error(`Error in delete_all_stickers: ${err.message}`);
                const errorEmbed = new EmbedBuilder()
                    .setDescription('❌ ' + await t('An error occurred while executing this command.', langCode))
                    .setColor('#FF0000');
                await interaction.editReply({ embeds: [errorEmbed] }).catch(() => {});
            });
        }
        else if (interaction.commandName === 'delete_permission') {
            await safeDefer();
            await showLoading('delete_permission');
            await deletepermission.execute(interaction, langCode).catch(async err => {
                console.error(`Error in delete_permission: ${err.message}`);
                const errMsg = '❌ ' + await t('An error occurred while executing this command.', langCode);
                if (interaction.deferred || interaction.replied) {
                    await interaction.editReply({ content: errMsg }).catch(() => {});
                } else {
                    await interaction.reply({ content: errMsg, flags: 64 }).catch(() => {});
                }
            });
        }
        else if (interaction.commandName === 'emoji_permission') {
            await safeDefer();
            await showLoading('emoji_permission');
            const permission = require('./src/commands/storage/permission');
            await permission.execute(interaction, langCode).catch(async err => {
                console.error(`Error in emoji_permission: ${err.message}`);
                const errMsg = '❌ ' + await t('An error occurred while executing this command.', langCode);
                if (interaction.replied || interaction.deferred) {
                    await interaction.editReply({ content: errMsg }).catch(() => {});
                } else {
                    await interaction.reply({ content: errMsg, flags: MessageFlags.Ephemeral }).catch(() => {});
                }
            });
        }
        else if (interaction.commandName === 'sticker_permission') {
            await safeDefer();
            await showLoading('sticker_permission');
            await stickerPermission.execute(interaction, langCode).catch(async err => {
                console.error(`Error in sticker_permission: ${err.message}`);
                const errMsg = '❌ ' + await t('An error occurred while executing this command.', langCode);
                if (interaction.replied || interaction.deferred) {
                    await interaction.editReply({ content: errMsg }).catch(() => {});
                } else {
                    await interaction.reply({ content: errMsg, flags: MessageFlags.Ephemeral }).catch(() => {});
                }
            });
        }
        else if (interaction.commandName === 'emoji_search') {
            await safeDefer();
            await showLoading('emoji_search');
            await emojisearch.execute(interaction, langCode, client).catch(async err => {
                console.error(`Error in emoji_search: ${err.message}`);
                const errMsg = '❌ ' + await t('An error occurred while executing this command.', langCode);
                if (interaction.replied || interaction.deferred) {
                    await interaction.editReply({ content: errMsg }).catch(() => {});
                } else {
                    await interaction.reply({ content: errMsg, flags: MessageFlags.Ephemeral }).catch(() => {});
                }
            });
        }
        else if (interaction.commandName === 'search_sticker') {
            await safeDefer();
            await showLoading('search_sticker');
            await searchsticker.execute(interaction, langCode, client).catch(async err => {
                console.error(`Error in search_sticker: ${err.message}`);
                const errMsg = '❌ ' + await t('An error occurred while executing this command.', langCode);
                if (interaction.replied || interaction.deferred) {
                    await interaction.editReply({ content: errMsg }).catch(() => {});
                } else {
                    await interaction.reply({ content: errMsg, flags: MessageFlags.Ephemeral }).catch(() => {});
                }
            });
        }
        else if (interaction.commandName === 'emoji_pack') {
            await safeDefer();
            await showLoading('emoji_pack');
            await emojipack.execute(interaction, langCode, client).catch(async err => {
                console.error(`Error in emoji_pack: ${err.message}`);
                const errMsg = '❌ ' + await t('An error occurred while executing this command.', langCode);
                if (interaction.replied || interaction.deferred) {
                    await interaction.editReply({ content: errMsg }).catch(() => {});
                } else {
                    await interaction.reply({ content: errMsg, flags: MessageFlags.Ephemeral }).catch(() => {});
                }
            });
        }
        else if (interaction.commandName === 'add_to_pack') {
            await safeDefer();
            await showLoading('add_to_pack');
            await addtopack.execute(interaction, langCode).catch(async err => {
                console.error(`Error in add_to_pack: ${err.message}`);
                const errMsg = '❌ ' + await t('An error occurred while executing this command.', langCode);
                if (interaction.replied || interaction.deferred) {
                    await interaction.editReply({ content: errMsg }).catch(() => {});
                }
            });
        }
        else if (interaction.commandName === 'delete_from_pack') {
            await safeDefer();
            await showLoading('delete_from_pack');
            await deletefrompack.execute(interaction, langCode).catch(async err => {
                console.error(`Error in delete_from_pack: ${err.message}`);
                const errMsg = '❌ ' + await t('An error occurred while executing this command.', langCode);
                if (interaction.replied || interaction.deferred) {
                    await interaction.editReply({ content: errMsg }).catch(() => {});
                }
            });
        }
        else if (interaction.commandName === 'suggest_emojis') {
            await safeDefer();
            await showLoading('suggest_emojis');
            await suggestemojis.execute(interaction, langCode, client).catch(async err => {
                console.error(`Error in suggest_emojis: ${err.message}`);
                const errMsg = '❌ ' + await t('An error occurred while executing this command.', langCode);
                if (interaction.replied || interaction.deferred) {
                    await interaction.editReply({ content: errMsg }).catch(() => {});
                } else {
                    await interaction.reply({ content: errMsg, flags: MessageFlags.Ephemeral }).catch(() => {});
                }
            });
        }
        else if (interaction.commandName === 'suggest_sticker') {
            await safeDefer();
            await showLoading('suggest_sticker');
            await suggeststicker.execute(interaction, langCode, client).catch(async err => {
                console.error(`Error in suggest_sticker: ${err.message}`);
                const errMsg = '❌ ' + await t('An error occurred while executing this command.', langCode);
                if (interaction.replied || interaction.deferred) {
                    await interaction.editReply({ content: errMsg }).catch(() => {});
                } else {
                    await interaction.reply({ content: errMsg, flags: MessageFlags.Ephemeral }).catch(() => {});
                }
            });
        }
        else if (interaction.commandName === 'enhance_sticker') {
            await safeDefer();
            await showLoading('enhance_sticker');
            const response = await enhancesticker.execute(interaction, langCode).catch(async err => {
                console.error(`Error in enhance_sticker: ${err.message}`);
                const errMsg = '❌ ' + await t('An error occurred while executing this command.', langCode);
                if (interaction.replied || interaction.deferred) {
                    await interaction.editReply({ content: errMsg }).catch(() => {});
                } else {
                    await interaction.reply({ content: errMsg, flags: MessageFlags.Ephemeral }).catch(() => {});
                }
            });
            if (response && response.id) {
                stickerEnhanceSessions.set(response.id, {
                    guildId: interaction.guild.id,
                    userId: interaction.user.id,
                    langCode: langCode,
                    messageId: response.id,
                    channelId: response.channel.id
                });
                setTimeout(() => stickerEnhanceSessions.has(response.id) && stickerEnhanceSessions.delete(response.id), 180000);
            }
        }
        else if (interaction.commandName === 'enhance_emoji') {
            await safeDefer();
            await showLoading('enhance_emoji');
            await enhanceemoji.execute(interaction, langCode).catch(async err => {
                console.error(`Error in enhance_emoji: ${err.message}`);
                const errMsg = '❌ ' + await t('An error occurred while executing this command.', langCode);
                if (interaction.replied || interaction.deferred) {
                    await interaction.editReply({ content: errMsg }).catch(() => {});
                } else {
                    await interaction.reply({ content: errMsg, flags: MessageFlags.Ephemeral }).catch(() => {});
                }
            });
        }
        else if (interaction.commandName === 'add_emoji') {
            await safeDefer();
            await showLoading('add_emoji');
            await addemojiCmd.execute(interaction, langCode).catch(async err => {
                console.error(`Error in add_emoji: ${err.message}`);
                try {
                    const errorMessage = '❌ ' + await t('An error occurred while executing this command.', langCode);
                    if (interaction.replied || interaction.deferred) {
                        await interaction.editReply({ content: errorMessage }).catch(() => {});
                    } else {
                        await interaction.reply({ content: errorMessage, flags: 64 }).catch(() => {});
                    }
                } catch (e) {}
            });
        }
        else if (interaction.commandName === 'image_to_emoji') {
            await safeDefer();
            await showLoading('image_to_emoji');
            await imagetoemoji.execute(interaction, langCode, usedUrls).catch(async err => {
                console.error(`Error in image_to_emoji: ${err.message}`);
                const errMsg = '❌ ' + await t('An error occurred while executing this command.', langCode);
                if (interaction.replied || interaction.deferred) {
                    await interaction.editReply({ content: errMsg }).catch(() => {});
                } else {
                    await interaction.reply({ content: errMsg, flags: MessageFlags.Ephemeral }).catch(() => {});
                }
            });
        }
        else if (interaction.commandName === 'emoji_to_sticker') {
            await safeDefer();
            await showLoading('emoji_to_sticker');
            await emojiTosticker.execute(interaction, langCode, convertedEmojisToStickers).catch(async err => {
                console.error(`Error in emoji_to_sticker: ${err.message}`);
                const errMsg = '❌ ' + await t('An error occurred while executing this command.', langCode);
                if (interaction.replied || interaction.deferred) {
                    await interaction.editReply({ content: errMsg }).catch(() => {});
                } else {
                    await interaction.reply({ content: errMsg, flags: MessageFlags.Ephemeral }).catch(() => {});
                }
            });
        }
        else if (interaction.commandName === 'list_emojis') {
            await safeDefer();
            await showLoading('list_emojis');
            await listemoji.execute(interaction, langCode).catch(async err => {
                console.error(`Error in list_emojis: ${err.message}`);
                const errMsg = '❌ ' + await t('An error occurred while executing this command.', langCode);
                if (interaction.replied || interaction.deferred) {
                    await interaction.editReply({ content: errMsg }).catch(() => {});
                } else {
                    await interaction.reply({ content: errMsg, flags: MessageFlags.Ephemeral }).catch(() => {});
                }
            });
        }
        else if (interaction.commandName === 'language') {
            await safeDefer();
            await showLoading('language');
            await language.execute(interaction, langCode).catch(async err => {
                console.error(`Error in language: ${err.message}`);
                try { await interaction.editReply({ content: '❌ ' + await t('An error occurred while executing this command.', langCode) }).catch(() => {}); } catch (e) {}
            });
        }
        else if (interaction.commandName === 'delete_emoji') {
            await safeDefer();
            await showLoading('delete_emoji');
            await deletemoji.execute(interaction, langCode, convertedStickersToEmojis).catch(async err => {
                console.error(`Error in delete_emoji: ${err.message}`);
                const errMsg = '❌ ' + await t('An error occurred while executing this command.', langCode);
                if (interaction.replied || interaction.deferred) {
                    await interaction.editReply({ content: errMsg }).catch(() => {});
                } else {
                    await interaction.reply({ content: errMsg, flags: MessageFlags.Ephemeral }).catch(() => {});
                }
            });
        }
        else if (interaction.commandName === 'rename_emoji') {
            await safeDefer();
            await showLoading('rename_emoji');
            await renameemoji.execute(interaction, langCode).catch(async err => {
                console.error(`Error in rename_emoji: ${err.message}`);
                const errMsg = '❌ ' + await t('An error occurred while executing this command.', langCode);
                if (interaction.replied || interaction.deferred) {
                    await interaction.editReply({ content: errMsg }).catch(() => {});
                } else {
                    await interaction.reply({ content: errMsg, flags: MessageFlags.Ephemeral }).catch(() => {});
                }
            });
        }
        else if (interaction.commandName === 'delete_sticker') {
            await safeDefer();
            await showLoading('delete_sticker');
            const response = await deletesticker.execute(interaction, langCode).catch(async err => {
                console.error(`Error in delete_sticker: ${err.message}`);
                const errMsg = '❌ ' + await t('An error occurred while executing this command.', langCode);
                if (interaction.replied || interaction.deferred) {
                    await interaction.editReply({ content: errMsg }).catch(() => {});
                } else {
                    await interaction.reply({ content: errMsg, flags: MessageFlags.Ephemeral }).catch(() => {});
                }
            });
            if (response && response.id) {
                const msg = response;
                stickerDeletionSessions.set(msg.id, {
                    guildId: interaction.guild.id,
                    userId: interaction.user.id,
                    langCode: langCode,
                    messageId: msg.id,
                    channelId: msg.channel.id
                });
                setTimeout(() => stickerDeletionSessions.has(msg.id) && stickerDeletionSessions.delete(msg.id), 180000);
            }
        }
        else if (interaction.commandName === 'rename_sticker') {
            await safeDefer();
            await showLoading('rename_sticker');
            const response = await renamesticker.execute(interaction, langCode).catch(async err => {
                console.error(`Error in rename_sticker: ${err.message}`);
                const errMsg = '❌ ' + await t('An error occurred while executing this command.', langCode);
                if (interaction.replied || interaction.deferred) {
                    await interaction.editReply({ content: errMsg }).catch(() => {});
                } else {
                    await interaction.reply({ content: errMsg, flags: MessageFlags.Ephemeral }).catch(() => {});
                }
            });
            if (response && response.id) {
                const msg = response;
                const newName = interaction.options.getString('name');
                stickerRenameSessions.set(msg.id, {
                    guildId: interaction.guild.id,
                    userId: interaction.user.id,
                    langCode: langCode,
                    messageId: msg.id,
                    channelId: msg.channel.id,
                    newName: newName
                });
                setTimeout(() => stickerRenameSessions.has(msg.id) && stickerRenameSessions.delete(msg.id), 180000);
            }
        }
        else if (interaction.commandName === 'sticker_to_emoji') {
            await safeDefer();
            await showLoading('sticker_to_emoji');
            const response = await stickertoemi.execute(interaction, langCode).catch(async err => {
                console.error(`Error in sticker_to_emoji: ${err.message}`);
                const errMsg = '❌ ' + await t('An error occurred while executing this command.', langCode);
                if (interaction.replied || interaction.deferred) {
                    await interaction.editReply({ content: errMsg }).catch(() => {});
                } else {
                    await interaction.reply({ content: errMsg, flags: MessageFlags.Ephemeral }).catch(() => {});
                }
            });
            if (response && response.id) {
                const msg = response;
                const emojiName = interaction.options.getString('name');
                stickerToEmojiSessions.set(msg.id, {
                    guildId: interaction.guild.id,
                    userId: interaction.user.id,
                    langCode: langCode,
                    messageId: msg.id,
                    channelId: msg.channel.id,
                    emojiName: emojiName
                });
                setTimeout(() => stickerToEmojiSessions.has(msg.id) && stickerToEmojiSessions.delete(msg.id), 180000);
            }
        }
        else if (interaction.commandName === 'image_to_sticker') {
            await safeDefer();
            await showLoading('image_to_sticker');
            await imagetosticker.execute(interaction, langCode, convertedImagesToStickers).catch(async err => {
                console.error(`Error in image_to_sticker: ${err.message}`);
                const errMsg = '❌ ' + await t('An error occurred while executing this command.', langCode);
                if (interaction.replied || interaction.deferred) {
                    await interaction.editReply({ content: errMsg }).catch(() => {});
                } else {
                    await interaction.reply({ content: errMsg, flags: MessageFlags.Ephemeral }).catch(() => {});
                }
            });
        }
        else if (interaction.commandName === 'emoji_to_image') {
            await safeDefer();
            await showLoading('emoji_to_image');
            await emojitoimage.execute(interaction, langCode).catch(async err => {
                console.error(`Error in emoji_to_image: ${err.message}`);
                const errMsg = '❌ ' + await t('An error occurred while executing this command.', langCode);
                if (interaction.replied || interaction.deferred) {
                    await interaction.editReply({ content: errMsg }).catch(() => {});
                } else {
                    await interaction.reply({ content: errMsg, flags: MessageFlags.Ephemeral }).catch(() => {});
                }
            });
        }
        else if (interaction.commandName === 'sticker_to_image') {
            await safeDefer();
            await showLoading('sticker_to_image');
            const response = await stickertoimage.execute(interaction, langCode).catch(async err => {
                console.error(`Error in sticker_to_image: ${err.message}`);
                const errMsg = '❌ ' + await t('An error occurred while executing this command.', langCode);
                if (interaction.replied || interaction.deferred) {
                    await interaction.editReply({ content: errMsg }).catch(() => {});
                } else {
                    await interaction.reply({ content: errMsg, flags: MessageFlags.Ephemeral }).catch(() => {});
                }
            });
            if (response && response.id) {
                const msg = response;
                convertedStickersToEmojis.set(msg.id, {
                    guildId: interaction.guild.id,
                    userId: interaction.user.id,
                    langCode: langCode,
                    messageId: msg.id,
                    channelId: msg.channel.id,
                    type: 'image'
                });
                setTimeout(() => convertedStickersToEmojis.has(msg.id) && convertedStickersToEmojis.delete(msg.id), 180000);
            }
        }
        else if (interaction.commandName === 'enhance_emoji') {
            await safeDefer();
            await showLoading('enhance_emoji');
            await enhanceemoji.execute(interaction, langCode).catch(async err => {
                console.error(`Error in enhance_emoji: ${err.message}`);
                const errMsg = '❌ ' + await t('An error occurred while executing this command.', langCode);
                if (interaction.replied || interaction.deferred) {
                    await interaction.editReply({ content: errMsg }).catch(() => {});
                } else {
                    await interaction.reply({ content: errMsg, flags: MessageFlags.Ephemeral }).catch(() => {});
                }
            });
        }
        else if (interaction.commandName === 'enhance_sticker') {
            await safeDefer();
            await showLoading('enhance_sticker');
            const response = await enhancesticker.execute(interaction, langCode).catch(async err => {
                console.error(`Error in enhance_sticker: ${err.message}`);
                const errMsg = '❌ ' + await t('An error occurred while executing this command.', langCode);
                if (interaction.replied || interaction.deferred) {
                    await interaction.editReply({ content: errMsg }).catch(() => {});
                } else {
                    await interaction.reply({ content: errMsg, flags: MessageFlags.Ephemeral }).catch(() => {});
                }
            });
            if (response && response.id) {
                const msg = response;
                stickerEnhanceSessions.set(msg.id, {
                    guildId: interaction.guild.id,
                    userId: interaction.user.id,
                    langCode: langCode,
                    messageId: msg.id,
                    channelId: msg.channel.id
                });
                setTimeout(() => stickerEnhanceSessions.has(msg.id) && stickerEnhanceSessions.delete(msg.id), 180000);
            }
        }
        else if (interaction.commandName === 'list_stickers') {
            await safeDefer();
            await showLoading('list_stickers');
            await liststicker.execute(interaction, langCode).catch(async err => {
                console.error(`Error in list_stickers: ${err.message}`);
                const errMsg = '❌ ' + await t('An error occurred while executing this command.', langCode);
                if (interaction.replied || interaction.deferred) {
                    await interaction.editReply({ content: errMsg }).catch(() => {});
                } else {
                    await interaction.reply({ content: errMsg, flags: MessageFlags.Ephemeral }).catch(() => {});
                }
            });
        }
        else if (interaction.commandName === 'add_sticker') {
            await safeDefer();
            await showLoading('add_sticker');
            const response = await addsticker.execute(interaction, langCode).catch(async err => {
                console.error(`Error in add_sticker: ${err.message}`);
                try { await interaction.editReply({ content: '❌ ' + await t('An error occurred while executing this command.', langCode) }).catch(() => {}); } catch (e) {}
            });
            if (response && response.id) {
                const msg = response;
                const stickerName = interaction.options.getString('name');
                stickerAddSessions.set(msg.id, {
                    guildId: interaction.guild.id,
                    userId: interaction.user.id,
                    langCode: langCode,
                    messageId: msg.id,
                    channelId: msg.channel.id,
                    stickerName: stickerName
                });
                setTimeout(() => stickerAddSessions.has(msg.id) && stickerAddSessions.delete(msg.id), 180000);
            }
        }
        else if (interaction.commandName === 'suggest_sticker') {
            await safeDefer();
            await showLoading('suggest_sticker');
            await suggeststicker.execute(interaction, langCode, client).catch(async err => {
                console.error(`Error in suggest_sticker: ${err.message}`);
                const errMsg = '❌ ' + await t('An error occurred while executing this command.', langCode);
                if (interaction.replied || interaction.deferred) {
                    await interaction.editReply({ content: errMsg }).catch(() => {});
                } else {
                    await interaction.reply({ content: errMsg, flags: MessageFlags.Ephemeral }).catch(() => {});
                }
            });
        }
    } catch (error) {
        console.error('⚠️ Interaction error:', error.message);
        try {
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply({ content: '❌ An error occurred while executing this command.' }).catch(() => {});
            } else {
                await interaction.reply({ content: '❌ An error occurred while executing this command.', flags: 64 }).catch(() => {});
            }
        } catch (e) {}
    }
});

client.on('messageCreate', async message => {
    if (message.author.bot) return;
    if (!message.guild) return;
    const langCode = await db.getServerLanguage(message.guild.id);

    try {
        if (!message.stickers.size) {
            // Check for sticker enhancement session
            const stickerEnhanceSession = stickerEnhanceSessions.get(message.reference?.messageId);
            if (stickerEnhanceSession && message.author.id === stickerEnhanceSession.userId) {
                const embed = new EmbedBuilder()
                    .setDescription('❌ ' + await t('Please send a sticker, not a message!', stickerEnhanceSession.langCode))
                    .setColor('#FF0000');
                message.reply({ embeds: [embed] });
                return;
            }

            return;
        }

        const sticker = message.stickers.first();
        const enhanceSession = stickerEnhanceSessions.get(message.reference?.messageId);
        const deletionSession = stickerDeletionSessions.get(message.reference?.messageId);
        const stToEmSession = activeStickerSessions.get(message.author.id);

        if (stToEmSession && stToEmSession.type === 'sticker_to_emoji' && message.channelId === stToEmSession.channelId) {
            try {
                const emojiName = stToEmSession.data.name;
                const guildId = message.guildId;
                const db = require('./src/utils/database');
                const { t } = require('./src/utils/languages');
                const langCode = await db.getServerLanguage(guildId);

                // Check emoji limit
                const emojis = await message.guild.emojis.fetch();
                const premiumTier = message.guild.premiumTier;
                const maxEmojis = premiumTier === 3 ? 250 : premiumTier === 2 ? 150 : premiumTier === 1 ? 100 : 50;

                const isAnimated = sticker.format === 4 || (sticker.url && sticker.url.endsWith('.gif'));
                const animatedCount = emojis.filter(e => e.animated).size;
                const staticCount = emojis.filter(e => !e.animated).size;

                if ((isAnimated && animatedCount >= maxEmojis) || (!isAnimated && staticCount >= maxEmojis)) {
                    const limitMsg = await t('Server emoji limit reached!', langCode);
                    await message.reply('❌ ' + limitMsg);
                    activeStickerSessions.delete(message.author.id);
                    return;
                }

                const waitMsg = await t('Converting sticker to emoji...', langCode);
                const progressMsg = await message.reply('⏳ ' + waitMsg);

                const newEmoji = await message.guild.emojis.create({
                    attachment: sticker.url,
                    name: emojiName
                });

                await db.addEmojiRecord(guildId, newEmoji.id, newEmoji.name, message.author.tag);
                
                const successMsg = await t('Sticker converted to emoji successfully!', langCode);
                await progressMsg.edit('✅ ' + successMsg + ` ${newEmoji}`);
                activeStickerSessions.delete(message.author.id);
            } catch (error) {
                console.error('Sticker to Emoji conversion error:', error);
                const errorMsg = await require('./src/utils/languages').t('Error converting sticker:', langCode) + ' ' + error.message;
                await message.reply('❌ ' + errorMsg);
                activeStickerSessions.delete(message.author.id);
            }
            return;
        }

        if (deletionSession && message.author.id === deletionSession.userId) {
            if (!message.stickers.size) {
                const errorText = await t('Please reply with a sticker, not an emoji or message!', deletionSession.langCode);
                const embed = new EmbedBuilder().setDescription('❌ ' + errorText).setColor('#FF0000');
                await message.reply({ embeds: [embed] }).catch(() => {});
                return;
            }

            if (deletionSession.isIdRetrieval) {
                stickerDeletionSessions.delete(message.reference.messageId);
                const stickerId = message.stickers.first().id;
                const embed = new EmbedBuilder()
                    .setTitle('🆔 ' + await t('Sticker ID', deletionSession.langCode))
                    .setDescription(`**ID:** \`${stickerId}\``)
                    .setColor('#00FFFF');
                await message.reply({ embeds: [embed] }).catch(() => {});
                return;
            }
        }

        if (enhanceSession && message.author.id === enhanceSession.userId) {
            const sessionLang = enhanceSession.langCode;
            stickerEnhanceSessions.delete(message.reference.messageId);

            const waitEmbed = new EmbedBuilder()
                .setDescription('⏳ ' + await t('Enhancing sticker... Please wait.', sessionLang))
                .setColor('#FFFF00');
            const statusMsg = await message.reply({ embeds: [waitEmbed] });

            try {
                const stickerUrl = sticker.url;
                const stickerName = sticker.name.substring(0, 22) + '_enh';

                const response = await axios.get(stickerUrl, { responseType: 'arraybuffer' });
                const buffer = Buffer.from(response.data);

                const enhancedBuffer = await sharp(buffer)
                    .resize(512, 512, { 
                        fit: 'contain', 
                        background: { r: 0, g: 0, b: 0, alpha: 0 },
                        kernel: sharp.kernel.lanczos3
                    })
                    .modulate({
                        brightness: 1.05,
                        saturation: 1.15
                    })
                    .sharpen({
                        sigma: 1.5,
                        m1: 0.5,
                        m2: 10
                    })
                    .toBuffer();

                let finalBuffer = enhancedBuffer;
                if (finalBuffer.length > 512000) {
                    finalBuffer = await sharp(enhancedBuffer)
                        .png({ palette: true, colors: 256 })
                        .toBuffer();
                }

                const newSticker = await message.guild.stickers.create({
                    file: finalBuffer,
                    name: stickerName,
                    description: await t('Enhanced by ProEmoji', sessionLang),
                    tags: 'enhanced',
                    reason: `Enhanced by ${message.author.tag}`
                });

                const successText = await t('Sticker enhanced with maximum strength!', sessionLang);
                const embed = new EmbedBuilder()
                    .setDescription('✨ ' + successText + `\n**Name:** ${stickerName}`)
                    .setColor('#ADD8E6')
                    .setImage(newSticker.url)
                    .setFooter({ text: `${message.author.displayName} (@${message.author.username})`, iconURL: message.author.displayAvatarURL() });
                
                await statusMsg.edit({ embeds: [embed] });
            } catch (error) {
                const errorPrefix = await t('Error:', sessionLang);
                const embed = new EmbedBuilder()
                    .setDescription('❌ ' + errorPrefix + ' ' + error.message)
                    .setColor('#FF0000');
                await statusMsg.edit({ embeds: [embed] });
            }
            return;
        }

        if (message.content === 'نعم' || message.content.toLowerCase() === 'yes') {
            const suggestedEmojis = suggestemojis.getSuggestedEmojis();
            if (suggestedEmojis.length > 0) {
                for (const emoji of suggestedEmojis) {
                    if (!message.guild.emojis.cache.find(e => e.name === emoji.name)) {
                        try {
                            await message.guild.emojis.create({ attachment: emoji.url, name: emoji.name });
                        } catch (error) {
                            console.error(`⚠️ Warning: Could not add emoji ${emoji.name}:`, error.message);
                        }
                    }
                }
                message.channel.send('✅ ' + await t('The suggested emojis have been added successfully!', langCode));
                suggestemojis.setSuggestedEmojis([]);
            }
        } else if (message.content === 'لا' || message.content.toLowerCase() === 'no') {
            const suggestedEmojis = suggestemojis.getSuggestedEmojis();
            if (suggestedEmojis.length > 0) {
                message.channel.send('❌ ' + await t('The suggested emojis were not added.', langCode));
                suggestemojis.setSuggestedEmojis([]);
            }
        }
    } catch (err) {
        console.error('Error in messageCreate:', err.message);
    }
});

async function initializeBot() {
    try {
        await db.initDatabase();
        console.log('✅ Database initialized');
    } catch (error) {
        console.error('❌ Database initialization failed:', error.message);
    }
}

initializeBot();

function updateStatus() {
    if (!client.user) return;
    const serverCount = client.guilds.cache.size;
    client.user.setPresence({
        activities: [{
            name: `ProEmoji | ${serverCount} Servers`,
            type: 1, // STREAMING
            url: 'https://m.twitch.tv/proemoji_bot/home'
        }],
        status: 'online'
    });
}

client.on('clientReady', () => {
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`🤖 Bot: ${client.user.tag}`)
    console.log(`✅ Status: Online and Ready!`);
    console.log(`📊 Servers: ${client.guilds.cache.size}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    initializeDatabaseAndSync().catch(console.error);
    
    updateStatus();

    try {
        const globalCommands = COMMAND_DEFINITIONS.filter(cmd => !['update', 'add_to_pack', 'delete_from_pack'].includes(cmd.name));
        client.application.commands.set(globalCommands);
        
        const restrictedServer = client.guilds.cache.get('1118153648938160191');
        if (restrictedServer) {
            const restrictedCommands = COMMAND_DEFINITIONS.filter(cmd => ['update', 'add_to_pack', 'delete_from_pack'].includes(cmd.name));
            restrictedServer.commands.set(restrictedCommands);
            console.log('✅ Restricted commands (/update, /add_to_pack, /delete_from_pack) registered');
        }
        
        preWarmCache().catch(err => console.error('⚠️ Cache warming error:', err.message));
    } catch (error) {
        console.error('❌ Error registering commands:', error);
    }
});

async function initializeDatabaseAndSync() {
    await db.initDatabase();
    for (const guild of client.guilds.cache.values()) {
        const emojis = await guild.emojis.fetch();
        for (const emoji of emojis.values()) {
            await db.addEmojiRecord(guild.id, emoji.id, emoji.name, 'system_sync');
        }
        try {
            const stickers = await guild.stickers.fetch();
            for (const sticker of stickers.values()) {
                await db.addStickerRecord(guild.id, sticker.id, sticker.name, 'system_sync');
            }
        } catch (e) {}
    }
}

client.on('guildCreate', async guild => {
    try {
        await db.addServer(guild.id, guild.name);
        updateStatus();
    } catch (error) {
        console.error('Error adding server:', error.message);
    }
});

client.on('guildDelete', async guild => {
    try {
        await db.removeServer(guild.id);
        updateStatus();
    } catch (error) {
        console.error('Error removi"ng server:', error.message);
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🌐 Web server running on port ${PORT}`);
});

const TOKEN = process.env.token;

if (!TOKEN) {
    console.error('❌ DISCORD_BOT_TOKEN or token secret is missing!');
    process.exit(1);
}

client.login(TOKEN).catch(err => {
    console.error('❌ Failed to login to Discord:', err.message);
});