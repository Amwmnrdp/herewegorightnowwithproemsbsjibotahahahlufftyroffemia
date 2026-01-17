const { EmbedBuilder, PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { t } = require('../../utils/languages');

async function execute(interaction, langCode) {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        const embed = new EmbedBuilder()
            .setDescription('❌ ' + await t('Only administrators can use this command.', langCode))
            .setColor('#FF0000');
        return await interaction.editReply({ embeds: [embed] });
    }

    const confirmTitle = await t('Confirm Deletion', langCode);
    const confirmDesc = await t('Are you sure you want to delete all stickers? This action cannot be undone.', langCode);
    const yesLabel = await t('Yes, delete all', langCode);
    const noLabel = await t('Cancel', langCode);

    const embed = new EmbedBuilder()
        .setTitle('⚠️ ' + confirmTitle)
        .setDescription(confirmDesc)
        .setColor('#FFA500');

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('confirm_delete_all_stickers').setLabel(yesLabel).setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('cancel_delete_all_stickers').setLabel(noLabel).setStyle(ButtonStyle.Secondary)
    );

    const response = await interaction.editReply({ embeds: [embed], components: [row] });

    const filter = i => i.user.id === interaction.user.id;
    const collector = response.createMessageComponentCollector({ filter, time: 30000 });

    collector.on('collect', async i => {
        if (i.customId === 'confirm_delete_all_stickers') {
            await i.deferUpdate();
            try {
                const stickers = await interaction.guild.stickers.fetch();
                if (stickers.size === 0) {
                    const noStickersText = await t('No stickers found to delete.', langCode);
                    const e = new EmbedBuilder().setDescription('ℹ️ ' + noStickersText).setColor('#0000FF');
                    return await i.editReply({ embeds: [e], components: [] });
                }

                let count = 0;
                for (const sticker of stickers.values()) {
                    await sticker.delete();
                    count++;
                }

                const successText = await t('Successfully deleted all stickers!', langCode);
                const e = new EmbedBuilder()
                    .setDescription('✅ ' + successText.replace('{count}', count))
                    .setColor('#ADD8E6');
                await i.editReply({ embeds: [e], components: [] });
            } catch (error) {
                const errorPrefix = await t('Error:', langCode);
                const e = new EmbedBuilder()
                    .setDescription('❌ ' + errorPrefix + ' ' + error.message)
                    .setColor('#FF0000');
                await i.editReply({ embeds: [e], components: [] });
            }
        } else {
            const cancelledText = await t('Action cancelled.', langCode);
            await i.update({ content: '❌ ' + cancelledText, embeds: [], components: [] });
        }
        collector.stop();
    });

    collector.on('end', collected => {
        if (collected.size === 0) {
            interaction.editReply({ components: [] }).catch(() => {});
        }
    });
}

module.exports = { execute };
