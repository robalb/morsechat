-- --------------------------------------------------------
-- Host:                         127.0.0.1
-- Versione server:              10.4.11-MariaDB - mariadb.org binary distribution
-- S.O. server:                  Win64
-- HeidiSQL Versione:            11.2.0.6213
-- --------------------------------------------------------

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8 */;
/*!50503 SET NAMES utf8mb4 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;



CREATE DATABASE IF NOT EXISTS `morsechat` /*!40100 DEFAULT CHARACTER SET utf8mb4 */;
USE `morsechat`;

CREATE TABLE IF NOT EXISTS `special_callsigns` (
  `callID` int(11) unsigned NOT NULL,
  `callsign` varchar(20) NOT NULL,
  `description` varchar(4096) NOT NULL,
  PRIMARY KEY (`callID`) USING HASH
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `users` (
  `ID` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `email` varchar(255) NOT NULL,
  `callsign` varchar(20) NOT NULL,
  `password` varchar(97) NOT NULL, 
  `registrationTimestamp` int(11) NOT NULL,
  `lastOnlineTimestamp` int(11) NOT NULL,
  PRIMARY KEY (`id`) USING HASH,
  KEY `email` (`email`),
  KEY `callsign` (`callsign`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `special_callsigns` VALUES (
  '0',
  'hello_world',
  'a short description'
);
