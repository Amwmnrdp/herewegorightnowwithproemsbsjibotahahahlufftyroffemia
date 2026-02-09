const { EmbedBuilder, PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { t } = require('../../utils/languages');

async function execute(interaction, langCode, client) {
    const db = require('../../utils/database');
    const isVerified = await db.isUserVerifiedDb(interaction.user.id);
    if (!isVerified) {
        const verifyText = await t('This command is for verified users only. Please use /verify to unlock it.', langCode);
        const embed = new EmbedBuilder()
            .setTitle('🔐 ' + await t('Verification Required', langCode))
            .setDescription(verifyText)
            .setColor('#FF6B6B');
        await interaction.editReply({ embeds: [embed] });
        return;
    }

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

    // Since we're already deferred in index.js, we don't need to defer again.
    // However, index.js calls deferReply() for suggest_sticker too.
    // If it's already deferred, we just proceed.

    const stickers = [];
    const serverStickerNames = interaction.guild.stickers.cache.map(s => s.name.toLowerCase());

    for (const guild of client.guilds.cache.values()) {
        for (const sticker of guild.stickers.cache.values()) {
            if (!serverStickerNames.includes(sticker.name.toLowerCase())) {
                stickers.push(sticker);
            }
        }
    }

    if (stickers.length === 0) {
        const embed = new EmbedBuilder()
            .setDescription('❌ ' + await t('No more stickers available in this pack for now.', langCode))
            .setColor('#FF0000');
        return await interaction.editReply({ embeds: [embed] });
    }

    // Shuffle and pick 5
    const suggested = stickers.sort(() => 0.5 - Math.random()).slice(0, 5);
    let currentPage = 0;

    const createEmbed = async (page) => {
        const sticker = suggested[page];
        return new EmbedBuilder()
            .setTitle('✨ ' + await t('Suggested Sticker', langCode))
            .setDescription(`**${await t('Name', langCode)}:** ${sticker.name}\n**ID:** ${sticker.id}`)
            .setImage(sticker.url)
            .setFooter({ text: `${await t('Page', langCode)} ${page + 1}/${suggested.length}` })
            .setColor('#00FF00');
    };

    const createRow = async (page, disabled = false) => {
        const addedLabel = await t('Added', langCode);
        const addLabel = await t('Add', langCode);
        return new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('prev_sticker')
                .setEmoji('⬅️')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(disabled || page === 0),
            new ButtonBuilder()
                .setCustomId('add_suggested_sticker')
                .setLabel(disabled ? addedLabel : addLabel)
                .setStyle(ButtonStyle.Success)
                .setDisabled(disabled),
            new ButtonBuilder()
                .setCustomId('next_sticker')
                .setEmoji('➡️')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(disabled || page === suggested.length - 1)
        );
    };

    const msg = await interaction.editReply({
        embeds: [await createEmbed(0)],
        components: [await createRow(0)]
    });

    const collector = msg.createMessageComponentCollector({
        filter: i => i.user.id === interaction.user.id,
        time: 180000
    });

    collector.on('collect', async i => {
        try {
            if (!i.deferred && !i.replied) await i.deferUpdate().catch(() => {});
            
            if (i.customId === 'prev_sticker') {
                currentPage--;
                await i.editReply({ embeds: [await createEmbed(currentPage)], components: [await createRow(currentPage)] }).catch(() => {});
            } else if (i.customId === 'next_sticker') {
                currentPage++;
                await i.editReply({ embeds: [await createEmbed(currentPage)], components: [await createRow(currentPage)] }).catch(() => {});
            } else if (i.customId === 'add_suggested_sticker') {
                const stickerToAdd = suggested[currentPage];
                try {
                    await interaction.guild.stickers.create({
                        file: stickerToAdd.url,
                        name: stickerToAdd.name,
                        tags: stickerToAdd.tags || 'emoji'
                    });
                    await i.editReply({
                        components: [await createRow(currentPage, true)]
                    }).catch(() => {});
                    collector.stop();
                } catch (err) {
                    console.error('Error adding sticker:', err);
                    const errorEmbed = new EmbedBuilder()
                        .setDescription('❌ ' + await t('Error adding sticker:', langCode) + ' ' + err.message)
                        .setColor('#FF0000');
                    await i.followUp({ embeds: [errorEmbed], ephemeral: true }).catch(() => {});
                }
            }
        } catch (err) {
            console.error('Collector interaction error:', err.message);
        }
    });

    collector.on('end', async (_, reason) => {
        try {
            const currentMsg = await interaction.channel.messages.fetch(msg.id).catch(() => null);
            if (currentMsg) {
                const disabledRow = await createRow(currentPage, true);
                await interaction.editReply({ components: [disabledRow] }).catch(() => {});
            }
        } catch (e) {}
    });
}

module.exports = { execute };