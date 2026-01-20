const { EmbedBuilder } = require('discord.js');
const { t } = require('../../utils/languages');

async function execute(interaction, langCode) {
    // 1. Check Server Permissions
    const hasManageEmoji = interaction.member.permissions.has('ManageGuildExpressions') ||
                           interaction.member.permissions.has('ManageEmojisAndStickers');
    const permStatus = hasManageEmoji ? '🟢' : '🔴';

    // 2. Ping
    const ping = interaction.client.ws.ping;
    const botStatus = await t('Bot Status', langCode);
    const serverPerms = await t('Server Permissions', langCode);
    const pingText = await t('Ping', langCode);

    const embed = new EmbedBuilder()
        .setTitle('📊 ' + botStatus)
        .addFields(
            { name: serverPerms, value: permStatus, inline: true },
            { name: pingText, value: `${ping}ms`, inline: true }
        )
        .setColor(hasManageEmoji ? '#00FF00' : '#FF0000')
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] }).catch(() => {});
}

module.exports = { execute };
