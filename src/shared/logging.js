"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util = require("util");
util.inspect.styles.error = 'red';
util.inspect.styles.symbol = 'bold';
util.inspect.styles.boolean = 'italic';
function initLogger(inspectOptions = {}, loggerSettings, inspectorSettings) {
    inspect.inspectOptions = inspectOptions;
    if (inspectorSettings) {
        if (inspectorSettings.customStyles)
            util.inspect.styles = inspectorSettings.customStyles;
        if (inspectorSettings.customColors)
            util.inspect.colors = inspectorSettings.customColors;
    }
    if (loggerSettings) {
        if (loggerSettings.colorsForLevel)
            log.colorsForLevel = loggerSettings.colorsForLevel;
        if (loggerSettings.outputStreams)
            log.outputStreams = loggerSettings.outputStreams;
        if (loggerSettings.showLevels)
            log.showLevels = loggerSettings.showLevels;
    }
}
exports.initLogger = initLogger;
function isError(error) {
    if (error instanceof Error)
        return true;
    return false;
}
function inspectSingleValue(value) {
    const inspected = util.inspect(value, inspect.inspectOptions);
    if (isError(value)) {
        if (!inspect.inspectOptions.colors)
            return inspected;
        const color = util.inspect.colors[util.inspect.styles['error']];
        return `\x1b[${color[0]}m${inspected}\x1b[${color[1]}m`;
    }
    return inspected;
}
function combineTemplate(strings, args) {
    let substringArray = Array.from(strings);
    // let substringArray = 
    // Array.from(strings)
    // .map(substring =>{
    // 	if (disableColors) return substring;
    // 	return colors.FgGreen + substring + colors.Reset;
    // });
    args = args.map(value => {
        if (typeof value === "string") {
            if (!inspect.inspectOptions.colors)
                return value;
            // return colors.FgCyan + value + colors.Reset;
            // return colors.FgGreen + value + colors.Reset;
            const color = util.inspect.colors[util.inspect.styles['string']];
            return `\x1b[${color[0]}m${value}\x1b[${color[1]}m`;
        }
        return inspectSingleValue(value);
    });
    let combined = [];
    while (args.length + substringArray.length > 0) {
        if (substringArray.length > 0)
            combined.push(substringArray.shift());
        if (args.length > 0)
            combined.push(args.shift());
    }
    return combined.join('');
}
function checkIsTemplate(strings, ...args) {
    if (strings instanceof Array) {
        const rawProperty = Object.getOwnPropertyDescriptor(strings, 'raw');
        if (rawProperty &&
            !(rawProperty.writable ||
                rawProperty.enumerable ||
                rawProperty.configurable) &&
            rawProperty.value instanceof Array &&
            rawProperty.value.length === strings.length) {
            if (rawProperty.value.length - 1 !== args.length) {
                // throw(`${rawProperty.value.length} - 1 !== ${args.length}`);
                return false;
            }
            for (let value of rawProperty.value) {
                if (typeof value !== 'string') {
                    return false;
                }
            }
            return true;
        }
    }
    return false;
}
function inspectNonTemplate(...args) {
    if (typeof args[0] === 'string') {
        return util.formatWithOptions(inspect.inspectOptions, args[0], ...args.slice(1));
    }
    else {
        return args.map(inspectSingleValue).join(' ');
    }
}
let inspect = function inspect(strings, ...values) {
    const isTemplate = checkIsTemplate(strings, ...values);
    if (isTemplate) {
        return combineTemplate(strings, values);
    }
    else {
        return inspectNonTemplate(strings, ...values);
    }
};
exports.inspect = inspect;
const levelOrder = ['error', 'warning', 'info', 'verbose', 'silly'];
let log = function (subsystem, level) {
    if (log.showLevels && log.showLevels.hasOwnProperty(subsystem)) {
        var showSubsystem = log.showLevels[subsystem];
    }
    else {
        var showSubsystem = log.showLevels.default;
    }
    let logThisCall = true;
    if (showSubsystem.hasOwnProperty('to')) {
        const { to } = showSubsystem;
        const toIndex = levelOrder.indexOf(to);
        const isIndex = levelOrder.indexOf(level);
        if (!~toIndex) {
            logThisCall = true;
        }
        else {
            logThisCall = isIndex <= toIndex;
        }
    }
    else if (showSubsystem.hasOwnProperty(level)) {
        logThisCall = showSubsystem[level];
    }
    else {
        logThisCall = showSubsystem.default;
    }
    if (!logThisCall)
        return () => { };
    return function (...values) {
        const inspected = inspect(...values);
        let color = '';
        if (log.colorsForLevel) {
            if (log.colorsForLevel.hasOwnProperty(level)) {
                color = '\x1b[' + log.colorsForLevel[level] + 'm';
            }
            else {
                color = '\x1b[' + log.colorsForLevel.default + 'm';
            }
        }
        const d = new Date();
        let adjustedTime = d.getTime();
        adjustedTime -= d.getTimezoneOffset() * 60 * 1000;
        const dateString = new Date(adjustedTime).toISOString().replace(/[T]/g, ' ').slice(0, -1);
        let ouput = '';
        ouput += dateString;
        ouput += ' ';
        ouput += subsystem.padStart(18);
        ouput += '.';
        ouput += color;
        ouput += level.padEnd(7);
        ouput += '\x1b[0m';
        ouput += ' | ';
        ouput += inspected;
        ouput += '\n';
        let stream = process.stdout; // TODO: read from level & subsystem 
        if (log.outputStreams) {
            if (log.outputStreams.hasOwnProperty(subsystem)) {
                var streamsForSubsystem = log.outputStreams[subsystem];
            }
            else {
                var streamsForSubsystem = log.outputStreams.default;
            }
            if (streamsForSubsystem.hasOwnProperty(level)) {
                stream = streamsForSubsystem[level];
            }
            else {
                stream = streamsForSubsystem.default;
            }
        }
        stream.write(ouput);
    };
};
exports.log = log;
log.outputStreams = {
    default: {
        default: process.stdout,
        error: process.stderr,
    }
};
log.colorsForLevel = {
    default: 2,
    error: 31,
    warning: 33,
    info: 32,
    verbose: 36,
    silly: 35,
};
function makeLogger(subsystem) {
    return log.bind(null, subsystem);
}
exports.makeLogger = makeLogger;
