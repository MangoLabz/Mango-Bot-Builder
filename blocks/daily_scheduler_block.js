module.exports = {
    name: "Daily Scheduler [Event]",

    description: "Runs connected action every day at a chosen hour and minute.",

    category: "Events",

    auto_execute: true,

    inputs: [],

    options: [
        {
            id: "hour",
            name: "Hour (0–23)",
            description: "Hour when the event should trigger each day.",
            type: "NUMBER",
            defaultValue: 12
        },
        {
            id: "minute",
            name: "Minute (0–59)",
            description: "Minute when the event should trigger each day.",
            type: "NUMBER",
            defaultValue: 0
        }
    ],

    outputs: [
        {
            id: "action",
            name: "Action",
            description: "Triggered when scheduled time is reached.",
            types: ["action"]
        },
        {
            id: "date",
            name: "Current Date",
            description: "Date when the scheduler fired (DD-MM-YYYY).",
            types: ["text", "unspecified"]
        }
    ],

    code(cache) {
        const hour = this.GetOptionValue("hour", cache) ?? 12;
        const minute = this.GetOptionValue("minute", cache) ?? 0;

        const check = () => {
            const now = new Date();

            if (now.getHours() === hour && now.getMinutes() === minute) {
                const d = String(now.getDate()).padStart(2, "0");
                const m = String(now.getMonth() + 1).padStart(2, "0");
                const y = now.getFullYear();

                this.StoreOutputValue(`${d}-${m}-${y}`, "date", cache);
                this.RunNextBlock("action", cache);
            }
        };

        // check every 30 seconds
        setInterval(check, 30 * 1000);
    }
};