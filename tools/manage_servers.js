#!/usr/bin/env node
"use strict";

global.logger = {log:(level, ...args)=>{console.log(`\x1b[4m${level}\x1b[0m`, ...args);}};
// global.logger = {log:()=>{}};

const sql = require("../src/shared/SQL.js");

if (process.argv[2] == "--help") {
	printUsage();
} else {
	(async ()=>{
		try{
			await sql.connectToDb();
		}catch(err){
			console.error(err);
			process.exit(-1);
		}

		switch (process.argv[2]) {
			case "add":
				if (process.argv.length == 6) {
					await sql.SqlRun("INSERT INTO servers (address, port, version) VALUES (?, ?, ?);", [process.argv[3], process.argv[4], process.argv[5]]);

					console.log("done!");
					console.log(`Added entry:\n${process.argv[3]} ${process.argv[4]} ${process.argv[5]}`);
					process.exit();
				} else {
					printUsage();
				}
				break;
			case "remove":
				if (process.argv.length == 6) {
					let res = await sql.SqlRun("DELETE FROM servers WHERE address=? AND port=? AND version=?;", [process.argv[3], process.argv[4], process.argv[5]]);
					if (res.changes > 0) {
						console.log(`done!\ndeleted entrys: ${this.changes}`);
					} else {
						console.log(`the entry:\n${process.argv[3]} ${process.argv[4]} ${process.argv[5]}\ndoes not exist!`);
					}
					process.exit();
				} else {
					printUsage();
				}
				break;
			case "list":
				if (process.argv.length == 3) {
					let entries = await sql.SqlAll("SELECT * FROM servers;");

					if(entries.length === 0) console.log("No entries");
					
					for (let entry of entries) {
						console.log(`${entry.address} ${entry.port} ${entry.version}`);
					}
					process.exit();
				} else {
					printUsage();
				}
				break;
			default:
				printUsage();
		}
	})();
}

function printUsage() {
	const programName = process.argv[0].split("/").slice(-1)[0]+' '+process.argv[1].split("/").slice(-1)[0];
	console.log(
`USAGE: ${programName} [OPTION] [...arguments]

SYNOPSIS:
Manage servers

OPTIONS:

list:
	List all servers
	USAGE: ${programName} list

add:
	Add a server
	USAGE: ${programName} add [server address] [server port] [server version]


remove:
	Remove a server
	USAGE: ${programName} remove [server address] [server port] [server version]
`);
	process.exit(1);
}