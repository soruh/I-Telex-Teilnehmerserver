"use strict";

//#region imports
import {ll, lle, llo} from "../COMMONMODULES/logWithLineNumbers.js";

import config from '../COMMONMODULES/config.js';
import colors from "../COMMONMODULES/colors.js";

//#endregion

const verbosity = config.loggingVerbosity;
var cv = level => level <= verbosity; //check verbosity


var timeouts:{
	[index: string]: Timer;
} = {};
class Timer {
	public duration:number;
	public fn;
	public complete:boolean;
	public start_time: number;
	public timeout:NodeJS.Timer;
	public remaining:number;
	public total_time_run:number;
	public paused:boolean;
	public name:string;
	constructor(fn, duration:number, name?:string) {
		this.duration = duration;
		this.fn = fn;
		this.name = name;

		this.complete = false;
		this.start_time = Date.now();
		this.timeout = global.setTimeout(fn, duration);
	}

	_time_diff(date1:number, date2?:number) {
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
			if (cv(3)) ll(colors.FgMagenta + "restarted timeout"+ (this.name?" "+colors.FgCyan+this.name:"") + colors.Reset);
			this.start_time = Date.now();
			this.resume();
		} else {
			this.timeout = global.setTimeout(this.fn, this.remaining);
		}
	}
}

function pauseAll(){
	for (let k in timeouts) {
		timeouts[k].pause();
		if (cv(3)) ll(colors.FgBlue + "paused " + colors.FgMagenta + "timeout: " + colors.FgCyan + k + colors.FgMagenta + " remaining: " + colors.FgCyan + timeouts[k].remaining + colors.Reset);
	}
}

function resumeAll(){
	for (let k in timeouts) {
		timeouts[k].resume();
		if (cv(3)) ll(colors.FgYellow + "resumed " + colors.FgMagenta + "timeout: " + colors.FgCyan + k + colors.FgMagenta + " remaining: " + colors.FgCyan + timeouts[k].remaining + colors.Reset);
	}
}
function TimeoutWrapper(fn, duration, ...args) {
	var fnName = fn.toString().split("(")[0].split(" ")[1];
	if (cv(1)) ll(colors.FgMagenta + "set timeout for: " + colors.FgCyan + fnName + colors.FgMagenta + " to " + colors.FgCyan + duration + colors.FgMagenta + "ms" + colors.Reset);
	timeouts[fnName] = new Timer(function () {
		pauseAll();
		if (cv(3)) ll(colors.FgMagenta + "called: " + colors.FgCyan + fnName + colors.FgMagenta + " with: " + colors.FgCyan+"["+args.slice(1)+"]"+colors.Reset);
		fn.apply(null, args)
		.then(()=>{
			if (cv(3)) ll(colors.FgGreen +"finished "+ colors.FgMagenta + "callback for timeout: " + colors.FgCyan + fnName + colors.Reset);
			resumeAll();
		}).catch(err=>{
			if (cv(2)) lle(colors.FgRed+"error "+colors.FgMagenta + "in timeout: " + colors.FgCyan + fnName + colors.FgMagenta + " error: " + err + colors.Reset);
			resumeAll();
		});
	}, duration, fn.name);
}

export{
    Timer,
    TimeoutWrapper,
    timeouts
}