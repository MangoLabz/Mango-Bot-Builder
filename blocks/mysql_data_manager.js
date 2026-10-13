module.exports = {
  name: "MySQL Data Manager",
  description: "Reads, writes, and deletes rows in a MySQL table using dynamic options.",
  category: "Database",
  inputs: [
    { id: "action", name: "Action", description: "Executes this block.", types: ["action"] },
    { id: "query_values", name: "Query Values", description: "Values to inject (array for prepared statements).", types: ["list", "unspecified"], multiInput: true }
  ],
  options: [
    { id: "host", name: "Host", description: "MySQL host.", type: "TEXT" },
    { id: "user", name: "User", description: "MySQL user.", type: "TEXT" },
    { id: "password", name: "Password", description: "MySQL password.", type: "TEXT" },
    { id: "database", name: "Database", description: "Database name.", type: "TEXT" },
    { id: "query", name: "SQL Query", description: "Your SQL query (use ? for values).", type: "TEXT" }
  ],
  outputs: [
    { id: "action", name: "Action", description: "Next block.", types: ["action"] },
    { id: "result", name: "Result", description: "Query result.", types: ["unspecified", "object", "list"] },
    { id: "error", name: "Error", description: "Error message if occurred.", types: ["text", "unspecified"] }
  ],
  async code(cache, DBB) {
    const mysql = require("mysql2/promise");

    const host = this.GetOptionValue("host", cache);
    const user = this.GetOptionValue("user", cache);
    const password = this.GetOptionValue("password", cache);
    const database = this.GetOptionValue("database", cache);
    const query = this.GetOptionValue("query", cache);

    let values = this.GetInputValue("query_values", cache) || [];
    if (!Array.isArray(values)) values = [values];

    try {
      const conn = await mysql.createConnection({ host, user, password, database });
      const [rows] = await conn.execute(query, values);
      await conn.end();

      this.StoreOutputValue(rows, "result", cache);
    } catch (err) {
      this.StoreOutputValue(String(err), "error", cache);
    }

    this.RunNextBlock("action", cache);
  }
};
