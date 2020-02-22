---
title: 'Spring中使用logback打印日志，替换其他日志如log4j,commons-logging'
tags:
  - Java
  - Spring
  - Log
categories:
  - Spring
abbrlink: 1a9710e
date: 2017-03-21 19:42:32
---
### Spring MVC集成slf4j-log4j

关于slf4j和log4j的相关介绍和用法，网上有很多文章可供参考，但是关于logback的，尤其是spring MVC集成logback的，就相对少一些了，而且其中一些也有着这样那样的问题。进入正题之前先简单介绍下Spring MVC集成slf4j-log4j的过程，如下：

- 在pom.xml文件中添加slf4j-log4j的依赖，完成后的classpath中将新增三个jar包，分别是：slf4j-api.jar、log4j.jar及slf4j-log4j.jar
- 在当前classpath中添加log4j.properties配置文件，按照log4j的参数语法编写该文件
- 以上两步完成后，普通的Java项目就能使用slf4j-log4j进行日志处理了；对于Java Web项目，还需要在web.xml文件中配置Log4jConfigLocation和Log4jConfigListener

### log4j与logback简要比较

本文意在阐述用logback替代log4j作为Spring MVC项目的日志处理组件。这两者虽然作者相同，但log4j早已被托管给Apache基金会维护，并且自从2012年5月之后就没有更新了。而logback从出生开始就是其作者奔着取代log4j的目的开发的，因此一方面logback继承了log4j大量的用法，使得学习和迁移的成本不高，另一方面logback在性能上要明显优于log4j，尤其是在大量并发的环境下，并且新增了一些log4j所没有的功能（如将日志文件压缩成zip包等）

### Spring MVC集成slf4j-logback

#### 添加依赖

```xml
<dependency>  
    <groupId>ch.qos.logback</groupId>  
    <artifactId>logback-classic</artifactId>  
    <version>1.1.4</version>  
</dependency>  
<dependency>  
    <groupId>ch.qos.logback</groupId>  
    <artifactId>logback-core</artifactId>  
    <version>1.1.4</version>  
</dependency>  

<dependency>  
    <groupId>org.slf4j</groupId>  
    <artifactId>log4j-over-slf4j</artifactId>  
    <version>1.7.20</version>  
</dependency>  
<dependency>  
    <groupId>org.slf4j</groupId>  
    <artifactId>slf4j-api</artifactId>  
    <version>1.7.21</version>  
</dependency>  
<dependency>  
    <groupId>org.logback-extensions</groupId>  
    <artifactId>logback-ext-spring</artifactId>  
    <version>0.1.2</version>  
</dependency>  
<dependency>  
    <groupId>org.slf4j</groupId>  
    <artifactId>jcl-over-slf4j</artifactId>  
    <version>1.7.12</version>  
</dependency>  
```

注意：删除原有的log4j.jar。
如上所示是集成所需要的依赖，其中：
第一个logback-classic包含了logback本身所需的slf4j-api.jar、logback-core.jar及logback-classsic.jar
第二个logback-ext-spring是由官方提供的对Spring的支持，它的作用就相当于log4j中的Log4jConfigListener；这个listener，网上大多都是用的自己实现的，原因在于这个插件似乎并没有出现在官方文档的显要位置导致大多数人并不知道它的存在
第三个jcl-over-slf4j是用来把Spring源代码中大量使用到的commons-logging替换成slf4j，只有在添加了这个依赖之后才能看到Spring框架本身打印的日志，否则只能看到开发者自己打印的日志

#### 编写logback.xml

logback与log4j一样，也需要在classpath中编写配置文件。但logback配置文件似乎比log4j复杂一些：log4j不仅支持xml格式的配置文件，还支持properties格式的，而logback只支持xml格式的。好在官方提供了一个在线工具，可以将log4j的properties文件直接转换成logback的xml文件，地址如下：
[http://logback.qos.ch/translator/](http://logback.qos.ch/translator/)
logback的详细用法及其xml文件的相关语法，可参见它的用户向导，地址如下：
[http://logback.qos.ch/manual/introduction.html](http://logback.qos.ch/manual/introduction.html)

#### 配置web.xml

与log4j类似，logback集成到Spring MVC项目中，也需要在web.xml中进行配置，同样也是配置一个config location和一个config listener，如下所示：

```xml
<context-param>  
  <param-name>logbackConfigLocation</param-name>  
  <param-value>classpath:logback.xml</param-value>  
</context-param>  
<listener>  
  <listener-class>ch.qos.logback.ext.spring.web.LogbackConfigListener</listener-class>  
</listener>  
```

其中LogbackConfigListener由前述的logback-ext-spring依赖提供，若不依赖它则找不到这个listener类

### 其它

从上面可以看出，slf4j-log4j和slf4j-logback集成到Spring MVC（或推广到其它Java Web项目中）的步骤大体是相同的。集成完毕后，就可以通过slf4j提供的API隐藏掉logback（或log4j）的具体实现，直接进行日志处理了
使用slf4j-api的时候，需要注意的是：slf4j采用了单例模式，项目中创建的每一个Logger实例都会按你传入的name（传入的Class<?>实例也会被转换成String型的name）保存到一个静态的ConcurrentHashMap中；因此只要name（或Class<?>实例）相同，每次返回的实际上都是同一个Logger实例。因此完全没必要把Logger实例作为常量或静态成员，随用随取即可。实际上，其作者也不建议那么做。
