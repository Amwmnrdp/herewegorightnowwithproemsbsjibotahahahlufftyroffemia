const { EmbedBuilder, PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { t } = require('../../utils/languages');

async function execute(interaction, langCode, client) {
    const hasManageEmoji = interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuildExpressions) ||
                           interaction.member.permissions.has(PermissionsBitField.Flags.ManageEmojisAndStickers);
    
    if (!hasManageEmoji) {
        const embed = new EmbedBuilder()
            .setTitle('🚫 ' + await t('Permission Denied', langCode))
            .setDescription(await t('You need the "Manage Emojis and Stickers" permission to use this command.', langCode))
            .setColor('#FF0000');
        await interaction.editReply({ embeds: [embed] });
        return;
    }

    const searchTerm = interaction.options.getString('search').toLowerCase();
    
    // Search for stickers in all guilds the bot is in
    let foundSticker = null;
    for (const guild of client.guilds.cache.values()) {
        const sticker = guild.stickers.cache.find(s => s.name.toLowerCase().includes(searchTerm));
        if (sticker) {
            // Check if already in current server
            const alreadyInServer = interaction.guild.stickers.cache.find(s => s.name === sticker.name);
            if (!alreadyInServer) {
                foundSticker = sticker;
                break;
            }
        }
    }

    if (!foundSticker) {
        const embed = new EmbedBuilder()
            .setTitle('❌ ' + await t('No Results Found', langCode))
            .setDescription(await t('No stickers found with name:', langCode) + ` **${searchTerm}**`)
            .setColor('#FF0000');
        await interaction.editReply({ embeds: [embed] });
        return;
    }

    const embed = new EmbedBuilder()
        .setTitle('🔍 ' + await t('Sticker Search Result', langCode))
        .setDescription(await t('Found this sticker. Would you like to add it?', langCode) + `\n\n**${foundSticker.name}**`)
        .setImage(foundSticker.url)
        .setColor('#00FFFF')
        .setFooter({ text: `${interaction.user.displayName} (@${interaction.user.username})`, iconURL: interaction.user.displayAvatarURL() });

    const yesLabel = await t('Yes', langCode);
    const noLabel = await t('No', langCode);
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('confirm_sticker_search_add')
                .setLabel(yesLabel)
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('cancel_sticker_search_add')
                .setLabel(noLabel)
                .setStyle(ButtonStyle.Danger)
        );

    const msg = await interaction.editReply({ embeds: [embed], components: [row] });

    const filter = i => i.user.id === interaction.user.id;
    const collector = msg.createMessageComponentCollector({ filter, time: 60000 });

    collector.on('collect', async i => {
        if (i.customId === 'confirm_sticker_search_add') {
            await i.deferUpdate();
            try {
                await interaction.guild.stickers.create({ file: foundSticker.url, name: foundSticker.name, tags: foundSticker.tags || 'emoji' });
                const successEmbed = new EmbedBuilder()
                    .setDescription('✅ ' + await t('Successfully added the sticker!', langCode))
                    .setColor('#00FFFF');
                await i.editReply({ embeds: [successEmbed], components: [] });
            } catch (err) {
                console.error('Error adding sticker:', err);
                const errorEmbed = new EmbedBuilder()
                    .setDescription('❌ ' + await t('Error adding sticker:', langCode) + ' ' + err.message)
                    .setColor('#FF0000');
                await i.editReply({ embeds: [errorEmbed], components: [] });
            }
        } else {
            await i.deferUpdate();
            const cancelEmbed = new EmbedBuilder()
                .setDescription('❌ ' + await t('Cancelled.', langCode))
                .setColor('#FF0000');
            await i.editReply({ embeds: [cancelEmbed], components: [] });
        }
        collector.stop();
    });

    collector.on('end', (_, reason) => {
        if (reason === 'time') {
            interaction.editReply({ components: [] }).catch(() => {});
        }
    });
}

module.exports = { execute };