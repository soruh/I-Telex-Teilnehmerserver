CREATE DATABASE `telefonbuch` /*!40100 DEFAULT CHARACTER SET utf8 */;
CREATE TABLE `queue` (
  `uid` int(11) NOT NULL AUTO_INCREMENT,
  `server` int(11) DEFAULT NULL,
  `message` int(11) DEFAULT NULL,
  `timestamp` double unsigned DEFAULT NULL,
  PRIMARY KEY (`uid`),
  UNIQUE KEY `uid_UNIQUE` (`uid`)
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8;
CREATE TABLE `servers` (
  `uid` int(11) NOT NULL AUTO_INCREMENT,
  `addresse` tinytext,
  `port` tinytext,
  PRIMARY KEY (`uid`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8;
CREATE TABLE `teilnehmer` (
  `uid` int(11) NOT NULL AUTO_INCREMENT,
  `rufnummer` int(10) NOT NULL,
  `name` tinytext CHARACTER SET utf8,
  `typ` int(8) DEFAULT NULL,
  `hostname` tinytext CHARACTER SET utf8,
  `ipaddresse` tinytext CHARACTER SET utf8,
  `port` tinytext CHARACTER SET utf8,
  `extention` tinytext CHARACTER SET utf8,
  `pin` tinytext CHARACTER SET utf8,
  `gesperrt` tinyint(4) DEFAULT NULL,
  `moddate` tinytext CHARACTER SET utf8,
  `changed` tinyint(4) DEFAULT '1',
  PRIMARY KEY (`uid`),
  UNIQUE KEY `uid_UNIQUE` (`uid`),
  UNIQUE KEY `rufnummer_UNIQUE` (`rufnummer`)
) ENGINE=InnoDB AUTO_INCREMENT=41 DEFAULT CHARSET=utf8 COLLATE=utf8_danish_ci;
