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
    
    const cleanedName = nameOption.substring(0, 32);
    if (cleanedName.length < 2) {
        const embed = new EmbedBuilder()
            .setDescription('❌ ' + await t('Sticker name must be between 2 and 32 characters.', langCode))
            .setColor('#FF0000');
        await interaction.editReply({ embeds: [embed] });
        return;
    }

    let emojiUrl = '';
    let emojiId = '';
    const customEmojiMatch = emojiInput.match(/<a?:.+:(\d+)>/);
    if (customEmojiMatch) {
        emojiId = customEmojiMatch[1];
        const isAnimated = emojiInput.startsWith('<a:');
        emojiUrl = `https://cdn.discordapp.com/emojis/${emojiId}.${isAnimated ? 'gif' : 'png'}?size=1024`;
    } else {
        const embed = new EmbedBuilder()
            .setDescription('❌ ' + await t('Only custom emojis are supported.', langCode))
            .setColor('#FF0000');
        await interaction.editReply({ embeds: [embed] });
        return;
    }

    const trackingKey = `${interaction.guild.id}:${emojiId}`;
    if (convertedEmojisToStickers && convertedEmojisToStickers.has(trackingKey)) {
        const embed = new EmbedBuilder()
            .setTitle('⚠️ ' + await t('Already Converted!', langCode))
            .setDescription(await t('This emoji has already been converted to a sticker in this server!', langCode))
            .setColor('#FF9900');
        await interaction.editReply({ embeds: [embed] });
        return;
    }

    try {
        const stickers = await interaction.guild.stickers.fetch();
        
        const stickerLimit = interaction.guild.premiumTier >= 1 ? 15 : 5;
        if (stickers.size >= stickerLimit) {
            const limitMsg = await t('Maximum number of stickers reached ({limit})', langCode);
            const embed = new EmbedBuilder()
                .setDescription('❌ ' + limitMsg.replace('{limit}', stickerLimit))
                .setColor('#FF0000');
            await interaction.editReply({ embeds: [embed] });
            return;
        }

        if (stickers.find(s => s.name.toLowerCase() === cleanedName.toLowerCase())) {
            const duplicateText = await t('A sticker with the name "{name}" already exists!', langCode);
            const embed = new EmbedBuilder()
                .setDescription('❌ ' + duplicateText.replace('{name}', cleanedName))
                .setColor('#FF0000');
            await interaction.editReply({ embeds: [embed] });
            return;
        }

        const response = await axios.get(emojiUrl, { responseType: 'arraybuffer' });
        const inputBuffer = Buffer.from(response.data);

        const isAnimated = emojiUrl.includes('.gif');
        let sharpInstance = sharp(inputBuffer, { animated: isAnimated });

        let processedBuffer;
        if (isAnimated) {
            processedBuffer = await sharpInstance
                .resize(512, 512, { 
                    fit: 'contain', 
                    background: { r: 0, g: 0, b: 0, alpha: 0 } 
                })
                .webp({ quality: 80, effort: 6, loop: 0 })
                .toBuffer();
        } else {
            processedBuffer = await sharpInstance
                .resize(512, 512, { 
                    fit: 'contain', 
                    background: { r: 0, g: 0, b: 0, alpha: 0 } 
                })
                .png({ quality: 90, compressionLevel: 9 })
                .toBuffer();
        }

        if (processedBuffer.length > 512000) {
            if (isAnimated) {
                processedBuffer = await sharp(inputBuffer, { animated: true })
                    .resize(320, 320, { fit: 'contain' })
                    .webp({ quality: 50, effort: 6, loop: 0 })
                    .toBuffer();
            } else {
                processedBuffer = await sharp(processedBuffer)
                    .png({ palette: true, colors: 128 })
                    .toBuffer();
            }
        }

        const sticker = await interaction.guild.stickers.create({
            file: processedBuffer,
            name: cleanedName,
            description: await t('Converted by ProEmoji', langCode),
            tags: 'emoji',
            reason: `Converted from emoji by ${interaction.user.tag}`
        });

        await db.addStickerRecord(interaction.guild.id, sticker.id, sticker.name, interaction.user.tag);

        if (convertedEmojisToStickers) {
            convertedEmojisToStickers.set(trackingKey, {
                stickerId: sticker.id,
                stickerName: cleanedName,
                emojiId: emojiId
            });
        }

        const stickerCreatedTitle = await t('Sticker Created!', langCode);
        const stickerCreatedDesc = await t('Emoji converted to sticker successfully!', langCode);
        const nameText = await t('Name:', langCode);

        const embed = new EmbedBuilder()
            .setTitle('✅ ' + stickerCreatedTitle)
            .setDescription(stickerCreatedDesc + `\n**${nameText}** ${cleanedName}`)
            .setThumbnail(`https://cdn.discordapp.com/stickers/${sticker.id}.png`)
            .setImage(emojiUrl)
            .setColor('#00FF00');

        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        console.error('emoji_to_sticker error:', error);
        let errorMsg = error.message;
        if (error.code === 50045) errorMsg = await t('Asset exceeds maximum size (512KB).', langCode);
        if (error.code === 30039) errorMsg = await t('Maximum number of stickers reached.', langCode);
        const embed = new EmbedBuilder().setDescription('❌ ' + errorMsg).setColor('#FF0000');
        await interaction.editReply({ embeds: [embed] });
    }
}

module.exports = { execute };
