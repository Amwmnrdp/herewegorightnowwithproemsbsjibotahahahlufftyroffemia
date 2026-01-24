const { EmbedBuilder } = require('discord.js');
const { t } = require('../../utils/languages');

async function execute(interaction, langCode) {
    if (!interaction.replied && !interaction.deferred) {
        await interaction.deferReply().catch(() => {});
    }
    
    try {
        const titleText = await t('Get Sticker ID', langCode);
        const descText = await t('Reply to this message using the sticker you want to get the ID for.', langCode);
        const footerPrefix = await t('Waiting for your sticker...', langCode);
        
        const embed = new EmbedBuilder()
            .setTitle('🆔 ' + titleText)
            .setDescription(descText)
            .setColor('#00FFFF')
            .setFooter({ text: footerPrefix + ` • ${interaction.user.displayName} (@${interaction.user.username})`, iconURL: interaction.user.displayAvatarURL() });

        return await interaction.editReply({ embeds: [embed], fetchReply: true });
    } catch (error) {
        console.error('Error in get_sticker_id:', error);
        const errorText = await t('An error occurred while executing this command.', langCode);
        await interaction.editReply({ content: '❌ ' + errorText }).catch(() => {});
    }
}

module.exports = { execute };