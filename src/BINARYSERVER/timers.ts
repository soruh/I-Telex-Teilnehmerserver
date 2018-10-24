"use strict";

//#region imports
// import colors from "../SHARED/colors.js";
import {inspect} from "../SHARED/misc.js";
//#endregion


function timeDiff(date1: number, date2=Date.now()) {
	return date2 - date1;
}

let timeouts: Map < symbol, Timer > = new Map();
class Timer {
	public name: string;
	public paused = false;
	public duration: number;
	public remaining: number;
	public startTime = Date.now();
	public timeout: NodeJS.Timer;
	public fn: (...args: any[]) => any;

	public complete: boolean = false;

	constructor(fn: (...args: any[]) => any, duration: number, name ? : string) {
		this.fn = ()=>{
			fn();
			this.remaining = 0;
			this.complete = true;
		};
		this.name = name;

		this.duration = duration;
		this.remaining = this.duration;
		this.timeout = global.setTimeout(this.fn, this.remaining);
		logger.log('silly', inspect`started timeout ${this.name||''} with duration ${this.duration}`);
	}
	public cancel() {
		logger.log('silly', inspect`canceled timeout ${this.name||''}`);
		this.complete = true;
		clearTimeout(this.timeout);
	}
	public pause() {
		logger.log('silly', inspect`paused timeout ${this.name||''}`);
		if(!this.paused){
			this.paused = true;
			clearTimeout(this.timeout);
			this.remaining -= timeDiff(this.startTime);
			this.complete = this.remaining <= 0;
		}
	}
	public resume() {
		this.paused = false;
		this.startTime = Date.now();
		if (this.complete) {
			logger.log('silly', inspect`restarted timeout ${this.name||''}`);
			this.remaining = this.duration;
			this.complete = false;
			this.timeout = global.setTimeout(this.fn, this.remaining);
		} else {
			logger.log('silly', inspect`resumed timeout ${this.name||''}`);
			this.timeout = global.setTimeout(this.fn, this.remaining);
		}
	}
}

function pauseAll() {
	for (let [name, timeout] of timeouts) {
		timeout.pause();
		// logger.log('silly', inspect`paused timeout: ${name.description} remaining: ${timeout.remaining}`);
	}
}

function resumeAll() {
	for (let [name, timeout] of timeouts) {
		timeout.resume();
		// logger.log('silly', inspect`resumed timeout: ${name.description} remaining: ${timeout.remaining}`);
	}
	
}

function TimeoutWrapper(
	fn: (...args: any[]) => Promise<any>,
	duration: number,
	...args
) {
	// logger.log('warning', inspect`set timeout for: ${fn.name} to ${duration}ms`);
	timeouts.set(
		Symbol(fn.name),
		new Timer(
			()=>{
				pauseAll();
				logger.log('silly', inspect`called: ${fn.name} with: ${args.slice(1)}`);
				fn.apply(null, args)
				.then(() => {
					logger.log('silly', inspect`finished callback for timeout: ${fn.name}`);
					resumeAll();
				})
				.catch(err => {
					logger.log('error', inspect`error in timeout: ${fn.name} error: ${err}`);
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
