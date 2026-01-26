const { EmbedBuilder } = require('discord.js');
const { t } = require('../../utils/languages');
const axios = require('axios');
const sharp = require('sharp');
const db = require('../../utils/database');

async function execute(interaction, langCode, convertedImagesToStickers) {
    if (!interaction.replied && !interaction.deferred) {
        await interaction.deferReply().catch(() => {});
    }
    
    const nameOption = interaction.options.getString('name');
    const urlOption = interaction.options.getString('url');
    const integrationOption = interaction.options.getString('integration') === 'true';

    const cleanedName = nameOption.substring(0, 32);
    if (cleanedName.length < 2) {
        const embed = new EmbedBuilder()
            .setDescription('❌ ' + await t('Sticker name must be between 2 and 32 characters.', langCode))
            .setColor('#FF0000');
        await interaction.editReply({ embeds: [embed] });
        return;
    }

    if (!urlOption) {
        const titleText = await t('Convert Image to Sticker', langCode);
        const descText = await t('Reply to this message with the image you want to convert into a sticker.', langCode);
        const embed = new EmbedBuilder()
            .setTitle('🖼️ ' + titleText)
            .setDescription(descText)
            .setColor('#00FFFF')
            .setFooter({ text: `${interaction.user.displayName} (@${interaction.user.username})`, iconURL: interaction.user.displayAvatarURL() });

        const response = await interaction.editReply({ embeds: [embed], fetchReply: true });
        return { waitingForImage: true, messageId: response.id, stickerName: cleanedName, userId: interaction.user.id, langCode, guildId: interaction.guild.id, integration: integrationOption };
    }

    const finalUrl = urlOption;

    const imageTrackingKey = `${interaction.guild.id}:${finalUrl}`;
    if (convertedImagesToStickers.has(imageTrackingKey)) {
        const embed = new EmbedBuilder()
            .setTitle('⚠️ ' + await t('Image Already Converted!', langCode))
            .setDescription(await t('This image has already been converted to a sticker!', langCode))
            .setColor('#FF9900');
        await interaction.editReply({ embeds: [embed] });
        return;
    }

    try {
        const stickers = await interaction.guild.stickers.fetch();
        if (stickers.size >= 5) {
            const embed = new EmbedBuilder()
                .setDescription('❌ ' + await t('Maximum number of stickers reached (5)', langCode))
                .setColor('#FF0000');
            await interaction.editReply({ embeds: [embed] });
            return;
        }

        if (stickers.find(s => s.name.toLowerCase() === cleanedName.toLowerCase())) {
            const duplicateText = await t('A sticker with the name "{name}" already exists!', langCode);
            const embed = new EmbedBuilder().setDescription('❌ ' + duplicateText.replace('{name}', cleanedName)).setColor('#FF0000');
            await interaction.editReply({ embeds: [embed] });
            return;
        }

        const response = await axios.get(finalUrl, { responseType: 'arraybuffer' });
        const inputBuffer = Buffer.from(response.data);

        let sharpInstance = sharp(inputBuffer);

        if (integrationOption) {
            sharpInstance = sharpInstance.resize(512, 512, {
                fit: 'cover',
                position: 'center'
            });
        } else {
            const metadata = await sharpInstance.metadata();
            const ratio = metadata.width / metadata.height;
            
            if (ratio > 1) {
                sharpInstance = sharpInstance.resize(512, Math.round(512 / ratio));
            } else {
                sharpInstance = sharpInstance.resize(Math.round(512 * ratio), 512);
            }
        }

        let processedBuffer = await sharpInstance
            .png({ quality: 80, compressionLevel: 9 })
            .toBuffer();

        if (processedBuffer.length > 512000) {
            processedBuffer = await sharp(processedBuffer)
                .png({ palette: true, colors: 128 })
                .toBuffer();
        }

        const sticker = await interaction.guild.stickers.create({
            file: processedBuffer,
            name: cleanedName,
            description: await t('Converted by ProEmoji', langCode),
            tags: 'emoji',
            reason: `By ${interaction.user.tag}`
        });

        await db.addStickerRecord(interaction.guild.id, sticker.id, sticker.name, interaction.user.tag);
        const stickerCreatedTitle = await t('Sticker Created!', langCode);
        const stickerCreatedDesc = await t('Successfully converted image to sticker!', langCode);
        const nameText = await t('Name:', langCode);
        const modeText = await t('Mode:', langCode);
        const integrationText = await t('Integration (Full 512x512)', langCode);
        const originalText = await t('Original Form', langCode);

        const embed = new EmbedBuilder()
            .setTitle('✅ ' + stickerCreatedTitle)
            .setDescription(stickerCreatedDesc + `\n**${nameText}** ${cleanedName}\n**${modeText}** ${integrationOption ? integrationText : originalText}`)
            .setImage(finalUrl)
            .setColor('#00FF00');

        await interaction.editReply({ embeds: [embed] });
        convertedImagesToStickers.set(imageTrackingKey, {
            stickerId: sticker.id,
            stickerName: cleanedName,
            imageUrl: finalUrl
        });
    } catch (error) {
        let errorMsg = error.message;
        if (error.code === 50045) errorMsg = 'Asset exceeds maximum size (512KB).';
        const embed = new EmbedBuilder().setDescription(`❌ ${errorMsg}`).setColor('#FF0000');
        await interaction.editReply({ embeds: [embed] });
    }
}

module.exports = { execute };
