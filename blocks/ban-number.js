module.exports = {
    name: "Get Ban Count",

    description: "Gets the total number of bans on the server.",

    category: "Server Stuff",

    inputs: [
        {
            "id": "action",
            "name": "Action",
            "description": "Acceptable Types: Action\n\nDescription: Executes this block.",
            "types": ["action"]
        },
        {
            "id": "server",
            "name": "Server",
            "description": "Acceptable Types: Object, Unspecified\n\nDescription: The server to get the ban count from. (Leave empty for current server context if supported).",
            "types": ["object", "unspecified"],
            "required": true
        }
    ],

    options: [],

    outputs: [
        {
            "id": "action",
            "name": "Action",
            "description": "Type: Action\n\nDescription: Executes the following blocks when this block finishes its task.",
            "types": ["action"]
        },
        {
            "id": "ban_count",
            "name": "Ban Count",
            "description": "Type: Number/Text\n\nDescription: The total number of bans on the server.",
            "types": ["number", "text"]
        }
    ],

    code(cache) {
        const server = this.GetInputValue("server", cache);

        if (!server || !server.bans) {
            this.RunNextBlock("action", cache);
            return;
        }

        server.bans.fetch()
            .then(bans => {
                this.StoreOutputValue(bans.size, "ban_count", cache);
                this.RunNextBlock("action", cache);
            })
            .catch(err => {
                console.error("Error fetching bans: " + err);
                this.StoreOutputValue(0, "ban_count", cache);
                this.RunNextBlock("action", cache);
            });
    }
}