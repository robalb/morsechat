-- --------------------------------------------------------
-- Host:                         127.0.0.1
-- Versione server:              10.5.10-MariaDB - Source distribution
-- S.O. server:                  Linux
-- HeidiSQL Versione:            9.5.0.5196
-- --------------------------------------------------------

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8 */;
/*!50503 SET NAMES utf8mb4 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;


-- Dump della struttura del database morsechat
CREATE DATABASE IF NOT EXISTS `morsechat` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci */;
USE `morsechat`;

-- Dump della struttura di tabella morsechat.callsign_schemas
CREATE TABLE IF NOT EXISTS `callsign_schemas` (
  `schema` varchar(8000) NOT NULL,
  `expire` int(11) unsigned DEFAULT NULL,
  `max_uses` int(11) DEFAULT NULL,
  `description` varchar(256) DEFAULT NULL,
  `code_hash` varchar(90) NOT NULL,
  `code_clear` varchar(90) DEFAULT NULL,
  PRIMARY KEY (`code_hash`) USING HASH
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Dump dei dati della tabella morsechat.callsign_schemas: ~2 rows (circa)
/*!40000 ALTER TABLE `callsign_schemas` DISABLE KEYS */;
INSERT INTO `callsign_schemas` (`schema`, `expire`, `max_uses`, `description`, `code_hash`, `code_clear`) VALUES
	('[{"module": "country", "value": ""}, {"module": "text", "value": "", "len": 2, "ecmaPattern": "^[0-9]*$", "description": "2 numbers"}, {"module": "text", "value": "", "len": 3, "ecmaPattern": "^[a-zA-Z]*$", "description": "3 letters"}]', 0, 0, 'test schema', '3b899da9e97543f678075ea88aa70be6096b054d', 'mrse_76ee5b3445ee7094'),
	('[{"module": "country", "value": ""}, {"module": "text", "value": "", "len": 2, "ecmaPattern": "^[0-9]*$", "description": "2 numbers"}, {"module": "text", "value": "", "len": 3, "ecmaPattern": "^[a-zA-Z]*$", "description": "3 letters"}]', 0, 0, 'default schema for registered users', '7c0c3bff8e743a406726e57517f9dc17f8b8a40b', 'mrse_default');
/*!40000 ALTER TABLE `callsign_schemas` ENABLE KEYS */;

-- Dump della struttura di tabella morsechat.sessions
CREATE TABLE IF NOT EXISTS `sessions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `session_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `data` blob DEFAULT NULL,
  `expiry` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `session_id` (`session_id`)
) ENGINE=InnoDB AUTO_INCREMENT=197 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dump dei dati della tabella morsechat.sessions: ~189 rows (circa)
/*!40000 ALTER TABLE `sessions` DISABLE KEYS */;
/*!40000 ALTER TABLE `sessions` ENABLE KEYS */;

-- Dump della struttura di tabella morsechat.users
CREATE TABLE IF NOT EXISTS `users` (
  `ID` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `email` varchar(255) NOT NULL,
  `callsign` varchar(20) NOT NULL,
  `username` varchar(20) NOT NULL,
  `password` varchar(97) NOT NULL,
  `registrationTimestamp` int(11) NOT NULL,
  `lastOnlineTimestamp` int(11) NOT NULL,
  PRIMARY KEY (`ID`) USING HASH,
  KEY `email` (`email`),
  KEY `callsign` (`callsign`)
) ENGINE=InnoDB AUTO_INCREMENT=94 DEFAULT CHARSET=utf8mb4;

-- Dump dei dati della tabella morsechat.users: ~12 rows (circa)
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` (`ID`, `email`, `callsign`, `username`, `password`, `registrationTimestamp`, `lastOnlineTimestamp`) VALUES
	(71, 'test@test.t', 'IT00HAL', 'robalb', '$argon2id$v=19$m=102400,t=2,p=8$9SY/qdKAO+ekjUFQ76/yjA$u5VmZ7X3nx3wCwmaXxQv7g', 1634152835, 1634152835);
/*!40000 ALTER TABLE `users` ENABLE KEYS */;

/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IF(@OLD_FOREIGN_KEY_CHECKS IS NULL, 1, @OLD_FOREIGN_KEY_CHECKS) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
