const { EmbedBuilder } = require('discord.js');
const { t } = require('../../utils/languages');

async function execute(interaction, langCode) {
    const start = Date.now();
    
    const pingEmbed = new EmbedBuilder()
        .setDescription('🏓 ' + await t('Measuring latency...', langCode))
        .setColor('#FFD700');
    
    await interaction.editReply({ embeds: [pingEmbed] });
    
    const latency = Date.now() - start;
    const apiLatency = Math.round(interaction.client.ws.ping);

    const getLatencyColor = (ms) => {
        if (ms < 100) return '#00FF00';
        if (ms < 200) return '#FFFF00';
        if (ms < 400) return '#FFA500';
        return '#FF0000';
    };

    const getLatencyEmoji = (ms) => {
        if (ms < 100) return '🟢';
        if (ms < 200) return '🟡';
        if (ms < 400) return '🟠';
        return '🔴';
    };

    const botLatencyText = await t('Bot Latency', langCode);
    const apiLatencyText = await t('API Latency', langCode);
    const connectionText = await t('Connection', langCode);
    
    let connectionStatus;
    if (apiLatency < 100) {
        connectionStatus = await t('Excellent', langCode);
    } else if (apiLatency < 200) {
        connectionStatus = await t('Good', langCode);
    } else if (apiLatency < 400) {
        connectionStatus = await t('Fair', langCode);
    } else {
        connectionStatus = await t('Poor', langCode);
    }

    const resultEmbed = new EmbedBuilder()
        .setTitle('🏓 Pong!')
        .addFields(
            { name: `${getLatencyEmoji(latency)} ${botLatencyText}`, value: `\`${latency}ms\``, inline: true },
            { name: `${getLatencyEmoji(apiLatency)} ${apiLatencyText}`, value: `\`${apiLatency}ms\``, inline: true },
            { name: `📶 ${connectionText}`, value: `\`${connectionStatus}\``, inline: true }
        )
        .setColor(getLatencyColor(apiLatency))
        .setFooter({ text: `${interaction.user.displayName} (@${interaction.user.username})`, iconURL: interaction.user.displayAvatarURL() })
        .setTimestamp();

    await interaction.editReply({ embeds: [resultEmbed] });
}

module.exports = { execute };
