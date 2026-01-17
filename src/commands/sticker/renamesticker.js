const { EmbedBuilder } = require('discord.js');
const { t } = require('../../utils/languages');

async function execute(interaction, langCode) {
    const newName = interaction.options.getString('name');

    const titleText = await t('Send or Reply with Sticker', langCode);
    const descText = await t('Reply to this message using the sticker you want to rename.', langCode);
    const newNameText = await t('New Name:', langCode);
    const footerPrefix = await t('Waiting for your sticker...', langCode);
    const embed = new EmbedBuilder()
        .setTitle('📌 ' + titleText)
        .setDescription(descText + `\n\n**${newNameText}** ${newName}`)
        .setColor('#00FFFF')
        .setFooter({ text: footerPrefix + ` • ${interaction.user.displayName} (@${interaction.user.username})`, iconURL: interaction.user.displayAvatarURL() });

    const response = await interaction.editReply({ embeds: [embed] });
    return response;
}

module.exports = { execute };
