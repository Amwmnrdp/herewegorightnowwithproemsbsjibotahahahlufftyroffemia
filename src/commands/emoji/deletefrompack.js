const { EmbedBuilder, MessageFlags } = require('discord.js');
const db = require('../../utils/database');
const { t } = require('../../utils/languages');

async function execute(interaction, langCode) {
    if (interaction.guild.id !== '1118153648938160191' || interaction.user.id !== '815701106235670558') {
        const errMsg = await t('This command is restricted to the bot owner in a specific server.', langCode);
        const embed = new EmbedBuilder()
            .setDescription('🚫 ' + errMsg)
            .setColor('#FF0000');
        return await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }

    await interaction.deferReply();

    const emojiInput = interaction.options.getString('emoji');
    const packName = interaction.options.getString('pack_select');
    const packDisplayName = packName.charAt(0).toUpperCase() + packName.slice(1) + ' Pack';

    const emojiMatches = emojiInput.match(/<a?:\w+:\d+>/g) || [];
    const idMatches = emojiInput.match(/\b\d{17,21}\b/g) || [];
    
    const allEmojis = [];
    
    for (const emoji of emojiMatches) {
        const match = emoji.match(/<a?:(\w+):(\d+)>/);
        if (match) {
            allEmojis.push({ display: emoji, id: match[2], name: match[1] });
        }
    }
    
    for (const id of idMatches) {
        if (!allEmojis.find(e => e.id === id)) {
            allEmojis.push({ display: id, id: id, name: id });
        }
    }

    if (allEmojis.length === 0) {
        const errorMsg = await t('No valid emojis or IDs found. Please provide custom emojis or emoji IDs.', langCode);
        const embed = new EmbedBuilder()
            .setTitle('❌ ' + await t('Error', langCode))
            .setDescription(errorMsg)
            .setColor('#FF0000')
            .setFooter({ text: `${interaction.user.displayName}`, iconURL: interaction.user.displayAvatarURL() });
        return await interaction.editReply({ embeds: [embed] });
    }

    const results = {
        removed: [],
        notFound: [],
        failed: []
    };

    for (const emoji of allEmojis) {
        try {
            const exists = await db.isEmojiInPack(emoji.id, packName);
            if (!exists) {
                results.notFound.push(emoji);
                continue;
            }

            await db.removeEmojiFromPack(emoji.id, packName);
            results.removed.push(emoji);
        } catch (error) {
            console.error('Error removing emoji from pack:', error);
            results.failed.push(emoji);
        }
    }

    let description = '';
    
    if (results.removed.length > 0) {
        const removedText = await t('Removed from {pack}:', langCode);
        const emojiList = results.removed.map(r => r.display).join(' ');
        description += `✅ **${removedText.replace('{pack}', packDisplayName)}**\n${emojiList}\n\n`;
    }
    
    if (results.notFound.length > 0) {
        const notFoundText = await t('Not found in pack:', langCode);
        const emojiList = results.notFound.map(r => r.display).join(' ');
        description += `⚠️ **${notFoundText}**\n${emojiList}\n\n`;
    }
    
    if (results.failed.length > 0) {
        const failedText = await t('Failed to remove:', langCode);
        const emojiList = results.failed.map(r => r.display).join(' ');
        description += `❌ **${failedText}**\n${emojiList}\n`;
    }

    let color = '#00FF00';
    let title = await t('Success!', langCode);
    
    if (results.removed.length === 0 && results.notFound.length > 0) {
        color = '#FFA500';
        title = await t('No Changes', langCode);
    } else if (results.removed.length === 0 && results.failed.length > 0) {
        color = '#FF0000';
        title = await t('Error', langCode);
    } else if (results.notFound.length > 0 || results.failed.length > 0) {
        color = '#FFFF00';
        title = await t('Partially Removed', langCode);
    }

    const summaryText = await t('Summary:', langCode);
    const removedCountText = await t('Removed', langCode);
    const skippedCountText = await t('Skipped', langCode);
    
    const embed = new EmbedBuilder()
        .setTitle(`🗑️ ${title}`)
        .setDescription(description.trim())
        .addFields({
            name: `📊 ${summaryText}`,
            value: `${removedCountText}: **${results.removed.length}** | ${skippedCountText}: **${results.notFound.length + results.failed.length}**`,
            inline: false
        })
        .setColor(color)
        .setFooter({ text: `${packDisplayName} • ${interaction.user.displayName}`, iconURL: interaction.user.displayAvatarURL() })
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
}

module.exports = { execute };
