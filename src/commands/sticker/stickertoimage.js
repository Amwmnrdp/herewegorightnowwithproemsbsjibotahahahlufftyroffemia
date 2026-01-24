const { EmbedBuilder } = require('discord.js');
const { t } = require('../../utils/languages');

async function execute(interaction, langCode) {
    if (!interaction.replied && !interaction.deferred) {
        await interaction.deferReply().catch(() => {});
    }
    
    const titleText = await t('Sticker to Image', langCode);
    const descText = await t('Reply to this message using the sticker you want to convert back into an image file.', langCode);
    const footerPrefix = await t('Waiting for your sticker...', langCode);
    const embed = new EmbedBuilder()
        .setTitle('🖼️ ' + titleText)
        .setDescription(descText)
        .setColor('#00FFFF')
        .setFooter({ text: footerPrefix + ` • ${interaction.user.displayName} (@${interaction.user.username})`, iconURL: interaction.user.displayAvatarURL() });

    const response = await interaction.editReply({ embeds: [embed] });
    return response;
}

module.exports = { execute };
