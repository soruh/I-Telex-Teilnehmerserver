CREATE TABLE queue(
	uid INTEGER PRIMARY KEY,
	server int(11) DEFAULT NULL,
	message int(11) DEFAULT NULL,
	timestamp double unsigned DEFAULT NULL
);

CREATE TABLE servers(
	 uid INTEGER PRIMARY KEY,
	 addresse tinytext,
	 port tinytext
);

CREATE TABLE teilnehmer(
	uid INTEGER PRIMARY KEY,
	number int(10) NOT NULL UNIQUE,
	name tinytext,
	type int(8) DEFAULT 0,
	hostname tinytext,
	ipaddress tinytext,
	port tinytext,
	extension tinytext,
	pin tinytext,
	disabled tinyint(4) DEFAULT 1,
	timestamp int DEFAULT 0,
	changed tinyint(4) DEFAULT '1'
);