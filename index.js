const express = require('express');
const path = require('path');
const app = express();
const { Client, GatewayIntentBits, EmbedBuilder, PermissionsBitField, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const prefix = '+';
const db = require('./src/utils/database');
const sharp = require('sharp');
const axios = require('axios');
const { SUPPORTED_LANGUAGES, COMMAND_DEFINITIONS, OWNER_ONLY_COMMANDS, ADMIN_ONLY_COMMANDS = [], PUBLIC_COMMANDS, EMOJI_PERMISSION_COMMANDS } = require('./src/utils/constants');
const { t, preWarmCache } = require('./src/utils/languages');

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
    const langCode = interaction.guild ? await db.getServerLanguage(interaction.guild.id) : 'en';

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
            const currentLangCode = interaction.guild ? await db.getServerLanguage(interaction.guild.id) : 'en';
            
            if (!interaction.deferred && !interaction.replied) {
                try {
                    await interaction.deferUpdate();
                } catch (deferError) {
                    console.error('Failed to defer help category update:', deferError.message);
                    return;
                }
            }

            const row = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('help_category')
                    .setPlaceholder(await t('Select a category', currentLangCode))
                    .addOptions([
                        { label: await t('Sticker Commands', currentLangCode), value: 'sticker_help', emoji: '✨' },
                        { label: await t('Emoji Commands', currentLangCode), value: 'emoji_help', emoji: '😀' },
                        { label: await t('Info Commands', currentLangCode), value: 'info_help', emoji: 'ℹ️' }
                    ])
            );

            const pages = [];
            let title = '';

            if (interaction.values[0] === 'sticker_help') {
                title = await t('Sticker Commands', currentLangCode);
                const stickerCommands = [
                    { cmd: '/add_sticker', desc: 'Add a new sticker to your server with a custom name', emoji: '➕' },
                    { cmd: '/image_to_sticker', desc: 'Convert an image URL or attachment into a server sticker instantly', emoji: '🖼️' },
                    { cmd: '/rename_sticker', desc: 'Change the name of an existing server sticker', emoji: '✏️' },
                    { cmd: '/delete_sticker', desc: 'Permanently remove a specific sticker from your server', emoji: '🗑️' },
                    { cmd: '/delete_all_stickers', desc: 'Remove all stickers from your server (Admin only)', emoji: '⚠️' },
                    { cmd: '/list_stickers', desc: 'View a complete list of all stickers currently in your server', emoji: '📋' },
                    { cmd: '/sticker_to_emoji', desc: 'Transform any existing server sticker into a custom emoji', emoji: '🔄' },
                    { cmd: '/sticker_to_image', desc: 'Convert a server sticker into a downloadable image file', emoji: '💾' },
                    { cmd: '/enhance_sticker', desc: 'Improve a sticker quality before saving it to the server', emoji: '✨' },
                    { cmd: '/suggest_sticker', desc: 'Get 5 random sticker suggestions from other servers', emoji: '💡' },
                    { cmd: '/search_sticker', desc: 'Search for stickers by name across servers', emoji: '🔍' },
                    { cmd: '/get_sticker_id', desc: 'Get the ID of a specific sticker', emoji: '🆔' }
                ];

                for (let i = 0; i < stickerCommands.length; i += 6) {
                    let pageContent = '';
                    const chunk = stickerCommands.slice(i, i + 6);
                    for (const item of chunk) {
                        const translatedDesc = await t(item.desc, currentLangCode);
                        pageContent += `${item.emoji} **${item.cmd}**\n> ${translatedDesc}\n\n`;
                    }
                    pages.push(pageContent);
                }
            } else if (interaction.values[0] === 'emoji_help') {
                title = await t('Emoji Commands', currentLangCode);
                const emojiCommands = [
                    { cmd: '/add_emoji', desc: 'Add one or more emojis to your server at once', emoji: '➕' },
                    { cmd: '/emoji_search', desc: 'Search for specific emojis by name across multiple servers', emoji: '🔍' },
                    { cmd: '/image_to_emoji', desc: 'Convert an image URL or attachment into a server emoji instantly', emoji: '🖼️' },
                    { cmd: '/rename_emoji', desc: 'Change the name of an existing server emoji', emoji: '✏️' },
                    { cmd: '/delete_emoji', desc: 'Permanently remove a specific emoji from your server', emoji: '🗑️' },
                    { cmd: '/delete_all_emojis', desc: 'Remove all emojis from your server (Admin only)', emoji: '⚠️' },
                    { cmd: '/list_emojis', desc: 'View a complete list of all emojis currently in your server', emoji: '📋' },
                    { cmd: '/enhance_emoji', desc: 'Improve an emoji quality before adding it to the server', emoji: '✨' },
                    { cmd: '/emoji_to_sticker', desc: 'Transform any existing server emoji into a high-quality sticker', emoji: '🔄' },
                    { cmd: '/emoji_to_image', desc: 'Convert any emoji into a downloadable image file', emoji: '💾' },
                    { cmd: '/emoji_pack', desc: 'Get a curated pack of suggested emojis to enhance your server', emoji: '📦' },
                    { cmd: '/suggest_emojis', desc: 'Get 5 random emoji suggestions from other servers', emoji: '💡' },
                    { cmd: '/get_emoji_id', desc: 'Get the ID of a specific emoji', emoji: '🆔' }
                ];

                for (let i = 0; i < emojiCommands.length; i += 6) {
                    let pageContent = '';
                    const chunk = emojiCommands.slice(i, i + 6);
                    for (const item of chunk) {
                        const translatedDesc = await t(item.desc, currentLangCode);
                        pageContent += `${item.emoji} **${item.cmd}**\n> ${translatedDesc}\n\n`;
                    }
                    pages.push(pageContent);
                }
            } else if (interaction.values[0] === 'info_help') {
                title = await t('Info Commands', currentLangCode);
                const infoCommands = [
                    { cmd: '/status', desc: 'View server stats and permission settings', emoji: '📊' },
                    { cmd: '/ping', desc: 'Check the bot response speed and connection quality', emoji: '🏓' },
                    { cmd: '/language', desc: 'Change the bot language setting (Admin only)', emoji: '🌐' },
                    { cmd: '/emoji_permission', desc: 'Set permissions for emoji suggestions (Owner only)', emoji: '🔐' },
                    { cmd: '/sticker_permission', desc: 'Set permissions for sticker suggestions (Owner only)', emoji: '🔐' },
                    { cmd: '/delete_permission', desc: 'Set mass deletion approval requirement (Owner only)', emoji: '🔐' },
                    { cmd: '/vote', desc: 'Get links to vote and support the bot', emoji: '⭐' }
                ];
                
                let pageContent = '';
                for (const item of infoCommands) {
                    const translatedDesc = await t(item.desc, currentLangCode);
                    pageContent += `${item.emoji} **${item.cmd}**\n> ${translatedDesc}\n\n`;
                }
                pageContent += `\n🔗 [${await t('Vote for ProEmoji on Top.gg', currentLangCode)}](https://top.gg/bot/1009426679061553162/vote)`;
                pages.push(pageContent);
            }

            if (pages.length === 0) {
                pages.push(await t('No commands found in this category.', currentLangCode));
            }

            let currentPage = 0;
            const totalPages = pages.length;
            const currentTitle = title;
            const pageText = await t('Page', currentLangCode);
            
            const createHelpEmbed = (idx, embedTitle, pagesArr, pagesTotal) => {
                const safeIdx = Math.max(0, Math.min(idx, pagesTotal - 1));
                const desc = pagesArr[safeIdx] || '...';
                return new EmbedBuilder()
                    .setAuthor({ name: 'ProEmoji', iconURL: interaction.client.user.displayAvatarURL() })
                    .setTitle('📖 ' + embedTitle)
                    .setDescription(desc)
                    .setColor('#5865F2')
                    .setFooter({ text: `${pageText} ${safeIdx + 1}/${pagesTotal} • ${interaction.user.displayName}`, iconURL: interaction.user.displayAvatarURL() });
            };

            const createHelpRow = (idx, pagesTotal) => {
                const safeIdx = Math.max(0, Math.min(idx, pagesTotal - 1));
                const rowComponents = [
                    new ButtonBuilder().setCustomId('prev_help').setEmoji('⬅️').setStyle(ButtonStyle.Primary).setDisabled(safeIdx === 0),
                    new ButtonBuilder().setCustomId('next_help').setEmoji('➡️').setStyle(ButtonStyle.Primary).setDisabled(safeIdx >= pagesTotal - 1)
                ];
                return new ActionRowBuilder().addComponents(rowComponents);
            };

            await interaction.editReply({ 
                embeds: [createHelpEmbed(0, currentTitle, pages, totalPages)], 
                components: totalPages > 1 ? [row, createHelpRow(0, totalPages)] : [row]
            });

            if (totalPages > 1) {
                const storedPages = [...pages];
                const storedTitle = currentTitle;
                const storedTotalPages = totalPages;
                
                const collector = interaction.message.createMessageComponentCollector({ 
                    filter: i => i.user.id === interaction.user.id && (i.customId === 'prev_help' || i.customId === 'next_help'),
                    time: 180000 
                });

                collector.on('collect', async i => {
                    try {
                        if (!i.deferred && !i.replied) await i.deferUpdate().catch(() => {});
                        if (i.customId === 'prev_help' && currentPage > 0) currentPage--;
                        else if (i.customId === 'next_help' && currentPage < storedTotalPages - 1) currentPage++;
                        
                        currentPage = Math.max(0, Math.min(currentPage, storedTotalPages - 1));
                        await i.editReply({ 
                            embeds: [createHelpEmbed(currentPage, storedTitle, storedPages, storedTotalPages)], 
                            components: [row, createHelpRow(currentPage, storedTotalPages)] 
                        });
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
        const langCode = interaction.values[0];
        const langInfo = SUPPORTED_LANGUAGES[langCode];
        await db.setServerLanguage(interaction.guild.id, langCode);
        
        const successTitle = await t('Language Updated!', langCode);
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

        // Helper to defer safely
    const safeDefer = async (ephemeral = false) => {
        if (!interaction.deferred && !interaction.replied) {
            await interaction.deferReply({ flags: ephemeral ? MessageFlags.Ephemeral : 0 }).catch(() => {});
        }
    };

    try {
        if (interaction.commandName === 'ping') {
            await safeDefer();
            const ping = require('./src/commands/storage/ping');
            await ping.execute(interaction, langCode).catch(async err => {
                console.error(`Error in ping: ${err.message}`);
            });
        }
        else if (interaction.commandName === 'update') {
            if (interaction.guild.id !== '1118153648938160191' || 
                interaction.channel.id !== '1456609646205861938' || 
                interaction.user.id !== '815701106235670558') {
                return await interaction.reply({ content: '🚫 This command is restricted.', flags: MessageFlags.Ephemeral }).catch(() => {});
            }
            await safeDefer(true);
            
            try {
                const commandPath = path.join(__dirname, 'src', 'commands');
                const utilsPath = path.join(__dirname, 'src', 'utils');
                
                Object.keys(require.cache).forEach(key => {
                    if (key.includes(commandPath) || key.includes(utilsPath) || key.includes('index.js')) {
                        delete require.cache[key];
                    }
                });
                
                await interaction.editReply({ content: '✅ Code changes applied dynamically!' }).catch(() => {});
            } catch (err) {
                await interaction.editReply({ content: `❌ Update failed: ${err.message}` }).catch(() => {});
            }
        }
        else if (interaction.commandName === 'get_emoji_id') {
            await safeDefer();
            await getemojiid.execute(interaction, langCode).catch(async err => {
                console.error(`Error in get_emoji_id: ${err.message}`);
                const errMsg = '❌ ' + await t('An error occurred while executing this command.', langCode);
                if (interaction.replied || interaction.deferred) {
                    await interaction.editReply({ content: errMsg }).catch(() => {});
                } else {
                    await interaction.reply({ content: errMsg, flags: MessageFlags.Ephemeral }).catch(() => {});
                }
            });
        }
        else if (interaction.commandName === 'get_sticker_id') {
            await safeDefer();
            const response = await getstickerid.execute(interaction, langCode).catch(async err => {
                console.error(`Error in get_sticker_id: ${err.message}`);
                const errMsg = '❌ ' + await t('An error occurred while executing this command.', langCode);
                if (interaction.replied || interaction.deferred) {
                    await interaction.editReply({ content: errMsg }).catch(() => {});
                } else {
                    await interaction.reply({ content: errMsg, flags: MessageFlags.Ephemeral }).catch(() => {});
                }
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
            await status.execute(interaction, langCode).catch(async err => {
                console.error(`Error in status: ${err.message}`);
                const errMsg = '❌ ' + await t('An error occurred while executing this command.', langCode);
                if (interaction.replied || interaction.deferred) {
                    await interaction.editReply({ content: errMsg }).catch(() => {});
                } else {
                    await interaction.reply({ content: errMsg, flags: MessageFlags.Ephemeral }).catch(() => {});
                }
            });
        }
        else if (interaction.commandName === 'help') {
            await help.execute(interaction, langCode).catch(async err => {
                console.error(`Error in help: ${err.message}`);
                const errMsg = '❌ ' + await t('An error occurred while executing this command.', langCode);
                if (interaction.replied || interaction.deferred) {
                    await interaction.editReply({ content: errMsg }).catch(() => {});
                } else {
                    await interaction.reply({ content: errMsg, flags: MessageFlags.Ephemeral }).catch(() => {});
                }
            });
        }
        else if (interaction.commandName === 'vote') {
            await safeDefer();
            await vote.execute(interaction, langCode).catch(async err => {
                console.error(`Error in vote: ${err.message}`);
                const errMsg = '❌ ' + await t('An error occurred while executing this command.', langCode);
                if (interaction.replied || interaction.deferred) {
                    await interaction.editReply({ content: errMsg }).catch(() => {});
                } else {
                    await interaction.reply({ content: errMsg, flags: MessageFlags.Ephemeral }).catch(() => {});
                }
            });
        }
        else if (interaction.commandName === 'delete_all_emojis') {
            await safeDefer();
            
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

            const deletingEmbed = new EmbedBuilder()
                .setDescription('⏳ ' + await t('Deleting all emojis... Please wait.', langCode))
                .setColor('#FFFF00');
            await interaction.editReply({ embeds: [deletingEmbed] }).catch(() => {});

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

            const deletingEmbed = new EmbedBuilder()
                .setDescription('⏳ ' + await t('Deleting all stickers... Please wait.', langCode))
                .setColor('#FFFF00');
            await interaction.editReply({ embeds: [deletingEmbed] }).catch(() => {});

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
            await addtopack.execute(interaction, langCode).catch(async err => {
                console.error(`Error in add_to_pack: ${err.message}`);
            });
        }
        else if (interaction.commandName === 'delete_from_pack') {
            await deletefrompack.execute(interaction, langCode).catch(async err => {
                console.error(`Error in delete_from_pack: ${err.message}`);
            });
        }
        else if (interaction.commandName === 'suggest_emojis') {
            await safeDefer();
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
            await language.execute(interaction, langCode).catch(async err => {
                console.error(`Error in language: ${err.message}`);
                try { await interaction.editReply({ content: '❌ ' + await t('An error occurred while executing this command.', langCode) }).catch(() => {}); } catch (e) {}
            });
        }
        else if (interaction.commandName === 'delete_emoji') {
            await safeDefer();
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

        // Handle sticker add session (when user replies with a sticker to add)
        const stickerAddSession = stickerAddSessions.get(message.reference?.messageId);
        if (stickerAddSession && message.author.id === stickerAddSession.userId) {
            const sessionLang = stickerAddSession.langCode;
            stickerAddSessions.delete(message.reference.messageId);

            try {
                const stickerUrl = sticker.url;
                const stickerName = stickerAddSession.stickerName || sticker.name;
                
                // Check sticker limit
                const maxStickers = { 0: 5, 1: 15, 2: 30, 3: 60 };
                const guildMax = maxStickers[message.guild.premiumTier];
                const serverStickers = await message.guild.stickers.fetch();
                
                if (serverStickers.size >= guildMax) {
                    const limitText = await t('Maximum number of stickers reached ({max})', sessionLang);
                    const embed = new EmbedBuilder()
                        .setDescription('❌ ' + limitText.replace('{max}', guildMax))
                        .setColor('#FF0000');
                    await message.reply({ embeds: [embed] });
                    return;
                }

                // Download sticker and create it
                const response = await axios.get(stickerUrl, { responseType: 'arraybuffer' });
                let buffer = Buffer.from(response.data);
                
                // Resize to 512x512 for sticker format
                const processedBuffer = await sharp(buffer)
                    .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
                    .png()
                    .toBuffer();
                
                const newSticker = await message.guild.stickers.create({
                    file: processedBuffer,
                    name: stickerName,
                    description: await t('Added by ProEmoji', sessionLang),
                    tags: 'emoji',
                    reason: `Added by ${message.author.tag}`
                });
                
                await db.addStickerRecord(message.guild.id, newSticker.id, newSticker.name, message.author.tag);
                
                const successText = await t('Successfully added sticker: {name}', sessionLang);
                const embed = new EmbedBuilder()
                    .setTitle('✅ ' + await t('Sticker Added!', sessionLang))
                    .setDescription(successText.replace('{name}', stickerName))
                    .setImage(newSticker.url)
                    .setColor('#00FF00')
                    .setFooter({ text: `${message.author.displayName} (@${message.author.username})`, iconURL: message.author.displayAvatarURL() });
                
                await message.reply({ embeds: [embed] });
            } catch (error) {
                console.error('Error in sticker add session:', error);
                const errorText = await t('Error adding sticker:', sessionLang);
                const embed = new EmbedBuilder()
                    .setDescription('❌ ' + errorText + ' ' + error.message)
                    .setColor('#FF0000');
                await message.reply({ embeds: [embed] });
            }
            return;
        }

        // Handle sticker to emoji conversion
        const stickerToEmojiSession = stickerToEmojiSessions.get(message.reference?.messageId);
        if (stickerToEmojiSession && message.author.id === stickerToEmojiSession.userId) {
            const sessionLang = stickerToEmojiSession.langCode;
            stickerToEmojiSessions.delete(message.reference.messageId);

            try {
                const stickerUrl = sticker.url;
                const emojiName = stickerToEmojiSession.emojiName;
                
                // Check if sticker is animated (APNG format)
                const isAnimated = sticker.format === 2; // StickerFormatType.APNG = 2
                
                // Download and process the sticker
                const response = await axios.get(stickerUrl, { responseType: 'arraybuffer' });
                let buffer = Buffer.from(response.data);
                
                // Resize to emoji size (128x128 max, under 256KB)
                let finalBuffer;
                if (isAnimated) {
                    // For animated stickers, try to use as-is or convert
                    // Note: Discord stickers are APNG, which may not work as emoji
                    // We'll try to convert or use the first frame
                    finalBuffer = await sharp(buffer, { animated: false })
                        .resize(128, 128, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
                        .png()
                        .toBuffer();
                } else {
                    finalBuffer = await sharp(buffer)
                        .resize(128, 128, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
                        .png()
                        .toBuffer();
                }
                
                const newEmoji = await message.guild.emojis.create({
                    attachment: finalBuffer,
                    name: emojiName,
                    reason: `Converted from sticker by ${message.author.tag}`
                });
                
                await db.addEmojiRecord(message.guild.id, newEmoji.id, newEmoji.name, message.author.tag);
                
                const successText = await t('Sticker converted to emoji successfully!', sessionLang);
                const embed = new EmbedBuilder()
                    .setTitle('✅ ' + await t('Emoji Created!', sessionLang))
                    .setDescription(successText + `\n\n${newEmoji.toString()} \`${emojiName}\``)
                    .setThumbnail(newEmoji.imageURL())
                    .setColor('#00FF00')
                    .setFooter({ text: `${message.author.displayName} (@${message.author.username})`, iconURL: message.author.displayAvatarURL() });
                
                await message.reply({ embeds: [embed] });
            } catch (error) {
                console.error('Error in sticker to emoji conversion:', error);
                const errorText = await t('Error converting sticker to emoji:', sessionLang);
                const embed = new EmbedBuilder()
                    .setDescription('❌ ' + errorText + ' ' + error.message)
                    .setColor('#FF0000');
                await message.reply({ embeds: [embed] });
            }
            return;
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
        console.error('Error removing server:', error.message);
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🌐 Web server running on port ${PORT}`);
});

client.login(process.env.token);
