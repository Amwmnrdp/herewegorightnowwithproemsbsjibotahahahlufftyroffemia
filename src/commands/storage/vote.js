const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { t } = require('../../utils/languages');

async function execute(interaction, langCode) {
    const embed = new EmbedBuilder()
        .setTitle('🙏 ' + await t('Thank You!', langCode))
        .setDescription(await t('Thank you for supporting ProEmoji! Your help keeps the bot growing. Supporting us with a vote helps the bot grow and stay online! Click the button below to vote on Top.gg.', langCode))
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
                .setURL(`https://top.gg/bot/${interaction.client.user.id}/vote`)
                .setStyle(ButtonStyle.Link)
        );

    await interaction.editReply({ embeds: [embed], components: [row] });
}

module.exports = { execute };