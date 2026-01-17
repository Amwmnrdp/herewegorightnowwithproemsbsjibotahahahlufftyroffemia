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
const status = require('./src/commands/storage/status');
const vote = require('./src/commands/storage/vote');
const language = require('./src/commands/storage/language');
const emojiPermission = require('./src/commands/storage/emoji_permission');
const stickerPermission = require('./src/commands/storage/sticker_permission');

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
                
                if (interaction.deferred || interaction.replied) {
                    return await interaction.editReply({ embeds: [cooldownEmbed] });
                } else {
                    return await interaction.reply({ embeds: [cooldownEmbed], flags: MessageFlags.Ephemeral });
                }
            }
        }
        cooldowns.set(userId, now);
        setTimeout(() => cooldowns.delete(userId), cooldownAmount);
    }

    if (interaction.isStringSelectMenu() && interaction.customId === 'help_category') {
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

        let content = '';
        let title = '';
        const separator = '\n⌄ـــــــــــــــــــــــــــproemoji.botـــــــــــــــــــــــــــــ⌄\n';

        if (interaction.values[0] === 'sticker_help') {
            title = await t('Sticker Commands', langCode);
            content = `${await t('Add a new sticker to your server with a custom name', langCode)}: **/add_sticker**${separator}${await t('Convert an image URL or attachment into a server sticker instantly', langCode)}: **/image_to_sticker**${separator}${await t('Change the name of an existing server sticker', langCode)}: **/rename_sticker**${separator}${await t('Permanently remove a specific sticker from your server', langCode)}: **/delete_sticker**${separator}${await t('Remove all stickers from your server (Admin only, requires confirmation)', langCode)}: **/delete_all_stickers**${separator}${await t('View a complete list of all stickers currently in your server', langCode)}: **/list_stickers**${separator}${await t('Transform any existing server sticker into a custom emoji', langCode)}: **/sticker_to_emoji**${separator}${await t('Convert a server sticker into a downloadable image file', langCode)}: **/sticker_to_image**${separator}${await t('Improve a sticker\'s resolution and quality before saving it to the server', langCode)}: **/enhance_sticker**${separator}${await t('Suggests 5 random stickers from other servers (useful if you don\'t have Nitro)', langCode)}: **/suggest_sticker**`;
        } else if (interaction.values[0] === 'emoji_help') {
            title = await t('Emoji Commands', langCode);
            content = `${await t('If you do not have Nitro, you can use /suggest_emojis and the bot will suggest 5 random emojis from other servers it is in.', langCode)}${separator}${await t('Search for specific emojis by name across multiple servers', langCode)}: **/emoji_search**${separator}${await t('Add a new emoji to your server using a custom name or ID', langCode)}: **/add_emoji**${separator}${await t('Convert an image URL or attachment into a server emoji instantly', langCode)}: **/image_to_emoji**${separator}${await t('Change the name of an existing server emoji', langCode)}: **/rename_emoji**${separator}${await t('Permanently remove a specific emoji from your server', langCode)}: **/delete_emoji**${separator}${await t('Remove all emojis from your server (Admin only, requires confirmation)', langCode)}: **/delete_all_emojis**${separator}${await t('View a complete list of all emojis currently in your server', langCode)}: **/list_emojis**${separator}${await t('Improve an emoji\'s resolution and quality before adding it to the server', langCode)}: **/enhance_emoji**${separator}${await t('Transform any existing server emoji into a high-quality sticker', langCode)}: **/emoji_to_sticker**${separator}${await t('Convert any emoji into a downloadable image file', langCode)}: **/emoji_to_image**${separator}${await t('Get a curated pack of suggested emojis to enhance your server', langCode)}: **/emoji_pack**`;
        } else if (interaction.values[0] === 'info_help') {
            title = await t('Info Commands', langCode);
            content = `${await t('Set permissions for emoji suggestions (Owner only)', langCode)}: **/emoji_permission**${separator}${await t('Set permissions for sticker suggestions (Owner only)', langCode)}: **/sticker_permission**${separator}${await t('Change the bot\'s language setting (Owner only)', langCode)}: **/language**${separator}${await t('View bot status, latency, and vote status', langCode)}: **/status**${separator}[${await t('Vote ProEmoji', langCode)}](https://top.gg/bot/1009426679061553162/vote)`;
        }

        return await interaction.update({ 
            embeds: [new EmbedBuilder().setTitle('📖 ' + title).setDescription(content).setColor('#0099ff')], 
            components: [row] 
        });
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
        await interaction.update({ embeds: [embed], components: [] });
        return;
    }
    
    if (!interaction.isCommand()) return;
    
    const hasPermission = await checkPermissions(interaction, langCode);
    if (!hasPermission) return;

    try {
        if (interaction.commandName === 'update') {
            if (interaction.guild.id !== '1118153648938160191' || 
                interaction.channel.id !== '1456609646205861938' || 
                interaction.user.id !== '815701106235670558') {
                return await interaction.reply({ content: '🚫 This command is restricted.', flags: 64 });
            }
            await interaction.deferReply({ flags: 64 });
            
            try {
                const commandPath = path.join(__dirname, 'src', 'commands');
                const utilsPath = path.join(__dirname, 'src', 'utils');
                
                Object.keys(require.cache).forEach(key => {
                    if (key.includes(commandPath) || key.includes(utilsPath) || key.includes('index.js')) {
                        delete require.cache[key];
                    }
                });
                
                await interaction.editReply({ content: '✅ Code changes applied dynamically!' });
            } catch (err) {
                await interaction.editReply({ content: `❌ Update failed: ${err.message}` });
            }
        }
        else if (interaction.commandName === 'status') {
            await interaction.deferReply();
            await status.execute(interaction, langCode);
        }
        else if (interaction.commandName === 'help') {
            await interaction.deferReply();
            await help.execute(interaction, langCode);
        }
        else if (interaction.commandName === 'vote') {
            await interaction.deferReply();
            await vote.execute(interaction, langCode);
        }
        else if (interaction.commandName === 'delete_all_emojis') {
            await interaction.deferReply();
            await deleteallemojis.execute(interaction, langCode);
        }
        else if (interaction.commandName === 'delete_all_stickers') {
            await interaction.deferReply();
            await deleteallstickers.execute(interaction, langCode);
        }
        else if (interaction.commandName === 'emoji_permission') {
            await interaction.deferReply();
            await emojiPermission.execute(interaction, langCode);
        }
        else if (interaction.commandName === 'sticker_permission') {
            await interaction.deferReply();
            await stickerPermission.execute(interaction, langCode);
        }
        else if (interaction.commandName === 'emoji_search') {
            await interaction.deferReply();
            await emojisearch.execute(interaction, langCode, client);
        }
        else if (interaction.commandName === 'search_sticker') {
            await interaction.deferReply();
            await searchsticker.execute(interaction, langCode, client);
        }
        else if (interaction.commandName === 'emoji_pack') {
            await interaction.deferReply();
            await emojipack.execute(interaction, langCode, client);
        }
        else if (interaction.commandName === 'suggest_emojis') {
            await interaction.deferReply();
            await suggestemojis.execute(interaction, langCode, client);
        }
        else if (interaction.commandName === 'add_emoji') {
            await interaction.deferReply();
            await addemojiCmd.execute(interaction, langCode);
        }
        else if (interaction.commandName === 'image_to_emoji') {
            await interaction.deferReply();
            await imagetoemoji.execute(interaction, langCode, usedUrls);
        }
        else if (interaction.commandName === 'emoji_to_sticker') {
            await interaction.deferReply();
            await emojiTosticker.execute(interaction, langCode, convertedEmojisToStickers);
        }
        else if (interaction.commandName === 'list_emojis') {
            await interaction.deferReply();
            await listemoji.execute(interaction, langCode);
        }
        else if (interaction.commandName === 'language') {
            await interaction.deferReply();
            await language.execute(interaction, langCode);
        }
        else if (interaction.commandName === 'delete_emoji') {
            await interaction.deferReply();
            await deletemoji.execute(interaction, langCode, convertedStickersToEmojis);
        }
        else if (interaction.commandName === 'rename_emoji') {
            await interaction.deferReply();
            await renameemoji.execute(interaction, langCode);
        }
        else if (interaction.commandName === 'delete_sticker') {
            await interaction.deferReply();
            const response = await deletesticker.execute(interaction, langCode);
            if (response && response.id) {
                const msg = response;
                stickerDeletionSessions.set(msg.id, {
                    guildId: interaction.guild.id,
                    userId: interaction.user.id,
                    langCode: langCode,
                    messageId: msg.id,
                    channelId: msg.channel.id
                });
                setTimeout(() => stickerDeletionSessions.has(msg.id) && stickerDeletionSessions.delete(msg.id), 60000);
            }
        }
        else if (interaction.commandName === 'rename_sticker') {
            await interaction.deferReply();
            const response = await renamesticker.execute(interaction, langCode);
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
                setTimeout(() => stickerRenameSessions.has(msg.id) && stickerRenameSessions.delete(msg.id), 60000);
            }
        }
        else if (interaction.commandName === 'sticker_to_emoji') {
            await interaction.deferReply();
            const response = await stickertoemi.execute(interaction, langCode);
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
                setTimeout(() => stickerToEmojiSessions.has(msg.id) && stickerToEmojiSessions.delete(msg.id), 60000);
            }
        }
        else if (interaction.commandName === 'image_to_sticker') {
            await interaction.deferReply();
            await imagetosticker.execute(interaction, langCode, convertedImagesToStickers);
        }
        else if (interaction.commandName === 'emoji_to_image') {
            await interaction.deferReply();
            await emojitoimage.execute(interaction, langCode);
        }
        else if (interaction.commandName === 'sticker_to_image') {
            await interaction.deferReply();
            const response = await stickertoimage.execute(interaction, langCode);
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
                setTimeout(() => convertedStickersToEmojis.has(msg.id) && convertedStickersToEmojis.delete(msg.id), 60000);
            }
        }
        else if (interaction.commandName === 'enhance_emoji') {
            await interaction.deferReply();
            await enhanceemoji.execute(interaction, langCode);
        }
        else if (interaction.commandName === 'enhance_sticker') {
            await interaction.deferReply();
            const response = await enhancesticker.execute(interaction, langCode);
            if (response && response.id) {
                const msg = response;
                stickerEnhanceSessions.set(msg.id, {
                    guildId: interaction.guild.id,
                    userId: interaction.user.id,
                    langCode: langCode,
                    messageId: msg.id,
                    channelId: msg.channel.id
                });
                setTimeout(() => stickerEnhanceSessions.has(msg.id) && stickerEnhanceSessions.delete(msg.id), 60000);
            }
        }
        else if (interaction.commandName === 'list_stickers') {
            await interaction.deferReply();
            await liststicker.execute(interaction, langCode);
        }
        else if (interaction.commandName === 'add_sticker') {
            await interaction.deferReply();
            const response = await addsticker.execute(interaction, langCode);
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
                setTimeout(() => stickerAddSessions.has(msg.id) && stickerAddSessions.delete(msg.id), 60000);
            }
        }
        else if (interaction.commandName === 'suggest_sticker') {
            await interaction.deferReply();
            await suggeststicker.execute(interaction, langCode, client);
        }
    } catch (error) {
        console.error('⚠️ Interaction error:', error.message);
        if (interaction.deferred || interaction.replied) {
            await interaction.editReply({ content: '❌ An error occurred while executing this command.' }).catch(() => {});
        } else {
            await interaction.reply({ content: '❌ An error occurred while executing this command.', flags: 64 }).catch(() => {});
        }
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

        if (enhanceSession && message.author.id === enhanceSession.userId) {
            const sessionLang = enhanceSession.langCode;
            stickerEnhanceSessions.delete(message.reference.messageId);

            const waitEmbed = new EmbedBuilder()
                .setDescription('⏳ ' + await t('Enhancing sticker... Please wait.', sessionLang))
                .setColor('#FFFF00');
            const statusMsg = await message.reply({ embeds: [waitEmbed] });

            try {
                const stickerUrl = sticker.url;
                const stickerName = sticker.name.substring(0, 22) + '_enhanced';

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
    client.user.setPresence({
        status: 'idle',
        activities: [{
            name: `${client.guilds.cache.size} servers! | ProEmoji`,
            type: 1, // Streaming
            url: 'https://www.twitch.tv/discord'
        }]
    });
}

client.once('clientReady', async () => {
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`🤖 Bot: ${client.user.tag}`)
    console.log(`✅ Status: Online and Ready!`);
    console.log(`📊 Servers: ${client.guilds.cache.size}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

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
        } catch (e) {
            console.error(`Failed to sync stickers:`, e.message);
        }
    }
    console.log('✅ Synchronized emojis and stickers with database');

    updateStatus();

    try {
        const globalCommands = COMMAND_DEFINITIONS.filter(cmd => cmd.name !== 'update');
        await client.application.commands.set(globalCommands);
        
        const restrictedServer = client.guilds.cache.get('1118153648938160191');
        if (restrictedServer) {
            const updateCommand = COMMAND_DEFINITIONS.find(cmd => cmd.name === 'update');
            await restrictedServer.commands.set([updateCommand]);
            console.log('✅ Restricted /update command registered for the specific server');
        }
        
        console.log('✅ Global slash commands registered!');
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        preWarmCache().catch(err => console.error('⚠️ Cache warming error:', err.message));
    } catch (error) {
        console.error('❌ Error:', error);
    }
});

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
