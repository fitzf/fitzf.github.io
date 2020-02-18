---
title: Java线上CPU占用过高问题排查思路
author: Zhang Fei
tags:
  - Java
categories:
  - Collection
abbrlink: 36f079e3
date: 2019-10-31 17:09:00
---
#### 一、根据 Java 进程 ID，用 `ps` 或 `top` 命令查询出 CPU 占用率高的线程

```shell
ps -mp <pid> -o THREAD,tid,time | sort -rn | more // (sort -rn 已数值的方式进行逆序排列)
// 或top -Hp <pid>
top - 08:31:16 up 30 min,  0 users,  load average: 0.75, 0.59, 0.35
Threads:  11 total,   1 running,  10 sleeping,   0 stopped,   0 zombie
%Cpu(s):  3.5 us,  0.6 sy,  0.0 ni, 95.9 id,  0.0 wa,  0.0 hi,  0.0 si,  0.0 st
KiB Mem:   2046460 total,  1924856 used,   121604 free,    14396 buffers
KiB Swap:  1048572 total,        0 used,  1048572 free.  1192532 cached Mem

  PID USER      PR  NI    VIRT    RES    SHR S %CPU %MEM     TIME+ COMMAND
   10 root      20   0 2557160 289824  15872 R 79.3 14.2   0:41.49 java
   11 root      20   0 2557160 289824  15872 S 13.2 14.2   0:06.78 java
```

#### 二、转换线程 ID 为 16 进制

```shell
printf "%x\n" <tid>
// printf "%x\n" 10
// a
```

#### 三、利用 JDK 提供的工具 `jstack` 打印导出线程信息

```shell
jstack <pid> | grep <16tid> -A 30 // 或导出 jstack <pid> >> jstack.txt 文件查看
```

#### 四、查看线程信息并处理

##### 4.1 如果是用户线程

![upload successful](/images/pasted-48.png)

查看相关代码并处理

**附 `jstack` 死锁日志**

![upload successful](/images/pasted-47.png)

##### 4.2 如果是 **Full GC** 次数过多

```shell
"main" #1 prio=5 os_prio=0 tid=0x00007f8718009800 nid=0xb runnable [0x00007f871fe41000]
   java.lang.Thread.State: RUNNABLE
	at com.aibaobei.chapter2.eg2.UserDemo.main(UserDemo.java:9)

"VM Thread" os_prio=0 tid=0x00007f871806e000 nid=0xa runnable
```

**nid=0xa** 为系统线程 ID
使用 JDK 提供的工具 `jstat` 查看 GC 情况

```shell
jstat -gcutil <pid> 1000 10
S0     S1     E      O      M     CCS    YGC     YGCT    FGC    FGCT     GCT
0.00   0.00   0.00  75.07  59.09  59.60   3259    0.919  6517    7.715    8.635
0.00   0.00   0.00   0.08  59.09  59.60   3306    0.930  6611    7.822    8.752
0.00   0.00   0.00   0.08  59.09  59.60   3351    0.943  6701    7.924    8.867
0.00   0.00   0.00   0.08  59.09  59.60   3397    0.955  6793    8.029    8.984
```

使用 JDK 提供的 `jmap` 工具导出内存日志到 Eclipse mat工具进行查看

```shell
// 简单查看存活对象的大小数目
jmap -histo:live <pid> | more
// dump 内存
jmap -dump:live,format=b,file=problem.bin <pid>
```

![upload successful](/images/pasted-49.png)

主要有以下两种原因：
1. 代码中一次获取了大量的对象，导致内存溢出
2. 内存占用不高，但是 Full GC 次数还是比较多，此时可能是显示的 `System.gc()` 调用导致 GC 次数过多，这可以通过添加 `-XX:+DisableExplicitGC` 来禁用JVM对显示GC的响应

#### 总结

通过 `ps` 或 `top` 命令找出 CPU 过高的线程，将其线程 ID 转换为十六进制，然后在 `jstack` 日志中查看该线程信息，分为以下两种情况：
1. 如果是正常的用户线程，则通过该线程的堆栈信息查看其具体是在哪处用户代码处运行比较消耗 CPU
2. 如果该线程是 **VM Thread** 则通过 `jstat -gcutil <pid> <period> <times>` 命令监控当前系统的 GC 状况，然后通过 `jmap dump:format=b,file=<filepath> <pid>` 导出系统当前的内存数据，导出之后将内存情况放到 eclipse 的 mat 工具中进行分析即可得出内存中主要是什么对象比较消耗内存，进而可以处理相关代码

> 参考链接:
> - https://blog.csdn.net/baiye_xing/article/details/90483169
> - https://my.oschina.net/zhangxufeng/blog/3017521
> - https://www.cnblogs.com/youxin/p/11229071.html
> - [JVM 故障分析及性能优化系列文章](https://www.javatang.com/archives/2017/10/19/33151873.html)