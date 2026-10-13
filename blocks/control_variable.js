module.exports = {
    name: "Control Variable",

    description: "Adds more value or sets a new value to the variable.",

    category: "Data Stuff",

    inputs: [
        {
            id: "action",
            name: "Action",
            description: "Acceptable Types: Action\n\nDescription: Executes this block.",
            types: ["action"]
        },
        {
            id: "name",
            name: "Name",
            description:
                "Acceptable Types: Text, Unspecified\n\nDescription: The name for this variable.",
            types: ["text", "unspecified"],
            required: true
        },
        {
            id: "value",
            name: "Value",
            description:
                "Acceptable Types: Unspecified, Undefined, Null, Object, Boolean, Date, Number, Text, List\n\nDescription: The value for this variable.",
            types: [
                "unspecified",
                "undefined",
                "null",
                "object",
                "boolean",
                "date",
                "number",
                "text",
                "list"
            ],
            required: true
        },
        {
            id: "search_value",
            name: "Workspace Search Value",
            description:
                'Acceptable Types: Unspecified, Text, Number\n\nDescription: The value according to your choice in the "Workspace Search Type" option only if you selected the option "Specific Workspace(s)(s)" in "Variable Restriction Type".',
            types: ["unspecified", "text", "number"]
        }
    ],

    options: [
        {
            id: "action_type",
            name: "Action Type",
            description:
                'Description: The type of action for this variable. If "Add", inserted a number in the "Value" input add to the current number in the variable or use a negative number to subtract.',
            type: "SELECT",
            options: {
                set: "Set",
                add: "Add"
            }
        },
        {
            id: "variable_type",
            name: "Variable Type",
            description: "Description: The type of this variable.",
            type: "SELECT",
            options: {
                temp: "Temporary Variable",
                global: "Global Variable"
            }
        },
        {
            id: "variable_restriction_type",
            name: "Variable Restriction Type",
            description:
                'Description: The type of access restriction for this variable. If "Specific Workspace(s)", you need to put a number in the "Workspace Number" input.',
            type: "SELECT",
            options: {
                current: "Current Workspace",
                specific: "Specific Workspace(s)",
                all: "All Workspace"
            }
        },
        {
            id: "workspace_search_type",
            name: "Workspace Search Type",
            description:
                'Description: The type of search to find the workspace(s) related to this variable. You need to put a value in the "Workspace Search Value" input.',
            type: "SELECT",
            options: {
                id: "Workspace ID",
                title: "Workspace Title",
                description: "Workspace Description",
                groupId: "Category ID"
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

    code(cache) {
        const name = this.GetInputValue("name", cache) + ""
        let value = this.GetInputValue("value", cache)
        const search_value = this.GetInputValue("search_value", cache)
        const action_type = this.GetOptionValue("action_type", cache) + ""
        const type = this.GetOptionValue("variable_type", cache) + ""
        const restriction = this.GetOptionValue("variable_restriction_type", cache) + ""
        const workspace_search_type = this.GetOptionValue("workspace_search_type", cache)

        if (action_type === "add") {
            let data = this.getVariable(
                name,
                { type, restriction, workspace_search_type, search_value },
                cache
            )
            if (!isNaN(data)) value += data
        }

        this.setVariable(
            name,
            value,
            { type, restriction, workspace_search_type, search_value },
            cache
        )

        this.RunNextBlock("action", cache)
    }
}
