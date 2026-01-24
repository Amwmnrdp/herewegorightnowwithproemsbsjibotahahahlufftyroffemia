const { EmbedBuilder } = require('discord.js');
const { parseEmoji } = require('../../utils/helpers');
const { t } = require('../../utils/languages');
const db = require('../../utils/database');

async function execute(interaction, langCode) {
    const emojiInput = interaction.options.getString('emoji');
    const customName = interaction.options.getString('name');
    
    const emojiMatches = emojiInput.match(/<a?:\w+:\d+>|\d{17,21}/g);
    
    if (!emojiMatches || emojiMatches.length === 0) {
        const isStandardEmoji = /(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])/.test(emojiInput);
        let errorText;
        if (isStandardEmoji) {
            errorText = await t('This is a standard emoji. Please use a custom emoji or an emoji ID.', langCode);
        } else {
            errorText = await t('Invalid emoji! Please provide a custom emoji or an emoji ID.', langCode);
        }
        const embed = new EmbedBuilder()
            .setDescription('❌ ' + errorText)
            .setColor('#FF0000')
            .setFooter({ text: `${interaction.user.displayName} (@${interaction.user.username})`, iconURL: interaction.user.displayAvatarURL() });
        await interaction.editReply({ embeds: [embed] });
        return;
    }

    const results = {
        added: [],
        alreadyExists: [],
        failed: []
    };

    for (let i = 0; i < emojiMatches.length; i++) {
        const emoji = emojiMatches[i];
        const match = emoji.match(/<a?:(\w+):(\d+)>/) || emoji.match(/^(\d+)$/);
        
        if (!match) continue;
        
        const emojiId = match[2] || match[1];
        const originalName = match[2] ? match[1] : null;
        const isAnimated = emoji.includes('<a:');
        
        try {
            if (await db.isEmojiInDb(interaction.guild.id, emojiId)) {
                results.alreadyExists.push({ id: emojiId, name: originalName || emojiId });
                continue;
            }

            const serverEmojis = await interaction.guild.emojis.fetch().catch(() => new Map());
            if (serverEmojis.has(emojiId)) {
                results.alreadyExists.push({ id: emojiId, name: originalName || emojiId });
                continue;
            }

            let emojiName;
            if (emojiMatches.length === 1 && customName) {
                emojiName = customName;
            } else {
                emojiName = originalName || 'emoji_' + emojiId;
            }

            let finalName = emojiName;
            let counter = 1;
            while ([...serverEmojis.values()].find(e => e.name.toLowerCase() === finalName.toLowerCase())) {
                finalName = `${emojiName}_${counter}`;
                counter++;
            }

            let animated = isAnimated;
            let foundEmoji = null;
            for (const g of interaction.client.guilds.cache.values()) {
                foundEmoji = g.emojis.cache.get(emojiId);
                if (foundEmoji) {
                    animated = foundEmoji.animated;
                    break;
                }
            }

            const type = animated ? '.gif' : '.png';
            const url = `https://cdn.discordapp.com/emojis/${emojiId}${type}`;
            const emj = await interaction.guild.emojis.create({ attachment: url, name: finalName, reason: `By ${interaction.user.tag}` });
            
            await db.addEmojiRecord(interaction.guild.id, emj.id, emj.name, interaction.user.tag).catch(err => {
                console.error('Database error in addemoji:', err);
            });
            
            results.added.push({ emoji: emj, name: finalName });
        } catch (error) {
            console.error('Discord API error in addemoji:', error);
            results.failed.push({ id: emojiId, name: originalName || emojiId, error: error.message });
        }
    }

    let description = '';
    
    if (results.added.length > 0) {
        const addedText = await t('Added!', langCode);
        const emojiList = results.added.map(r => r.emoji.toString()).join(' ');
        description += `✅ **${addedText}** ${emojiList}\n`;
    }
    
    if (results.alreadyExists.length > 0) {
        const existsText = await t('Already exists:', langCode);
        const existsList = results.alreadyExists.map(r => `\`${r.name}\``).join(', ');
        description += `⚠️ **${existsText}** ${existsList}\n`;
    }
    
    if (results.failed.length > 0) {
        const failedText = await t('Failed:', langCode);
        const failedList = results.failed.map(r => `\`${r.name}\``).join(', ');
        description += `❌ **${failedText}** ${failedList}\n`;
    }

    let color = '#00FFFF';
    if (results.added.length === 0 && results.failed.length > 0) {
        color = '#FF0000';
    } else if (results.added.length === 0 && results.alreadyExists.length > 0) {
        color = '#FF9900';
    } else if (results.failed.length > 0 || results.alreadyExists.length > 0) {
        color = '#FFFF00';
    } else {
        color = '#00FF00';
    }

    const embed = new EmbedBuilder()
        .setDescription(description.trim())
        .setColor(color)
        .setFooter({ text: `${interaction.user.displayName} (@${interaction.user.username})`, iconURL: interaction.user.displayAvatarURL() });

    if (results.added.length > 0 && results.added.length === 1) {
        const addedEmoji = results.added[0].emoji;
        embed.setThumbnail(`https://cdn.discordapp.com/emojis/${addedEmoji.id}.${addedEmoji.animated ? 'gif' : 'png'}`);
    }

    await interaction.editReply({ embeds: [embed] }).catch(() => {});
}

module.exports = { execute };
