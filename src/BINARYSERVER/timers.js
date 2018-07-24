"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
//#region imports
const colors_js_1 = require("../COMMONMODULES/colors.js");
const misc_js_1 = require("./misc.js");
//#endregion
const logger = global.logger;
var timeouts = new Map();
exports.timeouts = timeouts;
class Timer {
    constructor(fn, duration, name) {
        this.complete = false;
        this.fn = fn;
        this.name = name;
        this.duration = duration;
        this.start_time = Date.now();
        this.timeout = global.setTimeout(fn, duration);
    }
    _time_diff(date1, date2) {
        return date2 ? date2 - date1 : Date.now() - date1;
    }
    cancel() {
        clearTimeout(this.timeout);
        this.remaining = 0;
    }
    getRemaining() {
        this.total_time_run = this._time_diff(this.start_time);
        this.remaining = this.duration - this.total_time_run;
        return this.remaining;
    }
    pause() {
        this.paused = true;
        clearTimeout(this.timeout);
        this.total_time_run = this._time_diff(this.start_time);
        this.complete = this.total_time_run >= this.duration;
        this.remaining = this.duration - this.total_time_run;
    }
    resume() {
        this.paused = false;
        this.total_time_run = this._time_diff(this.start_time);
        this.complete = this.total_time_run >= this.duration;
        this.remaining = this.duration - this.total_time_run;
        if (this.complete) {
            logger.debug(colors_js_1.default.FgMagenta +
                "restarted timeout" +
                (this.name ? " " + colors_js_1.default.FgCyan + this.name : "") +
                colors_js_1.default.Reset);
            this.start_time = Date.now();
            this.resume();
        }
        else {
            this.timeout = global.setTimeout(this.fn, this.remaining);
        }
    }
}
exports.Timer = Timer;
function pauseAll() {
    for (var [name, timeout] of timeouts) {
        timeout.pause();
        logger.debug(colors_js_1.default.FgBlue +
            "paused " +
            colors_js_1.default.FgMagenta +
            "timeout: " +
            colors_js_1.default.FgCyan +
            misc_js_1.symbolName(name) +
            colors_js_1.default.FgMagenta +
            " remaining: " +
            colors_js_1.default.FgCyan +
            timeout.remaining +
            colors_js_1.default.Reset);
    }
}
function resumeAll() {
    for (var [name, timeout] of timeouts) {
        timeout.resume();
        logger.debug(colors_js_1.default.FgYellow +
            "resumed " +
            colors_js_1.default.FgMagenta +
            "timeout: " +
            colors_js_1.default.FgCyan +
            misc_js_1.symbolName(name) +
            colors_js_1.default.FgMagenta +
            " remaining: " +
            colors_js_1.default.FgCyan +
            timeout.remaining +
            colors_js_1.default.Reset);
    }
}
function TimeoutWrapper(fn, duration, ...args) {
    var fnName = fn
        .toString()
        .split("(")[0]
        .split(" ")[1];
    logger.info(colors_js_1.default.FgMagenta +
        "set timeout for: " +
        colors_js_1.default.FgCyan +
        fnName +
        colors_js_1.default.FgMagenta +
        " to " +
        colors_js_1.default.FgCyan +
        duration +
        colors_js_1.default.FgMagenta +
        "ms" +
        colors_js_1.default.Reset);
    timeouts.set(Symbol(fnName), new Timer(function () {
        pauseAll();
        logger.debug(colors_js_1.default.FgMagenta +
            "called: " +
            colors_js_1.default.FgCyan +
            fnName +
            colors_js_1.default.FgMagenta +
            " with: " +
            colors_js_1.default.FgCyan +
            "[" +
            args.slice(1) +
            "]" +
            colors_js_1.default.Reset);
        fn.apply(null, args)
            .then(() => {
            logger.debug(colors_js_1.default.FgGreen +
                "finished " +
                colors_js_1.default.FgMagenta +
                "callback for timeout: " +
                colors_js_1.default.FgCyan +
                fnName +
                colors_js_1.default.Reset);
            resumeAll();
        })
            .catch(err => {
            logger.error(colors_js_1.default.FgRed +
                "error " +
                colors_js_1.default.FgMagenta +
                "in timeout: " +
                colors_js_1.default.FgCyan +
                fnName +
                colors_js_1.default.FgMagenta +
                " error: " +
                err +
                colors_js_1.default.Reset);
            resumeAll();
        });
    }, duration, fn.name));
}
exports.TimeoutWrapper = TimeoutWrapper;
