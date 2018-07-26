"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
//#region imports
// import colors from "../SHARED/colors.js";
const misc_js_1 = require("../SHARED/misc.js");
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
            logger.debug(misc_js_1.inspect `restarted timeout ${this.name || ''}`);
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
        logger.debug(misc_js_1.inspect `paused timeout: ${misc_js_1.symbolName(name)} remaining: ${timeout.remaining}`);
    }
}
function resumeAll() {
    for (var [name, timeout] of timeouts) {
        timeout.resume();
        logger.debug(misc_js_1.inspect `resumed timeout: ${misc_js_1.symbolName(name)} remaining: ${timeout.remaining}`);
    }
}
function TimeoutWrapper(fn, duration, ...args) {
    var fnName = fn
        .toString()
        .split("(")[0]
        .split(" ")[1];
    logger.info(misc_js_1.inspect `set timeout for: ${fnName} to ${duration}ms`);
    timeouts.set(Symbol(fnName), new Timer(function () {
        pauseAll();
        logger.debug(misc_js_1.inspect `called: ${fnName} with: ${args.slice(1)}`);
        fn.apply(null, args)
            .then(() => {
            logger.debug(misc_js_1.inspect `finished callback for timeout: ${fnName}`);
            resumeAll();
        })
            .catch(err => {
            logger.error(misc_js_1.inspect `error in timeout: ${fnName} error: ${err}`);
            resumeAll();
        });
    }, duration, fn.name));
}
exports.TimeoutWrapper = TimeoutWrapper;
