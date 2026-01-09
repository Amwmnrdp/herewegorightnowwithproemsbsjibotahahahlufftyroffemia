const { EmbedBuilder, PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { t } = require('../../utils/languages');

// Storage for emojis in the code (IDs)
const EMOJI_PACK_IDS = [
    '1456696678470910065', // Example ID
    // Add more emoji IDs here
];

// In-memory session to track used emojis per user
const userSessions = new Map();

async function execute(interaction, langCode, client) {
    const hasManageEmoji = interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuildExpressions) ||
                           interaction.member.permissions.has(PermissionsBitField.Flags.ManageEmojisAndStickers);
    
    if (!hasManageEmoji) {
        const embed = new EmbedBuilder()
            .setTitle('🚫 ' + await t('Permission Denied', langCode))
            .setDescription(await t('You need the "Manage Emojis and Stickers" permission to use this command.', langCode))
            .setColor('#FF0000');
        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
    }

    let session = userSessions.get(interaction.user.id);
    if (!session) {
        session = { usedIds: new Set() };
        userSessions.set(interaction.user.id, session);
    }

    const availableIds = EMOJI_PACK_IDS.filter(id => !session.usedIds.has(id));

    if (availableIds.length === 0) {
        const embed = new EmbedBuilder()
            .setTitle('🎁 ' + await t('Emoji Pack Ended', langCode))
            .setDescription(await t('The emoji pack has ended. More will be added later!', langCode))
            .setColor('#FF9900');
        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
    }

    // Pick 5 emojis (or fewer if less than 5 left)
    const selectedIds = availableIds.slice(0, 5);
    const selectedEmojis = [];

    for (const id of selectedIds) {
        // Find emoji across all guilds
        let found = null;
        for (const guild of client.guilds.cache.values()) {
            const emoji = guild.emojis.cache.get(id);
            if (emoji) {
                found = emoji;
                break;
            }
        }
        if (found) {
            selectedEmojis.push(found);
        }
    }

    if (selectedEmojis.length === 0) {
        const embed = new EmbedBuilder()
            .setTitle('❌ ' + await t('Error', langCode))
            .setDescription(await t('Could not find any of the emojis in the pack.', langCode))
            .setColor('#FF0000');
        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
    }

    const embed = new EmbedBuilder()
        .setTitle('🎁 ' + await t('Emoji Pack', langCode))
        .setDescription(await t('Found these emojis in the pack. Would you like to add them?', langCode) + '\n\n' + selectedEmojis.map((e, i) => `${i+1}. ${e} (${e.name})`).join('\n'))
        .setColor('#ADD8E6')
        .setFooter({ text: `${interaction.user.displayName} (@${interaction.user.username})`, iconURL: interaction.user.displayAvatarURL() });

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('confirm_pack_add')
                .setLabel('Yes')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('cancel_pack_add')
                .setLabel('No')
                .setStyle(ButtonStyle.Danger)
        );

    const msg = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });

    const filter = i => i.user.id === interaction.user.id;
    const collector = msg.createMessageComponentCollector({ filter, time: 60000 });

    collector.on('collect', async i => {
        if (i.customId === 'confirm_pack_add') {
            await i.deferUpdate();
            let added = 0;
            for (const emoji of selectedEmojis) {
                try {
                    // Check if already in server
                    if (!interaction.guild.emojis.cache.find(e => e.name === emoji.name)) {
                        await interaction.guild.emojis.create({ attachment: emoji.url, name: emoji.name });
                        added++;
                    }
                } catch (err) {
                    console.error('Error adding emoji from pack:', err);
                }
            }
            
            // Mark as used
            selectedIds.forEach(id => session.usedIds.add(id));

            const successEmbed = new EmbedBuilder()
                .setDescription('✅ ' + (await t('Successfully added emojis from the pack!', langCode)).replace('{count}', added))
                .setColor('#ADD8E6');
            await i.editReply({ embeds: [successEmbed], components: [] });
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