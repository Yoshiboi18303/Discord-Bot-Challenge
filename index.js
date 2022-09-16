require("colors")
const { Client, Intents, ButtonInteraction, MessageActionRow, MessageButton, MessageEmbed } = require("discord.js");
const client = new Client({
    intents: Object.values(Intents.FLAGS)
})
const config = require("./config.json");
const wait = require("util").promisify(setTimeout);
const axios = require("axios");
const colors = require("./colors.json")

client.on("ready", () => {
    console.log("The client is ready!".green)
})

client.on("messageCreate", async (message) => {
    if(!message.content.startsWith(config.prefix) || message.author.bot || !message.guild) return;

    const args = message.content.slice(config.prefix.length).trim().split(/ +/g)
    const command = args.shift();

    if(command === "ping") {
        message.reply({
            content: "Pinging..."
        }).then(async (msg) => {
            const clientPing = msg.createdTimestamp - message.createdTimestamp;
            const wsPing = client.ws.ping;

            await wait(2500)

            await msg.edit({
                content: `Pong!\n\n**Client Ping:** ${clientPing}\n**WebSocket Ping:** ${wsPing}`
            })
        })
    } else if(command === "genderize") {
        const req = await axios.get(`https://api.genderize.io?name=${message.author.username.split(" ").join("%20")}`)
        const data = req.data;
        await message.reply({
            content: `Predicted gender: \`${data.gender}\``
        })
    } else if(command === "bored") {
        let req;
        if(!args[0]) {
            req = await axios.get("https://www.boredapi.com/api/activity")
        } else {
            req = await axios.get(`https://www.boredapi.com/api/activity?type=${args[0]}`)
        }
        const data = req.data;
        if(!req?.activity) return await message.reply({ content: "No activity found." })
        const row = new MessageActionRow().addComponents([
            new MessageButton()
                .setStyle("PRIMARY")
                .setLabel("View Docs")
                .setCustomId("docs")
        ])
        const msg = await message.reply({
            content: `Found an activity.\n\n**Activity:** \`${data.activity}\`${data.link ? "\n\n**Click the button below to view the docs**" : ""}`,
            components: data.link ? [row] : null
        })

        /**
         * @param {ButtonInteraction} interaction
         */
        const filter = (interaction) => {
            if(interaction.user.id !== message.author.id) return interaction.reply({content: "This isn't yours!", ephemeral: true});
            return true;
        }

        const collector = msg.createMessageComponentCollector({
            filter,
            componentType: "BUTTON",
            max: 1,
        })

        collector.on("end", async (collection) => {
            const collected = collection.first();

            if(collected) {
                if(!data.link) return await collected.reply({
                    content: "No docs are provided for this, sorry!",
                    ephemeral: true
                })
                await collected.reply({
                    content: `${data.link}`,
                    ephemeral: true
                })
            }
            row.components.forEach((component) => component.setDisabled(true))
            await msg.edit({
                components: data.link ? [row] : null
            })
        })
    } else if(command === "weather") {
        if(!args[0]) return await message.reply({
            content: "Please provide a city!"
        })
        const req = await axios.get(`https://goweather.herokuapp.com/weather/${args[0]}`, )
        const data = req.data;
        if(data.temperature === "") return await message.reply({
            content: "No weather data found."
        })
        const embed = new MessageEmbed()
            .setColor(colors.cyan)
            .setTitle(`Weather Info \`(Today)\``)
            .setDescription(`${data.description}`)
            .addFields([
                {
                    name: "Wind",
                    value: `${data.wind}`,
                    inline: true
                }
            ])
        await message.reply({
            embeds: [embed]
        })
    }
})

client.login(config.token)