#!/usr/bin/env node
"use strict";
global.logger = {
	log: (level, message)=>{
		console.log(message);
	}
};
const fs = require('fs');
const path = require('path');
const config = require(path.join(__dirname, '../src/shared/config')).default;

let oldConfig = {};
for(let i in config.mysql) oldConfig[i] = config.mysql[i];

config.useMysql = true;
config.mysql.multipleStatements = true;

const sql = require(path.join(__dirname, '../src/shared/SQL'));


function getInput(message, muted){
	return new Promise((resolve, reject) => {
		const readline = require('readline');
		const { Writable } = require('stream');

		const mutableStdout = new Writable({
			write: function(chunk, encoding, callback) {
				if (!this.muted) process.stdout.write(chunk, encoding);
				callback();
			}
		});

		mutableStdout.muted = false;

		const rl = readline.createInterface({
			input: process.stdin,
			output: mutableStdout,
			terminal: true,
		});

		rl.question(message+': ', function(password) {
			rl.close();
			if(muted) process.stdout.write('\n');
			resolve(password);
		});

		mutableStdout.muted = muted;
	});
}

async function connectToDb(promtForUser){
	try{
		if(promtForUser) throw({code: 'ECONNREFUSED'});

		await sql.connectToDb();
	}catch(err){
		if(err.code !== 'ECONNREFUSED') throw(err);

		const username = await getInput('Enter username', false);
		const password = await getInput('Enter password', true);

		config.mysql.user     = username;
		config.mysql.password = password;
		
		try{
			await sql.connectToDb();
		}catch(err){
			throw(err);
		}
	}
}

function createDatabase(){
	return sql.run("CREATE DATABASE ?;", [oldConfig.database]);
}

function createUser(){
	return sql.run("CREATE USER ?@localhost IDENTIFIED BY ?;", [oldConfig.user, oldConfig.password]);
}

function createGrant(){
	return sql.run("GRANT ALL ON ?.* TO ?@localhost;", [oldConfig.database, oldConfig.user]);
}
function createTables(){
	return sql.run(fs.readFileSync(path.join(__dirname, '../tables_mysql.sql')));
}


(async ()=>{
	try{
		await connectToDb(process.argv[2]);
		console.log("\x1b[32mconnect to database\x1b[0m");
	}catch(err){
		console.error("\x1b[31mcould not connect to database\x1b[0m");
		process.exit();
	}

	try{
		await createDatabase();
		console.log("\x1b[32mcreated: database\x1b[0m");
	}catch(err){
		console.error("\x1b[31mcould not create: database\x1b[0m");
	}

	try{
		await createTables();
		console.log("\x1b[32mcreated: tables\x1b[0m");
	}catch(err){
		console.error("\x1b[31mcould not create: tables\x1b[0m");
	}

	try{
		await createUser();
		console.log("\x1b[32mcreated: user\x1b[0m");
	}catch(err){
		console.error("\x1b[31mcould not create: user\x1b[0m");
	}

	try{
		await createGrant();
		console.log("\x1b[32mcreated: grant\x1b[0m");
	}catch(err){
		console.error("\x1b[31mcould not create: grant\x1b[0m");
	}
})();