CREATE TABLE queue (
	uid INTEGER PRIMARY KEY,
	server INTEGER NOT NULL,
	message INTEGER NOT NULL,
	timestamp int unsigned DEFAULT 0
);

CREATE TABLE servers (
	uid INTEGER PRIMARY KEY,
	address tinytext,
	version tinyint unsigned,
	port tinyint unsigned
);

CREATE TABLE teilnehmer (
	uid INTEGER PRIMARY KEY,
	number int unsigned NOT NULL UNIQUE,
	name VARCHAR(40),
	type tinyint unsigned DEFAULT 0,
	hostname VARCHAR(40),
	ipaddress VARCHAR(15),
	port smallint unsigned,
	extension tinyint unsigned DEFAULT 0,
	pin smallint unsigned,
	disabled bit DEFAULT 1,
	timestamp int unsigned DEFAULT 0,
	changed bit DEFAULT 1
);