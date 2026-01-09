const { EmbedBuilder } = require('discord.js');
const { t } = require('../../utils/languages');
const db = require('../../utils/database');
const axios = require('axios');

async function execute(interaction, langCode) {
    const TOP_GG_API_KEY = process.env.TOP_GG_API_KEY;
    const TOP_GG_BOT_ID = process.env.TOP_GG_BOT_ID;

    // 1. Check Server Permissions
    const hasManageEmoji = interaction.member.permissions.has('ManageGuildExpressions') ||
                           interaction.member.permissions.has('ManageEmojisAndStickers');
    const permStatus = hasManageEmoji ? '🟢' : '🔴';

    // 2. Check Vote Status
    let voteStatus = '⚪';
    if (TOP_GG_API_KEY && TOP_GG_BOT_ID) {
        try {
            const response = await axios.get(`https://top.gg/api/bots/${TOP_GG_BOT_ID}/check?userId=${interaction.user.id}`, {
                headers: { 'Authorization': TOP_GG_API_KEY }
            });
            voteStatus = response.data.voted === 1 ? '🟢' : '🔴';
        } catch (error) {
            voteStatus = '🔴 (Error)';
        }
    } else {
        voteStatus = '🔴 (Not Configured)';
    }

    // 3. Ping
    const ping = interaction.client.ws.ping;

    const embed = new EmbedBuilder()
        .setTitle('📊 ' + await t('Bot Status', langCode))
        .addFields(
            { name: await t('Server Permissions', langCode), value: permStatus, inline: true },
            { name: await t('Ping', langCode), value: `${ping}ms`, inline: true }
        )
        .setColor(hasManageEmoji ? '#00FF00' : '#FF0000')
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

module.exports = { execute };
