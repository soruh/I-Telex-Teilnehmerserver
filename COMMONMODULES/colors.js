"use strict";
if(module.parent!=null){var mod=module;var load_order=[module.id.split("/").slice(-1)];while(mod.parent){load_order.push(mod.parent.filename.split("/").slice(-1));mod=mod.parent;}var load_order_rev=[];for(let i=load_order.length-1;i>=0;i--){load_order_rev.push(i==0?"\x1b[32m"+load_order[i]+"\x1b[0m":i==load_order.length-1?"\x1b[36m"+load_order[i]+"\x1b[0m":"\x1b[33m"+load_order[i]+"\x1b[0m");}console.log("loaded: "+load_order_rev.join(" ––> "));}
const COLORS = {
	Reset: "\x1b[000m",
	Bright: "\x1b[001m",
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
	BgLightWhite: "\x1b[107m"
}


for(let i in COLORS){
	module.exports[i] = COLORS[i];
}
module.exports["disable"]=
function disable(bool){
	for(let i in COLORS){
		module.exports[i] = (typeof bool === "undefined"||bool)?"":COLORS[i];
	}
};
module.exports["colorsAt"]=
function colorsAt(str){
	if(typeof str === "string"){
		var colors = {};
		for(let i in COLORS){
			if(typeof COLORS[i] === "string"){
				var index = str.indexOf(COLORS[i]);
				if(index!=-1){
					colors[index]=COLORS[i];
				}
			}
		}
		return(colors);
	}else{
		return(colors);
	}
};
