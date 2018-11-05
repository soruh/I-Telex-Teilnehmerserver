#!/usr/bin/env node
"use strict";
const path = require("path");
const sqlite = require("sqlite3");
const sqlstring = require("sqlstring");

if (process.argv[2] == "--help") {
	printUsage();
} else {
	const db = new sqlite.Database(path.join(__dirname, 'db/telefonbuch.db'), err=>{
		if(err) throw(err);

		switch (process.argv[2]) {
			case "add":
				if (process.argv.length == 5) {
					db.run("INSERT INTO servers (address, port) VALUES (" + sqlstring.escape(process.argv[3]) + ", " + sqlstring.escape(process.argv[4]) + ");", function (err) {
						if (err) {
							console.error(err);
						} else {
							console.log("done!");
							console.log("Added entry:\n" + process.argv[3] + " " + process.argv[4]);
						}
						process.exit();
					});
				} else {
					printUsage();
				}
				break;
			case "remove":
				if (process.argv.length == 5) {
					db.run("DELETE FROM servers WHERE address=" + sqlstring.escape(process.argv[3]) + " AND  port=" + sqlstring.escape(process.argv[4]) + ";", function (err) {
						if (err) {
							console.error(err);
						} else if (this.changes > 0) {
							console.log("done!\ndeleted entrys: " + this.changes);
						} else {
							console.log("the entry:\n" + process.argv[3] + " " + process.argv[4] + "\ndoes not exist!");
						}
						process.exit();
					});
				} else {
					printUsage();
				}
				break;
			case "list":
				if (process.argv.length == 3) {
					db.all("SELECT * FROM servers;", function (err, res) {
						if (err) {
							console.error(err);
						} else {
							for (let o of res) {
								console.log(o.address + " " + o.port);
							}
						}
						process.exit();
					});
				} else {
					printUsage();
				}
				break;
			default:
				printUsage();
		}
	});
}

function printUsage() {
	console.log("USAGE: " + process.argv[0].split("/").slice(-1)[0] + " " + process.argv[1].split("/").slice(-1)[0] + " [OPTION] (parameter1) (parameter2)\n\nSYNOPSIS:\n\Manage servers\n\nOPTIONS:\n\nlist:\n\tList all servers\n\tUSAGE: " + process.argv[0].split("/").slice(-1)[0] + " " + process.argv[1].split("/").slice(-1)[0] + " list\n\nadd:\n\tAdd a server\n\tUSAGE: " + process.argv[0].split("/").slice(-1)[0] + " " + process.argv[1].split("/").slice(-1)[0] + " add [server address] [server port]\n\nremove:\n\tRemove a server\n\tUSAGE: " + process.argv[0].split("/").slice(-1)[0] + " " + process.argv[1].split("/").slice(-1)[0] + " remove [server address] [server port]\n");
	process.exit(1);
}