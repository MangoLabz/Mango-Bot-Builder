module.exports = {
    name: "Play Audio",

    description: "Plays audio (e.g. YouTube, Spotify, SoundCloud, ...) on the voice channel.",

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
            name: "Server/Voice Channel",
            description:
                "Acceptable Types: Object, Text, Unspecified\n\nDescription: The server or voice channel to play the audio. Supports server ID.",
            types: ["object", "text", "unspecified"],
            required: true
        },
        {
            id: "audio_query",
            name: "Search Query",
            description:
                "Acceptable Types: Text, Unspecified\n\nDescription: The name, URL or any query to search the audio to play.",
            types: ["text", "unspecified"],
            required: true
        },
        {
            id: "requested_by",
            name: "User Requesting",
            description:
                "Acceptable Types: Object, Unspecified\n\nDescription: The user who requested the audio.",
            types: ["object", "unspecified"]
        },
        {
            id: "force",
            name: "Force?",
            description:
                "Acceptable Types: Boolean, Unspecified\n\nDescription: Whether to force this audio to play.",
            types: ["boolean", "unspecified"]
        }
    ],

    options: [
        {
            id: "search_engine",
            name: "Search Engine",
            description: "Description: The search engine to use to find the audios.",
            type: "SELECT",
            options: {
                auto: "Automatic",
                youtube: "YouTube",
                spotify: "Spotify",
                apple_music: "Apple Music",
                soundcloud: "SoundCloud",
                vimeo: "Vimeo",
                reverbnation: "Reverbnation",
                attachment: "Attachment (Remote or Local)"
            }
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
        const server = this.GetInputValue("server", cache)
        const audio_query = this.GetInputValue("audio_query", cache)
        const requestedBy = this.GetInputValue("requested_by", cache)
        const force = this.GetInputValue("force", cache)
        const search_engine = this.GetOptionValue("search_engine", cache)

        const DiscordPlayer = await this.getDependency("DiscordPlayer", cache.name)

        const channelId = server?.voiceStates
            ? server.voiceStates.cache.get(this.client.user.id)?.channelId
            : server?.id ?? server

        if (channelId) {
            let searchEngine
            switch (search_engine) {
                case "auto":
                case "youtube":
                case "soundcloud":
                case "vimeo":
                case "reverbnation":
                    searchEngine = search_engine
                    break
                case "spotify":
                    searchEngine = "spotifySearch"
                    break
                case "apple_music":
                    searchEngine = "appleMusicSearch"
                    break
                case "attachment":
                    searchEngine = "file"
                    break
                default:
                    break
            }

            if (force) {
                const queue = DiscordPlayer.player.nodes.get(server)
                const oldTracks = queue?.tracks.toArray()

                await DiscordPlayer.player.play(channelId, audio_query, {
                    requestedBy,
                    searchEngine,
                    connectionOptions: { deaf: true },
                    afterSearch() {
                        queue?.node.stop()
                    }
                })

                if (oldTracks) queue.tracks.add(oldTracks)
            } else {
                await DiscordPlayer.player.play(channelId, audio_query, {
                    requestedBy,
                    searchEngine,
                    connectionOptions: { deaf: true }
                })
            }
        }

        this.RunNextBlock("action", cache)
    }
}
