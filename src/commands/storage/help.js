const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const { t } = require('../../utils/languages');

async function execute(interaction, langCode) {
    const embed = new EmbedBuilder()
        .setTitle('📖 ' + await t('ProEmoji Help', langCode))
        .setDescription(await t('Where would you like to receive the help menu?', langCode))
        .setColor('#0099ff');

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('help_dm')
            .setLabel(await t('DM', langCode))
            .setStyle(ButtonStyle.Primary)
            .setEmoji('📩'),
        new ButtonBuilder()
            .setCustomId('help_here')
            .setLabel(await t('Here', langCode))
            .setStyle(ButtonStyle.Success)
            .setEmoji('📍')
    );

    if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [embed], components: [row] });
    } else {
        await interaction.reply({ embeds: [embed], components: [row], flags: MessageFlags.Ephemeral });
    }

    const filter = i => (i.customId === 'help_dm' || i.customId === 'help_here') && i.user.id === interaction.user.id;
    const response = await interaction.fetchReply();
    const collector = response.createMessageComponentCollector({ filter, time: 60000 });

    collector.on('collect', async i => {
        try {
            const isDM = i.customId === 'help_dm';
            const helpRow = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('help_category')
                    .setPlaceholder(await t('Select a category', langCode))
                    .addOptions([
                        { label: await t('Sticker Commands', langCode), value: 'sticker_help', emoji: '✨' },
                        { label: await t('Emoji Commands', langCode), value: 'emoji_help', emoji: '😀' },
                        { label: await t('Info Commands', langCode), value: 'info_help', emoji: 'ℹ️' }
                    ])
            );

            const helpEmbed = new EmbedBuilder()
                .setTitle('📖 ' + await t('ProEmoji Help', langCode))
                .setDescription(await t('Select a category from the menu below to see the available commands.', langCode))
                .setColor('#0099ff');

            if (isDM) {
                try {
                    await i.user.send({ embeds: [helpEmbed], components: [helpRow] });
                    const successEmbed = new EmbedBuilder()
                        .setDescription('✅ ' + await t('Help Sent to your DMs!', langCode))
                        .setColor('#10b981');
                    await i.update({ embeds: [successEmbed], components: [] });
                } catch (err) {
                    const errorEmbed = new EmbedBuilder()
                        .setDescription('❌ ' + await t('Could not send DM. Please enable DMs and try again.', langCode))
                        .setColor('#FF6B6B');
                    await i.update({ embeds: [errorEmbed], components: [] });
                }
            } else {
                // Sent "Here" - visible to everyone
                await i.update({ content: '📍 ' + await t('Help menu loading below...', langCode), embeds: [], components: [] });
                await i.channel.send({ embeds: [helpEmbed], components: [helpRow] });
            }
            collector.stop();
        } catch (e) {
            console.error('Help decision error:', e);
        }
    });
}

module.exports = { execute };