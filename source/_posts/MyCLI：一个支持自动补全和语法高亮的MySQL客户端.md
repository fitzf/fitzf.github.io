---
title: MyCLI：一个支持自动补全和语法高亮的MySQL客户端
tags:
  - Mysql
  - Shell
categories: Collection
abbrlink: 2f03f1fe
date: 2017-06-07 17:24:06
---
![upload successful](/images/pasted-19.png)
MyCLI 是一个易于使用的命令行客户端，可用于受欢迎的数据库管理系统 MySQL、MariaDB 和 Percona，支持自动补全和语法高亮。它是使用 prompt_toolkit 库写的，需要 Python 2.7、3.3、3.4、3.5 和 3.6 的支持。MyCLI 还支持通过 SSL 安全连接到 MySQL 服务器。

## MyCLI 的特性

- 当你第一次使用它的时候，将会自动创建一个文件 ~/.myclirc。
- 当输入 SQL 的关键词和数据库中的表、视图和列时，支持自动补全。
- 默认情况下也支持智能补全，能根据上下文的相关性提供补全建议。

比如：

```mysql
SELECT * FROM <Tab> - 这将显示出数据库中的表名。
SELECT * FROM users WHERE <Tab> - 这将简单的显示出列名称。
```

- 通过使用 Pygents 支持语法高亮
- 支持 SSL 连接
- 提供多行查询支持
- 它可以将每一个查询和输出记录到一个文件中（默认情况下禁用）。
- 允许保存收藏一个查询（使用 \fs 别名 保存一个查询，并可使用 \f 别名 运行它）。
- 支持 SQL 语句执行和表查询计时
- 以更吸引人的方式打印表格数据

## 如何在 Linux 上为 MySQL 和 MariaDB 安装 MyCLI

在 Debian/Ubuntu 发行版上，你可以很容易的像下面这样使用 apt 命令 来安装 MyCLI 包：

```sh
sudo apt-get update
sudo apt-get install mycli
```

同样，在 Fedora 22+ 上也有 MyCLI 的可用包，你可以像下面这样使用 dnf 命令 来安装它：

```sh
sudo dnf install mycli
```

对于其他 Linux 发行版，比如 RHEL/CentOS，你需要使用 Python 的 pip 工具来安装 MyCLI。首先，使用下面的命令来安装 pip：

```sh
$ sudo yum install pip
```

安装好 pip 以后，你可以像下面这样安装 MyCLI：

```sh
$ sudo pip install mycli
```

## 在 Linux 中如何使用 MyCLI 连接 MySQL 和 MariaDB

安装好 MyCLI 以后，你可以像下面这样使用它：

```sh
$ mycli -u root -h localhost
```

## 自动补全

对于关键词和 SQL 函数可以进行简单的自动补全：

![upload successful](/images/pasted-20.png)

## 智能补全

当输入 FROM 关键词以后会进行表名称的补全：

![upload successful](/images/pasted-21.png)

## 别名支持

当表的名称设置别名以后，也支持列名称的补全：

![upload successful](/images/pasted-22.png)

## 语法高亮

支持 MySQL 语法高亮：

![upload successful](/images/pasted-23.png)

## 格式化 SQL 的输出

MySQL 的输出会通过 less 命令[1] 进行格式化输出：

![upload successful](/images/pasted-24.png)

要登录 MySQL 并同时选择数据库，你可以使用和下面类似的命令：

```sh
$ mycli local_database
$ mycli -h localhost -u root app_db
$ mycli mysql://amjith@localhost:3306/django_poll
```

更多使用选项，请输入：

```sh
$ mycli --help
```

> MyCLI 主页： [http://mycli.net/index](http://mycli.net/index)