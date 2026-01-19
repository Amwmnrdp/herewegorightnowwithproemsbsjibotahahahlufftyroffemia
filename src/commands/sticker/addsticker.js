const { EmbedBuilder } = require('discord.js');
const { t } = require('../../utils/languages');

async function execute(interaction, langCode) {
    const name = interaction.options.getString('name');
    const stickerId = interaction.options.getString('sticker_id');

    const maxStickers = {
        0: 5,   // Tier 0
        1: 15,  // Tier 1
        2: 30,  // Tier 2
        3: 60   // Tier 3
    };
    const guildMax = maxStickers[interaction.guild.premiumTier];

    const serverStickers = await interaction.guild.stickers.fetch();
    if (serverStickers.size >= guildMax) {
        const limitText = await t('Maximum number of stickers reached ({max})', langCode);
        const embed = new EmbedBuilder().setDescription('❌ ' + limitText.replace('{max}', guildMax)).setColor('#FF0000');
        await interaction.editReply({ embeds: [embed] });
        return;
    }

    if (stickerId) {
        try {
            let foundSticker = null;
            for (const guild of interaction.client.guilds.cache.values()) {
                foundSticker = guild.stickers.cache.get(stickerId);
                if (foundSticker) break;
            }

            if (!foundSticker) {
                const notFoundText = await t('Sticker with ID {id} not found in bot\'s reach.', langCode);
                const embed = new EmbedBuilder().setDescription('❌ ' + notFoundText.replace('{id}', stickerId)).setColor('#FF0000');
                return await interaction.editReply({ embeds: [embed] });
            }

            const stickerName = name || foundSticker.name;
            await interaction.guild.stickers.create({
                file: foundSticker.imageURL(),
                name: stickerName,
                tags: foundSticker.tags || 'emoji'
            });

            const successText = await t('Successfully added sticker: {name}', langCode);
            const embed = new EmbedBuilder().setDescription('✅ ' + successText.replace('{name}', stickerName)).setColor('#00FFFF');
            return await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            const errorPrefix = await t('Error adding sticker:', langCode);
            const embed = new EmbedBuilder().setDescription('❌ ' + errorPrefix + ' ' + error.message).setColor('#FF0000');
            return await interaction.editReply({ embeds: [embed] });
        }
    }

    if (name) {
        const duplicate = serverStickers.find(s => s.name.toLowerCase() === name.toLowerCase());
        if (duplicate) {
            const duplicateText = await t('A sticker with the name "{name}" already exists!', langCode);
            const embed = new EmbedBuilder().setDescription('❌ ' + duplicateText.replace('{name}', name)).setColor('#FF0000');
            await interaction.editReply({ embeds: [embed] });
            return;
        }
    }

    const titleText = await t('Add Sticker', langCode);
    const descText = await t('Reply to this message using the sticker you want to add to the server.', langCode);
    const footerPrefix = await t('Waiting for your sticker...', langCode);
    const embed = new EmbedBuilder()
        .setTitle('🎨 ' + titleText)
        .setDescription(descText)
        .setColor('#00FFFF')
        .setFooter({ text: footerPrefix + ` • ${interaction.user.displayName} (@${interaction.user.username})`, iconURL: interaction.user.displayAvatarURL() });

    const response = await interaction.editReply({ embeds: [embed], fetchReply: true });
    
    return response;
}

module.exports = { execute };
