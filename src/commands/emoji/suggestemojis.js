const { EmbedBuilder, PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { t } = require('../../utils/languages');
const { allowedServers } = require('../../utils/permissions');

let suggestedEmojis = [];

async function execute(interaction, langCode, client) {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageEmojisAndStickers)) {
        const embed = new EmbedBuilder().setDescription('❌ ' + await t('Need Manage Emojis permission!', langCode)).setColor('#FF0000');
        await interaction.editReply({ embeds: [embed] });
        return;
    }

    let emojis = [];
    const perms = await require('../../utils/database').getServerPermissions(interaction.guild.id);
    const emojiAllowed = perms ? perms.emoji_permission_enabled : true;

    client.guilds.cache.forEach(guild => {
        guild.emojis.cache.forEach(emoji => {
            const isDuplicate = emojis.find(e => e.id === emoji.id);
            const alreadyInServer = interaction.guild.emojis.cache.find(e => e.name === emoji.name);
            if (!isDuplicate && !alreadyInServer) {
                emojis.push(emoji);
            }
        });
    });

    if (emojis.length === 0) {
        const noResultsTitle = await t('No Emojis Available', langCode);
        const noResultsDesc = await t('No emojis available.', langCode);
        const embed = new EmbedBuilder().setTitle('❌ ' + noResultsTitle).setDescription(noResultsDesc).setColor('#FF0000');
        await interaction.editReply({ embeds: [embed] });
        return;
    }

    emojis = emojis.sort(() => Math.random() - 0.5).slice(0, 5);
    suggestedEmojis = emojis;
    
    const titleText = await t('Suggested Emojis', langCode);
    const descPrefix = await t('Here are 5 suggestions:', langCode);
    const footerText = await t('Click the buttons below to add all or cancel.', langCode);
    
    const resolvedFields = await Promise.all(emojis.map(async (e, idx) => {
        const emojiUrl = `https://cdn.discordapp.com/emojis/${e.id}.${e.animated ? 'gif' : 'png'}`;
        const viewText = await t('View', langCode) || 'View';
        return {
            name: `${idx + 1}. ${e.name}`,
            value: `[${viewText}](${emojiUrl}) • ${e.animated ? '🎞️' : '🖼️'}`,
            inline: true
        };
    }));

    const emojiPreviews = emojis.map(e => `<${e.animated ? 'a' : ''}:${e.name}:${e.id}>`).join(' ');

    const embed = new EmbedBuilder()
        .setTitle('💡 ' + titleText)
        .setDescription(`${descPrefix}\n\n${emojiPreviews}`)
        .addFields(resolvedFields)
        .setColor('#00FFFF')
        .setFooter({ text: footerText + ` • ${interaction.user.displayName} (@${interaction.user.username})`, iconURL: interaction.user.displayAvatarURL() });

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('suggest_add_all')
            .setLabel(await t('Add All', langCode) || 'Add All')
            .setStyle(ButtonStyle.Success)
            .setEmoji('✅'),
        new ButtonBuilder()
            .setCustomId('suggest_cancel')
            .setLabel(await t('Cancel', langCode) || 'Cancel')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('❌')
    );

    const msg = await interaction.editReply({ embeds: [embed], components: [row] });

    const storedLangCode = langCode;
    const filter = i => ['suggest_add_all', 'suggest_cancel'].includes(i.customId) && i.user.id === interaction.user.id;
    const collector = msg.createMessageComponentCollector({ filter, max: 1, time: 180000 });

    collector.on('collect', async i => {
        try {
            if (!i.deferred && !i.replied) await i.deferUpdate().catch(() => {});
            
            if (i.customId === 'suggest_add_all') {
                let added = 0;
                let failed = 0;
                
                for (const emoji of emojis) {
                    if (!interaction.guild.emojis.cache.find(e => e.name === emoji.name)) {
                        try {
                            await interaction.guild.emojis.create({ attachment: emoji.url, name: emoji.name });
                            added++;
                        } catch (error) {
                            console.error(`⚠️ Warning: Could not add emoji ${emoji.name}:`, error.message);
                            failed++;
                        }
                    }
                }
                
                const successEmbed = new EmbedBuilder()
                    .setTitle('✅ ' + await t('Emojis Added!', storedLangCode))
                    .setDescription(`${await t('Successfully added', storedLangCode)} **${added}** ${await t('emojis', storedLangCode)}${failed > 0 ? `\n⚠️ ${failed} ${await t('failed to add', storedLangCode)}` : ''}`)
                    .setColor('#00FF00')
                    .setFooter({ text: `${interaction.user.displayName} (@${interaction.user.username})`, iconURL: interaction.user.displayAvatarURL() });
                
                await i.editReply({ embeds: [successEmbed], components: [] });
            } else {
                const cancelEmbed = new EmbedBuilder()
                    .setDescription('❌ ' + await t('Cancelled.', storedLangCode))
                    .setColor('#FF0000');
                await i.editReply({ embeds: [cancelEmbed], components: [] });
            }
        } catch (e) {
            console.error('Error in suggestion collection:', e.message);
        }
    });

    collector.on('end', async (collected, reason) => {
        if (reason === 'time' && collected.size === 0) {
            try {
                const timeoutEmbed = new EmbedBuilder()
                    .setDescription('⏳ ' + await t('Timeout - no action taken.', storedLangCode))
                    .setColor('#808080');
                await interaction.editReply({ embeds: [timeoutEmbed], components: [] }).catch(() => {});
            } catch (e) {}
        }
    });
}

module.exports = { execute, getSuggestedEmojis: () => suggestedEmojis, setSuggestedEmojis: (v) => { suggestedEmojis = v; } };
