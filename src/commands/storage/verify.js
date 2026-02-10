const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const { t } = require('../../utils/languages');
const db = require('../../utils/database');
const axios = require('axios');

async function execute(interaction, langCode, client) {
    const TOP_GG_BOT_ID = process.env.TOP_GG_BOT_ID || client.user.id;
    
    const embed = new EmbedBuilder()
        .setTitle('🛡️ ' + await t('Vote Verification', langCode))
        .setDescription(await t('Click the button below to verify your vote on Top.gg and unlock premium features for 12 hours.', langCode) + 
            `\n\n🔗 [${await t('Vote here', langCode)}](https://top.gg/bot/${TOP_GG_BOT_ID}/vote)`)
        .setColor('#0099ff');
    
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('verify_vote')
            .setLabel(await t('Verify', langCode))
            .setStyle(ButtonStyle.Success)
    );

    await interaction.editReply({ embeds: [embed], components: [row] });
}

module.exports = { execute };
