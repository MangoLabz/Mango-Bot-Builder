module.exports = {
    name: "Get Bot Audio Info",

    description:
        "Gets the bot audio information from the server.\n\nNOTE: Your bot needs to be on a voice channel and playing any audio for this block to work well.",

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
                "Acceptable Types: Object, Unspecified\n\nDescription: The server to get the bot audio information.",
            types: ["object", "unspecified"],
            required: true
        }
    ],

    options: [
        {
            id: "audio_info",
            name: "Audio Info",
            description: "Description: The bot audio information to get from the server.",
            type: "SELECT",
            options: {
                15: "Current Audio Playing [Audio]",
                16: "Next Audio [Audio]",
                3: "Next Audio URL [Text]",
                17: "Previous Audio [Audio]",
                18: "Audio Queue [List <Audio>]",
                19: "Previous Audio List [List <Audio>]",
                8: "Current Audio Added At [Date]",
                9: "Current Audio Played At [Date]",
                10: "Current Audio Playing Position (Seconds) [Number]",
                11: "Current Audio Source [Text]",
                21: "Current Audio Playlist [Playlist]",
                12: "Current Audio Playlist URL [Text]",
                1: "Audio Queue URLs List [List <Text>]",
                2: "Audio Queue Size [Number]",
                13: "Is Audio Paused? [Boolean]",
                14: "Is There Any Audio? [Boolean]",
                20: "Loop Queue Type [Text]",
                22: "Has Queue Loop [Boolean]",
                4: "Audio Volume [Number]",
                5: "Audio Volume (Decibels) [Number]",
                6: "Audio Volume (Logarithmic Scale) [Number]"
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
        },
        {
            id: "result",
            name: "Result",
            description:
                "Type: Unspecified\n\nDescription: The information obtained from the bot audio.",
            types: ["unspecified"]
        }
    ],

    async code(cache, DBB) {
        const DiscordPlayer = await this.getDependency("DiscordPlayer", cache.name)

        const server = this.GetInputValue("server", cache)
        const audio_info = parseInt(this.GetOptionValue("audio_info", cache))

        const queue = DiscordPlayer.player.nodes.get(server)

        let result
        if (queue) {
            switch (audio_info) {
                case 15:
                    result = queue.currentTrack
                    break
                case 16:
                    result = queue.history.nextTrack
                    break
                case 3:
                    result = queue.history.nextTrack?.url
                    break
                case 17:
                    result = queue.history.previousTrack
                    break
                case 18:
                    result = queue.tracks.toArray()
                    break
                case 19:
                    result = queue.history.toArray()
                    break
                case 8: {
                    const { currentTrack } = queue
                    if (currentTrack) {
                        const timestamp = DBB.DiscordJS.module.SnowflakeUtil.timestampFrom(
                            currentTrack.id
                        )
                        if (timestamp) {
                            result = new Date(timestamp)
                        }
                    }
                    break
                }
                case 9: {
                    const timestamp =
                        queue.currentTrack?.metadata.startTimestamp ??
                        (queue.streamTime ? Date.now() - queue.streamTime : undefined)
                    if (timestamp) {
                        result = new Date(timestamp)
                    }
                    break
                }
                case 10:
                    result = queue.streamTime
                    break
                case 11: {
                    switch (queue.currentTrack?.source) {
                        case "youtube":
                            result = "YouTube"
                            break
                        case "spotify":
                            result = "Spotify"
                            break
                        case "apple_music":
                            result = "Apple Music"
                            break
                        case "soundcloud":
                            result = "SoundCloud"
                            break
                        case "arbitrary":
                            result = "Arbitrary"
                            break
                        default:
                            result = "Unknown"
                            break
                    }
                    break
                }
                case 21: {
                    result = queue.currentTrack?.playlist
                    break
                }
                case 12: {
                    result = queue.currentTrack?.playlist?.url
                    break
                }
                case 1:
                    result = queue.tracks.map((item) => item.url)
                    break
                case 2:
                    result = queue.size
                    break
                case 13:
                    result = queue.node.isPaused()
                    break
                case 14:
                    result = queue.size === 0 && !queue.currentTrack
                    break
                case 20:
                    switch (queue.repeatMode) {
                        case DiscordPlayer.module.QueueRepeatMode.OFF:
                            result = "Off"
                            break
                        case DiscordPlayer.module.QueueRepeatMode.TRACK:
                            result = "Current Audio"
                            break
                        case DiscordPlayer.module.QueueRepeatMode.QUEUE:
                            result = "Queue"
                            break
                        case DiscordPlayer.module.QueueRepeatMode.AUTOPLAY:
                            result = "Autoplay"
                            break
                        default:
                            result = "Unknown"
                            break
                    }
                    break
                case 22:
                    result = queue.repeatMode === DiscordPlayer.module.QueueRepeatMode.OFF
                    break
                case 4:
                    result = queue.node.volume
                    break
                case 5: {
                    const log10 = Math.log10(queue.node.volume)
                    result = isFinite(log10) ? log10 * 20 : 0
                    break
                }
                case 6:
                    result = Math.pow(queue.node.volume, 1 / 1.660964)
                    break
            }
        }

        this.StoreOutputValue(result, "result", cache)
        this.RunNextBlock("action", cache)
    }
}
