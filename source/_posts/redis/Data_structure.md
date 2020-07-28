---
title: Redis数据结构
tags:
  - Redis
  - Data structure
categories:
  - Redis
abbrlink: 85682d75
date: 2020-04-28 10:44:01
---

## Redis数据类型简介

> [Introduction to Redis data types](https://redis.io/topics/data-types-intro)

### Redis支持的所有数据结构列表

- [String](https://redis.io/topics/data-types-intro#redis-strings): 字符串；
- [List](https://redis.io/topics/data-types-intro#redis-lists): 根据插入顺序排序的字符串元素集合，基本上是一个双向链表；
- [Set](https://redis.io/topics/data-types-intro#redis-sets): 不重复且无序的字符串元素的集合；
- [SortedSet](https://redis.io/topics/data-types-intro#redis-sorted-sets): 排序集，类似于`Set`，但每个字符串元素都与一个浮点数（称为`score`）相关联，元素总是按`score`排序，因此与`Set`不同，可以检索一系列元素（例如，您可能会问：给我前10个，或后10个）；
- [Hash](https://redis.io/topics/data-types-intro#redis-hashes): 是由与值关联的字段组成的映射，key 和 value 都是字符串；
- [Bitmap(Bit array)](https://redis.io/topics/data-types-intro#bitmaps): 通过特殊的命令，你可以将 String 值当作一系列 bits 处理：可以设置和清除单独的 bits，数出所有设为 1 的 bits 的数量，找到最前的被设为 1 或 0 的 bit，等等
- [HyperLogLog](https://redis.io/topics/data-types-intro#hyperloglogs): 用于估计`Set`中元素数量的的的概率数据结构;
- [Stream (Redis 5.0+)](https://redis.io/topics/streams-intro): 一种更抽象的日志数据类型：就像一个日志文件一样，总是以仅追加的方式操作，Redis的stream就是一种append only的数据类型。

**Redis key 的大小最大为 512MB**

### String

值最大的容量为 512MB.

```redis-cli
> 127.0.0.1@6379 connected!
> set key value
OK
> get key
value
> set key value2 nx // 当 key 不存在时才会成功，可以利用此特性来实现分布式锁
null
> get key
value
```

### List

Redis中List是通过链表来实现的

```redis-cli
> 127.0.0.1@6379 connected!
> rpush list A // 在链表尾部（右侧）插入
1
> rpush list B
2
> lpush list C // 在链表头部（左侧）插入
3
> lrange list 0 -1 // 根据索引获取元素 负数表示从尾部开始计算 e.g. -1 表示列表的最后一个元素
C
A
B
> rpush list D E F G // rpush, lpush 都支持在单个调用中插入多个元素
7
> lrange list 0 -1
C
A
B
D
E
F
G
> rpop list // 从尾部（右侧）取出数据
G
> lpop list // 从头部（左侧）取出数据
C
> lrange list 0 -1
A
B
D
E
F
```

### Set

Redis Set 是不重复且无序的字符串集合

### SortedSet

### Hash

### Bitmap

### HyperLogLog

### Stream

### 其他值得注意的特性

- Pub/Sub