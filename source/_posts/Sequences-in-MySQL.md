---
title: Sequences in MySQL
date: 2017-03-24 13:00:42
tags: Mysql
categories: Essay
---

Sequences in MySQL
January 26, 2006 by ronald

One piece of SQL functionality that doesn’t appear to have any consistency or an ANSI SQL Standard is the management of system generated sequential numbers, used for example in suggorate keys.

MySQL uses AUTO_INCREMENT which serves the purposes adequately, however in my documenting of differences with Oracle in my upcoming MySQL Conference presentation “MySQL for Oracle Developers” there a number of key differences with Oracle’s SEQUENCE usage.

MySQL AUTO_INCREMENT to Oracle SEQUENCE Differences

AUTO_INCREMENT is limited to one column per table
AUTO_INCREMENT must be assigned to a specific table.column (not allowing multi table use)
AUTO_INCREMENT is INSERTed as a not specified column, or a value of NULL
The MaxDB Reserved Words list includes SEQUENCE for the CREATE SEQUENCE however I’ve never used MaxDB. Other popular open source products such as PostgreSQL and Ingres use sequences. Refer to the references section for more details.

Usage

The following provides an example sytax usage within MySQL and Oracle.

MySQL


 CREATE TABLE Movie(
id           INT NOT NULL AUTO_INCREMENT,
name     VARCHAR(60) NOT NULL,
released YEAR NOT NULL,
PRIMARY KEY (id)
) ENGINE=InnoDB;


INSERT INTO Movie (name,released) VALUES ('Gladiator',2000);
INSERT INTO Movie (id,name,released) VALUES (NULL,'The Bourne Identity',1998);

Oracle


 CREATE TABLE Movie(
id          INT NOT NULL,
name     VARCHAR2(60) NOT NULL,
released INT NOT NULL,
PRIMARY KEY (id)
);
CREATE SEQUENCE MovieSeq;


INSERT INTO Movie (id,name,released) VALUES (MovieSeq.NEXTVAL,'Gladiator',2000);

You can within Oracle use a Before Insert trigger to simulate handling of the MySQL Insert syntax. Note: Within Oracle you will require a SEQUENCE per table and a TRIGGER per table. Oracle supports multiple triggers of the same type per table (not sure if MySQL supports this).


 CREATE OR REPLACE TRIGGER BRI_MOVIE_TRG
BEFORE INSERT ON Movie
FOR EACH ROW
BEGIN
  SELECT MovieSeq.NEXTVAL INTO :new.id FROM DUAL;
END BRI_MOVIE_TRG;
.
RUN;


INSERT INTO Movie (name,released) VALUES ('The Lion King',1994);

Oracle’s syntax uses the sequence name with .NEXTVAL or .CURVAL.

Future Directions

I would like to see a SEQUENCE implementation with MySQL (whether official or unofficial). I’m sure some enterprising person in the community already has one. Database abstraction layer systems would also most likely have implementations. I liked the PostgreSQL Syntax for ease of use with the following commands.

NEXTVAL(‘sequence’);
CURRVAL(‘sequence’);
SETVAL(‘sequence’,value);
Wanting something and doing something about it are two different things, so here is what I wiped together to demonstrate a possible implementation. It needs a lot more work in appropiate error handling. transaction management, testing and performance analysis, however it shows the options of one possible implementation.

currval


 DROP TABLE IF EXISTS sequence;
CREATE TABLE sequence (
name              VARCHAR(50) NOT NULL,
current_value INT NOT NULL,
increment       INT NOT NULL DEFAULT 1,
PRIMARY KEY (name)
) ENGINE=InnoDB;
INSERT INTO sequence VALUES ('MovieSeq',3,5);
DROP FUNCTION IF EXISTS currval;
DELIMITER $
CREATE FUNCTION currval (seq_name VARCHAR(50))
RETURNS INTEGER
CONTAINS SQL
BEGIN
  DECLARE value INTEGER;
  SET value = 0;
  SELECT current_value INTO value
  FROM sequence
  WHERE name = seq_name;
  RETURN value;
END$
DELIMITER ;

Some Testing:

 mysql> SELECT currval('MovieSeq');
+---------------------+
| currval('MovieSeq') |
+---------------------+
|                   3 |
+---------------------+
1 row in set (0.00 sec)
mysql> SELECT currval('x');
+--------------+
| currval('x') |
+--------------+
|            0 |
+--------------+
1 row in set, 1 warning (0.00 sec)
mysql> show warnings;
+---------+------+------------------+
| Level   | Code | Message          |
+---------+------+------------------+
| Warning | 1329 | No data to FETCH |
+---------+------+------------------+
1 row in set (0.00 sec)

What was interesting was I originally used a cursor, as below, but the results for passing an invalid argument (basic boundary testing), returned a SQL error while the above implementation returned a more manageable warning.


  DECLARE c CURSOR FOR
    SELECT current_value FROM sequence
    WHERE name = seq_name;
  OPEN c;
  FETCH c INTO value;


mysql> select currval('x');
ERROR 1329 (02000): No data to FETCH

Indeed the Apache Object Relational Bridge Sequence Manager section shows a very cool syntax for MSSQL.

UPDATE TABLE SET @MAX_KEY = MAX_KEY = MAX_KEY + 1

UPDATE table SET var = column = value which effectively allows you to eliminated the need for a seperate UPDATE and SELECT for this type of operation.

nextval


 DROP FUNCTION IF EXISTS nextval;
DELIMITER $
CREATE FUNCTION nextval (seq_name VARCHAR(50))
RETURNS INTEGER
CONTAINS SQL
BEGIN
   UPDATE sequence
   SET          current_value = current_value + increment
   WHERE name = seq_name;
   RETURN currval(seq_name);
END$
DELIMITER ;


 mysql> select nextval('MovieSeq');
+---------------------+
| nextval('MovieSeq') |
+---------------------+
|                  15 |
+---------------------+
1 row in set (0.09 sec)

mysql> select nextval('MovieSeq');
+---------------------+
| nextval('MovieSeq') |
+---------------------+
|                  20 |
+---------------------+
1 row in set (0.01 sec)

mysql> select nextval('MovieSeq');
+---------------------+
| nextval('MovieSeq') |
+---------------------+
|                  25 |
+---------------------+
1 row in set (0.00 sec)

setval


 DROP FUNCTION IF EXISTS setval;
DELIMITER $
CREATE FUNCTION setval (seq_name VARCHAR(50), value INTEGER)
RETURNS INTEGER
CONTAINS SQL
BEGIN
   UPDATE sequence
   SET          current_value = value
   WHERE name = seq_name;
   RETURN currval(seq_name);
END$
DELIMITER ;


 mysql> select setval('MovieSeq',150);
+------------------------+
| setval('MovieSeq',150) |
+------------------------+
|                    150 |
+------------------------+
1 row in set (0.06 sec)

mysql> select curval('MovieSeq');
+---------------------+
| currval('MovieSeq') |
+---------------------+
|                 150 |
+---------------------+
1 row in set (0.00 sec)

mysql> select nextval('MovieSeq');
+---------------------+
| nextval('MovieSeq') |
+---------------------+
|                 155 |
+---------------------+
1 row in set (0.00 sec)


