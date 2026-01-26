const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const { t } = require('../../utils/languages');
const axios = require('axios');
const sharp = require('sharp');
const db = require('../../utils/database');

async function execute(interaction, langCode, convertedEmojisToStickers) {
    const hasManageEmoji = interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuildExpressions) ||
                           interaction.member.permissions.has(PermissionsBitField.Flags.ManageEmojisAndStickers);
    
    if (!hasManageEmoji) {
        const embed = new EmbedBuilder()
            .setTitle('🚫 ' + await t('Permission Denied', langCode))
            .setDescription(await t('You need the "Manage Emojis and Stickers" permission to use this command.', langCode))
            .setColor('#FF0000');
        await interaction.editReply({ embeds: [embed] });
        return;
    }

    const emojiInput = interaction.options.getString('emoji');
    const nameOption = interaction.options.getString('name');
    
    // Parse custom emoji
    const customEmojiMatch = emojiInput.match(/<(a)?:(\w+):(\d+)>/);
    if (!customEmojiMatch) {
        const embed = new EmbedBuilder()
            .setDescription('❌ ' + await t('Only custom emojis are supported.', langCode))
            .setColor('#FF0000');
        await interaction.editReply({ embeds: [embed] });
        return;
    }

    const isAnimated = customEmojiMatch[1] === 'a';
    const emojiName = customEmojiMatch[2];
    const emojiId = customEmojiMatch[3];
    const stickerName = nameOption || emojiName;
    
    // Check sticker limit based on boost level
    const maxStickers = {
        0: 5,
        1: 15,
        2: 30,
        3: 60
    };
    const guildMax = maxStickers[interaction.guild.premiumTier];

    try {
        const stickers = await interaction.guild.stickers.fetch();
        if (stickers.size >= guildMax) {
            const limitText = await t('Maximum number of stickers reached ({max})', langCode);
            const embed = new EmbedBuilder()
                .setDescription('❌ ' + limitText.replace('{max}', guildMax))
                .setColor('#FF0000');
            await interaction.editReply({ embeds: [embed] });
            return;
        }

        // Check for duplicate name
        if (stickers.find(s => s.name.toLowerCase() === stickerName.toLowerCase())) {
            const duplicateText = await t('A sticker with the name "{name}" already exists!', langCode);
            const embed = new EmbedBuilder()
                .setDescription('❌ ' + duplicateText.replace('{name}', stickerName))
                .setColor('#FF0000');
            await interaction.editReply({ embeds: [embed] });
            return;
        }

        // Get emoji URL with proper extension
        const extension = isAnimated ? 'gif' : 'png';
        const emojiUrl = `https://cdn.discordapp.com/emojis/${emojiId}.${extension}?size=512`;

        // Download the emoji
        const response = await axios.get(emojiUrl, { responseType: 'arraybuffer' });
        const inputBuffer = Buffer.from(response.data);

        let processedBuffer;
        
        if (isAnimated) {
            // For animated emojis (GIF), we need to handle differently
            // Discord stickers support APNG but not GIF, so we convert to static for now
            // Note: Full animated sticker support would require APNG conversion library
            processedBuffer = await sharp(inputBuffer, { animated: false })
                .resize(512, 512, { 
                    fit: 'contain', 
                    background: { r: 0, g: 0, b: 0, alpha: 0 } 
                })
                .png({ quality: 90, compressionLevel: 9 })
                .toBuffer();
        } else {
            // Static emoji - straightforward conversion
            processedBuffer = await sharp(inputBuffer)
                .resize(512, 512, { 
                    fit: 'contain', 
                    background: { r: 0, g: 0, b: 0, alpha: 0 } 
                })
                .png({ quality: 90, compressionLevel: 9 })
                .toBuffer();
        }

        // Safety check for size
        if (processedBuffer.length > 512000) {
            processedBuffer = await sharp(processedBuffer)
                .png({ palette: true, colors: 128 })
                .toBuffer();
        }

        // Create the sticker
        const newSticker = await interaction.guild.stickers.create({
            file: processedBuffer,
            name: stickerName,
            description: await t('Converted from emoji by ProEmoji', langCode),
            tags: emojiName,
            reason: `Converted from emoji by ${interaction.user.tag}`
        });

        await db.addStickerRecord(interaction.guild.id, newSticker.id, newSticker.name, interaction.user.tag);

        // Track conversion
        if (convertedEmojisToStickers) {
            convertedEmojisToStickers.set(`${interaction.guild.id}:${emojiId}`, {
                stickerId: newSticker.id,
                stickerName: stickerName
            });
        }

        const stickerCreatedTitle = await t('Sticker Created!', langCode);
        const stickerCreatedDesc = await t('Emoji converted to sticker successfully!', langCode);
        const nameText = await t('Name:', langCode);
        const typeText = await t('Type:', langCode);
        const animatedText = isAnimated ? await t('Animated (converted to static)', langCode) : await t('Static', langCode);

        const embed = new EmbedBuilder()
            .setTitle('✅ ' + stickerCreatedTitle)
            .setDescription(`${stickerCreatedDesc}\n\n**${nameText}** ${stickerName}\n**${typeText}** ${animatedText}`)
            .setThumbnail(emojiUrl)
            .setImage(newSticker.url)
            .setColor('#00FF00')
            .setFooter({ text: `${interaction.user.displayName} (@${interaction.user.username})`, iconURL: interaction.user.displayAvatarURL() });

        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        console.error('Error in emoji_to_sticker:', error);
        let errorMsg = error.message;
        if (error.code === 50045) errorMsg = await t('Asset exceeds maximum size (512KB).', langCode);
        if (error.code === 50138) errorMsg = await t('Image must be under 512KB', langCode);
        
        const embed = new EmbedBuilder()
            .setDescription('❌ ' + await t('Error:', langCode) + ' ' + errorMsg)
            .setColor('#FF0000')
            .setFooter({ text: `${interaction.user.displayName} (@${interaction.user.username})`, iconURL: interaction.user.displayAvatarURL() });
        await interaction.editReply({ embeds: [embed] });
    }
}

module.exports = { execute };
