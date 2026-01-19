const { EmbedBuilder, PermissionsBitField } = require('discord.js');
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
    const footerText = await t('React with checkmark to add or X to cancel.', langCode);
    const embed = new EmbedBuilder()
        .setTitle('💡 ' + titleText)
        .setDescription(descPrefix + '\n' + emojis.map(e => e.toString()).join(' '))
        .setColor('#00FFFF')
        .setFooter({ text: footerText + ` • ${interaction.user.displayName} (@${interaction.user.username})`, iconURL: interaction.user.displayAvatarURL() });

    const msg = await interaction.editReply({ embeds: [embed] });
    try {
        await msg.react('✅');
        await msg.react('❌');
    } catch (error) {
        console.error('⚠️ Warning: Could not add reactions:', error.message);
    }

    const storedLangCode = langCode;
    const filter = (reaction, user) => ['✅', '❌'].includes(reaction.emoji.name) && user.id === interaction.user.id;
    const collector = msg.createReactionCollector({ filter, max: 1, time: 180000 });

    collector.on('collect', async (reaction, user) => {
        try {
            // Check if interaction is still valid before responding
            if (reaction.emoji.name === '✅') {
                for (const emoji of emojis) {
                    if (!interaction.guild.emojis.cache.find(e => e.name === emoji.name)) {
                        try {
                            await interaction.guild.emojis.create({ attachment: emoji.imageURL(), name: emoji.name });
                        } catch (error) {
                            console.error(`⚠️ Warning: Could not add emoji ${emoji.name}:`, error.message);
                        }
                    }
                }
                await interaction.followUp({ content: '✅ ' + await t('Emojis added!', storedLangCode) }).catch(() => {});
            } else {
                await interaction.followUp({ content: '❌ ' + await t('Cancelled.', storedLangCode) }).catch(() => {});
            }
        } catch (e) {
            console.error('Error in reaction collection:', e.message);
        }
    });

    collector.on('end', async (collected, reason) => {
        if (reason === 'time') {
            try {
                await interaction.followUp({ content: '⏳ ' + await t('Timeout.', storedLangCode) }).catch(() => {});
            } catch (e) {}
        }
        try {
            const currentMsg = await interaction.channel.messages.fetch(msg.id).catch(() => null);
            if (currentMsg) {
                await currentMsg.reactions.removeAll().catch(() => {});
            }
        } catch (e) {}
    });
}

module.exports = { execute, getSuggestedEmojis: () => suggestedEmojis, setSuggestedEmojis: (v) => { suggestedEmojis = v; } };
