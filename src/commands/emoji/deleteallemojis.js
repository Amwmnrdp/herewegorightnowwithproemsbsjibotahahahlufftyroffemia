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
    const confirmDesc = await t('Are you sure you want to delete all emojis? This action cannot be undone.', langCode);
    const yesLabel = await t('Yes, delete all', langCode);
    const noLabel = await t('Cancel', langCode);

    const embed = new EmbedBuilder()
        .setTitle('⚠️ ' + confirmTitle)
        .setDescription(confirmDesc)
        .setColor('#FFA500');

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('confirm_delete_all_emojis').setLabel(yesLabel).setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('cancel_delete_all_emojis').setLabel(noLabel).setStyle(ButtonStyle.Secondary)
    );

    const response = await interaction.editReply({ embeds: [embed], components: [row] });
    if (!response) return;

    const filter = i => i.user.id === interaction.user.id;
    const collector = response.createMessageComponentCollector({ filter, time: 180000 });

    collector.on('collect', async i => {
        try {
            if (!i.deferred && !i.replied) await i.deferUpdate().catch(() => {});
            
            if (i.customId === 'confirm_delete_all_emojis') {
                try {
                    // Check if the user is the owner - skip owner approval if they are
                    if (interaction.user.id === interaction.guild.ownerId) {
                        const waitText = await t('Please wait a moment...', langCode);
                        await i.editReply({ content: '⏳ ' + waitText, embeds: [], components: [] }).catch(() => {});

                        const emojis = await interaction.guild.emojis.fetch();
                        if (emojis.size === 0) {
                            const noEmojisText = await t('No emojis found to delete.', langCode);
                            return await i.editReply({ content: 'ℹ️ ' + noEmojisText }).catch(() => {});
                        }

                        for (const emoji of emojis.values()) {
                            await emoji.delete().catch(() => {});
                        }

                        const successText = await t('Successfully deleted all emojis!', langCode);
                        return await i.editReply({ content: '✅ ' + successText }).catch(() => {});
                    }

                    const waitText = await t('Please wait a moment...', langCode);
                    await i.editReply({ content: '⏳ ' + waitText, embeds: [], components: [] }).catch(() => {});

                    const owner = await interaction.guild.fetchOwner();
                    const requestTitle = await t('Deletion Request', langCode);
                    const requestDesc = await t('Admin {admin} wants to delete all emojis in the server. Do you approve?', langCode);
                    const approveLabel = await t('Approve', langCode);
                    const denyLabel = await t('Deny', langCode);

                    const requestEmbed = new EmbedBuilder()
                        .setTitle('⚠️ ' + requestTitle)
                        .setDescription(requestDesc.replace('{admin}', interaction.user.tag))
                        .setColor('#FF4500')
                        .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL() });

                    const requestRow = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId('approve_delete_all_emojis').setLabel(approveLabel).setStyle(ButtonStyle.Success),
                        new ButtonBuilder().setCustomId('deny_delete_all_emojis').setLabel(denyLabel).setStyle(ButtonStyle.Danger)
                    );

                    const ownerMsg = await owner.send({ embeds: [requestEmbed], components: [requestRow] }).catch(async () => {
                        const cantDMText = await t('I couldn\'t send a DM to the server owner for approval.', langCode);
                        await i.editReply({ content: '❌ ' + cantDMText }).catch(() => {});
                        return null;
                    });

                    if (!ownerMsg) return;

                    const ownerFilter = btnI => btnI.user.id === owner.id;
                    const ownerCollector = ownerMsg.createMessageComponentCollector({ filter: ownerFilter, time: 300000 });

                    ownerCollector.on('collect', async ownerI => {
                        await ownerI.deferUpdate().catch(() => {});
                        if (ownerI.customId === 'approve_delete_all_emojis') {
                            try {
                                const emojis = await interaction.guild.emojis.fetch();
                                if (emojis.size === 0) {
                                    const noEmojisText = await t('No emojis found to delete.', langCode);
                                    await ownerI.editReply({ content: 'ℹ️ ' + noEmojisText, embeds: [], components: [] }).catch(() => {});
                                    return await i.editReply({ content: 'ℹ️ ' + noEmojisText }).catch(() => {});
                                }

                                let count = 0;
                                for (const emoji of emojis.values()) {
                                    await emoji.delete().catch(() => {});
                                    count++;
                                }

                                const successText = await t('Successfully deleted all emojis!', langCode);
                                await ownerI.deleteReply().catch(() => {}); // Hide owner approval message
                                await i.editReply({ content: '✅ ' + successText, embeds: [], components: [] }).catch(() => {});
                            } catch (err) {
                                await i.editReply({ content: '❌ Error: ' + err.message }).catch(() => {});
                            }
                        } else {
                            const deniedText = await t('Deletion request denied by the owner.', langCode);
                            await ownerI.deleteReply().catch(() => {}); // Hide owner approval message
                            await i.editReply({ content: '❌ ' + deniedText, embeds: [], components: [] }).catch(() => {});
                        }
                        ownerCollector.stop();
                    });

                } catch (error) {
                    const errorPrefix = await t('Error:', langCode);
                    const e = new EmbedBuilder()
                        .setDescription('❌ ' + errorPrefix + ' ' + error.message)
                        .setColor('#FF0000');
                    await i.editReply({ embeds: [e], components: [] }).catch(() => {});
                }
            } else {
                const cancelledText = await t('Action cancelled.', langCode);
                await i.editReply({ content: '❌ ' + cancelledText, embeds: [], components: [] }).catch(() => {});
            }
            collector.stop();
        } catch (e) {
            console.error('Error in deleteallemojis collector:', e);
        }
    });

    collector.on('end', async (collected, reason) => {
        if (reason === 'time' || collected.size === 0) {
            try {
                const currentMsg = await interaction.channel.messages.fetch(response.id).catch(() => null);
                if (currentMsg) {
                    const disabledRow = ActionRowBuilder.from(row);
                    disabledRow.components.forEach(c => c.setDisabled(true));
                    await interaction.editReply({ components: [disabledRow] }).catch(() => {});
                }
            } catch (e) {}
        }
    });
}

module.exports = { execute };
