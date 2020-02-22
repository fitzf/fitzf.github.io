---
title: 基于Docker结合Canal实现MySQL实时增量数据传输
tags:
  - Java
  - ElasticSearch
  - Canal
  - MySQL
  - Docker
categories:
 - 未分类
abbrlink: 5844eaeb
date: 2017-04-08 17:50:29
---
## Canal的介绍

### Canal的历史由来

在早期的时候，阿里巴巴公司因为杭州和美国两个地方的机房都部署了数据库实例，但因为跨机房同步数据的业务需求 ，便孕育而生出了Canal，主要是基于`trigger(触发器)`的方式获取增量变更。从 2010 年开始，阿里巴巴公司开始逐步尝试数据库日志解析，获取增量变更的数据进行同步，由此衍生出了增量订阅和消费业务。
当前的 Canal 支持的数据源端MySQL版本包括（ 5.1.x , 5.5.x , 5.6.x , 5.7.x , 8.0.x）

### Canal的应用场景

目前普遍基于日志增量订阅和消费的业务，主要包括

- 基于数据库增量日志解析，提供增量数据订阅和消费
- 数据库镜像
- 数据库实时备份
- 索引构建和实时维护(拆分异构索引、倒排索引等)
- 业务 Cache 刷新
- 带业务逻辑的增量数据处理

## Canal的工作原理

在介绍Canal的原理之前，我们先来了解下MySQL主从复制的原理
**MySQL主从复制原理**

![](https://cdn.nlark.com/yuque/0/2020/png/86832/1582364591843-89170014-2eb2-4270-85c1-075741fc23b8.png)

- MySQL master 将数据变更的操作写入二进制日志`binary log`中， 其中记录的内容叫做二进制日志事件`binary log events`，可以通过`show binlog events`命令进行查看
- MySQL slave 会将 master 的`binary log`中的`binary log events` 拷贝到它的中继日志`relay log`
- MySQL slave 重读并执行`relay log` 中的事件，将数据变更映射到它自己的数据库表中

了解了MySQL的工作原理，我们可以大致猜想到Canal应该也是采用类似的逻辑去实现增量数据订阅的功能，那么接下来我们看看实际上Canal的工作原理是怎样的？
**Canal工作原理**

![](https://cdn.nlark.com/yuque/0/2020/png/86832/1582364591800-b2014c16-bfd0-4b41-9e0d-7ed73d3f3c20.png)

- Canal 模拟 MySQL slave 的交互协议，伪装自己为 MySQL slave ，向MySQL master 发送dump 协议
- MySQL master 收到 dump 请求，开始推送 `binary log` 给 slave (也就是 Canal )
- Canal 解析 `binary log` 对象(数据为`byte`流)

基于这样的原理与方式，便可以完成数据库增量日志的获取解析，提供增量数据订阅和消费，实现MySQL实时增量数据传输的功能。
既然Canal是这样的一个框架，又是纯Java语言编写而成，那么我们接下来就开始学习怎么使用它并把它用到我们的实际工作中。

## Canal的Docker环境准备

因为目前容器化技术的火热，本文通过使用Docker来快速搭建开发环境，而传统方式的环境搭建，在我们学会了Docker容器环境搭建后，也能自行依葫芦画瓢搭建成功。由于本篇主要讲解Canal，所以关于Docker的内容不会涉及太多，主要会介绍Docker的基本概念和命令使用。

### 什么是Docker

相信绝大多数人都使用过虚拟机VMware，在使用VMware进行环境搭建的时候，只需提供了一个普通的系统镜像并成功安装，剩下的软件环境与应用配置还是如我们在本机操作一样在虚拟机里也操作一遍，而且VMware占用宿主机的资源较多，容易造成宿主机卡顿，而且系统镜像本身也占用过多空间。
为了便于大家快速理解Docker，便与VMware做对比来做介绍，Docker 提供了一个开始，打包，运行APP的平台，把 APP （应用）和底层 Infrastructure（基础设施）隔离开来。Docker中最主要的两个概念就是镜像（类似VMware的系统镜像）与容器（类似VMware里安装的系统）
**什么是Image（镜像）**

- 文件和meta data的集合（root filesystem）
- 分层的，并且每一层都可以添加改变删除文件，成为一个新的Image
- 不同的Image可以共享相同的layer
- Image本身是read-only的

![](https://cdn.nlark.com/yuque/0/2020/png/86832/1582364591764-15ff0db7-bd82-4300-b378-5aa084fd5065.png#)

**什么是Container（容器）**

- 通过Image创建（copy）
- 在Image layer 之上建立一个container layer（可读写）
- 类比面向对象：类和实例
- Image负责app的存储和分发，Container负责运行app

![](https://cdn.nlark.com/yuque/0/2020/png/86832/1582364591737-e53508c6-4cbd-4be0-92c9-334598053d12.png)

### Docker的网络介绍

Docker的网络类型有三种：
**bridge：桥接网络**

```text
默认情况下启动的Docker容器，都是使用 bridge，Docker安装时创建的桥接网络，
每次Docker容器重启时，会按照顺序获取对应的IP地址，
这个就导致重启下，Docker的IP地址就变了
```

**none：无指定网络**

```text
使用 --network=none ，docker 容器就不会分配局域网的IP
```

**host：主机网络**

```text
使用 --network=host，此时，Docker 容器的网络会附属在主机上，两者是互通的。
例如，在容器中运行一个Web服务，监听8080端口，则主机的8080端口就会自动映射到容器中。
```

**创建自定义网络：（设置固定IP）**

```bash
docker network create --subnet=172.18.0.0/16 mynetwork
```

查看存在的网络类型`docker network ls`

![](https://cdn.nlark.com/yuque/0/2020/png/86832/1582364591841-df828f22-76f3-4c36-bb95-16dfd9a7d1a2.png)

### 搭建Canal环境

附上Docker的下载安装地址==> [Docker Download](https://www.docker.com/products/docker-desktop)
下载Canal镜像`docker pull canal/canal-server`

![](https://cdn.nlark.com/yuque/0/2020/png/86832/1582364591786-1e5d236d-7195-461e-8914-f50c2580bc2a.png)

下载MySQL镜像`docker pull mysql`，下载过的则如下图

![](https://cdn.nlark.com/yuque/0/2020/png/86832/1582364591808-7cd9c1ec-a8d6-424a-ba1c-336f6926fae7.png)

查看已经下载好的镜像`docker images`

![](https://cdn.nlark.com/yuque/0/2020/png/86832/1582364591727-d165c471-40db-44ed-94f1-24b57eb6e199.png)

接下来通过镜像生成MySQL容器与canal-server容器

```bash
##生成mysql容器
docker run -d --name mysql --net mynetwork --ip 172.18.0.6 -p 3306:3306 -e MYSQL_ROOT_PASSWORD=root mysql
##生成canal-server容器
docker run -d --name canal-server --net mynetwork --ip 172.18.0.4 -p 11111:11111 canal/canal-server
## 命令介绍
--net mynetwork #使用自定义网络
--ip   #指定分配ip
```

查看docker中运行的容器`docker ps`

![](https://cdn.nlark.com/yuque/0/2020/png/86832/1582364591704-177ca19f-cdff-4b30-9622-69397d1958d2.png)

### MySQL的配置修改

以上只是初步准备好了基础的环境，但是怎么让Canal伪装成salve并正确获取MySQL中的binary log呢？
对于自建 MySQL , 需要先开启 Binlog 写入功能，配置 binlog-format 为 ROW 模式，通过修改mysql配置文件来开启bin_log，使用 `find / -name my.cnf` 查找my.cnf, 修改文件内容如下

```text
[mysqld]
log-bin=mysql-bin # 开启 binlog
binlog-format=ROW # 选择 ROW 模式
server_id=1 # 配置 MySQL replaction 需要定义，不要和 canal 的 slaveId 重复
```

进入mysql容器`docker exec -it mysql bash`
创建链接MySQL的账号`canal`并授予作为 MySQL slave 的权限, 如果已有账户可直接 GRANT

```sql
mysql -uroot -proot
# 创建账号
CREATE USER canal IDENTIFIED BY 'canal';
# 授予权限
GRANT SELECT, REPLICATION SLAVE, REPLICATION CLIENT ON *.* TO 'canal'@'%';
-- GRANT ALL PRIVILEGES ON *.* TO 'canal'@'%' ;
# 刷新并应用
FLUSH PRIVILEGES;
```

数据库重启后, 简单测试 my.cnf 配置是否生效

![](https://cdn.nlark.com/yuque/0/2020/png/86832/1582364591772-099b4163-a60f-4a3f-95bc-c3775611a994.png)

```sql
show variables like 'log_bin';
show variables like 'log_bin';
show master status;
```

### Canal Server的配置修改

进入canal-server容器`docker exec -it canal-server bash`
编辑canal-server的配置`vi canal-server/conf/example/instance.properties`

![](https://cdn.nlark.com/yuque/0/2020/png/86832/1582364591753-9af08611-592d-49e8-ad3c-a25a37573bd2.png)

更多配置请参考==>[canal配置说明](https://github.com/alibaba/canal/wiki/AdminGuide)
重启canal-server容器`docker restart canal-server`
进入容器查看启动日志

```bash
docker exec -it canal-server bash
tail -100f canal-server/logs/example/example.log
```

![](https://cdn.nlark.com/yuque/0/2020/png/86832/1582364591703-3507e56a-fa73-495a-aa9c-d975c365f1ae.png)

至此，我们的环境工作准备完成！！！

## 拉取数据并同步保存到ElasticSearch

本文的ElasticSearch也是基于Docker环境搭建，所以读者可执行如下命令

```bash
# 下载对镜像
docker pull elasticsearch:7.1.1
docker pull mobz/elasticsearch-head:5-alpine
# 创建容器并运行
docker run -d --name elasticsearch --net mynetwork --ip 172.18.0.2 -p 9200:9200 -p 9300:9300 -e "discovery.type=single-node" elasticsearch:7.1.1
docker run -d --name elasticsearch-head --net mynetwork --ip 172.18.0.5 -p 9100:9100 mobz/elasticsearch-head:5-alpine
```

环境已经准备好了，现在就要开始我们的编码实战部分了，怎么通过应用程序去获取Canal解析后的binlog数据。首先我们基于Spring Boot搭建一个Canal Demo应用。结构如下图所示

![](https://cdn.nlark.com/yuque/0/2020/png/86832/1582364591749-ecdf57fd-800d-48cb-85a7-20f3640dbbbe.png)

**Student.java**

```java
package com.example.canal.study.pojo;

import java.io.Serializable;
import lombok.Data;

/**
 * 普通的实体domain对象
 *
 * @Data 用户生产getter、setter方法
 */
@Data
public class Student implements Serializable {

  private String id;
  private String name;
  private int age;
  private String sex;
  private String city;
}
```

**CanalConfig.java**

```java
package com.example.canal.study.common;

import com.alibaba.otter.canal.client.CanalConnector;
import com.alibaba.otter.canal.client.CanalConnectors;
import java.net.InetSocketAddress;
import org.apache.http.HttpHost;
import org.elasticsearch.client.RestClient;
import org.elasticsearch.client.RestHighLevelClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * 配置一些跟canal相关到配置与公共bean
 *
 * @author haha
 */
@Configuration
public class CanalConfig {

  // @Value 获取 application.properties配置中端内容
  @Value("${canal.server.ip}")
  private String canalIp;
  @Value("${canal.server.port}")
  private Integer canalPort;
  @Value("${canal.destination}")
  private String destination;
  @Value("${elasticSearch.server.ip}")
  private String elasticSearchIp;
  @Value("${elasticSearch.server.port}")
  private Integer elasticSearchPort;
  @Value("${zookeeper.server.ip}")
  private String zkServerIp;

  /**
   * 获取简单canal-server连接
   */
  @Bean
  public CanalConnector canalSimpleConnector() {
    CanalConnector canalConnector = CanalConnectors
        .newSingleConnector(new InetSocketAddress(canalIp, canalPort), destination, "", "");
    return canalConnector;
  }

  /**
   * 通过连接zookeeper获取canal-server连接
   */
  @Bean
  public CanalConnector canalHaConnector() {
    CanalConnector canalConnector = CanalConnectors
        .newClusterConnector(zkServerIp, destination, "", "");
    return canalConnector;
  }

  /**
   * elasticsearch 7.x客户端
   */
  @Bean
  public RestHighLevelClient restHighLevelClient() {
    RestHighLevelClient client = new RestHighLevelClient(
        RestClient.builder(new HttpHost(elasticSearchIp, elasticSearchPort))
    );
    return client;
  }
}
```

**CanalDataParser.java**
由于这个类的代码较多，文中则摘出其中比较重要的部分，其它部分代码可从github上获取

```java
  /**
   * 元祖类型的对象定义
   *
   * @param <A>
   * @param <B>
   */
  public static class TwoTuple<A, B> {

    public final A eventType;
    public final B columnMap;

    public TwoTuple(A a, B b) {
      eventType = a;
      columnMap = b;
    }
  }

  /**
   * 解析canal中的message对象内容
   *
   * @param entrys
   * @return
   */
  public static List<TwoTuple<EventType, Map>> printEntry(List<Entry> entrys) {
    List<TwoTuple<EventType, Map>> rows = new ArrayList<>();
    for (Entry entry : entrys) {
      // binlog event的事件事件
      long executeTime = entry.getHeader().getExecuteTime();
      // 当前应用获取到该binlog锁延迟的时间
      long delayTime = System.currentTimeMillis() - executeTime;
      Date date = new Date(entry.getHeader().getExecuteTime());
      SimpleDateFormat simpleDateFormat = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");
      // 当前的entry（binary log event）的条目类型属于事务
      if (entry.getEntryType() == EntryType.TRANSACTIONBEGIN
          || entry.getEntryType() == EntryType.TRANSACTIONEND) {
        if (entry.getEntryType() == EntryType.TRANSACTIONBEGIN) {
          TransactionBegin begin = null;
          try {
            begin = TransactionBegin.parseFrom(entry.getStoreValue());
          } catch (InvalidProtocolBufferException e) {
            throw new RuntimeException("parse event has an error , data:" + entry.toString(), e);
          }
          // 打印事务头信息，执行的线程id，事务耗时
          logger.info(transaction_format,
              new Object[]{entry.getHeader().getLogfileName(),
                  String.valueOf(entry.getHeader().getLogfileOffset()),
                  String.valueOf(entry.getHeader().getExecuteTime()),
                  simpleDateFormat.format(date),
                  entry.getHeader().getGtid(),
                  String.valueOf(delayTime)});
          logger.info(" BEGIN ----> Thread id: {}", begin.getThreadId());
          printXAInfo(begin.getPropsList());
        } else if (entry.getEntryType() == EntryType.TRANSACTIONEND) {
          TransactionEnd end = null;
          try {
            end = TransactionEnd.parseFrom(entry.getStoreValue());
          } catch (InvalidProtocolBufferException e) {
            throw new RuntimeException("parse event has an error , data:" + entry.toString(), e);
          }
          // 打印事务提交信息，事务id
          logger.info("----------------\n");
          logger.info(" END ----> transaction id: {}", end.getTransactionId());
          printXAInfo(end.getPropsList());
          logger.info(transaction_format,
              new Object[]{entry.getHeader().getLogfileName(),
                  String.valueOf(entry.getHeader().getLogfileOffset()),
                  String.valueOf(entry.getHeader().getExecuteTime()), simpleDateFormat.format(date),
                  entry.getHeader().getGtid(), String.valueOf(delayTime)});
        }
        continue;
      }
      // 当前entry（binary log event）的条目类型属于原始数据
      if (entry.getEntryType() == EntryType.ROWDATA) {
        RowChange rowChage = null;
        try {
          // 获取储存的内容
          rowChage = RowChange.parseFrom(entry.getStoreValue());
        } catch (Exception e) {
          throw new RuntimeException("parse event has an error , data:" + entry.toString(), e);
        }
        // 获取当前内容的事件类型
        EventType eventType = rowChage.getEventType();
        logger.info(row_format,
            new Object[]{entry.getHeader().getLogfileName(),
                String.valueOf(entry.getHeader().getLogfileOffset()),
                entry.getHeader().getSchemaName(),
                entry.getHeader().getTableName(), eventType,
                String.valueOf(entry.getHeader().getExecuteTime()), simpleDateFormat.format(date),
                entry.getHeader().getGtid(), String.valueOf(delayTime)});
        // 事件类型是query或数据定义语言DDL直接打印sql语句，跳出继续下一次循环
        if (eventType == EventType.QUERY || rowChage.getIsDdl()) {
          logger.info(" sql ----> " + rowChage.getSql() + SEP);
          continue;
        }
        printXAInfo(rowChage.getPropsList());
        // 循环当前内容条目的具体数据
        for (RowData rowData : rowChage.getRowDatasList()) {
          List<CanalEntry.Column> columns;
          // 事件类型是delete返回删除前的列内容，否则返回改变后列的内容
          if (eventType == CanalEntry.EventType.DELETE) {
            columns = rowData.getBeforeColumnsList();
          } else {
            columns = rowData.getAfterColumnsList();
          }
          HashMap<String, Object> map = new HashMap<>(16);
          // 循环把列的name与value放入map中
          for (Column column : columns) {
            map.put(column.getName(), column.getValue());
          }
          rows.add(new TwoTuple<>(eventType, map));
        }
      }
    }
    return rows;
  }
```

**ElasticUtils.java**

```java
package com.example.canal.study.common;

import com.alibaba.fastjson.JSON;
import com.example.canal.study.pojo.Student;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.elasticsearch.action.DocWriteRequest;
import org.elasticsearch.action.delete.DeleteRequest;
import org.elasticsearch.action.delete.DeleteResponse;
import org.elasticsearch.action.get.GetRequest;
import org.elasticsearch.action.get.GetResponse;
import org.elasticsearch.action.index.IndexRequest;
import org.elasticsearch.action.index.IndexResponse;
import org.elasticsearch.action.update.UpdateRequest;
import org.elasticsearch.action.update.UpdateResponse;
import org.elasticsearch.client.RequestOptions;
import org.elasticsearch.client.RestHighLevelClient;
import org.elasticsearch.common.xcontent.XContentType;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * es的crud工具类
 *
 * @author haha
 */
@Slf4j
@Component
public class ElasticUtils {

  @Autowired
  private RestHighLevelClient restHighLevelClient;

  /**
   * 新增
   *
   * @param student
   * @param index   索引
   */
  public void saveEs(Student student, String index) {
    IndexRequest indexRequest = new IndexRequest(index)
        .id(student.getId())
        .source(JSON.toJSONString(student), XContentType.JSON)
        .opType(DocWriteRequest.OpType.CREATE);
    try {
      IndexResponse response = restHighLevelClient.index(indexRequest, RequestOptions.DEFAULT);
      log.info("保存数据至ElasticSearch成功：{}", response.getId());
    } catch (Exception e) {
      log.error("保存数据至elasticSearch失败: {}", e);
    }
  }

  /**
   * 查看
   *
   * @param index 索引
   * @param id    _id
   * @throws Exception
   */
  public void getEs(String index, String id) {
    GetRequest getRequest = new GetRequest(index, id);
    GetResponse response = null;
    try {
      response = restHighLevelClient.get(getRequest, RequestOptions.DEFAULT);
      Map<String, Object> fields = response.getSource();
      for (Map.Entry<String, Object> entry : fields.entrySet()) {
        System.out.println(entry.getKey() + ":" + entry.getValue());
      }
    } catch (Exception e) {
      log.error("从elasticSearch获取数据失败: {}", e);
    }
  }

  /**
   * 更新
   *
   * @param student
   * @param index   索引
   * @throws Exception
   */
  public void updateEs(Student student, String index) {
    UpdateRequest updateRequest = new UpdateRequest(index, student.getId());
    updateRequest.doc(JSON.toJSONString(student), XContentType.JSON);
    UpdateResponse response = null;
    try {
      response = restHighLevelClient.update(updateRequest, RequestOptions.DEFAULT);
      log.info("更新数据至ElasticSearch成功：{}", response.getId());
    } catch (Exception e) {
      log.error("更新数据至elasticSearch失败: {}", e);
    }
  }

  /**
   * 根据id删除数据
   *
   * @param index 索引
   * @param id    _id
   * @throws Exception
   */
  public void DeleteEs(String index, String id) {
    DeleteRequest deleteRequest = new DeleteRequest(index, id);
    DeleteResponse response = null;
    try {
      response = restHighLevelClient.delete(deleteRequest, RequestOptions.DEFAULT);
      log.info("从elasticSearch删除数据成功：{}", response.getId());
    } catch (Exception e) {
      log.error("从elasticSearch删除数据失败: {}", e);
    }
  }
}
```

**BinLogElasticSearch.java**

```java
package com.example.canal.study.action;

import com.alibaba.otter.canal.client.CanalConnector;
import com.alibaba.otter.canal.protocol.CanalEntry;
import com.alibaba.otter.canal.protocol.Message;
import com.example.canal.study.common.CanalDataParser;
import com.example.canal.study.common.ElasticUtils;
import com.example.canal.study.pojo.Student;
import java.io.IOException;
import java.util.List;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;

/**
 * 获取binlog数据并发送到es中
 *
 * @author haha
 */
@Slf4j
@Component
public class BinLogElasticSearch {

  @Autowired
  private CanalConnector canalSimpleConnector;
  @Autowired
  private ElasticUtils elasticUtils;
  //@Qualifier("canalHaConnector")使用名为canalHaConnector的bean
  @Autowired
  @Qualifier("canalHaConnector")
  private CanalConnector canalHaConnector;

  public void binLogToElasticSearch() throws IOException {
    openCanalConnector(canalSimpleConnector);
    // 轮询拉取数据
    Integer batchSize = 5 * 1024;
    while (true) {
//            Message message = canalHaConnector.getWithoutAck(batchSize);
      Message message = canalSimpleConnector.getWithoutAck(batchSize);
      long id = message.getId();
      int size = message.getEntries().size();
      log.info("当前监控到binLog消息数量{}", size);
      if (id == -1 || size == 0) {
        try {
          // 等待4秒
          Thread.sleep(4000);
        } catch (InterruptedException e) {
          e.printStackTrace();
        }
      } else {
        //1. 解析message对象
        List<CanalEntry.Entry> entries = message.getEntries();
        List<CanalDataParser.TwoTuple<CanalEntry.EventType, Map>> rows = CanalDataParser
            .printEntry(entries);
        for (CanalDataParser.TwoTuple<CanalEntry.EventType, Map> tuple : rows) {
          if (tuple.eventType == CanalEntry.EventType.INSERT) {
            Student student = createStudent(tuple);
            // 2。将解析出的对象同步到elasticSearch中
            elasticUtils.saveEs(student, "student_index");
            // 3.消息确认已处理
            canalSimpleConnector.ack(id);
//                        canalHaConnector.ack(id);
          }
          if (tuple.eventType == CanalEntry.EventType.UPDATE) {
            Student student = createStudent(tuple);
            elasticUtils.updateEs(student, "student_index");
            // 3.消息确认已处理
            canalSimpleConnector.ack(id);
//                        canalHaConnector.ack(id);
          }
          if (tuple.eventType == CanalEntry.EventType.DELETE) {
            elasticUtils.DeleteEs("student_index", tuple.columnMap.get("id").toString());
            canalSimpleConnector.ack(id);
//                        canalHaConnector.ack(id);
          }
        }
      }
    }
  }

  /**
   * 封装数据至Student对象中
   *
   * @param tuple
   * @return
   */
  private Student createStudent(CanalDataParser.TwoTuple<CanalEntry.EventType, Map> tuple) {
    Student student = new Student();
    student.setId(tuple.columnMap.get("id").toString());
    student.setAge(Integer.parseInt(tuple.columnMap.get("age").toString()));
    student.setName(tuple.columnMap.get("name").toString());
    student.setSex(tuple.columnMap.get("sex").toString());
    student.setCity(tuple.columnMap.get("city").toString());
    return student;
  }

  /**
   * 打开canal连接
   *
   * @param canalConnector
   */
  private void openCanalConnector(CanalConnector canalConnector) {
    //连接CanalServer
    canalConnector.connect();
    // 订阅destination
    canalConnector.subscribe();
  }

  /**
   * 关闭canal连接
   *
   * @param canalConnector
   */
  private void closeCanalConnector(CanalConnector canalConnector) {
    //关闭连接CanalServer
    canalConnector.disconnect();
    // 注销订阅destination
    canalConnector.unsubscribe();
  }
}
```

**CanalDemoApplication.java（Spring Boot 启动类）**

```java
package com.example.canal.study;

import com.example.canal.study.action.BinLogElasticSearch;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * 应用的启动类
 *
 * @author haha
 */
@SpringBootApplication
public class CanalDemoApplication implements ApplicationRunner {

  @Autowired
  private BinLogElasticSearch binLogElasticSearch;

  public static void main(String[] args) {
    SpringApplication.run(CanalDemoApplication.class, args);
  }

  // 程序启动则执行run方法
  @Override
  public void run(ApplicationArguments args) throws Exception {
    binLogElasticSearch.binLogToElasticSearch();
  }
}
```

**application.properties**

```text
server.port=8081
spring.application.name = canal-demo
canal.server.ip = localhost
canal.server.port = 11111
canal.destination = example
zookeeper.server.ip = localhost:2181
zookeeper.sasl.client = false
elasticSearch.server.ip = localhost
elasticSearch.server.port = 9200
```

## Canal集群高可用的搭建

通过上面的学习，我们知道了单机直连方式的Canal应用。在当今互联网时代，单实例模式逐渐被集群高可用模式取代，那么Canal的多实例集群方式如何搭建呢！

### 基于Zookeeper获取Canal实例

准备Zookeeper的Docker镜像与容器

```bash
docker pull zookeeper
docker run -d --name zookeeper --net mynetwork --ip 172.18.0.3 -p 2181:2181 zookeeper
docker run -d --name canal-server2 --net mynetwork --ip 172.18.0.8 -p 11113:11113 canal/canal-server
```

最终效果如图

![](https://cdn.nlark.com/yuque/0/2020/png/86832/1582364591909-9857612f-618e-4910-9ca9-5edb24582ea7.png)

1. 机器准备
  - 运行Canal的容器ip： 172.18.0.4 , 172.18.0.8
  - Zookeeper容器ip：172.18.0.3:2181
  - MySQL容器ip：172.18.0.6:3306
2. 按照部署和配置，在单台机器上各自完成配置，演示时instance name为example
3. 修改canal.properties，加上Zookeeper配置并修改Canal端口

```text
canal.port=11113
canal.zkServers=172.18.0.3:2181
canal.instance.global.spring.xml = classpath:spring/default-instance.xml
```

4. 创建example目录，并修改instance.properties

```text
canal.instance.mysql.slaveId = 1235
#之前的canal slaveId是1234，保证slaveId不重复即可
canal.instance.master.address = 172.18.0.6:3306
```

**注意：** 两台机器上的instance目录的名字需要保证完全一致，HA模式是依赖于instance name进行管理，同时必须都选择default-instance.xml配置
启动两个不同容器的Canal，启动后，可以通过`tail -100f logs/example/example.log`查看启动日志，只会看到一台机器上出现了启动成功的日志。
比如我这里启动成功的是 172.18.0.4

![](https://cdn.nlark.com/yuque/0/2020/png/86832/1582364591764-5eb8bde2-bf81-4903-9c0d-7c6de281f8b0.png)

查看一下Zookeeper中的节点信息，也可以知道当前工作的节点为172.18.0.4:11111

```text
[zk: localhost:2181(CONNECTED) 15] get /otter/canal/destinations/example/running  
{"active":true,"address":"172.18.0.4:11111","cid":1}
```

### 客户端链接, 消费数据

可以通过指定Zookeeper地址和Canal的instance name，canal client会自动从Zookeeper中的running节点，获取当前服务的工作节点，然后与其建立链接：

```text
[zk: localhost:2181(CONNECTED) 0] get /otter/canal/destinations/example/running
{"active":true,"address":"172.18.0.4:11111","cid":1}
```

对应的客户端编码可以使用如下形式，上文中的`CanalConfig.java`中的`canalHaConnector`就是一个HA连接

```java
CanalConnector connector = CanalConnectors.newClusterConnector("172.18.0.3:2181", "example", "", "");
```

链接成功后，canal server会记录当前正在工作的canal client信息，比如客户端ip，链接的端口信息等 (聪明的你，应该也可以发现，canal client也可以支持HA功能)

```text
[zk: localhost:2181(CONNECTED) 4] get /otter/canal/destinations/example/1001/running
{"active":true,"address":"192.168.124.5:59887","clientId":1001}
```

数据消费成功后，canal server会在zookeeper中记录下当前最后一次消费成功的binlog位点.  (下次你重启client时，会从这最后一个位点继续进行消费)

```text
[zk: localhost:2181(CONNECTED) 5] get /otter/canal/destinations/example/1001/cursor
{"@type":"com.alibaba.otter.canal.protocol.position.LogPosition","identity":{"slaveId":-1,"sourceAddress":{"address":"mysql.mynetwork","port":3306}},"postion":{"included":false,"journalName":"binlog.000004","position":2169,"timestamp":1562672817000}}
```

停止正在工作的172.18.0.4的canal server

```bash
docker exec -it canal-server bash
cd canal-server/bin
sh stop.sh
```

这时172.18.0.8会立马启动example instance，提供新的数据服务

```text
[zk: localhost:2181(CONNECTED) 19] get /otter/canal/destinations/example/running
{"active":true,"address":"172.18.0.8:11111","cid":1}
```

与此同时，客户端也会随着canal server的切换，通过获取zookeeper中的最新地址，与新的canal server建立链接，继续消费数据，整个过程自动完成

## 异常与总结

### elasticsearch-head无法访问elasticsearch

es与es-head是两个独立的进程，当es-head访问es服务时，会存在一个跨域问题。所以我们需要修改es的配置文件，增加一些配置项来解决这个问题，如下

```text
[root@localhost /usr/local/elasticsearch-head-master]# cd ../elasticsearch-5.5.2/config/
[root@localhost /usr/local/elasticsearch-5.5.2/config]# vim elasticsearch.yml  
# 文件末尾加上如下配置
http.cors.enabled: true
http.cors.allow-origin: "*"
```

修改完配置文件后需重启es服务

### elasticsearch-head查询报406 Not Acceptable

![](https://cdn.nlark.com/yuque/0/2020/png/86832/1582364591825-b5a3667e-f54c-42b4-8543-e18de3b27d3c.png)

```text
解决方法:
1、进入head安装目录；
2、cd _site/
3、编辑vendor.js  共有两处
     #6886行   contentType: "application/x-www-form-urlencoded
    改成 contentType: "application/json;charset=UTF-8"
     #7574行 var inspectData = s.contentType === "application/x-www-form-urlencoded" &&
    改成 var inspectData = s.contentType === "application/json;charset=UTF-8" &&
```

### 使用elasticsearch-rest-high-level-client报org.elasticsearch.action.index.IndexRequest.ifSeqNo

```xml
#pom中除了加入依赖
<dependency>
   <groupId>org.elasticsearch.client</groupId>
   <artifactId>elasticsearch-rest-high-level-client</artifactId>
   <version>7.1.1</version>
</dependency>
#还需加入
<dependency>
    <groupId>org.elasticsearch</groupId>
    <artifactId>elasticsearch</artifactId>
    <version>7.1.1</version>
</dependency>
```

相关参考 [git hub issues](https://github.com/elastic/elasticsearch/issues/43023)

### 为什么ElasticSearch要在7.X版本不能使用type?

参考：[为什么ElasticSearch要在7.X版本去掉type?](https://www.waitig.com/%E4%B8%BA%E4%BB%80%E4%B9%88elasticsearch%E8%A6%81%E5%9C%A87-x%E7%89%88%E6%9C%AC%E5%8E%BB%E6%8E%89type.html)

### 使用spring-data-elasticsearch.jar报org.elasticsearch.client.transport.NoNodeAvailableException

由于本文使用的是elasticsearch7.x以上的版本，目前spring-data-elasticsearch底层采用es官方TransportClient，而es官方计划放弃TransportClient，工具以es官方推荐的RestHighLevelClient进行调用请求。
可参考[RestHighLevelClient API](https://www.elastic.co/guide/en/elasticsearch/client/java-rest/current/java-rest-high-supported-apis.html)

### 设置docker容器开启启动

```bash
# 如果创建时未指定 --restart=always ,可通过update 命令
docker update --restart=always [containerID]
```

### Focker for Mac network host 模式不生效

host 模式是为了性能，但是这却对 docker 的隔离性造成了破坏，导致安全性降低。
在性能场景下，可以用 --netwokr host 开启 Host 模式，但需要注意的是，**如果你用 Windows 或 Mac 本地启动容器的话，会遇到 host 模式失效的问题。原因是 host 模式只支持 Linux 宿主机。**
参见官方文档：[docs.docker.com/network/hos…](https://docs.docker.com/network/host/)

### 客户端连接Zookeeper报authenticate using SASL(unknow error)

![](https://cdn.nlark.com/yuque/0/2020/png/86832/1582364592006-2066f0c4-0667-464c-8823-1297f636fac5.png)

- zookeeper.jar与dokcer中的zookeeper版本不一致
- zookeeper.jar 使用了3.4.6之前的版本

出现这个错的意思是zookeeper作为外部应用需要向系统申请资源，申请资源的时候需要通过认证，而sasl是一种认证方式，我们想办法来绕过sasl认证。避免等待，来提高效率。
在项目代码中加入`System.setProperty("zookeeper.sasl.client", "false");`，如果是spring boot 项目可以在application.properties中加入`zookeeper.sasl.client=false`
参考：[Increased CPU usage by unnecessary SASL checks](https://issues.apache.org/jira/browse/ZOOKEEPER-1657)

### 如果更换canal.client.jar中依赖的zookeeper.jar的版本

把canal的官方源码下载到本机`git clone https://github.com/alibaba/canal.git`，然后修改client模块下pom.xml文件中关于zookeeper的内容，然后重新`mvn install`

![](https://cdn.nlark.com/yuque/0/2020/png/86832/1582364591846-e4970d0b-8b55-4f4c-9cd5-ba3704fa95f7.png)

把自己项目依赖的包替换为刚刚`mvn install`生产的包

![](https://cdn.nlark.com/yuque/0/2020/png/86832/1582364591871-fb7214b6-ccbf-440b-ad65-0377322c35fc.png)

### Zookeeper返回的是Docker容器中的IP，而宿主机IP与容器IP不是同一个网段，无法ping通

修改hosts文件只可以实现域名到ip的映射（域名重定向），iptables可以实现端口的重定向，但是这个问题是要通过ip到ip的重定向可以解决，但是研究了一下没找到怎么设置（windows、mac），所以我们修改canal的官方源码来达到我们想要的目的。修改`ClusterCanalConnector.java`中的`connect()`方法。
以下是修改后内容对比图

![](https://cdn.nlark.com/yuque/0/2020/png/86832/1582364591899-d2adc1f7-1821-4cbc-99b9-81a52b63e04e.png)

### 关于选型的取舍

![](https://cdn.nlark.com/yuque/0/2020/png/86832/1582364591907-ef53ccf0-0e59-4413-8682-3e8f521f7ec9.png)

本文示例项目源代码==>[canal-elasticsearch-sync](https://github.com/jiangeeq/gitchat-code/tree/master/canal_demo)

> 作者：蒋老湿
> 链接：[https://juejin.im/post/5d282f57e51d45590a445bcd](https://juejin.im/post/5d282f57e51d45590a445bcd)
> 来源：掘金
