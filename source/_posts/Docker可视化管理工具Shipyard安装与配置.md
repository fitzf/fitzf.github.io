---
title: Docker可视化管理工具Shipyard安装与配置
date: 2017-04-11 19:10:20
tags: Docker
categories: Collection
---
> **文章来源： [Shipyard Automated Deployment](https://shipyard-project.com/docs/deploy/automated/)**

---

# Shipyard简介

Shipyard是一个集成管理docker容器、镜像、Registries的系统，它具有以下特点：

* 支持多节点的集成管理
* 可动态加载节点
* 可托管node下的容器

# 环境准备

## 下载镜像

```
$ docker pull rethinkdb
$ docker pull microbox/etcd
$ docker pull shipyard/docker-proxy
$ docker pull swarm 
$ docker pull shipyard/shipyard
```

## 自动安装

注意：这将会暴露Docker Engine的管理端口2375。如果此节点在安全网络外部可以访问，建议使用TLS。

### 下载自动部署Shell脚本

```
$ curl -sSL https://shipyard-project.com/deploy | bash -s
```

自动部署脚本中， 包括以下参数：
* ACTION： 表示可以使用的指令，它包括以下选项。
* deploy， 默认值， 表示自动安装部署Shipyard管理工具及相关应用
* upgrade，更新已存在的实例（注意：你要保持相同的系统环境、变量来部署同样的配置）
* node， 部署Swarm的一个新节点
* remove， 已存在的shipyard实例
* DISCOVERY: 集群系统采用Swarm进行采集和管理(在节点管理中可以使用‘node’)
* IMAGE: 镜像，默认使用shipyard的镜像
* PREFIX: 容器名字的前缀
* SHIPYARD_ARGS: 容器的常用参数
* TLS_CERT_PATH: TLS证书路径
* PORT: 主程序监听端口 (默认端口: 8080)
* PROXY_PORT: 代理端口 (默认: 2375)

### 使用镜像

Shipyard允许您采取指定的镜像来部署实例，比如以下的测试版本，你也已这样做：

```
$ curl -sSL https://shipyard-project.com/deploy | IMAGE=shipyard/shipyard:test bash -s
```

### 使用前缀

你可以在部署Shipyard管理工具时，自定义你想要的前缀，比如

```
$ curl -sSL https://shipyard-project.com/deploy | PREFIX=shipyard-test bash -s
```

### 使用运行参数

这里增加一些shipyard运行参数，你可以像这样进行调整：

```
$ curl -sSL https://shipyard-project.com/deploy | SHIPYARD_ARGS="--ldap-server=ldap.example.com --ldap-autocreate-users" bash -s
```

### 使用安全认证(TLS证书)

启用安全加密通讯协议（TLS）对Shipyard进行部署，包括代理（docker-proxy）、swarm集群、shipyard管理平台的配置，这是一个配置规范。证书必须采用以下命名规范：

* ca.pem: 安全认证证书
* server.pem: 服务器证书
* server-key.pem: 服务器私有证书
* cert.pem: 客户端证书
* key.pem: 客户端证书的key

注意：证书将被放置在一个单独的安全认证docker容器中，并在各个组成部分之间共享。如果需要调试，可以将此容器连接到调试容器。数据容器名称为$PREFIX-certs。

```
$ docker run --rm \ 
   -v $(pwd)/certs:/certs \ 
   ehazlett/certm \ -d /certs \ 
   bundle \ 
   generate \
   -o shipyard \ 
   --host proxy \ 
   --host 127.0.0.1
```

你也可以在部署时，指定TLS_CERT_PATH参数：

```
$ curl -sSL https://shipyard-project.com/deploy | TLS_CERT_PATH=$(pwd)/certs bash -s
```

### 增加Swarm节点

Shipyard管理的Swarm节点部署脚本将自动的安装key/value存储系统（etcd系统），用于进行服务发现， 相关的工具还有Consul、Zookeeper。增加一个节点到swarm集群，你可以通过以下的节点部署脚本：

```
$ curl -sSL https://shipyard-project.com/deploy | ACTION=node DISCOVERY=etcd://10.0.1.10:4001 bash -s
```

注意：10.0.1.10该ip地址为部署Ectd系统所在主机的IP地址，你需要根据你的部署位置进行修改。

### 删除Shipyard管理工具

如果你要删除Shipyard部署的容器，你可以使用以下脚本进行删除。

```
$ curl -sSL https://shipyard-project.com/deploy | ACTION=remove bash -s
```

## 手动安装

### 数据存储

Shipyard使用RethinkDB做为数据存储工具， 我们需要先运行RethinkDB容器。

```
$ docker run \ 
    -ti \ 
    -d \ 
    --restart=always \ 
    --name shipyard-rethinkdb \ 
    rethinkdb
```

### 服务发现

为了启用Swarm leader选择，我们必须使用来自Swarm容器的外部键值存储。此处，我们使用Etcd作为服务发现工具。可以选用的服务发现工具还有Consul、Zookeeper等。

```
$ docker run \ 
     -ti \ 
     -d \ 
     -p 4001:4001 \ 
     -p 7001:7001 \ 
     --restart=always \ 
     --name shipyard-discovery \ 
     microbox/etcd:latest \
     -name discovery
```

### Docker代理服务

默认情况下，Docker引擎只侦听套接字。 我们可以重新配置引擎以使用TLS，或者您可以使用代理容器。 这是一个非常轻量级的容器，它只是将请求从TCP转发到Docker监听的Unix套接字。

```
$ docker run \ 
   -ti \ 
   -d \ 
   -p 2375:2375 \ 
   --hostname=$HOSTNAME \ 
   --restart=always \ 
   --name shipyard-proxy \ 
    -v /var/run/docker.sock:/var/run/docker.sock \ 
    -e PORT=2375 \ 
   shipyard/docker-proxy:latest
```

### Swarm管理节点

```
$ docker run \ 
   -ti \ 
   -d \ 
   --restart=always \ 
   --name shipyard-swarm-manager \ 
   swarm:latest \ 
   manage --host tcp://0.0.0.0:3375 etcd://<IP-OF-HOST>:4001
```

### Swarm Agent节点

```
$ docker run \ 
   -ti \ 
   -d \ 
   --restart=always \ 
   --name shipyard-swarm-agent \ 
   swarm:latest \ 
   join --addr <ip-of-host>:2375 etcd://<ip-of-host>:4001
```

### Shipyard管理工具

```
$ docker run \ 
   -ti \ 
   -d \ 
   --restart=always \ 
   --name shipyard-controller \ 
   --link shipyard-rethinkdb:rethinkdb \ 
   --link shipyard-swarm-manager:swarm \ 
   -p 8080:8080 \ 
   shipyard/shipyard:latest \ 
   server \ 
   -d tcp://swarm:3375
```