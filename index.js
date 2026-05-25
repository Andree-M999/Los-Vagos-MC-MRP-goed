require("dotenv").config();

const {
    Client,
    GatewayIntentBits,
    EmbedBuilder,
    REST,
    Routes,
    SlashCommandBuilder
} = require("discord.js");

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

/* ---------------- CONFIG ---------------- */

const STAFF_ROLE_ID = "1501963337351565353";
const AANGENOMEN_ROLE_ID = "1501979718059032816";
const ONTSLAG_ROLE_ID = "1502215601202925598";
const BLACKLIST_ROLE_ID = "1502215667183648788";

/* ---------------- ENV CHECK ---------------- */

if (!process.env.TOKEN || !process.env.CLIENT_ID || !process.env.GUILD_ID) {
    console.error("❌ Missing TOKEN, CLIENT_ID or GUILD_ID");
    process.exit(1);
}

/* ---------------- STAFF CHECK ---------------- */

function isStaff(member) {
    return member.roles.cache.has(STAFF_ROLE_ID);
}

/* ---------------- COMMANDS ---------------- */

const commands = [

    new SlashCommandBuilder()
        .setName("ontslag")
        .setDescription("Ontsla medewerker")
        .addUserOption(o => o.setName("medewerker").setDescription("Wie?").setRequired(true))
        .addStringOption(o => o.setName("reden").setDescription("Waarom?").setRequired(true))
        .addStringOption(o => o.setName("blacklist").setDescription("ja/nee").setRequired(true)),

    new SlashCommandBuilder()
        .setName("aangenomen")
        .setDescription("Neem iemand aan")
        .addUserOption(o => o.setName("persoon").setDescription("Wie?").setRequired(true))
        .addStringOption(o => o.setName("rang").setDescription("Rang").setRequired(true))
        .addUserOption(o => o.setName("doorwie").setDescription("Door wie?").setRequired(true)),

    new SlashCommandBuilder()
        .setName("promotie")
        .setDescription("Promotie")
        .addUserOption(o => o.setName("persoon").setDescription("Wie?").setRequired(true))
        .addStringOption(o => o.setName("van").setDescription("Van rol").setRequired(true))
        .addStringOption(o => o.setName("naar").setDescription("Naar rol").setRequired(true)),

    new SlashCommandBuilder()
        .setName("demotie")
        .setDescription("Demotie")
        .addUserOption(o => o.setName("persoon").setDescription("Wie?").setRequired(true))
        .addStringOption(o => o.setName("van").setDescription("Van rol").setRequired(true))
        .addStringOption(o => o.setName("naar").setDescription("Naar rol").setRequired(true)),

    new SlashCommandBuilder()
        .setName("warn")
        .setDescription("Warn systeem")
        .addUserOption(o => o.setName("persoon").setDescription("Wie?").setRequired(true))
        .addStringOption(o => o.setName("reden").setDescription("Reden").setRequired(true))
        .addStringOption(o => o.setName("actieve_warns").setDescription("1 / 2 / 3").setRequired(true)),

    /* ---------------- CONGTRIBUTIE (FIXED) ---------------- */

    new SlashCommandBuilder()
        .setName("contributie")
        .setDescription("Contributie registratie")
        .addUserOption(o => o.setName("persoon").setDescription("Persoon").setRequired(true))
        .addStringOption(o => o.setName("bedrag").setDescription("Bedrag").setRequired(true))
        .addStringOption(o => o.setName("vooruitbetaald").setDescription("Ja / nee").setRequired(true))
        .addStringOption(o => o.setName("voortuibetaling").setDescription("Getal").setRequired(true))

].map(c => c.toJSON());

/* ---------------- REGISTER ---------------- */

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

async function registerCommands() {
    try {
        console.log("🔄 Commands registreren...");

        await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
            { body: commands }
        );

        console.log("✅ Commands geregistreerd");
    } catch (err) {
        console.error("❌ Register error:", err);
    }
}

/* ---------------- READY ---------------- */

client.once("ready", () => {
    console.log(`🤖 Online als ${client.user.tag}`);
});

/* ---------------- INTERACTIONS ---------------- */

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

            const ontslagRole = await interaction.guild.roles.fetch(ONTSLAG_ROLE_ID);
            const blacklistRole = await interaction.guild.roles.fetch(BLACKLIST_ROLE_ID);

            if (ontslagRole) await member.roles.add(ontslagRole);

            if (blacklist?.toLowerCase() === "ja" && blacklistRole) {
                await member.roles.add(blacklistRole);
            }

            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("#ff8800")
                        .setTitle("📋 Ontslag")
                        .addFields(
                            { name: "👤 Medewerker", value: `${user}` },
                            { name: "📄 Reden", value: reden },
                            { name: "⛔ Blacklist", value: blacklist }
                        )
                        .setThumbnail(user.displayAvatarURL({ dynamic: true }))
                        .setTimestamp()
                ]
            });
        }

        /* ---------------- AANGENOMEN ---------------- */
        if (cmd === "aangenomen") {

            const persoon = interaction.options.getUser("persoon");
            const rang = interaction.options.getString("rang");
            const doorWie = interaction.options.getUser("doorwie");

            const member = await interaction.guild.members.fetch(persoon.id);

            const aangenomenRole = await interaction.guild.roles.fetch(AANGENOMEN_ROLE_ID);
            if (aangenomenRole) await member.roles.add(aangenomenRole);

            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("#00ff88")
                        .setTitle("✅ Aangenomen")
                        .addFields(
                            { name: "👤", value: `${persoon}` },
                            { name: "⚜️ Rang", value: rang },
                            { name: "🌍 Door wie", value: `${doorWie}` }
                        )
                        .setThumbnail(persoon.displayAvatarURL({ dynamic: true }))
                        .setTimestamp()
                ]
            });
        }

        /* ---------------- PROMOTIE ---------------- */
        if (cmd === "promotie") {

            const persoon = interaction.options.getUser("persoon");
            const van = interaction.options.getString("van");
            const naar = interaction.options.getString("naar");

            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("#00c3ff")
                        .setTitle("💎 Promotie")
                        .addFields(
                            { name: "👤", value: `${persoon}` },
                            { name: "✨ Van", value: van },
                            { name: "✨ Naar", value: naar }
                        )
                        .setThumbnail(persoon.displayAvatarURL({ dynamic: true }))
                        .setTimestamp()
                ]
            });
        }

        /* ---------------- DEMOTIE ---------------- */
        if (cmd === "demotie") {

            const persoon = interaction.options.getUser("persoon");
            const van = interaction.options.getString("van");
            const naar = interaction.options.getString("naar");

            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("#ff3b3b")
                        .setTitle("🚫 Demotie")
                        .addFields(
                            { name: "👤", value: `${persoon}` },
                            { name: "✨ Van", value: van },
                            { name: "✨ Naar", value: naar }
                        )
                        .setThumbnail(persoon.displayAvatarURL({ dynamic: true }))
                        .setTimestamp()
                ]
            });
        }

        /* ---------------- WARN ---------------- */
        if (cmd === "warn") {

            const persoon = interaction.options.getUser("persoon");
            const reden = interaction.options.getString("reden");
            const warns = interaction.options.getString("actieve_warns");

            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("#ff0000")
                        .setTitle("💥 Warn")
                        .addFields(
                            { name: "👤", value: `${persoon}` },
                            { name: "📄 Reden", value: reden },
                            { name: "⚠️ Warns", value: warns }
                        )
                        .setThumbnail(persoon.displayAvatarURL({ dynamic: true }))
                        .setTimestamp()
                ]
            });
        }

        /* ---------------- CONGTRIBUTIE ---------------- */
        if (cmd === "contributie") {

            const persoon = interaction.options.getUser("persoon");
            const bedrag = interaction.options.getString("bedrag");
            const vooruit = interaction.options.getString("vooruitbetaald");
            const betaling = interaction.options.getString("voortuibetaling");

            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor("#ffd700")
                        .setTitle("💰 Contributie")
                        .addFields(
                            { name: "👤", value: `${persoon}` },
                            { name: "💲 Bedrag", value: bedrag },
                            { name: "💳 Vooruitbetaald", value: vooruit },
                            { name: "💸 Voortuibetaling", value: betaling }
                        )
                        .setThumbnail(persoon.displayAvatarURL({ dynamic: true }))
                        .setTimestamp()
                ]
            });
        }

    } catch (err) {
        console.error("❌ Error:", err);

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