module.exports = {
  name: "Control Data [DEV]",
  description: "Get/Set/Add/Delete/Replace data.",
  category: "Data Stuff",

  inputs(data) {
    return [
      { id: "action",
        name: "Action",
        types: ["action"]
      },
      {
        id: "name",
        name: data?.options?.object_mode ? "Name.path" : "Name",
        description: "Key name for data. Use dot notation for nested properties, e.g. 'test.1.2'",
        types: ["text", "unspecified"]
      },
      ["get", "delete"].includes(data?.options?.action_type || "set") ?
        undefined :
        {
          id: "value",
          name: "Value",
          description: "Value to set or add or replace.",
          types: ["unspecified", "text", "number", "object", "boolean", "list", "null", "date", "color"]
        },
      ["none"].includes(data?.options?.data_type || "none") ?
        undefined : 
        {
          id: "target",
          name: JSON.stringify(data?.options?.data_type)
            .replaceAll(`"`, ``)
            .replace(/^./, (match) => match.toUpperCase()),
          description: `The ${
            JSON.stringify(data?.options?.data_type)
              .replaceAll(`"`, ``)
              .replace(/^./, (match) => match.toUpperCase())
          } object for the data.`,
          types: ["object", "text", "unspecified"],
        }
    ];
  },

  options(data) {
    return [
      {
        id: "action_type",
        name: "Action Type",
        description: "Choose get, set, add, delete, or replace",
        type: "SELECT",
        options: [
          {
            type: "GROUP",
            name: "Read",
            options: [
              { id: "get", name: "Get", description: "Retrieve data" }
            ]
          },
          {
            type: "GROUP",
            name: "Write",
            options: [
              { id: "set", name: "Set", description: "Set/overwrite data" },
              { id: "add", name: "Add", description: "Add to existing data" },
              { id: "replace", name: "Replace", description: "Replace only if path exists" },
              { id: "delete", name: "Delete", description: "Delete data or nested key" },
            ]
          }
        ],
        defaultValue: "set"
      },
      {
        id: "data_type",
        name: "Data Type",
        description: "Scope of data.",
        type: "SELECT",
        options: {
          none: "None",
          server: "Server",
          member: "Member",
          user: "User"
        }
      },
      {
        id: "name",
        name: data?.options?.object_mode ? "Name.path" : "Name",
        description: data?.options?.object_mode ? "Key name for data. Use dot notation for nested properties, e.g. 'currency.amount' or 'data.users.0' / 'data.users[0]'." : "Name of the data to store.\nUse dot notation for nested properties (another button will appear to confirm this usage), e.g. 'currency.amount'.",
        type: "TEXT_LINE"
      },
      ["get", "delete"].includes(data?.options?.action_type || "set") ?
        undefined :
        {
          id: "value",
          name: "Value",
          type: "TEXT"
        },
      {
        id: "object_mode",
        name: "Object Mode",
        description: "Enable to treat `name` as a nested object path (e.g. 'currency.amount' or 'data.users.0' / 'data.users[0]').",
        type: "CHECKBOX",
      }
    ];
  },

  outputs(data) {
    return [
      { id: "action",
        name: "Action",
        types: ["action"]
      },
      { 
        id: "output",
        name: data?.options?.object_mode ? "Object" : "Output",
        description: data?.options?.object_mode ? "The entire object output" : "The final value after action.",
        types: ["unspecified", "text", "number", "object", "list", "color", "boolean", "date"]
      },
      data?.options?.object_mode ? 
      {
        id: "value",
        name: "Value",
        description: "The final value after action (whole object).",
        types: ["unspecified", "text", "number", "object", "list", "color", "boolean", "date"]
      } :
      undefined
    ];
  },

  async init(data) {
    async function migrateOldDataOnce() {
      await new Promise((ok, fail) => {
        db.run(`CREATE TABLE IF NOT EXISTS migration_status (
          name TEXT PRIMARY KEY,
          done INTEGER
        )`, err => (err ? fail(err) : ok()));
      });

      const migrated = await new Promise((res, rej) => {
        db.get(`SELECT done FROM migration_status WHERE name = ?`, ['sqlite3_migration'], (err, row) => {
          if (err) return rej(err);
          res(row?.done === 1);
        });
      });

      if (migrated) return;

      try {
        const oldDataPath = path.join(__dirname, "../data/data.json");
        if (!fs.existsSync(oldDataPath)) return;
        const raw = fs.readFileSync(oldDataPath, "utf-8");
        const data = JSON.parse(raw);

        const map = {
          "dbb": "dbb_data",
          "discord.servers": "server_data",
          "discord.members": "member_data",
          "discord.users": "user_data",
          "blocks": "block_data",
          "custom": "global_data"
        };

        for (const fullKey in map) {
          const parts = fullKey.split(".");
          let targetData = data;

          for (const part of parts) {
            if (!targetData) break;
            targetData = targetData[part];
          }
          if (!targetData || typeof targetData !== "object") continue;

          const tableName = map[fullKey];

          await new Promise((ok, fail) => {
            db.run(`CREATE TABLE IF NOT EXISTS ${tableName} (
              name TEXT PRIMARY KEY,
              value TEXT
            )`, err => (err ? fail(err) : ok()));
          });

          const promises = [];

          for (const key in targetData) {
            if (!Object.prototype.hasOwnProperty.call(targetData, key)) continue;

            const value = targetData[key];
            const json = JSON.stringify(value);

            promises.push(new Promise((r, j) => {
              db.run(`INSERT OR REPLACE INTO ${tableName} (name, value) VALUES (?, ?)`, [key, json], err => err ? j(err) : r());
            }));
          }

          await Promise.all(promises);
        }

        await new Promise((ok, fail) => {
          db.run(`INSERT OR REPLACE INTO migration_status (name, done) VALUES (?, ?)`, ['sqlite3_migration', 1], err => (err ? fail(err) : ok()));
        });

        return true;

      } catch (err) {
        throw err;
      }
    }

    async function requireModule(moduleName) {
      try {
        require.resolve(moduleName);
        return require(moduleName);
      } catch (e) {
        const { execSync } = require('child_process');
        execSync(`npm install ${moduleName}`, { stdio: 'inherit' });
        return require(moduleName);
      }
    }
    
    const fs = await requireModule('fs');
    const path = await requireModule('path');
    const sqlite3 = await requireModule('sqlite3');
    const sqlite3Sync = await requireModule('better-sqlite3');

    const dbPath = path.join(__dirname, "../data/data.sqlite");
    const db = await new sqlite3.Database(dbPath);

    let syncDb;
    try {
      syncDb = new sqlite3Sync(dbPath);
    } catch (e) {
      syncDb = null;
    }

    await migrateOldDataOnce();

    function getPathArray(path) {
      if (Array.isArray(path)) return path;
      if (!path) return [];
      return path.toString().replace(/\[(\d+)\]/g, '.$1').split('.').filter(Boolean);
    }

    function splitPath(fullPath) {
      const keys = getPathArray(fullPath);
      const name = keys.shift();
      const nestedPath = keys.join(".");
      return { name, nestedPath };
    }

    function deepMerge(target, source) {
      if (typeof target !== "object" || target === null) return source;
      if (typeof source !== "object" || source === null) return source;

      for (const key of Object.keys(source)) {
        if (Array.isArray(source[key]) && Array.isArray(target[key])) {
          target[key] = [...target[key], ...source[key]];
        } else if (typeof source[key] === "object" && typeof target[key] === "object" && target[key] !== null) {
          target[key] = deepMerge(target[key], source[key]);
        } else {
          target[key] = source[key];
        }
      }
      return target;
    }

    function setNestedValue(obj, path, value, merge = false) {
      console.log("value:", value)
      const keys = getPathArray(path);

      if (keys.length === 0) return value;
      let target = obj;

      for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        if (!target[key] || typeof target[key] !== "object") target[key] = {};
        target = target[key];
      }

      const lastKey = keys[keys.length - 1];

      if (merge) {
        if (Array.isArray(target[lastKey]) && Array.isArray(value)) target[lastKey] = [...target[lastKey], ...value];
        else if (Array.isArray(target[lastKey]) && value !== undefined) target[lastKey] = [...target[lastKey], value];
        else if (typeof target[lastKey] === "object" && typeof value === "object" && target[lastKey] !== null) target[lastKey] = deepMerge(target[lastKey], value);
        else if (typeof target[lastKey] === "number" && typeof value === "number") target[lastKey] += value;
        else if (typeof target[lastKey] === "string" && typeof value === "string") target[lastKey] += value;
        else target[lastKey] = value;
      } else {
        target[lastKey] = value;
      }
      return obj;
    }

    function deleteNestedKey(obj, path) {
      const keys = getPathArray(path);

      if (keys.length === 0) return obj;
      let target = obj;
      
      for (let i = 0; i < keys.length - 1; i++) {
        if (!target) return obj;
        target = target[keys[i]];
        if (typeof target !== "object" || target === null) return obj;
      }

      const lastKey = keys[keys.length - 1];

      if (Array.isArray(target)) {
        const idx = Number(lastKey);

        if (!isNaN(idx) && idx >= 0 && idx < target.length) {
          target.splice(idx, 1);
          return obj;
        }
      }
      if (target && lastKey in target) delete target[lastKey];
      return obj;
    }

    const DATA_TABLES = {
      server: "server_data",
      member: "member_data",
      user: "user_data",
      none: "global_data",
      block: "block_data",
      dbb: "dbb_data"
    };
    

    function getDb(table, name) {
      if (!syncDb) return null;
      try {
        const row = syncDb.prepare(`SELECT value FROM ${table} WHERE name = ?`).get(name);
        if (!row || row.value === undefined) return null;
        return JSON.parse(row.value);
      } catch {
        return null;
      }
    }

    function setDb(table, name, value) {
      if (!syncDb) return null;
      try {
        const json = JSON.stringify(value);
        syncDb.prepare(`INSERT OR REPLACE INTO ${table} (name, value) VALUES (?, ?)`).run(name, json);
        return value;
      } catch {
        return null;
      }
    }

    
    function parseId(id, dataType) {
      if (!id) return undefined;
      if (typeof id === 'object' && id !== null) {
        if (Boolean(['server', 'user'].includes(dataType) && id.id)) return id.id;
        if ((dataType === 'member') && (id.guild && id.user)) return `${id.user.id}${id.guild.id}`;
      }
      return id;
    }

    data.Blocks.Data.getData = function(name, id, dataType = "none", isObjectMode) {
      const table = DATA_TABLES[dataType || "none"];
      let parsedId = parseId(id, dataType);
      let key = name;
      if (dataType !== 'none' && parsedId) key = `${parsedId}.${name}`;
      const { name: base, nestedPath } = splitPath(key);
      let data = getDb(table, base);
      if (!isObjectMode) {
        if (!nestedPath) return data;
        let output = data;
        const parts = getPathArray(nestedPath);
        for (const part of parts) {
          if (output == null) break;
          output = output[part];
        }
        return output;
      } else {
        let fullObj = data;
        let nestedVal = fullObj;
        if (nestedPath) {
          const parts = getPathArray(nestedPath);
          for (const part of parts) {
            if (nestedVal == null) break;
            nestedVal = nestedVal[part];
          }
        }
        return { output: fullObj, value: nestedVal };
      }
    };

    data.Blocks.Data.setData = function(name, value, id, dataType = "none", isObjectMode) {
      const table = DATA_TABLES[dataType || "none"];
      let parsedId = parseId(id, dataType);
      let key = name;
      if (dataType !== 'none' && parsedId) key = `${parsedId}.${name}`;
      const { name: base, nestedPath } = splitPath(key);
      let data = getDb(table, base);
      if (nestedPath) {
        if (typeof data !== 'object' || data === null) {
          data = {};
        }
        data = setNestedValue(data, nestedPath, value, false);
      } else {
        data = value;
      }
      setDb(table, base, data);
      if (!isObjectMode) {
        return data;
      } else {
        let nestedVal = data;
        if (nestedPath) {
          const parts = getPathArray(nestedPath);
          for (const part of parts) {
            if (nestedVal == null) break;
            nestedVal = nestedVal[part];
          }
        }
        return { output: data, value: nestedVal };
      }
    };

    data.Blocks.Data.addData = function(name, value, id, dataType = "none", isObjectMode) {
      const table = DATA_TABLES[dataType || "none"];
      let parsedId = parseId(id, dataType);
      let key = name;
      if (dataType !== 'none' && parsedId) key = `${parsedId}.${name}`;
      const { name: base, nestedPath } = splitPath(key);
      let data = getDb(table, base);
      if (nestedPath) {
        let baseObj = data || {};
        const parts = getPathArray(nestedPath);
        let target = baseObj;
        for (let i = 0; i < parts.length - 1; i++) {
          const k = parts[i];
          if (!target[k] || typeof target[k] !== "object") target[k] = {};
          target = target[k];
        }
        const lastKey = parts[parts.length - 1];
        if (Array.isArray(target[lastKey]) && Array.isArray(value)) target[lastKey] = [...target[lastKey], ...value];
        else if (Array.isArray(target[lastKey]) && value !== undefined) target[lastKey] = [...target[lastKey], value];
        else if (typeof target[lastKey] === "object" && typeof value === "object" && target[lastKey] !== null) target[lastKey] = { ...target[lastKey], ...value };
        else if (typeof target[lastKey] === "number" && typeof value === "number") target[lastKey] += value;
        else if (typeof target[lastKey] === "string" && typeof value === "string") target[lastKey] += value;
        else target[lastKey] = value;
        setDb(table, base, baseObj);
        if (!isObjectMode) {
          return baseObj;
        } else {
          let nestedVal = baseObj;
          if (nestedPath) {
            const parts = getPathArray(nestedPath);
            for (const part of parts) {
              if (nestedVal == null) break;
              nestedVal = nestedVal[part];
            }
          }
          return { output: baseObj, value: nestedVal };
        }
      } else {
        if (typeof data === "number" && typeof value === "number") {
          data = (data ?? 0) + value;
        } else if (typeof data === "string" && typeof value === "string") {
          data = (data ?? "") + value;
        } else if (Array.isArray(data)) {
          data = data.concat(value);
        } else if (typeof data === "object" && typeof value === "object" && data !== null && value !== null) {
          data = { ...data, ...value };
        } else {
          data = value;
        }
        setDb(table, base, data);
        if (!isObjectMode) {
          return data;
        } else {
          let nestedVal = data;
          return { output: data, value: nestedVal };
        }
      }
    };

    data.Blocks.Data.deleteData = function(name, id, dataType = "none", isObjectMode) {
      const table = DATA_TABLES[dataType || "none"];
      let parsedId = parseId(id, dataType);
      let key = name;
      if (dataType !== 'none' && parsedId) key = `${parsedId}.${name}`;
      const { name: base, nestedPath } = splitPath(key);
      let data = getDb(table, base);
      if (!isObjectMode) {
        if (!nestedPath) {
          if (!syncDb) return null;
          try {
            syncDb.prepare(`DELETE FROM ${table} WHERE name = ?`).run(base);
            return true;
          } catch {
            return null;
          }
        } else {
          data = deleteNestedKey(data, nestedPath);
          setDb(table, base, data);
          return true;
        }
      } else {
        let output = data;
        let value = undefined;
        if (!nestedPath) {
          value = data;
          if (!syncDb) return { output: undefined, value: undefined };
          try {
            syncDb.prepare(`DELETE FROM ${table} WHERE name = ?`).run(base);
            output = undefined;
          } catch {
            output = undefined;
          }
        } else {
          const parts = getPathArray(nestedPath);
          value = data;
          for (const part of parts) {
            if (value == null) break;
            value = value[part];
          }
          data = deleteNestedKey(data, nestedPath);
          setDb(table, base, data);
          output = data;
        }
        return { output, value };
      }
    };

    data.Blocks.Data.replaceData = function(name, value, id, dataType = "none", isObjectMode) {
      const table = DATA_TABLES[dataType || "none"];
      let parsedId = parseId(id, dataType);
      let key = name;
      if (dataType !== 'none' && parsedId) key = `${parsedId}.${name}`;
      const { name: base, nestedPath } = splitPath(key);
      let data = getDb(table, base) || {};
      if (nestedPath) {
        let target = data;
        const parts = getPathArray(nestedPath);
        for (let i = 0; i < parts.length - 1; i++) {
          const k = parts[i];
          if (!target[k] || typeof target[k] !== "object") {
            if (!isObjectMode) return data;
            else return { output: data, value: undefined };
          }
          target = target[k];
        }
        const lastKey = parts[parts.length - 1];
        if (lastKey in target) {
          target[lastKey] = value;
          setDb(table, base, data);
        }
        if (!isObjectMode) {
          return data;
        } else {
          let nestedVal = data;
          if (nestedPath) {
            const parts = getPathArray(nestedPath);
            for (const part of parts) {
              if (nestedVal == null) break;
              nestedVal = nestedVal[part];
            }
          }
          return { output: data, value: nestedVal };
        }
      } else {
        data = value;
        setDb(table, base, data);
        if (!isObjectMode) {
          return data;
        } else {
          let nestedVal = data;
          return { output: data, value: nestedVal };
        }
      }
    };
  },

  async code(cache) {
    const dataType = this.GetOptionValue("data_type", cache) || "none";
    const isObjectMode = this.GetOptionValue("object_mode", cache);
    const action = this.GetOptionValue("action_type", cache) || "get";
    const rawName = this.GetInputValue("name", cache) || this.GetOptionValue("name", cache);
    const target = this.GetInputValue("target", cache)

    if (!rawName) {
      this.StoreOutputValue(null, "output", cache);
      this.RunNextBlock("action", cache);
      return;
    }

    switch (action) {
      case "get": {
        const result = await this.getData(rawName, target, dataType, isObjectMode);
        
        if (isObjectMode) {
          this.StoreOutputValue(result.output, "output", cache);
          this.StoreOutputValue(result.value, "value", cache);
        } else {
          this.StoreOutputValue(result, "output", cache);
        }
        this.RunNextBlock("action", cache);
        return;
      }
      case "delete": {
        const result = await this.deleteData(rawName, target, dataType, isObjectMode);

        if (isObjectMode) {
          this.StoreOutputValue(result.output, "output", cache);
          this.StoreOutputValue(result.value, "value", cache);
        } else {
          this.StoreOutputValue(null, "output", cache);
        }
        this.RunNextBlock("action", cache);
        return;
      }
      case "set": {
        const rawValue = this.GetInputValue("value", cache) || this.GetOptionValue("value", cache);
        const value = (typeof rawValue === "string" && rawValue !== undefined) ? (() => { try { return (isNaN(JSON.parse(rawValue)) ? JSON.parse(rawValue) : Number.isSafeInteger(JSON.parse(rawValue)) ? JSON.parse(rawValue) : rawValue); } catch { return rawValue; } })() : rawValue;
        const result = await this.setData(rawName, value, target, dataType, isObjectMode);

        if (isObjectMode) {
          this.StoreOutputValue(result.output, "output", cache);
          this.StoreOutputValue(result.value, "value", cache);
        } else {
          this.StoreOutputValue(result, "output", cache);
        }
        this.RunNextBlock("action", cache);
        return;
      }
      case "add": {
        const rawValue = this.GetInputValue("value", cache) || this.GetOptionValue("value", cache);
        const value = (typeof rawValue === "string" && rawValue !== undefined) ? (() => { try { return JSON.parse(rawValue); } catch { return rawValue; } })() : rawValue;
        const result = await this.addData(rawName, value, target, dataType, isObjectMode);

        if (isObjectMode) {
          this.StoreOutputValue(result.output, "output", cache);
          this.StoreOutputValue(result.value, "value", cache);
        } else {
          this.StoreOutputValue(result, "output", cache);
        }
        this.RunNextBlock("action", cache);
        return;
      }
      case "replace": {
        const rawValue = this.GetInputValue("value", cache) || this.GetOptionValue("value", cache);
        const value = (typeof rawValue === "string" && rawValue !== undefined) ? (() => { try { return JSON.parse(rawValue); } catch { return rawValue; } })() : rawValue;
        const result = await this.replaceData(rawName, value, target, dataType, isObjectMode);
        
        if (isObjectMode) {
          this.StoreOutputValue(result.output, "output", cache);
          this.StoreOutputValue(result.value, "value", cache);
        } else {
          this.StoreOutputValue(result, "output", cache);
        }
        this.RunNextBlock("action", cache);
        return;
      }
      default:
        break;
    }
  }
};
