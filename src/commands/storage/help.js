const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { t } = require('../../utils/languages');

async function execute(interaction, langCode) {
    // Embed أولي قصير فقط مع قائمة منسدلة
    const embed = new EmbedBuilder()
        .setTitle('📖 ' + await t('ProEmoji Help', langCode))
        .setDescription(await t('Select a category from the menu below to see the available commands.', langCode))
        .setColor('#0099ff');

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
        const footerText = await t('Vote ProEmoji', langCode);
        const footerLink = 'https://top.gg/bot/1009426679061553162/vote'; // Placeholder link
        
        // إرسال الرسالة الأولى فقط مع القائمة المنسدلة
        const dm = await interaction.user.send({ 
            embeds: [embed], 
            components: [row],
            content: `\n[${footerText}](<${footerLink}>)`
        });
        
        const collector = dm.createMessageComponentCollector({ time: 300000 });

        collector.on('collect', async i => {
            if (i.customId !== 'help_category') return;

            let content = '';
            let title = '';
            const separator = '\n⌄ـــــــــــــــــــــــــــProEmojiـــــــــــــــــــــــــــــ⌄\n';

            // الأقسام
            if (i.values[0] === 'sticker_help') {
                title = await t('Sticker Commands', langCode);
                content = `
${await t('Add a new sticker to your server', langCode)}: **/add_sticker**${separator}
${await t('Convert an image URL or attachment into a sticker', langCode)}: **/image_to_sticker**${separator}
${await t('Rename an existing server sticker', langCode)}: **/rename_sticker**${separator}
${await t('Delete a sticker from your server', langCode)}: **/delete_sticker**${separator}
${await t('Delete all stickers from your server', langCode)}: **/delete_all_stickers**${separator}
${await t('List all current server stickers', langCode)}: **/list_stickers**${separator}
${await t('Convert a sticker into a server emoji', langCode)}: **/sticker_to_emoji**${separator}
${await t('Convert a sticker back into an image file', langCode)}: **/sticker_to_image**${separator}
${await t('Improve a sticker\'s quality and save it', langCode)}: **/enhance_sticker**`;
            } else if (i.values[0] === 'emoji_help') {
                title = await t('Emoji Commands', langCode);
                content = `
${await t('Get emoji suggestions if you do not have Nitro', langCode)}: **/suggest_emojis**${separator}
${await t('Search for specific emojis by name', langCode)}: **/emoji_search**${separator}
${await t('Add a new emoji to your server', langCode)}: **/add_emoji**${separator}
${await t('Convert an image URL or attachment into an emoji', langCode)}: **/image_to_emoji**${separator}
${await t('Rename an existing server emoji', langCode)}: **/rename_emoji**${separator}
${await t('Delete an emoji from your server', langCode)}: **/delete_emoji**${separator}
${await t('Delete all emojis from your server', langCode)}: **/delete_all_emojis**${separator}
${await t('List all current server emojis', langCode)}: **/list_emojis**${separator}
${await t('Improve an emoji\'s quality and add it', langCode)}: **/enhance_emoji**${separator}
${await t('Convert an existing emoji into a beautiful sticker', langCode)}: **/emoji_to_sticker**${separator}
${await t('Convert an emoji back into an image file', langCode)}: **/emoji_to_image**`;
            } else if (i.values[0] === 'info_help') {
                title = await t('Info Commands', langCode);
                content = `
${await t('Set suggestion permissions (Owner only)', langCode)}: **/permission**${separator}
${await t('Change the bot\'s language setting (Owner only)', langCode)}: **/language**${separator}
${await t('View bot status, latency, and vote status', langCode)}: **/status**`;
            }

            const updatedEmbed = new EmbedBuilder()
                .setTitle('📖 ' + title)
                .setDescription(content)
                .setColor('#0099ff');

            await i.update({ embeds: [updatedEmbed], components: [row] });
        });

        // رسالة تأكيد قصيرة للمستخدم في السيرفر
        const replyEmbed = new EmbedBuilder()
            .setTitle('✅ Help Sent')
            .setDescription('Check your private messages for the help menu!')
            .setColor('#10b981');
        await interaction.reply({ embeds: [replyEmbed], ephemeral: true });
    } catch (error) {
        console.error('Error sending help DM:', error);
        const errorEmbed = new EmbedBuilder()
            .setTitle('❌ Could not send DM')
            .setDescription('Please enable DMs from server members and try again.')
            .setColor('#FF6B6B');
        await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
}

module.exports = { execute };