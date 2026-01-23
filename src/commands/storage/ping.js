const { EmbedBuilder } = require('discord.js');
const { t } = require('../../utils/languages');

async function execute(interaction, langCode) {
    const start = Date.now();
    
    const embed = new EmbedBuilder()
        .setDescription('🏓 ' + await t('Pinging...', langCode))
        .setColor('#00FFFF');
    
    const msg = await interaction.editReply({ embeds: [embed] });
    const latency = Date.now() - start;
    const apiLatency = Math.round(interaction.client.ws.ping);

    const resultEmbed = new EmbedBuilder()
        .setTitle('🏓 Pong!')
        .addFields(
            { name: await t('Bot Latency', langCode), value: `\`${latency}ms\``, inline: true },
            { name: await t('API Latency', langCode), value: `\`${apiLatency}ms\``, inline: true }
        )
        .setColor('#00FF00')
        .setFooter({ text: `${interaction.user.displayName} (@${interaction.user.username})`, iconURL: interaction.user.displayAvatarURL() });

    await interaction.editReply({ embeds: [resultEmbed] });
}

module.exports = { execute };