const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const { t } = require('../../utils/languages');
const db = require('../../utils/database');
const axios = require('axios');

async function execute(interaction, langCode) {
    const TOP_GG_API_KEY = process.env.TOP_GG_API_KEY;
    const TOP_GG_BOT_ID = process.env.TOP_GG_BOT_ID;
    const userId = interaction.user.id;

    if (!TOP_GG_API_KEY || !TOP_GG_BOT_ID) {
        const errorText = await t('Bot verification is currently unavailable. Please try again later.', langCode);
        return interaction.editReply({ content: '⚠️ ' + errorText });
    }

    try {
        const response = await axios.get(`https://top.gg/api/bots/${TOP_GG_BOT_ID}/check?userId=${userId}`, {
            headers: { 'Authorization': TOP_GG_API_KEY }
        });
        const hasVoted = response.data.voted === 1;

        if (hasVoted) {
            await db.verifyUserDb(userId, interaction.user.username, interaction.user.displayAvatarURL());
            const successText = await t('Verification successful! You have unlocked all premium features for 12 hours.', langCode);
            const embed = new EmbedBuilder()
                .setTitle('✅ ' + await t('Verified!', langCode))
                .setDescription(successText)
                .setColor('#00FF00');
            await interaction.editReply({ embeds: [embed] });
        } else {
            const failText = await t('You have not voted for the bot yet. Please vote first!', langCode);
            const voteUrl = `https://top.gg/bot/${TOP_GG_BOT_ID}/vote`;
            const embed = new EmbedBuilder()
                .setTitle('🔐 ' + await t('Verification Failed', langCode))
                .setDescription(failText + `\n\n🔗 **${await t('Vote here:', langCode)}** ${voteUrl}`)
                .setColor('#FF0000');
            await interaction.editReply({ embeds: [embed] });
        }
    } catch (error) {
        console.error('Verify command error:', error.message);
        await interaction.editReply({ content: '❌ ' + await t('An error occurred while checking your vote status.', langCode) });
    }
}

module.exports = { execute };
