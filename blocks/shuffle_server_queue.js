module.exports = {
    name: "Shuffle Server Queue",

    description: "Shuffles or restores the server queue.",

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
                "Acceptable Types: Object, Text, Unspecified\n\nDescription: The server to shuffle its audio queue. Supports server ID.",
            types: ["object", "text", "unspecified"],
            required: true
        },
        {
            id: "shuffle",
            name: "Shuffle?",
            description:
                "Acceptable Types: Boolean, Unspecified\n\nDescription: Whether to shuffle or restore the audio queue. Default: true",
            types: ["boolean", "unspecified"]
        }
    ],

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
        const shuffle = this.GetInputValue("shuffle", cache, false, true)

        const queue = DiscordPlayer.player.nodes.get(server)

        if (queue) {
            if (shuffle) {
                queue.enableShuffle()
            } else {
                queue.disableShuffle()
            }
        }

        this.RunNextBlock("action", cache)
    }
}
