const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { t } = require('../../utils/languages');

async function execute(interaction, langCode) {
    const embed = new EmbedBuilder()
        .setTitle('🙏 ' + await t('Thank You!', langCode))
        .setDescription(await t('Thank you for supporting ProEmoji! Your help keeps the bot growing.', langCode))
        .setColor('#00FFFF')
        .setThumbnail(interaction.client.user.displayAvatarURL());

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setLabel(await t('Support Server', langCode))
                .setURL('https://discord.gg/qTHehSfaW4')
                .setStyle(ButtonStyle.Link),
            new ButtonBuilder()
                .setLabel(await t('Vote', langCode))
                .setURL('https://top.gg/bot/1009426679061553162/vote')
                .setStyle(ButtonStyle.Link)
        );

    await interaction.editReply({ embeds: [embed], components: [row] });
}

module.exports = { execute };