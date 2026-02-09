const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const { t } = require('../../utils/languages');

async function execute(interaction, langCode) {
    const titleText = await t('Sticker to Image', langCode);
    const descText = await t('Reply to this message using the sticker you want to convert back into an image file.', langCode);
    const footerPrefix = await t('Waiting for your sticker...', langCode);
    const embed = new EmbedBuilder()
        .setTitle('🖼️ ' + titleText)
        .setDescription(descText)
        .setColor('#00FFFF')
        .setFooter({ text: footerPrefix + ` • ${interaction.user.displayName} (@${interaction.user.username})`, iconURL: interaction.user.displayAvatarURL() });

    const response = await interaction.editReply({ embeds: [embed] });
    
    const indexFile = require('../../../index.js');
    if (indexFile.activeStickerSessions) {
        indexFile.activeStickerSessions.set(interaction.user.id, {
            type: 'sticker_to_image',
            userId: interaction.user.id,
            channelId: interaction.channelId,
            guildId: interaction.guildId,
            langCode: langCode,
            messageId: response.id
        });
        
        setTimeout(() => {
            if (indexFile.activeStickerSessions.get(interaction.user.id)?.messageId === response.id) {
                indexFile.activeStickerSessions.delete(interaction.user.id);
            }
        }, 300000);
    }
    
    return response;
}

module.exports = { execute };
