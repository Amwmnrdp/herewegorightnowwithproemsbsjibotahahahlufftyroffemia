const { EmbedBuilder } = require('discord.js');
const { t } = require('../../utils/languages');

async function execute(interaction, langCode) {
    const db = require('../../utils/database');
    const perms = await db.getServerPermissions(interaction.guild.id);
    
    const emojiAllowed = perms.emoji_permission_enabled;
    const emojiStatus = (emojiAllowed ? '🟢 ' : '🔴 ') + (emojiAllowed ? await t('Allowed', langCode) : await t('Denied', langCode));
    
    const stickerAllowed = perms.sticker_permission_enabled;
    const stickerStatus = (stickerAllowed ? '🟢 ' : '🔴 ') + (stickerAllowed ? await t('Allowed', langCode) : await t('Denied', langCode));
    
    const deleteAllowed = perms.delete_permission_enabled;
    const deleteStatus = (deleteAllowed ? '🟢 ' : '🔴 ') + (deleteAllowed ? await t('Allowed', langCode) : await t('Denied', langCode));

    const botStatus = await t('Server Status', langCode);
    const emojiPermText = await t('Emoji Permission', langCode);
    const stickerPermText = await t('Sticker Permission', langCode);
    const deletePermText = await t('Delete Permission', langCode);
    const serverStatsText = await t('Server Stats', langCode);
    const emojisText = await t('Emojis', langCode);
    const stickersText = await t('Stickers', langCode);
    const permissionsText = await t('Permissions', langCode);
    
    const emojiCount = interaction.guild.emojis.cache.size;
    const stickerCount = interaction.guild.stickers.cache.size;
    const animatedCount = interaction.guild.emojis.cache.filter(e => e.animated).size;
    const staticCount = emojiCount - animatedCount;
    
    const ping = Math.round(interaction.client.ws.ping);

    const embed = new EmbedBuilder()
        .setAuthor({ name: 'ProEmoji', iconURL: interaction.client.user.displayAvatarURL() })
        .setTitle('📊 ' + botStatus)
        .setDescription(`**${await t('Ping', langCode)}:** ${ping}ms`)
        .addFields(
            { 
                name: `📁 ${serverStatsText}`, 
                value: `${emojisText}: **${emojiCount}** (🎞️ ${animatedCount} | 🖼️ ${staticCount})\n${stickersText}: **${stickerCount}**`, 
                inline: false 
            },
            { 
                name: `🔐 ${permissionsText}`, 
                value: `${emojiPermText}: ${emojiStatus}\n${stickerPermText}: ${stickerStatus}\n${deletePermText}: ${deleteStatus}`, 
                inline: false 
            }
        )
        .setColor('#00FFFF')
        .setFooter({ text: `${interaction.user.displayName} (@${interaction.user.username})`, iconURL: interaction.user.displayAvatarURL() })
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] }).catch(() => {});
}

module.exports = { execute };
