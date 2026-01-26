const { EmbedBuilder, MessageFlags } = require('discord.js');
const db = require('../../utils/database');
const { t } = require('../../utils/languages');

async function execute(interaction, langCode) {
    if (interaction.guild.id !== '1118153648938160191' || interaction.user.id !== '815701106235670558') {
        const errMsg = await t('This command is restricted to the bot owner in a specific server.', langCode);
        const embed = new EmbedBuilder()
            .setDescription('🚫 ' + errMsg)
            .setColor('#FF0000');
        return await interaction.editReply({ embeds: [embed] });
    }

    const emojiStr = interaction.options.getString('emoji');
    const packName = interaction.options.getString('pack_select');
    const packDisplayName = packName.charAt(0).toUpperCase() + packName.slice(1) + ' Pack';

    const emojiMatches = emojiStr.match(/<a?:\w+:\d+>/g) || [];
    
    if (emojiMatches.length === 0) {
        const errorMsg = await t('No valid emojis found. Please provide custom emojis.', langCode);
        const embed = new EmbedBuilder()
            .setTitle('❌ ' + await t('Error', langCode))
            .setDescription(errorMsg)
            .setColor('#FF0000')
            .setFooter({ text: `${interaction.user.displayName}`, iconURL: interaction.user.displayAvatarURL() });
        return await interaction.editReply({ embeds: [embed] });
    }

    const results = {
        added: [],
        alreadyExists: [],
        failed: []
    };

    for (const emoji of emojiMatches) {
        const emojiMatch = emoji.match(/<(a)?:(\w+):(\d+)>/);
        if (!emojiMatch) continue;

        const isAnimated = emojiMatch[1] === 'a';
        const emojiName = emojiMatch[2];
        const emojiId = emojiMatch[3];

        try {
            const exists = await db.isEmojiInPack(emojiId, packName);
            if (exists) {
                results.alreadyExists.push({ emoji, name: emojiName });
                continue;
            }

            await db.addEmojiToPack(emojiId, emojiName, packName, isAnimated);
            results.added.push({ emoji, name: emojiName });
        } catch (error) {
            console.error('Error adding emoji to pack:', error);
            results.failed.push({ emoji, name: emojiName });
        }
    }

    let description = '';
    
    if (results.added.length > 0) {
        const addedText = await t('Added to {pack}:', langCode);
        const emojiList = results.added.map(r => r.emoji).join(' ');
        description += `✅ **${addedText.replace('{pack}', packDisplayName)}**\n${emojiList}\n\n`;
    }
    
    if (results.alreadyExists.length > 0) {
        const existsText = await t('Already in pack:', langCode);
        const emojiList = results.alreadyExists.map(r => r.emoji).join(' ');
        description += `⚠️ **${existsText}**\n${emojiList}\n\n`;
    }
    
    if (results.failed.length > 0) {
        const failedText = await t('Failed to add:', langCode);
        const emojiList = results.failed.map(r => r.emoji).join(' ');
        description += `❌ **${failedText}**\n${emojiList}\n`;
    }

    let color = '#00FF00';
    let title = await t('Success!', langCode);
    
    if (results.added.length === 0 && results.alreadyExists.length > 0) {
        color = '#FFA500';
        title = await t('No Changes', langCode);
    } else if (results.added.length === 0 && results.failed.length > 0) {
        color = '#FF0000';
        title = await t('Error', langCode);
    } else if (results.alreadyExists.length > 0 || results.failed.length > 0) {
        color = '#FFFF00';
        title = await t('Partially Added', langCode);
    }

    const summaryText = await t('Summary:', langCode);
    const addedCountText = await t('Added', langCode);
    const skippedCountText = await t('Skipped', langCode);
    
    const embed = new EmbedBuilder()
        .setTitle(`📦 ${title}`)
        .setDescription(description.trim())
        .addFields({
            name: `📊 ${summaryText}`,
            value: `${addedCountText}: **${results.added.length}** | ${skippedCountText}: **${results.alreadyExists.length + results.failed.length}**`,
            inline: false
        })
        .setColor(color)
        .setFooter({ text: `${packDisplayName} • ${interaction.user.displayName}`, iconURL: interaction.user.displayAvatarURL() })
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
}

module.exports = { execute };
