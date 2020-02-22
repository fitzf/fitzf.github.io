---
title: Spring模块及生态支持汇总
tags:
  - Spring
  - Java
categories:
  - Spring
abbrlink: c2ac83af
date: 2017-04-09 13:06:51
---
## 一、Spring模块

### （1）核心容器

- Spring-Core：核心工具类，Spring其他模块大量使用Spring-Core
- Spring-Bean：Spring定义Bean的支持
- Spring-Context：运行时Spring容器
- Spring-Context-Support：Spring容器对第三方包的集成支持
- Spring-Expression：使用表达式语言在运行时查询和操作对象

### （2）AOP

- Spring-Aop：基于代理的AOP支持
- Spring-Aspects：基于AspectJ的AOP支持

### （3）消息(message)

- Spring-Messaging：对消息架构和协议的支持

### （4）Web

- Spring-Web：提供基础的Web集成功能，在Web项目中提供Spring的容器
- Spring-Webmvc：提供基于Servlet的Spring MVC
- Spring-WebSocket：提供WebSocket功能
- Spring-Webmvc-Portlet：提供Portlet环境支持

### （5）数据访问/集成（Data Access/Integration）

- Spring-JDBC：提供以JDBC访问数据库的支持
- Spring-TX：提供编程式和声明式的事务支持
- Spring-ORM：提供对对象/关系映射技术的支持
- Spring-OXM：提供对对象/xml映射技术的支持
- Spring-JMS：提供对JMS的支持

## 二、Spring的生态

Spring发展到现在已经不仅仅是Spring框架本身的内容，Spring目前提供了大量的基于Spring的项目，可以用来更深入地降低我们的开发难度，提高开发效率。
目前Spring的生态里主要有以下项目，我们可以根据自己项目的需要来选择使用相应的项目：

- Spring Boot：使用默认开发配置来实现快捷开发
- Spring XD：用来简化大数据应用开发
- Spring Cloud：为分布式系统开发提供工具集
- Spring Data：对主流的关系型和Nosql数据库的支持
- Spring Integration：通过消息机制对企业集成模式（EIP）的支持
- Spring Batch：简化及优化大量数据的批处理操作
- Spring Security：通过认证和授权保护应用
- Spring HATEOAS：基于HATEOAS原则简化REST服务开发
- Spring Social：于社交网络API（如Facebook、新浪微博等）的集成
- Spring AMQP：对基于AMQP的消息的支持
- Spring Mobile：提供对手机设备检测的功能，给不同的设备返回不同的页面的支持
- Spring for Android：主要提供在Android上消费Restful API的功能
- Spring Web Flow：基于Spring MVC提供基于向导流程式的Web应用开发
- Spring Web Services：提供基于协议有限的SOAP/Web服务
- Spring LDAP：简化LDAP开发
- Spring Session：提供一个API及实现来管理用户会话信息