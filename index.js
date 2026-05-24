require("dotenv").config();

const {
    Client,
    GatewayIntentBits,
    EmbedBuilder,
    REST,
    Routes,
    SlashCommandBuilder
} = require("discord.js");

const express = require("express");
const app = express();

/* ---------------- RAILWAY KEEP ALIVE ---------------- */
app.get("/", (req, res) => res.send("Bot online"));
app.listen(process.env.PORT || 3000, () => {
    console.log("🌐 Webserver actief");
});

/* ---------------- CLIENT ---------------- */

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

/* ---------------- CONFIG ---------------- */

const STAFF_ROLE_ID = "1501963337351565353";
const AANGENOMEN_ROLE_ID = "1501979718059032816";
const ONTSLAG_ROLE_ID = "1502215601202925598";
const BLACKLIST_ROLE_ID = "1502215667183648788";

/* ---------------- CHECK ---------------- */

function isStaff(member) {
    return member?.roles?.cache?.has(STAFF_ROLE_ID);
}

/* ---------------- COMMANDS ---------------- */

const commands = [
    new SlashCommandBuilder()
        .setName("ontslag")
        .setDescription("Ontsla medewerker")
        .addUserOption(o => o.setName("medewerker").setDescription("Selecteer medewerker").setRequired(true))
        .addStringOption(o => o.setName("reden").setDescription("Reden van ontslag").setRequired(true))
        .addStringOption(o => o.setName("blacklist").setDescription("ja/nee").setRequired(true)),

    new SlashCommandBuilder()
        .setName("aangenomen")
        .setDescription("Neem iemand aan")
        .addUserOption(o => o.setName("persoon").setDescription("Selecteer persoon").setRequired(true))
        .addStringOption(o => o.setName("rang").setDescription("Functie / rang").setRequired(true))
        .addUserOption(o => o.setName("doorwie").setDescription("Uitgevoerd door").setRequired(true)),

    new SlashCommandBuilder()
        .setName("promotie")
        .setDescription("Promotie")
        .addUserOption(o => o.setName("persoon").setDescription("Persoon").setRequired(true))
        .addStringOption(o => o.setName("van").setDescription("Oude rang").setRequired(true))
        .addStringOption(o => o.setName("naar").setDescription("Nieuwe rang").setRequired(true)),

    new SlashCommandBuilder()
        .setName("demotie")
        .setDescription("Demotie")
        .addUserOption(o => o.setName("persoon").setDescription("Persoon").setRequired(true))
        .addStringOption(o => o.setName("van").setDescription("Oude rang").setRequired(true))
        .addStringOption(o => o.setName("naar").setDescription("Nieuwe rang").setRequired(true)),

    new SlashCommandBuilder()
        .setName("warn")
        .setDescription("Warn systeem")
        .addUserOption(o => o.setName("persoon").setDescription("Persoon").setRequired(true))
        .addStringOption(o => o.setName("reden").setDescription("Reden").setRequired(true))
        .addStringOption(o => o.setName("actieve_warns").setDescription("Aantal warns").setRequired(true)),

    new SlashCommandBuilder()
        .setName("contributie")
        .setDescription("Contributie systeem")
        .addUserOption(o => o.setName("persoon").setDescription("Persoon").setRequired(true))
        .addStringOption(o => o.setName("bedrag").setDescription("Bedrag").setRequired(true))
        .addStringOption(o => o.setName("voortuitbetaald").setDescription("Ja / Nee").setRequired(true))
        .addStringOption(o => o.setName("voortuibetaling").setDescription("Getal").setRequired(true))
].map(c => c.toJSON());

/* ---------------- REGISTER ---------------- */

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

async function registerCommands() {
    await rest.put(
        Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
        { body: commands }
    );

    console.log("✅ Commands geregistreerd");
}

/* ---------------- READY ---------------- */

client.once("ready", () => {
    console.log(`🤖 Online als ${client.user.tag}`);
});

/* ---------------- EMBED STYLE (STANDARD) ---------------- */

function baseEmbed(color, title) {
    return new EmbedBuilder()
        .setColor(color)
        .setTitle(title)
        .setTimestamp();
}

/* ---------------- COMMANDS ---------------- */

client.on("interactionCreate", async (interaction) => {
    try {
        if (!interaction.isChatInputCommand()) return;

        if (!isStaff(interaction.member)) {
            return interaction.reply({
                content: "⛔ Geen toegang.",
                ephemeral: true
            });
        }

        const cmd = interaction.commandName;

        /* ---------------- ONTSLAG ---------------- */
        if (cmd === "ontslag") {
            const user = interaction.options.getUser("medewerker");
            const reden = interaction.options.getString("reden");
            const blacklist = interaction.options.getString("blacklist");

            const member = await interaction.guild.members.fetch(user.id);

            const role1 = interaction.guild.roles.cache.get(ONTSLAG_ROLE_ID);
            const role2 = interaction.guild.roles.cache.get(BLACKLIST_ROLE_ID);

            if (role1) await member.roles.add(role1);

            if (blacklist.toLowerCase() === "ja" && role2) {
                await member.roles.add(role2);
            }

            const embed = baseEmbed("#ff8800", "📋 ONTSLAG")
                .addFields(
                    { name: "👤 Medewerker", value: `${user}`, inline: false },
                    { name: "📄 Reden", value: reden, inline: false },
                    { name: "⛔ Blacklist", value: blacklist, inline: false }
                )
                .setThumbnail(user.displayAvatarURL({ dynamic: true }));

            return interaction.reply({ embeds: [embed] });
        }

        /* ---------------- AANGENOMEN ---------------- */
        if (cmd === "aangenomen") {
            const persoon = interaction.options.getUser("persoon");
            const rang = interaction.options.getString("rang");
            const doorwie = interaction.options.getUser("doorwie");

            const member = await interaction.guild.members.fetch(persoon.id);

            const role = interaction.guild.roles.cache.get(AANGENOMEN_ROLE_ID);
            if (role) await member.roles.add(role);

            const embed = baseEmbed("#00ff88", "✅ AANGENOMEN")
                .addFields(
                    { name: "👤 Persoon", value: `${persoon}`, inline: false },
                    { name: "⚜️ Rang", value: rang, inline: false },
                    { name: "🌍 Door wie", value: `${doorwie}`, inline: false }
                )
                .setThumbnail(persoon.displayAvatarURL({ dynamic: true }));

            return interaction.reply({ embeds: [embed] });
        }

        /* ---------------- PROMOTIE ---------------- */
        if (cmd === "promotie") {
            const persoon = interaction.options.getUser("persoon");
            const van = interaction.options.getString("van");
            const naar = interaction.options.getString("naar");

            const embed = baseEmbed("#00c3ff", "💎 PROMOTIE")
                .addFields(
                    { name: "👤 Persoon", value: `${persoon}`, inline: false },
                    { name: "✨ Van", value: van, inline: false },
                    { name: "✨ Naar", value: naar, inline: false }
                )
                .setThumbnail(persoon.displayAvatarURL({ dynamic: true }));

            return interaction.reply({ embeds: [embed] });
        }

        /* ---------------- DEMOTIE ---------------- */
        if (cmd === "demotie") {
            const persoon = interaction.options.getUser("persoon");
            const van = interaction.options.getString("van");
            const naar = interaction.options.getString("naar");

            const embed = baseEmbed("#ff3b3b", "🚫 DEMOTIE")
                .addFields(
                    { name: "👤 Persoon", value: `${persoon}`, inline: false },
                    { name: "✨ Van", value: van, inline: false },
                    { name: "✨ Naar", value: naar, inline: false }
                )
                .setThumbnail(persoon.displayAvatarURL({ dynamic: true }));

            return interaction.reply({ embeds: [embed] });
        }

        /* ---------------- WARN ---------------- */
        if (cmd === "warn") {
            const persoon = interaction.options.getUser("persoon");
            const reden = interaction.options.getString("reden");
            const warns = interaction.options.getString("actieve_warns");

            const embed = baseEmbed("#ff0000", "💥 WARN")
                .addFields(
                    { name: "👤 Persoon", value: `${persoon}`, inline: false },
                    { name: "📄 Reden", value: reden, inline: false },
                    { name: "⚠️ Active Warns", value: warns, inline: false }
                )
                .setThumbnail(persoon.displayAvatarURL({ dynamic: true }));

            return interaction.reply({ embeds: [embed] });
        }

        /* ---------------- CONTRIBUTIE ---------------- */
        if (cmd === "contributie") {
            const persoon = interaction.options.getUser("persoon");
            const bedrag = interaction.options.getString("bedrag");
            const vooruit = interaction.options.getString("voortuitbetaald");
            const betaling = interaction.options.getString("voortuibetaling");

            const embed = baseEmbed("#ffd700", "💰 CONTRIBUTIE")
                .addFields(
                    { name: "👤 Persoon", value: `${persoon}`, inline: false },
                    { name: "💲 Bedrag", value: bedrag, inline: false },
                    { name: "💳 Vooruitbetaald", value: vooruit, inline: false },
                    { name: "💸 Vooruitbetaling", value: betaling, inline: false }
                )
                .setThumbnail(persoon.displayAvatarURL({ dynamic: true }));

            return interaction.reply({ embeds: [embed] });
        }

    } catch (err) {
        console.error("❌ ERROR:", err);

        if (!interaction.replied) {
            await interaction.reply({
                content: "❌ Er ging iets fout.",
                ephemeral: true
            });
        }
    }
});

/* ---------------- START ---------------- */

(async () => {
    await registerCommands();
    client.login(process.env.TOKEN);
})();