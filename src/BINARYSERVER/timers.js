"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
//#region imports
// import colors from "../SHARED/colors.js";
const misc_js_1 = require("../SHARED/misc.js");
//#endregion
function timeDiff(date1, date2 = Date.now()) {
    return date2 - date1;
}
var timeouts = new Map();
exports.timeouts = timeouts;
class Timer {
    constructor(fn, duration, name) {
        this.paused = false;
        this.startTime = Date.now();
        this.complete = false;
        this.fn = () => {
            fn();
            this.remaining = 0;
            this.complete = true;
        };
        this.name = name;
        this.duration = duration;
        this.remaining = this.duration;
        this.timeout = global.setTimeout(this.fn, this.remaining);
        logger.log('silly', misc_js_1.inspect `started timeout ${this.name || ''} with duration ${this.duration}`);
    }
    cancel() {
        logger.log('silly', misc_js_1.inspect `canceled timeout ${this.name || ''}`);
        this.complete = true;
        clearTimeout(this.timeout);
    }
    pause() {
        logger.log('silly', misc_js_1.inspect `paused timeout ${this.name || ''}`);
        if (!this.paused) {
            this.paused = true;
            clearTimeout(this.timeout);
            this.remaining -= timeDiff(this.startTime);
            this.complete = this.remaining <= 0;
        }
    }
    resume() {
        this.paused = false;
        this.startTime = Date.now();
        if (this.complete) {
            logger.log('silly', misc_js_1.inspect `restarted timeout ${this.name || ''}`);
            this.remaining = this.duration;
            this.complete = false;
            this.timeout = global.setTimeout(this.fn, this.remaining);
        }
        else {
            logger.log('silly', misc_js_1.inspect `resumed timeout ${this.name || ''}`);
            this.timeout = global.setTimeout(this.fn, this.remaining);
        }
    }
}
exports.Timer = Timer;
function pauseAll() {
    for (var [name, timeout] of timeouts) {
        timeout.pause();
        // logger.log('silly', inspect`paused timeout: ${symbolName(name)} remaining: ${timeout.remaining}`);
    }
}
function resumeAll() {
    for (var [name, timeout] of timeouts) {
        timeout.resume();
        // logger.log('silly', inspect`resumed timeout: ${symbolName(name)} remaining: ${timeout.remaining}`);
    }
}
function TimeoutWrapper(fn, duration, ...args) {
    var fnName = fn.name;
    // logger.log('warning', inspect`set timeout for: ${fnName} to ${duration}ms`);
    timeouts.set(Symbol(fnName), new Timer(() => {
        pauseAll();
        logger.log('silly', misc_js_1.inspect `called: ${fnName} with: ${args.slice(1)}`);
        fn.apply(null, args)
            .then(() => {
            logger.log('silly', misc_js_1.inspect `finished callback for timeout: ${fnName}`);
            resumeAll();
        })
            .catch(err => {
            logger.log('error', misc_js_1.inspect `error in timeout: ${fnName} error: ${err}`);
            resumeAll();
        });
    }, duration, fn.name));
}
exports.TimeoutWrapper = TimeoutWrapper;
