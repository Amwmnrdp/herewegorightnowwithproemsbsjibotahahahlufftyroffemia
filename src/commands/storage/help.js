const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const { t } = require('../../utils/languages');

async function execute(interaction, langCode) {
    const where = interaction.options.getString('where');
    const isDM = where === 'dm';
    
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

    const supportRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setLabel(await t('Support Server', langCode))
            .setURL('https://discord.gg/your-support-server') // Replace with actual support server link
            .setStyle(ButtonStyle.Link),
        new ButtonBuilder()
            .setLabel(await t('Vote', langCode))
            .setURL(`https://top.gg/bot/${interaction.client.user.id}/vote`)
            .setStyle(ButtonStyle.Link)
    );

    if (isDM) {
        try {
            await interaction.user.send({ embeds: [helpEmbed], components: [helpRow, supportRow] });
            const successEmbed = new EmbedBuilder()
                .setDescription('✅ ' + await t('Help Sent to your DMs!', langCode))
                .setColor('#10b981');
            
            // Send only one response
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ embeds: [successEmbed], components: [], flags: MessageFlags.Ephemeral }).catch(() => {});
            } else if (interaction.deferred) {
                await interaction.editReply({ embeds: [successEmbed], components: [], flags: MessageFlags.Ephemeral }).catch(() => {});
            }
        } catch (err) {
            const errorEmbed = new EmbedBuilder()
                .setDescription('❌ ' + await t('Could not send DM. Please enable DMs and try again.', langCode))
                .setColor('#FF6B6B');
            
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply({ embeds: [errorEmbed], components: [], flags: MessageFlags.Ephemeral }).catch(() => {});
            } else {
                await interaction.reply({ embeds: [errorEmbed], components: [], flags: MessageFlags.Ephemeral }).catch(() => {});
            }
        }
    } else {
        if (interaction.deferred || interaction.replied) {
            await interaction.editReply({ embeds: [helpEmbed], components: [helpRow, supportRow] }).catch(() => {});
        } else {
            await interaction.reply({ embeds: [helpEmbed], components: [helpRow, supportRow] }).catch(() => {});
        }
    }
}

module.exports = { execute };