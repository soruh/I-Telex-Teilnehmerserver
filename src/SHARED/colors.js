"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const COLORS = {
    Reset: "\x1b[000m",
    Bold: "\x1b[001m",
    Dim: "\x1b[002m",
    Underscore: "\x1b[004m",
    Blink: "\x1b[005m",
    Reverse: "\x1b[007m",
    Hidden: "\x1b[008m",
    Strike: "\x1b[009m",
    FgBlack: "\x1b[030m",
    FgRed: "\x1b[031m",
    FgGreen: "\x1b[032m",
    FgYellow: "\x1b[033m",
    FgBlue: "\x1b[034m",
    FgMagenta: "\x1b[035m",
    FgCyan: "\x1b[036m",
    FgWhite: "\x1b[037m",
    BgBlack: "\x1b[040m",
    BgRed: "\x1b[041m",
    BgGreen: "\x1b[042m",
    BgYellow: "\x1b[043m",
    BgBlue: "\x1b[044m",
    BgMagenta: "\x1b[045m",
    BgCyan: "\x1b[046m",
    BgWhite: "\x1b[047m",
    FgLightBlack: "\x1b[090m",
    FgLightRed: "\x1b[091m",
    FgLightGreen: "\x1b[092m",
    FgLightYellow: "\x1b[093m",
    FgLightBlue: "\x1b[094m",
    FgLightMagenta: "\x1b[095m",
    FgLightCyan: "\x1b[096m",
    FgLightWhite: "\x1b[097m",
    BgLightBlack: "\x1b[100m",
    BgLightRed: "\x1b[101m",
    BgLightGreen: "\x1b[102m",
    BgLightYellow: "\x1b[103m",
    BgLightBlue: "\x1b[104m",
    BgLightMagenta: "\x1b[105m",
    BgLightCyan: "\x1b[106m",
    BgLightWhite: "\x1b[107m",
};
function disable(bool) {
    if (bool) {
        for (let i in this) {
            if (typeof this[i] === "string")
                this[i] = "";
        }
    }
}
function colorsAt(str) {
    let colors = {};
    for (let i in COLORS) {
        if (typeof COLORS[i] === "string") {
            const index = str.indexOf(COLORS[i]);
            if (index !== -1) {
                colors[index] = COLORS[i];
            }
        }
    }
    return colors;
}
const exp = Object.assign(COLORS, {
    disable,
    colorsAt,
});
exports.default = exp;
