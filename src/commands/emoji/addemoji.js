const { EmbedBuilder } = require('discord.js');
const { parseEmoji } = require('../../utils/helpers');
const { t } = require('../../utils/languages');
const db = require('../../utils/database');

async function execute(interaction, langCode) {
    const emoji = interaction.options.getString('emoji');
    const name = interaction.options.getString('name');
    
    // Support either direct emoji <a:name:id> or just the ID
    const match = emoji.match(/<a?:.+:(\d+)>/) || emoji.match(/^(\d+)$/);
    if (!match) {
        const errorText = await t('Invalid emoji! Please provide a custom emoji or an emoji ID.', langCode);
        const embed = new EmbedBuilder().setDescription('❌ ' + errorText).setColor('#FF0000').setFooter({ text: `${interaction.user.displayName} (@${interaction.user.username})`, iconURL: interaction.user.displayAvatarURL() });
        await interaction.editReply({ embeds: [embed] });
        return;
    }
    const emojiId = match[1];
    const isAnimated = emoji.includes('<a:');

    try {
        if (await db.isEmojiInDb(interaction.guild.id, emojiId)) {
            const alreadyExistsText = await t('already exists!', langCode);
            const embed = new EmbedBuilder().setDescription('⚠️ ' + emojiId + ' ' + alreadyExistsText).setColor('#FF9900').setFooter({ text: `${interaction.user.displayName} (@${interaction.user.username})`, iconURL: interaction.user.displayAvatarURL() });
            return await interaction.editReply({ embeds: [embed] }).catch(() => {});
        }

        const serverEmojis = await interaction.guild.emojis.fetch().catch(() => new Map());
        if (serverEmojis.has(emojiId)) {
            const alreadyExistsText = await t('already exists!', langCode);
            const embed = new EmbedBuilder().setDescription('⚠️ ' + emojiId + ' ' + alreadyExistsText).setColor('#FF9900').setFooter({ text: `${interaction.user.displayName} (@${interaction.user.username})`, iconURL: interaction.user.displayAvatarURL() });
            return await interaction.editReply({ embeds: [embed] }).catch(() => {});
        }

        const emojiName = name || 'emoji_' + emojiId;
        if ([...serverEmojis.values()].find(e => e.name.toLowerCase() === emojiName.toLowerCase())) {
            const duplicateText = await t('An emoji with the name "{name}" already exists!', langCode);
            const embed = new EmbedBuilder().setDescription('❌ ' + duplicateText.replace('{name}', emojiName)).setColor('#FF0000');
            return await interaction.editReply({ embeds: [embed] }).catch(() => {});
        }

        // Try to fetch emoji info from other guilds the bot is in to determine animation
        let animated = isAnimated;
        let foundEmoji = null;
        for (const g of interaction.client.guilds.cache.values()) {
            foundEmoji = g.emojis.cache.get(emojiId);
            if (foundEmoji) {
                animated = foundEmoji.animated;
                break;
            }
        }

        let type = animated ? '.gif' : '.png';
        let url = `https://cdn.discordapp.com/emojis/${emojiId + type}`;
        const emj = await interaction.guild.emojis.create({ attachment: url, name: emojiName, reason: `By ${interaction.user.tag}` });
        await db.addEmojiRecord(interaction.guild.id, emj.id, emj.name, interaction.user.tag).catch(() => {});
        const addedText = await t('Added!', langCode);
        const embed = new EmbedBuilder().setDescription('✅ ' + addedText + ' ' + emj.toString()).setColor('#00FFFF').setFooter({ text: `${interaction.user.displayName} (@${interaction.user.username})`, iconURL: interaction.user.displayAvatarURL() });
        await interaction.editReply({ embeds: [embed] }).catch(() => {});
    } catch (error) {
        const errorPrefix = await t('Error:', langCode);
        const embed = new EmbedBuilder().setDescription('❌ ' + errorPrefix + ' ' + error.message).setColor('#FF0000').setFooter({ text: `${interaction.user.displayName} (@${interaction.user.username})`, iconURL: interaction.user.displayAvatarURL() });
        await interaction.editReply({ embeds: [embed] }).catch(() => {});
    }
}

module.exports = { execute };
