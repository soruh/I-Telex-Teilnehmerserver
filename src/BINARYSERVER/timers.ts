"use strict";

//#region imports
import colors from "../SHARED/colors.js";
import {inspect, symbolName} from "../SHARED/misc.js";
//#endregion

const logger = global.logger;

var timeouts: Map < symbol, Timer > = new Map();
class Timer {
  public name: string;
  public paused: boolean;
  public duration: number;
  public remaining: number;
  public start_time: number;
  public timeout: NodeJS.Timer;
  public total_time_run: number;
  public fn: (...args: any[]) => any;

  public complete: boolean = false;

  constructor(fn: (...args: any[]) => any, duration: number, name ? : string) {
    this.fn = fn;
    this.name = name;
    this.duration = duration;

    this.start_time = Date.now();
    this.timeout = global.setTimeout(fn, duration);
  }

  _time_diff(date1: number, date2 ? : number) {
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
      logger.debug(`${colors.FgMagenta}restarted timeout ${this.name ? " " + colors.FgCyan + this.name : ""}${colors.Reset}`);
      this.start_time = Date.now();
      this.resume();
    } else {
      this.timeout = global.setTimeout(this.fn, this.remaining);
    }
  }
}

function pauseAll() {
  for (var [name, timeout] of timeouts) {
    timeout.pause();
    logger.debug(`${colors.FgBlue}paused ${colors.FgMagenta}timeout: ${colors.FgCyan}${symbolName(name)}${colors.FgMagenta}remaining: ${colors.FgCyan}${timeout.remaining}${colors.Reset}`);
  }
}

function resumeAll() {
  for (var [name, timeout] of timeouts) {
    timeout.resume();
    logger.debug(`${colors.FgYellow}resumed ${colors.FgMagenta}timeout: ${colors.FgCyan}${symbolName(name)}${colors.FgMagenta} remaining: ${colors.FgCyan}${timeout.remaining}${colors.Reset}`);
  }
}

function TimeoutWrapper < T > (
  fn: (...args: any[]) => any,
  duration: number,
  ...args
) {
  var fnName = fn
    .toString()
    .split("(")[0]
    .split(" ")[1];
  logger.info(inspect`${colors.FgMagenta}set timeout for: ${colors.FgCyan}${fnName}${colors.FgMagenta} to ${colors.FgCyan}${duration}${colors.FgMagenta}ms${colors.Reset}`);
  timeouts.set(
    Symbol(fnName),
    new Timer(
      function () {
        pauseAll();
        logger.debug(inspect`${colors.FgMagenta}called: ${colors.FgCyan}${fnName}${colors.FgMagenta} with: ${colors.FgCyan}[${args.slice(1)}]${colors.Reset}`);
        fn.apply(null, args)
          .then(() => {
            logger.debug(inspect`${colors.FgGreen}finished${colors.FgMagenta}callback for timeout: ${colors.FgCyan}${fnName}${colors.Reset}`);
            resumeAll();
          })
          .catch(err => {
            logger.error(inspect`${colors.FgRed}error${colors.FgMagenta} in timeout: ${colors.FgCyan}${fnName}${colors.FgMagenta}error: ${err}${colors.Reset}`);
            resumeAll();
          });
      },
      duration,
      fn.name
    )
  );
}

export {
  Timer,
  TimeoutWrapper,
  timeouts
};