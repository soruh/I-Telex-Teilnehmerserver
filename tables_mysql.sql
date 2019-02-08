CREATE TABLE queue (
	PRIMARY KEY uid,
	server INTEGER NOT NULL,
	message INTEGER NOT NULL,
	timestamp int unsigned DEFAULT 0
);

CREATE TABLE servers (
	PRIMARY KEY uid,
	address VARCHAR(40),
	version tinyint unsigned,
	port smallint unsigned
);

CREATE TABLE teilnehmer (
	PRIMARY KEY uid,
	number int unsigned NOT NULL UNIQUE,
	name VARCHAR(40),
	type tinyint unsigned DEFAULT 0,
	hostname VARCHAR(40),
	ipaddress VARCHAR(15),
	port smallint unsigned,
	extension VARCHAR(2) DEFAULT "",
	pin smallint unsigned,
	disabled bit DEFAULT 1,
	timestamp int unsigned DEFAULT 0,
	changed bit DEFAULT 1
);