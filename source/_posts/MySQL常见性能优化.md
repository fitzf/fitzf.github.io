---
title: MySQL常见性能优化
date: 2017-04-11 22:03:36
tags: Mysql
categories: Essay
---
# 优化Group By语句

默认情况下，MySQL 排序所有GROUP BY col1，col2，....。查询的方法如同在查询中指定ORDER BY col1，col2，...。如果显式包括一个包含相同的列的ORDER BY子句，MySQL 可以毫不减速地对它进行优化，尽管仍然进行排序。如果查询包括GROUP BY 但你想要避免排序结果的消耗，你可以指定ORDER BY NULL禁止排序。

# 优化Order by语句

在某些情况中，MySQL 可以使用一个索引来满足ORDER BY 子句，而不需要额外的排序。where 条件和order by 使用相同的索引，并且order by 的顺序和索引顺序相同，并且order by 的字段都是升序或者都是降序。

# 优化insert语句

如果你同时从同一客户插入很多行，使用多个值表的INSERT 语句。这比使用分开 INSERT 语句快(在一些情况中几倍)。

```sql
mysql> insert into test values(1,2),(1,3),(1,4)…
```

如果你从不同客户插入很多行，能通过使用INSERT DELAYED 语句得到更高的速度。Delayed 的含义是让insert 语句马上执行，其实数据都被放在内存的队列中，并没有真正的写入磁盘；这比每条语句都分别插入要快的多；LOW_PRIORITY刚好相反，在所有其他用户对表的读写完成后才进行插入。
将索引文件和数据文件分在不同的磁盘上存放（利用建表中的选项）；
如果进行批量插入，可以增加bulk_insert_buffer_size 变量值的方法来提高速度，但是，这只能对myisam表使用
当从一个文本文件装载一个表时，使用LOAD DATA INFILE。这通常比使用很多INSERT语句快20倍；
根据应用情况使用replace 语句代替insert；
根据应用情况使用ignore 关键字忽略重复记录。

# 大批量插入数据

1. 对于Myisam 类型的表，可以通过以下方式快速的导入大量的数据。
ALTER TABLE tblname DISABLE KEYS;
这两个命令用来打开或者关闭Myisam 表非唯一索引的更新。在导入大量的数据到一个非空的Myisam 表时，通过设置这两个命令，可以提高导入的效率。对于导入大量数据到一个空的Myisam 表，默认就是先导入数据然后才创建索引的，所以不用进行设置。
2. 而对于Innodb 类型的表，这种方式并不能提高导入数据的效率。对于Innodb 类型的表，我们有以下几种方式可以提高导入的效率：
a. 因为Innodb 类型的表是按照主键的顺序保存的，所以将导入的数据按照主键的顺序排列，可以有效的提高导入数据的效率。如果Innodb 表没有主键，那么系统会默认创建一个内部列作为主键，所以如果可以给表创建一个主键，将可以利用这个优势提高导入数据的效率。
b. 在导入数据前执行SET UNIQUE_CHECKS=0，关闭唯一性校验，在导入结束后执行SETUNIQUE_CHECKS=1，恢复唯一性校验，可以提高导入的效率。
c. 如果应用使用自动提交的方式，建议在导入前执行SET AUTOCOMMIT=0，关闭自动提交，导入结束后再执行SET AUTOCOMMIT=1，打开自动提交，也可以提高导入的效率。

# 查询的优化

读为主可以设置low_priority_updates=1，写的优先级调低，告诉MYSQL尽量先处理读求
为查询缓存优化你的查询
大多数的MySQL服务器都开启了查询缓存。这是提高性最有效的方法之一，而且这是被MySQL的数据库引擎处理的。当有很多相同的查询被执行了多次的时候，这些查询结果会被放到一个缓存中，这样，后续的相同的查询就不用操作表而直接访问缓存结果了。
这里最主要的问题是，对于程序员来说，这个事情是很容易被忽略的。因为，我们某些查询语句会让MySQL不使用缓存。请看下面的示例：
// 查询缓存不开启

# 拆分大的 DELETE 或 INSERT 语句

如果你需要在一个在线的网站上去执行一个大的 DELETE 或 INSERT 查询，你需要非常小心，要避免你的操作让你的整个网站停止相应。因为这两个操作是会锁表的，表一锁住了，别的操作都进不来了。
Apache 会有很多的子进程或线程。所以，其工作起来相当有效率，而我们的服务器也不希望有太多的子进程，线程和数据库链接，这是极大的占服务器资源的事情，尤其是内存。
如果你把你的表锁上一段时间，比如30秒钟，那么对于一个有很高访问量的站点来说，这30秒所积累的访问进程/线程，数据库链接，打开的文件数，可能不仅仅会让你泊WEB服务Crash，还可能会让你的整台服务器马上掛了。
所以，如果你有一个大的处理，你定你一定把其拆分，使用 LIMIT 条件是一个好的方法。

# where语句的优化

1. 尽量避免在 where 子句中对字段进行表达式操作

```sql
select id from uinfo_jifen where jifen/60 > 10000;
```

优化后:

```sql
Select id from uinfo_jifen where jifen>600000;
```

2. 应尽量避免在where子句中对字段进行函数操作，这将导致mysql放弃使用索引

```sql
select uid from imid where datediff(create_time,'2011-11-22')=0
```

优化后:

```sql
select uid from imid where create_time> ='2011-11-21‘ and create_time<‘2011-11-23’;
```

# 索引的优化

MySQL只有对以下操作符才使用索引：<，<=，=，>，>=，BETWEEN，IN，以及某些时候的LIKE。
尽量不要写!=或者<>的sql，用between或> and <代替，否则可能用不到索引
Order by 、Group by 、Distinct 最好在需要这个列上建立索引，利于索引排序
尽量利用mysql索引排序
没办法的情况下，使用强制索引Force index(index_name)
尽量避勉innodb用非常大尺寸的字段作为主键
较频繁的作为查询条件的字段应该创建索引;
选择性高的字段比较适合创建索引;
作为表关联字段一般都需要创索引.
更新非常频繁的字段不适合创建索引;
不会出现在 WHERE 子句中的字段不该创建索引.
选择性太低的字段不适合单独创建索引

# 尽量不要用子查询

```sql
mysql> explain select uid_,count(*) from smember_6 where uid_ in (select uid_ from alluid) group by uid_;
--| id | select_type | table | type | possible_keys | key | key_len | ref | rows | Extra |+----+--------------------+-----------+-------+---------------+---------+---------+------+----------+--------------------------+| 1 | PRIMARY | smember_6 | index | NULL | PRIMARY | 8 | NULL | 53431264 | Using where; Using index | | 2 | DEPENDENT SUBQUERY | alluid | ALL | NULL | NULL | NULL | NULL | 2448 | Using where |
```

优化后:

```sql
mysql> explain select a.uid_,count(*) from smember_6 a,alluid b where a.uid_=b.uid_ group by uid_;
--| id | select_type | table | type | possible_keys | key | key_len | ref | rows | Extra |+----+-------------+-------+------+---------------+---------+---------+------------+------+---------------------------------+| 1 | SIMPLE | b | ALL | NULL | NULL | NULL | NULL | 2671 | Using temporary; Using filesort | | 1 | SIMPLE | a | ref | PRIMARY | PRIMARY | 4 | ssc.b.uid_ | 1 | Using index
```

# Join的优化

如果你的应用程序有很多 JOIN 查询，你应该确认两个表中Join的字段是被建过索引的。这样，MySQL内部会启动为你优化Join的SQL语句的机制。
而且，这些被用来Join的字段，应该是相同的类型的。例如：如果你要把 DECIMAL 字段和一个 INT 字段Join在一起，MySQL就无法使用它们的索引。对于那些STRING类型，还需要有相同的字符集才行。（两个表的字符集有可能不一样）

# 表的优化

## 尽可能的使用 NOT NULL

除非你有一个很特别的原因去使用 NULL 值，你应该总是让你的字段保持 NOT NULL。
不要以为 NULL 不需要空间，其需要额外的空间，并且，在你进行比较的时候，你的程序会更复杂。
当然，这里并不是说你就不能使用NULL了，现实情况是很复杂的，依然会有些情况下，你需要使用NULL值。
下面摘自MySQL自己的文档：
“NULL columns require additional space in the row to record whether their values are NULL. For MyISAM tables, each NULL column takes one bit extra, rounded up to the nearest byte.”

## 固定长度的表会更快

如果表中的所有字段都是“固定长度”的，整个表会被认为是 “static” 或 “fixed-length”。 例如，表中没有如下类型的字段： VARCHAR，TEXT，BLOB。只要你包括了其中一个这些字段，那么这个表就不是“固定长度静态表”了，这样，MySQL 引擎会用另一种方法来处理。
固定长度的表会提高性能，因为MySQL搜寻得会更快一些，因为这些固定的长度是很容易计算下一个数据的偏移量的，所以读取的自然也会很快。而如果字段不是定长的，那么，每一次要找下一条的话，需要程序找到主键。
并且，固定长度的表也更容易被缓存和重建。不过，唯一的副作用是，固定长度的字段会浪费一些空间，因为定长的字段无论你用不用，他都是要分配那么多的空间。

## 垂直分割
"垂直分割"是一种把数据库中的表按列变成几张表的方法，这样可以降低表的复杂度和字段的数目，从而达到优化的目的。（以前，在银行做过项目，见过一张表有100多个字段，很恐怖）
示例一：在Users表中有一个字段是家庭地址，这个字段是可选字段，相比起，而且你在数据库操作的时候除了个人信息外，你并不需要经常读取或是改写这个字段。那么，为什么不把他放到另外一张表中呢？ 这样会让你的表有更好的性能，大家想想是不是，大量的时候，我对于用户表来说，只有用户ID，用户名，口令，用户角色等会被经常使用。小一点的表总是会有好的性能。
示例二： 你有一个叫 “last_login” 的字段，它会在每次用户登录时被更新。但是，每次更新时会导致该表的查询缓存被清空。所以，你可以把这个字段放到另一个表中，这样就不会影响你对用户ID，用户名，用户角色的不停地读取了，因为查询缓存会帮你增加很多性能。
另外，你需要注意的是，这些被分出去的字段所形成的表，你不会经常性地去Join他们，不然的话，这样的性能会比不分割时还要差，而且，会是极数级的下降。

## 越小的列会越快

对于大多数的数据库引擎来说，硬盘操作可能是最重大的瓶颈。所以，把你的数据变得紧凑会对这种情况非常有帮助，因为这减少了对硬盘的访问。
参看 MySQL 的文档 Storage Requirements 查看所有的数据类型。
如果一个表只会有几列罢了（比如说字典表，配置表），那么，我们就没有理由使用 INT 来做主键，使用 MEDIUMINT, SMALLINT 或是更小的 TINYINT 会更经济一些。如果你不需要记录时间，使用 DATE 要比 DATETIME 好得多。
当然，你也需要留够足够的扩展空间，不然，你日后来干这个事，你会死的很难看，参看Slashdot的例子（2009年11月06日），一个简单的ALTER TABLE语句花了3个多小时，因为里面有一千六百万条数据。
