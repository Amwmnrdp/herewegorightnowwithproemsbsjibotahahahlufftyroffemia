const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { t } = require('../../utils/languages');

async function execute(interaction, langCode) {
    // Select Menu
    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('help_category')
        .setPlaceholder(await t('Select a category', langCode))
        .addOptions([
            {
                label: await t('Sticker Commands', langCode),
                description: await t('Commands related to stickers', langCode),
                value: 'sticker_help',
                emoji: '✨'
            },
            {
                label: await t('Emoji Commands', langCode),
                description: await t('Commands related to emojis', langCode),
                value: 'emoji_help',
                emoji: '😀'
            },
            {
                label: await t('Info Commands', langCode),
                description: await t('Utility and status commands', langCode),
                value: 'info_help',
                emoji: 'ℹ️'
            }
        ]);

    const row = new ActionRowBuilder().addComponents(selectMenu);

    try {
        const titleText = await t('ProEmoji Help', langCode);
        const descText = await t('Select a category from the menu below to see the available commands.', langCode);
        
        const dmEmbed = new EmbedBuilder()
            .setTitle('📖 ' + titleText)
            .setDescription(descText)
            .setColor('#0099ff');

        await interaction.user.send({ 
            embeds: [dmEmbed], 
            components: [row]
        });
        
        const replyEmbed = new EmbedBuilder()
            .setTitle('✅ ' + await t('Help Sent', langCode))
            .setDescription(await t('Check your private messages for the help menu!', langCode))
            .setColor('#10b981');
        
        if (interaction.deferred || interaction.replied) {
            await interaction.editReply({ embeds: [replyEmbed] });
        } else {
            await interaction.reply({ embeds: [replyEmbed], flags: MessageFlags.Ephemeral });
        }
    } catch (error) {
        const errorEmbed = new EmbedBuilder()
            .setTitle('❌ ' + await t('Could not send DM', langCode))
            .setDescription(await t('Please enable DMs from server members and try again.', langCode))
            .setColor('#FF6B6B');
        await interaction.editReply({ embeds: [errorEmbed] });
    }
}

module.exports = { execute };