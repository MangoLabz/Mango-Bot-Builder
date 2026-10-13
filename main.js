const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

let mainWindow;
let botProcess = null;

const APP_DIR = __dirname;
const BOTY_DIR = '/home/rakunek/Dokumenty/Moje/Boty';
const ROOT_DIR = path.join(BOTY_DIR, 'Mango Bot');
const BLOCKS_DIR = path.join(APP_DIR, 'blocks');
const PROJECTS_DIR = path.join(APP_DIR, 'projects');
const DBB_SETTINGS_PATH = path.join(BOTY_DIR, 'DBB-Linux', 'settings.json');
const LOCAL_SETTINGS_PATH = path.join(APP_DIR, 'settings.json');

function loadSettings() {
    let settings = { recent: [] };
    if (fs.existsSync(LOCAL_SETTINGS_PATH)) {
        try {
            settings = JSON.parse(fs.readFileSync(LOCAL_SETTINGS_PATH, 'utf8'));
        } catch(e) {}
    }
    if (!Array.isArray(settings.recent)) {
        settings.recent = [];
    }
    // Zachowaj tylko foldery, które faktycznie istnieją
    settings.recent = settings.recent.filter(p => fs.existsSync(p));
    return settings;
}

function saveSettings(settings) {
    try {
        fs.writeFileSync(LOCAL_SETTINGS_PATH, JSON.stringify(settings, null, 4), 'utf8');
    } catch(e) {}
}

if (!fs.existsSync(PROJECTS_DIR)) {
    fs.mkdirSync(PROJECTS_DIR, { recursive: true });
}

let currentProject = null;

function getProjectPaths(projNameOrPath) {
    if (!projNameOrPath) return null;
    let baseDir = null;
    if (path.isAbsolute(projNameOrPath) && fs.existsSync(projNameOrPath)) {
        baseDir = projNameOrPath;
    } else {
        const settings = loadSettings();
        const match = settings.recent.find(r => path.basename(r) === projNameOrPath || r === projNameOrPath);
        if (match && fs.existsSync(match)) {
            baseDir = match;
        }
    }

    if (!baseDir) return null;

    const wsData = path.join(baseDir, 'data', 'workspaces.json');
    const wsRoot = path.join(baseDir, 'workspaces.json');
    const workspaces = fs.existsSync(wsData) ? wsData : (fs.existsSync(wsRoot) ? wsRoot : wsData);

    const dataData = path.join(baseDir, 'data', 'data.json');
    const dataRoot = path.join(baseDir, 'data.json');
    const data = fs.existsSync(dataData) ? dataData : (fs.existsSync(dataRoot) ? dataRoot : dataData);

    const tokenTxt = path.join(baseDir, 'data', 'token.txt');
    const envFile = path.join(baseDir, '.env');
    let savedToken = '';
    if (fs.existsSync(tokenTxt)) {
        try { savedToken = fs.readFileSync(tokenTxt, 'utf8').trim(); } catch(e) {}
    } else if (fs.existsSync(envFile)) {
        try {
            const match = fs.readFileSync(envFile, 'utf8').match(/TOKEN=(.*)/);
            if (match) savedToken = match[1].trim();
        } catch(e) {}
    }

    const pBlocks = path.join(baseDir, 'blocks');
    const blocksDir = fs.existsSync(pBlocks) ? pBlocks : BLOCKS_DIR;

    return {
        name: path.basename(baseDir),
        dir: baseDir,
        workspaces,
        bot: path.join(baseDir, 'bot.js'),
        data,
        env: envFile,
        tokenTxt,
        savedToken,
        blocksDir
    };
}

if (!fs.existsSync(BLOCKS_DIR)) {
    fs.mkdirSync(BLOCKS_DIR, { recursive: true });
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1700,
        height: 1050,
        minWidth: 1100,
        minHeight: 700,
        backgroundColor: '#0c0d10',
        title: "Mango Bot Builder",
        icon: path.join(__dirname, '..', 'icon.png'),
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    mainWindow.setMenuBarVisibility(false);
    mainWindow.loadFile(path.join(__dirname, 'index.html'));
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (botProcess) botProcess.kill();
    if (process.platform !== 'darwin') app.quit();
});

function resolveBlockProp(prop, blockData) {
    try {
        if (Array.isArray(prop)) return prop;
        if (typeof prop === 'function') {
            const res = prop(blockData);
            return Array.isArray(res) ? res : [];
        }
    } catch (e) {
        // Fallback if function expects specific structure
    }
    return [];
}

function getBotJSContent() {
    return `/**
 * Mango Bot Builder - Wygenerowany plik wykonywalny (bot.js)
 * Kompatybilny z blokami Discord Bot Builder (DBB)
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');
const DiscordJS = require('discord.js');
const { Client, GatewayIntentBits, Partials, Events, Collection } = DiscordJS;

const WORKSPACES_PATH = path.join(__dirname, 'workspaces.json');
const DATA_PATH = path.join(__dirname, 'data.json');
const BLOCKS_DIR = fs.existsSync(path.join(__dirname, 'blocks')) 
    ? path.join(__dirname, 'blocks') 
    : path.join(__dirname, '..', '..', 'blocks');

// Domyślna struktura data.json
function loadDataFile() {
    const defaultData = {
        dbb: {
            prefixes: { main: "!", servers: {} },
            owners: []
        },
        discord: {
            servers: {},
            members: {},
            users: {}
        },
        blocks: {},
        custom: {}
    };
    if (!fs.existsSync(DATA_PATH)) {
        fs.writeFileSync(DATA_PATH, JSON.stringify(defaultData, null, 4), 'utf8');
        return defaultData;
    }
    try {
        const parsed = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
        return Object.assign(defaultData, parsed);
    } catch (e) {
        console.error('[BŁĄD ODCZYTU data.json]:', e.message);
        return defaultData;
    }
}

function saveDataFile(dataObj) {
    try {
        fs.writeFileSync(DATA_PATH, JSON.stringify(dataObj, null, 4), 'utf8');
    } catch (e) {
        console.error('[BŁĄD ZAPISU data.json]:', e.message);
    }
}

const persistedData = loadDataFile();

// Inicjalizacja klienta Discord.js ze wszystkimi potrzebnymi Intentami
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildEmojisAndStickers,
        GatewayIntentBits.GuildIntegrations,
        GatewayIntentBits.GuildWebhooks,
        GatewayIntentBits.GuildInvites,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildMessageTyping,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.DirectMessageReactions,
        GatewayIntentBits.DirectMessageTyping,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildScheduledEvents,
        GatewayIntentBits.AutoModerationConfiguration,
        GatewayIntentBits.AutoModerationExecution
    ],
    partials: [
        Partials.User,
        Partials.Channel,
        Partials.GuildMember,
        Partials.Message,
        Partials.Reaction,
        Partials.GuildScheduledEvent,
        Partials.ThreadMember
    ]
});

// Proxy zdarzeń dla bloków używających this.events.on(...)
const eventsEmitter = new EventEmitter();
eventsEmitter.setMaxListeners(200);
client.setMaxListeners(200);

const eventsProxy = {
    on(eventName, listener) {
        client.on(eventName, listener);
    },
    once(eventName, listener) {
        client.once(eventName, listener);
    },
    emit(eventName, ...args) {
        client.emit(eventName, ...args);
    }
};

// Wczytywanie bloków z /blocks
const blockModules = new Map();
if (fs.existsSync(BLOCKS_DIR)) {
    const files = fs.readdirSync(BLOCKS_DIR).filter(f => f.endsWith('.js'));
    for (const file of files) {
        const blockName = file.replace(/\\.js$/, '');
        try {
            const mod = require(path.join(BLOCKS_DIR, file));
            blockModules.set(blockName, mod);
        } catch (err) {
            console.warn(\`[OSTRZEŻENIE] Nie udało się załadować bloku \${file}: \${err.message}\`);
        }
    }
}

// Wczytywanie aktywnych workspace'ów z workspaces.json
function getActiveWorkspaces() {
    if (!fs.existsSync(WORKSPACES_PATH)) return [];
    const raw = JSON.parse(fs.readFileSync(WORKSPACES_PATH, 'utf8'));
    const allWorkspaces = [];

    for (const item of raw) {
        if (item.workspaces && Array.isArray(item.workspaces)) {
            for (const ws of item.workspaces) {
                allWorkspaces.push(ws);
            }
        } else if (item.blocks) {
            allWorkspaces.push(item);
        }
    }

    const active = allWorkspaces.filter(ws => ws.active !== false);
    // Jeśli żaden workspace nie ma flagi active: true, uruchom wszystkie niepuste
    return active.length > 0 ? active : allWorkspaces.filter(ws => Array.isArray(ws.blocks) && ws.blocks.length > 0);
}

const activeWorkspaces = getActiveWorkspaces();

// Zarządzanie danymi (Data Stuff)
const DataManager = {
    getData(name, target, type = 'custom') {
        target = target ? String(typeof target === 'object' ? (target.id || '') : target) : '';
        switch (type) {
            case 'server':
                return persistedData.discord.servers[target]?.[name];
            case 'member':
                return persistedData.discord.members[target]?.[name];
            case 'user':
                return persistedData.discord.users[target]?.[name];
            case 'block':
                return persistedData.blocks[target]?.[name];
            default:
                return persistedData.custom[name];
        }
    },
    setData(name, value, target, type = 'custom') {
        target = target ? String(typeof target === 'object' ? (target.id || '') : target) : '';
        switch (type) {
            case 'server':
                if (!persistedData.discord.servers[target]) persistedData.discord.servers[target] = {};
                persistedData.discord.servers[target][name] = value;
                break;
            case 'member':
                if (!persistedData.discord.members[target]) persistedData.discord.members[target] = {};
                persistedData.discord.members[target][name] = value;
                break;
            case 'user':
                if (!persistedData.discord.users[target]) persistedData.discord.users[target] = {};
                persistedData.discord.users[target][name] = value;
                break;
            case 'block':
                if (!persistedData.blocks[target]) persistedData.blocks[target] = {};
                persistedData.blocks[target][name] = value;
                break;
            default:
                persistedData.custom[name] = value;
                break;
        }
        saveDataFile(persistedData);
    },
    deleteData(name, target, type = 'custom') {
        target = target ? String(typeof target === 'object' ? (target.id || '') : target) : '';
        switch (type) {
            case 'server':
                if (persistedData.discord.servers[target]) delete persistedData.discord.servers[target][name];
                break;
            case 'member':
                if (persistedData.discord.members[target]) delete persistedData.discord.members[target][name];
                break;
            case 'user':
                if (persistedData.discord.users[target]) delete persistedData.discord.users[target][name];
                break;
            case 'block':
                if (persistedData.blocks[target]) delete persistedData.blocks[target][name];
                break;
            default:
                delete persistedData.custom[name];
                break;
        }
        saveDataFile(persistedData);
    },
    addData(name, value, target, type = 'custom') {
        const current = Number(this.getData(name, target, type)) || 0;
        this.setData(name, current + Number(value), target, type);
    },
    saveData() {
        saveDataFile(persistedData);
    }
};

// Zmienne tymczasowe i globalne
const globalVariables = new Map();
const workspaceVariables = new Map();

// Obiekt główny DBB
const DBB = {
    DiscordJS: {
        client,
        module: DiscordJS
    },
    File: {
        paths: {
            workspaces: WORKSPACES_PATH,
            data: DATA_PATH
        },
        writeFile(filePath, content) {
            fs.writeFileSync(filePath, typeof content === 'string' ? content : JSON.stringify(content, null, 4), 'utf8');
        }
    },
    Data: {
        token: process.env.TOKEN || process.env.DISCORD_TOKEN || '',
        workspaces: activeWorkspaces,
        data: persistedData
    },
    Dependencies: {},
    Core: {
        Dependencies: {},
        console(type, msg) {
            const prefix = type ? \`[\${type}]\` : '[LOG]';
            console.log(\`\${prefix} \${msg}\`);
        },
        async require(pkgName) {
            const cleanName = String(pkgName).split('@')[0] || pkgName;
            try {
                return require(cleanName.startsWith('@') ? '@' + String(pkgName).split('@')[1] : cleanName);
            } catch (e) {
                return require(pkgName);
            }
        },
        typeof(val) {
            if (val === null) return 'null';
            if (Array.isArray(val)) return 'list';
            if (val instanceof Date) return 'date';
            return typeof val;
        },
        generateID(length = 10) {
            return Math.random().toString(36).substring(2, 2 + length);
        },
        setDependency(name, instance) {
            this.Dependencies[name] = instance;
            DBB.Dependencies[name] = instance;
        },
        restart() {
            console.log('[INFO] Restartowanie procesu bota...');
        },
        end() {
            process.exit(0);
        }
    },
    Blocks: {
        cache: blockModules,
        inputs: {},
        Data: DataManager,
        Core: null
    }
};

// Przygotowanie indeksów połączeń dla każdego workspace'u
const runtimeWorkspaces = activeWorkspaces.map((ws, wsIdx) => {
    const blocks = ws.blocks || [];
    const wireProducers = new Map(); // wireId -> { blockIdx, outKey, isSlot, slotIdx }
    const wireConsumers = new Map(); // wireId -> Array<{ blockIdx, inKey }>
    const baseWireValues = new Map();

    blocks.forEach((b, bIdx) => {
        if (b.active === false) return;
        if (b.outputs) {
            for (const [outKey, outVal] of Object.entries(b.outputs)) {
                if (!Array.isArray(outVal)) continue;
                if (outVal.length > 0 && Array.isArray(outVal[0])) {
                    // multiOutput: tablica tablic wireId
                    outVal.forEach((slotArr, slotIdx) => {
                        if (Array.isArray(slotArr)) {
                            slotArr.forEach(wId => {
                                if (typeof wId === 'string' && wId) {
                                    wireProducers.set(wId, { blockIdx: bIdx, outKey, isSlot: true, slotIdx });
                                }
                            });
                        }
                    });
                } else {
                    outVal.forEach(wId => {
                        if (typeof wId === 'string' && wId) {
                            wireProducers.set(wId, { blockIdx: bIdx, outKey, isSlot: false, slotIdx: 0 });
                        }
                    });
                }
            }
        }
        if (b.inputs) {
            for (const [inKey, inVal] of Object.entries(b.inputs)) {
                const ids = Array.isArray(inVal) ? inVal : [inVal];
                ids.forEach(wId => {
                    if (typeof wId === 'string' && wId) {
                        if (!wireConsumers.has(wId)) wireConsumers.set(wId, []);
                        wireConsumers.get(wId).push({ blockIdx: bIdx, inKey });
                    }
                });
            }
        }
    });

    return {
        ws,
        wsIdx,
        id: ws.id,
        title: ws.info?.title || \`Workspace \${wsIdx + 1}\`,
        blocks,
        wireProducers,
        wireConsumers,
        baseWireValues,
        inputBlockFlags: new Set()
    };
});

function createCache(rws, blockIdx, sharedState = null, executedFrom = []) {
    const block = rws.blocks[blockIdx];
    const state = sharedState || {
        wireValues: new Map(rws.baseWireValues),
        tempVars: new Map(),
        visitedProducers: new Set()
    };
    return {
        index: blockIdx,
        _index: blockIdx,
        name: block.name,
        inputs: block.inputs || {},
        options: block.options || {},
        outputs: block.outputs || {},
        executedFrom,
        _temp: { __VALUES: [] },
        _rws: rws,
        _state: state
    };
}

// Kontekst wykonywania bloków (this wewnątrz code(cache))
const blockContext = {
    client,
    events: eventsProxy,
    DBB,
    commands: new Collection(),
    jobs: {},
    _tempData: {},

    getDBB() {
        return DBB;
    },

    console(type, msg) {
        DBB.Core.console(type, msg);
    },

    async require(pkgName) {
        return DBB.Core.require(pkgName);
    },

    ConvertRegex(str) {
        if (typeof str !== 'string') return new RegExp('');
        const match = str.match(/^\\/([\\s\\S]+)\\/([gimsuy]*)$/);
        if (match) {
            return new RegExp(match[1], match[2]);
        }
        return new RegExp(str);
    },

    getData(name, target, type) {
        return DataManager.getData(name, target, type);
    },
    setData(name, value, target, type) {
        return DataManager.setData(name, value, target, type);
    },
    deleteData(name, target, type) {
        return DataManager.deleteData(name, target, type);
    },
    addData(name, value, target, type) {
        return DataManager.addData(name, value, target, type);
    },
    saveData() {
        return DataManager.saveData();
    },

    getVariable(name, opts = {}, cache) {
        const type = opts.type || 'temp';
        const restriction = opts.restriction || 'current';
        if (type === 'global' || restriction === 'all') {
            return globalVariables.get(name);
        }
        const wsId = cache?._rws?.id || 'default';
        if (workspaceVariables.has(wsId) && workspaceVariables.get(wsId).has(name)) {
            return workspaceVariables.get(wsId).get(name);
        }
        return cache?._state?.tempVars?.get(name) ?? globalVariables.get(name);
    },

    setVariable(name, value, opts = {}, cache) {
        const type = opts.type || 'temp';
        const restriction = opts.restriction || 'current';
        if (type === 'global' || restriction === 'all') {
            globalVariables.set(name, value);
            return;
        }
        const wsId = cache?._rws?.id || 'default';
        if (!workspaceVariables.has(wsId)) workspaceVariables.set(wsId, new Map());
        workspaceVariables.get(wsId).set(name, value);
        if (cache?._state?.tempVars) {
            cache._state.tempVars.set(name, value);
        }
    },

    deleteVariable(name, opts = {}, cache) {
        globalVariables.delete(name);
        const wsId = cache?._rws?.id || 'default';
        workspaceVariables.get(wsId)?.delete(name);
        cache?._state?.tempVars?.delete(name);
    },

    isOutputConnected(outputId, cache) {
        const out = cache?.outputs?.[outputId];
        if (!out) return false;
        if (Array.isArray(out)) {
            return out.flat().some(w => typeof w === 'string' && w.length > 0);
        }
        return false;
    },

    resolveWireValue(wireId, cache, forceFetch = false) {
        if (!wireId || typeof wireId !== 'string') return undefined;
        const rws = cache._rws;
        const state = cache._state;
        const producer = rws.wireProducers.get(wireId);

        const shouldFetch = forceFetch ||
            (producer && rws.inputBlockFlags.has(producer.blockIdx)) ||
            (!state.wireValues.has(wireId) && !rws.baseWireValues.has(wireId));

        if (producer && shouldFetch) {
            const visitKey = \`\${producer.blockIdx}:\${wireId}\`;
            if (!state.visitedProducers.has(visitKey)) {
                state.visitedProducers.add(visitKey);
                const prodBlock = rws.blocks[producer.blockIdx];
                const prodMod = blockModules.get(prodBlock?.name);
                if (prodMod && typeof prodMod.code === 'function') {
                    const prodCache = createCache(rws, producer.blockIdx, state, []);
                    try {
                        prodMod.code.call(blockContext, prodCache, DBB);
                    } catch (err) {
                        console.error(\`[BŁĄD BLOKU WEJŚCIOWEGO \${prodBlock.name}]:\`, err.message);
                    }
                }
                state.visitedProducers.delete(visitKey);
            }
        }

        if (state.wireValues.has(wireId)) return state.wireValues.get(wireId);
        return rws.baseWireValues.get(wireId);
    },

    GetInputValue(inputId, cache, fetchOrBool = false, defaultValue = undefined) {
        if (!cache || !cache.inputs) return defaultValue;
        const forceFetch = (typeof fetchOrBool === 'object' && fetchOrBool?.fetch) || fetchOrBool === true;
        const rawInput = cache.inputs[inputId];

        const mod = blockModules.get(cache.name);
        let isMultiInput = Array.isArray(rawInput);
        if (!isMultiInput && mod) {
            try {
                const defs = Array.isArray(mod.inputs) ? mod.inputs : (typeof mod.inputs === 'function' ? mod.inputs(cache) : []);
                const def = (defs || []).find(d => d.id === inputId);
                if (def && def.multiInput) isMultiInput = true;
            } catch {}
        }

        if (isMultiInput) {
            const arr = Array.isArray(rawInput) ? rawInput : (rawInput ? [rawInput] : []);
            return arr.map(wId => this.resolveWireValue(wId, cache, forceFetch));
        }

        if (!rawInput || typeof rawInput !== 'string') return defaultValue;
        const val = this.resolveWireValue(rawInput, cache, forceFetch);
        return val !== undefined ? val : defaultValue;
    },

    GetOptionValue(optionId, cache, fetchOrBool = false, defaultValue = undefined) {
        if (!cache || !cache.options) return defaultValue;
        const val = cache.options[optionId];
        return (val !== undefined && val !== '') ? val : (val === '' ? '' : defaultValue);
    },

    StoreOutputValue(value, outputId, cache, mode = undefined) {
        if (!cache || !cache.outputs) return;
        const rws = cache._rws;
        const state = cache._state;
        if (mode === 'inputBlock') {
            rws.inputBlockFlags.add(cache.index);
        }

        const outEntry = cache.outputs[outputId];
        if (!Array.isArray(outEntry)) return;

        if (outEntry.length > 0 && Array.isArray(outEntry[0])) {
            // multiOutput: tablica slotów [[wireId1], [wireId2], ...]
            outEntry.forEach((slotWires, slotIdx) => {
                const slotVal = Array.isArray(value) ? value[slotIdx] : value;
                if (Array.isArray(slotWires)) {
                    slotWires.forEach(wId => {
                        if (typeof wId === 'string' && wId) {
                            state.wireValues.set(wId, slotVal);
                            rws.baseWireValues.set(wId, slotVal);
                        }
                    });
                }
            });
        } else {
            outEntry.forEach(wId => {
                if (typeof wId === 'string' && wId) {
                    state.wireValues.set(wId, value);
                    rws.baseWireValues.set(wId, value);
                }
            });
        }
    },

    async RunNextBlock(outputId, cache, callback = undefined) {
        if (!cache || !cache.outputs) return;
        const rws = cache._rws;
        const outEntry = cache.outputs[outputId];
        if (!Array.isArray(outEntry)) return;

        const wireIds = outEntry.flat().filter(w => typeof w === 'string' && w.length > 0);
        for (const wId of wireIds) {
            const targets = rws.wireConsumers.get(wId) || [];
            for (const target of targets) {
                const targetBlock = rws.blocks[target.blockIdx];
                if (!targetBlock || targetBlock.active === false) continue;
                const targetMod = blockModules.get(targetBlock.name);
                if (!targetMod || typeof targetMod.code !== 'function') continue;

                // Tworzymy płytką kopię stanu dla kolejnego wywołania w łańcuchu
                const nextState = {
                    wireValues: cache._state.wireValues,
                    tempVars: cache._state.tempVars,
                    visitedProducers: new Set()
                };
                const nextCache = createCache(rws, target.blockIdx, nextState, [target.inKey]);
                try {
                    await targetMod.code.call(blockContext, nextCache, DBB);
                } catch (err) {
                    console.error(\`[BŁĄD WYKONANIA BLOKU \${targetBlock.name} w "\${rws.title}"]:\`, err);
                }
            }
        }

        if (typeof callback === 'function') {
            callback();
        }
    },

    Emitter(id, opts = {}, cache) {
        const targetWorkspaces = runtimeWorkspaces.filter(rws => {
            if (opts.restriction_type === 'current') return rws === cache._rws;
            if (opts.restriction_type === 'specific') {
                if (opts.search_type === 'id') return rws.id === opts.search_value;
                if (opts.search_type === 'title') return rws.title === opts.search_value;
                if (opts.search_type === 'number') return (rws.wsIdx + 1) === Number(opts.search_value);
            }
            return true;
        });

        for (const rws of targetWorkspaces) {
            rws.blocks.forEach((b, bIdx) => {
                if (b.active === false || b.name !== 'receiver') return;
                const recCache = createCache(rws, bIdx, null, ['id']);
                const recId = this.GetInputValue('id', recCache) || this.GetOptionValue('id', recCache);
                if (String(recId) === String(id)) {
                    recCache._temp.__VALUES = opts.values || [];
                    const recMod = blockModules.get('receiver');
                    if (recMod && typeof recMod.code === 'function') {
                        try {
                            recMod.code.call(blockContext, recCache, DBB);
                        } catch (err) {
                            console.error('[BŁĄD RECEIVERA]:', err);
                        }
                    }
                }
            });
        }
    }
};

DBB.Blocks.Core = blockContext;

// Start wszystkich bloków po zalogowaniu bota
client.once(Events.ClientReady, async (readyClient) => {
    console.log(\`✅ Zalogowano pomyślnie jako \${readyClient.user.tag}! Aktywnych workspace'ów: \${runtimeWorkspaces.length}\`);

    // 1. Uruchomienie metod init(DBB, blockName) dla wszystkich zainstalowanych bloków używanych w projekcie
    const usedBlockNames = new Set();
    runtimeWorkspaces.forEach(rws => rws.blocks.forEach(b => {
        if (b.active !== false) usedBlockNames.add(b.name);
    }));
    if (blockModules.has('!auto_package_manager')) usedBlockNames.add('!auto_package_manager');

    for (const blockName of usedBlockNames) {
        const mod = blockModules.get(blockName);
        if (mod && typeof mod.init === 'function') {
            try {
                await mod.init.call(blockContext, DBB, blockName);
            } catch (err) {
                console.error(\`[BŁĄD INIT \${blockName}]:\`, err.message);
            }
        }
    }

    // 2. Najpierw obliczamy statyczne bloki wartości (auto_execute bez eventów, np. text, boolean, komponenty)
    for (const rws of runtimeWorkspaces) {
        for (let i = 0; i < rws.blocks.length; i++) {
            const b = rws.blocks[i];
            if (b.active === false) continue;
            const mod = blockModules.get(b.name);
            if (!mod || !mod.auto_execute || typeof mod.code !== 'function') continue;
            const isEvent = (mod.category || '').toLowerCase().includes('event') || b.name.endsWith('_event');
            if (!isEvent) {
                const cache = createCache(rws, i);
                try {
                    await mod.code.call(blockContext, cache, DBB);
                } catch (err) {
                    console.error(\`[BŁĄD AUTO-BLOKU \${b.name} w "\${rws.title}"]:\`, err.message);
                }
            }
        }
    }

    // 3. Teraz uruchamiamy bloki Eventów (auto_execute: true)
    for (const rws of runtimeWorkspaces) {
        for (let i = 0; i < rws.blocks.length; i++) {
            const b = rws.blocks[i];
            if (b.active === false) continue;
            const mod = blockModules.get(b.name);
            if (!mod || !mod.auto_execute || typeof mod.code !== 'function') continue;
            const isEvent = (mod.category || '').toLowerCase().includes('event') || b.name.endsWith('_event');
            if (isEvent) {
                const cache = createCache(rws, i);
                try {
                    await mod.code.call(blockContext, cache, DBB);
                } catch (err) {
                    console.error(\`[BŁĄD EVENTU \${b.name} w "\${rws.title}"]:\`, err.message);
                }
            }
        }
    }
});

// Logowanie bota
const token = process.env.TOKEN || process.env.DISCORD_TOKEN;
if (!token) {
    console.error('❌ Brak tokenu bota! Podaj token w Mango Bot Builderze lub w pliku .env (TOKEN=...)');
    process.exit(1);
}

client.login(token).catch(err => {
    console.error('❌ Błąd logowania do Discorda:', err.message);
    process.exit(1);
});
`;
}

// ═══════ PROJEKTY (Multi-Project Support 1:1 DBB) ═══════
ipcMain.handle('get-projects', () => {
    const settings = loadSettings();
    const colors = ['#8b572a', '#5a8b2a', '#8b2a4a', '#2a6e8b', '#6e2a8b', '#8b7a2a'];

    // Tylko prawdziwe, istniejące projekty z listy recent
    const recentList = settings.recent.map((recPath, i) => {
        const pName = path.basename(recPath);
        let initials = pName.split(/[\s-_]+/).map(w => w[0]).join('').toUpperCase().slice(0, 3);
        if (!initials) initials = pName.slice(0, 2).toUpperCase();
        let wsCount = 0;
        try {
            const p = getProjectPaths(recPath);
            if (fs.existsSync(p.workspaces)) {
                const data = JSON.parse(fs.readFileSync(p.workspaces, 'utf8'));
                wsCount = Array.isArray(data) ? data.length : 0;
            }
        } catch(e) {}
        return {
            name: pName,
            path: recPath,
            initials,
            color: colors[i % colors.length],
            wsCount
        };
    });

    const currPaths = currentProject ? getProjectPaths(currentProject) : null;

    return {
        recent: recentList,
        current: currPaths ? currPaths.name : null,
        currentPath: currPaths ? currPaths.dir : null,
        savedToken: currPaths ? currPaths.savedToken : ''
    };
});

ipcMain.handle('pick-directory', async (event, defaultPath) => {
    const res = await dialog.showOpenDialog(mainWindow, {
        title: 'Wybierz folder dla nowego bota',
        defaultPath: defaultPath || BOTY_DIR,
        properties: ['openDirectory', 'createDirectory']
    });
    if (res.canceled || !res.filePaths.length) return null;
    return res.filePaths[0];
});

ipcMain.handle('open-project-dialog', async () => {
    const res = await dialog.showOpenDialog(mainWindow, {
        title: 'Wybierz folder bota (Discord Bot Builder)',
        defaultPath: BOTY_DIR,
        properties: ['openDirectory']
    });
    if (res.canceled || !res.filePaths.length) return { canceled: true };
    const targetDir = res.filePaths[0];

    // Jeśli w projekcie brakuje folderu blocks, skopiuj z wzorca
    const bDest = path.join(targetDir, 'blocks');
    if (!fs.existsSync(bDest)) {
        try { fs.cpSync(BLOCKS_DIR, bDest, { recursive: true }); } catch(e) {}
    }

    // Jeśli brakuje workspaces.json, utwórz pusty []
    const wsPath = path.join(targetDir, 'data', 'workspaces.json');
    const rootWs = path.join(targetDir, 'workspaces.json');
    if (!fs.existsSync(wsPath) && !fs.existsSync(rootWs)) {
        const dDir = path.join(targetDir, 'data');
        if (!fs.existsSync(dDir)) fs.mkdirSync(dDir, { recursive: true });
        fs.writeFileSync(wsPath, JSON.stringify([], null, 4), 'utf8');
    }

    // Zapisz do recent
    const settings = loadSettings();
    settings.recent = [targetDir, ...(settings.recent || []).filter(r => r !== targetDir)];
    saveSettings(settings);

    currentProject = targetDir;
    const p = getProjectPaths(currentProject);
    return { ok: true, current: p.name, path: targetDir, savedToken: p.savedToken };
});

ipcMain.handle('switch-project', (event, projNameOrPath) => {
    if (botProcess) {
        botProcess.kill();
        botProcess = null;
        if (mainWindow) mainWindow.webContents.send('bot-status', false);
    }
    const paths = getProjectPaths(projNameOrPath);
    currentProject = paths.dir;

    const settings = loadSettings();
    settings.recent = [paths.dir, ...(settings.recent || []).filter(r => r !== paths.dir)];
    saveSettings(settings);

    return { ok: true, current: paths.name, path: paths.dir, savedToken: paths.savedToken };
});

ipcMain.handle('create-project', (event, payload) => {
    const name = typeof payload === 'object' ? payload.name : payload;
    const customDir = typeof payload === 'object' ? payload.targetDir : null;

    if (!name || !name.trim()) return { ok: false, error: 'Nazwa projektu nie może być pusta' };
    const cleanName = name.trim();
    const destDir = customDir ? customDir.trim() : path.join(BOTY_DIR, cleanName.replace(/[<>:"/\\|?*]/g, '_'));

    if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
    }

    // 1. Kopiuj folder blocks/ ze wszystkimi blokami
    const destBlocks = path.join(destDir, 'blocks');
    if (!fs.existsSync(destBlocks)) {
        try { fs.cpSync(BLOCKS_DIR, destBlocks, { recursive: true }); } catch(e) {}
    }

    // 2. Folder data/
    const destData = path.join(destDir, 'data');
    if (!fs.existsSync(destData)) {
        fs.mkdirSync(destData, { recursive: true });
    }

    // 3. workspaces.json - domyślnie pusty [], użytkownik sam tworzy workspace
    const wsPath = path.join(destData, 'workspaces.json');
    if (!fs.existsSync(wsPath)) {
        fs.writeFileSync(wsPath, JSON.stringify([], null, 4), 'utf8');
    }

    // 4. data.json
    const dataPath = path.join(destData, 'data.json');
    if (!fs.existsSync(dataPath)) {
        const defaultData = {
            dbb: { prefixes: { main: "!", servers: {} }, owners: [] },
            discord: { servers: {}, members: {}, users: {} },
            blocks: {},
            custom: {}
        };
        fs.writeFileSync(dataPath, JSON.stringify(defaultData, null, 4), 'utf8');
    }

    // 5. token.txt
    const tokenPath = path.join(destData, 'token.txt');
    if (!fs.existsSync(tokenPath)) {
        fs.writeFileSync(tokenPath, '', 'utf8');
    }

    // 6. package.json
    const pkgPath = path.join(destDir, 'package.json');
    if (!fs.existsSync(pkgPath)) {
        const pkgObj = {
            name: cleanName.toLowerCase().replace(/[^a-z0-9-_]/g, '-'),
            version: "1.0.0",
            main: "bot.js",
            dependencies: {
                "discord.js": "^14.17.3",
                "dotenv": "^16.6.1"
            }
        };
        fs.writeFileSync(pkgPath, JSON.stringify(pkgObj, null, 4), 'utf8');
    }

    // 7. bot.js
    const paths = getProjectPaths(destDir);
    const botCode = getBotJSContent(paths);
    fs.writeFileSync(paths.bot, botCode, 'utf8');

    // 8. .env
    if (!fs.existsSync(paths.env)) {
        fs.writeFileSync(paths.env, 'TOKEN=\n', 'utf8');
    }

    // 9. Zapisz w recent w settings.json
    const settings = loadSettings();
    settings.recent = [destDir, ...(settings.recent || []).filter(r => r !== destDir)];
    saveSettings(settings);

    currentProject = destDir;
    return { ok: true, current: cleanName, path: destDir, savedToken: '' };
});

ipcMain.handle('clear-recent', () => {
    const settings = loadSettings();
    settings.recent = [];
    saveSettings(settings);
    return { ok: true };
});

ipcMain.handle('remove-recent', (event, recPath) => {
    const settings = loadSettings();
    settings.recent = (settings.recent || []).filter(r => r !== recPath && path.basename(r) !== recPath);
    saveSettings(settings);
    return { ok: true };
});

ipcMain.handle('delete-project', (event, projName) => {
    const paths = getProjectPaths(projName);
    if (paths.dir === ROOT_DIR) return { ok: false, error: 'Nie można usunąć głównego projektu' };
    if (fs.existsSync(paths.dir)) {
        fs.rmSync(paths.dir, { recursive: true, force: true });
    }
    const settings = loadSettings();
    settings.recent = (settings.recent || []).filter(r => r !== paths.dir);
    saveSettings(settings);
    if (currentProject === paths.dir) {
        currentProject = null;
    }
    return { ok: true, current: null };
});

ipcMain.handle('generate-bot', (event, token) => {
    try {
        if (!currentProject) return { ok: false, error: 'Brak otwartego projektu' };
        const paths = getProjectPaths(currentProject);
        const code = getBotJSContent(paths);
        fs.writeFileSync(paths.bot, code, 'utf-8');
        if (token && token.trim()) {
            fs.writeFileSync(paths.env, `TOKEN=${token.trim()}\n`, 'utf-8');
        }
        return { ok: true, path: paths.bot };
    } catch (err) {
        console.error('[BŁĄD GENEROWANIA bot.js]:', err);
        return { ok: false, error: err.message };
    }
});

// Zarządzanie procesem Bota (Start / Stop) dla aktualnego projektu
ipcMain.handle('start-bot', (event, token) => {
    if (botProcess) return { status: 'already_running' };

    const paths = getProjectPaths(currentProject);

    // Zawsze upewnij się, że bot.js istnieje i nie jest pusty
    if (!fs.existsSync(paths.bot) || fs.statSync(paths.bot).size === 0) {
        fs.writeFileSync(paths.bot, getBotJSContent(paths), 'utf-8');
    }

    if (token && token.trim()) {
        fs.writeFileSync(paths.env, `TOKEN=${token.trim()}\n`, 'utf-8');
    }

    const nodeModulesPath = path.join(ROOT_DIR, 'node_modules');
    const existingNodePath = process.env.NODE_PATH || '';
    const env = Object.assign({}, process.env, {
        TOKEN: token,
        NODE_PATH: nodeModulesPath + (existingNodePath ? ':' + existingNodePath : '')
    });
    const cwd = paths.dir;
    botProcess = spawn('node', [paths.bot], { cwd, env });

    botProcess.stdout.on('data', (data) => {
        if (mainWindow) mainWindow.webContents.send('bot-log', data.toString());
    });

    botProcess.stderr.on('data', (data) => {
        if (mainWindow) mainWindow.webContents.send('bot-log', `[BŁĄD] ${data.toString()}`);
    });

    botProcess.on('close', (code) => {
        botProcess = null;
        if (mainWindow) mainWindow.webContents.send('bot-status', false);
    });

    return { status: 'started' };
});

ipcMain.handle('stop-bot', () => {
    if (botProcess) {
        botProcess.kill();
        botProcess = null;
        return { status: 'stopped' };
    }
    return { status: 'not_running' };
});

// Ładowanie bloków z folderu /blocks/
ipcMain.handle('get-installed-blocks', () => {
    const files = fs.readdirSync(BLOCKS_DIR).filter(f => f.endsWith('.js'));
    const loadedBlocks = [];

    for (const file of files) {
        try {
            const filePath = path.join(BLOCKS_DIR, file);
            delete require.cache[require.resolve(filePath)];
            const blockModule = require(filePath);

            const dummyData = { inputs: {}, options: {}, outputs: { text: [[]] } };
            const inputs = resolveBlockProp(blockModule.inputs, dummyData);
            const options = resolveBlockProp(blockModule.options, dummyData);
            const outputs = resolveBlockProp(blockModule.outputs, dummyData);

            loadedBlocks.push({
                file: file,
                idName: file.replace('.js', ''),
                name: blockModule.name || file.replace('.js', ''),
                description: blockModule.description || '',
                category: blockModule.category || 'General',
                hasDynamicInputs: typeof blockModule.inputs === 'function',
                hasDynamicOptions: typeof blockModule.options === 'function',
                hasDynamicOutputs: typeof blockModule.outputs === 'function',
                inputs,
                options,
                outputs
            });
        } catch (err) {
            console.error(`[BŁĄD BLOKU ${file}]:`, err.message);
        }
    }

    return loadedBlocks;
});

// Dynamiczna ewaluacja schematu bloku na podstawie jego aktualnych opcji/wejść/wyjść
ipcMain.handle('evaluate-block-schema', (event, blockData) => {
    try {
        const filePath = path.join(BLOCKS_DIR, `${blockData.name}.js`);
        if (!fs.existsSync(filePath)) return null;
        const blockModule = require(filePath);
        return {
            inputs: resolveBlockProp(blockModule.inputs, blockData),
            options: resolveBlockProp(blockModule.options, blockData),
            outputs: resolveBlockProp(blockModule.outputs, blockData)
        };
    } catch (err) {
        return null;
    }
});

// Odczyt i Zapis workspaces.json dla aktualnego projektu
ipcMain.handle('load-workspaces', () => {
    if (!currentProject) return [];
    const paths = getProjectPaths(currentProject);
    if (paths && fs.existsSync(paths.workspaces)) {
        try {
            const data = JSON.parse(fs.readFileSync(paths.workspaces, 'utf-8'));
            return Array.isArray(data) ? data : [];
        } catch (err) {
            console.error('[BŁĄD ODCZYTU workspaces.json]:', err);
        }
    }
    return [];
});

ipcMain.handle('save-workspaces', (event, data) => {
    if (!currentProject) return false;
    const paths = getProjectPaths(currentProject);
    if (!paths) return false;
    try {
        const dir = path.dirname(paths.workspaces);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(paths.workspaces, JSON.stringify(data, null, 4), 'utf-8');
        return true;
    } catch (err) {
        console.error('[BŁĄD ZAPISU workspaces.json]:', err);
        return false;
    }
});
