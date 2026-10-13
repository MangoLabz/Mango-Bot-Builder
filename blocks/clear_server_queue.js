module.exports = {
    name: "Clear Server Audio Queue",

    description: "Clears the server audio queue.",

    category: "Audio Stuff",

    inputs: [
        {
            id: "action",
            name: "Action",
            description: "Acceptable Types: Action\n\nDescription: Executes this block.",
            types: ["action"]
        },
        {
            id: "server",
            name: "Server",
            description:
                "Acceptable Types: Object, Text, Unspecified\n\nDescription: The server to clear its audio queue. Supports server ID.",
            types: ["object", "text", "unspecified"],
            required: true
        }
    ],

    options: [],

    outputs: [
        {
            id: "action",
            name: "Action",
            description:
                "Type: Action\n\nDescription: Executes the following blocks when this block finishes its task.",
            types: ["action"]
        }
    ],

    async code(cache) {
        const DiscordPlayer = await this.getDependency("DiscordPlayer", cache.name)

        const server = this.GetInputValue("server", cache)

        const queue = DiscordPlayer.player.nodes.get(server)

        queue?.clear()

        this.RunNextBlock("action", cache)
    }
}
