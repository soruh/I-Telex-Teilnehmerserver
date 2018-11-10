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
				if (process.argv.length == 6) {
					db.run("INSERT INTO servers (address, port, version) VALUES (?, ?, ?);", [process.argv[3], process.argv[4], process.argv[5]], function (err) {
						if (err) {
							throw(err);
						} else {
							console.log("done!");
							console.log(`Added entry:\n${process.argv[3]} ${process.argv[4]} ${process.argv[5]}`);
						}
						process.exit();
					});
				} else {
					printUsage();
				}
				break;
			case "remove":
				if (process.argv.length == 6) {
					db.run("DELETE FROM servers WHERE address=? AND port=? AND version=?;", [process.argv[3], process.argv[4], process.argv[5]], function (err) {
						if (err) {
							throw(err);
						} else if (this.changes > 0) {
							console.log(`done!\ndeleted entrys: ${this.changes}`);
						} else {
							console.log(`the entry:\n${process.argv[3]} ${process.argv[4]} ${process.argv[5]}\ndoes not exist!`);
						}
						process.exit();
					});
				} else {
					printUsage();
				}
				break;
			case "list":
				if (process.argv.length == 3) {
					db.all("SELECT * FROM servers;", function (err, entries) {
						if (err) {
							throw(err);
						} else {
							for (let entry of entries) {
								console.log(`${entry.address} ${entry.port} ${entry.version}`);
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