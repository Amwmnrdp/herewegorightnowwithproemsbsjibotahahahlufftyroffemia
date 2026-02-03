const { EmbedBuilder } = require('discord.js');
const { t } = require('../../utils/languages');

async function execute(interaction, langCode) {
    const titleText = await t('Send or Reply with Sticker', langCode);
    const descText = await t('Reply to this message using the sticker you want to delete, and I will delete it for you.', langCode);
    const footerPrefix = await t('Waiting for your sticker...', langCode);
    const embed = new EmbedBuilder()
        .setTitle('📌 ' + titleText)
        .setDescription(descText)
        .setColor('#00FFFF')
        .setFooter({ text: footerPrefix + ` • ${interaction.user.displayName} (@${interaction.user.username})`, iconURL: interaction.user.displayAvatarURL() });

    const response = await interaction.editReply({ embeds: [embed] });
    
    // Add to active sticker sessions for deletion
    const indexFile = require('../../../index.js');
    if (indexFile.activeStickerSessions) {
        indexFile.activeStickerSessions.set(interaction.user.id, {
            type: 'delete_sticker',
            userId: interaction.user.id,
            channelId: interaction.channelId,
            guildId: interaction.guildId,
            langCode: langCode
        });
    }

    return response;
}

module.exports = { execute };
