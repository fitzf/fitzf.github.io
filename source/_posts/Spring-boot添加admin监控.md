---
title: Spring-boot添加admin监控
tags:
  - Java
  - Spring
  - Spring Boot
  - Monitor
categories:
  - Collection
date: 2017-08-17 22:46:57
---
# 什么是Spring Boot Admin？

Spring Boot Admin是一个用于管理和监视Spring Boot应用程序的简单应用程序。应用程序通过我们的Spring Boot Admin Client（通过http）注册，或者使用Spring Cloud（例如Eureka）进行注册。

# 入门

## 设置Admin Server服务

- 添加Spring Boot Admin Server 和 UI依赖:

```xml
<dependency>
    <groupId>de.codecentric</groupId>
    <artifactId>spring-boot-admin-server</artifactId>
    <version>1.5.3</version>
</dependency>
<dependency>
    <groupId>de.codecentric</groupId>
    <artifactId>spring-boot-admin-server-ui</artifactId>
    <version>1.5.3</version>
</dependency>
```

- 在主配置类上添加@EnableAdminServer注解启用Server:

```java
@Configuration
@EnableAutoConfiguration
@EnableAdminServer
public class SpringBootAdminApplication {
    public static void main(String[] args) {
        SpringApplication.run(SpringBootAdminApplication.class, args);
    }
}
```

## 注册客户端应用

### Spring-boot-admin-starter-client

- 添加Spring-boot-admin-starter-client依赖:

```xml
<dependency>
    <groupId>de.codecentric</groupId>
    <artifactId>spring-boot-admin-starter-client</artifactId>
    <version>1.5.3</version>
</dependency>
```

- 配置Spring-boot-admin-server的Url已注册应用:

```yaml
spring.boot.admin.url: http://localhost:8080
```

### 使用 Spring Cloud Discovery 注册

- 添加Spring-cloud-starter-eureka依赖:

```xml
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-eureka</artifactId>
</dependency>
```

- 添加@EnableDiscoveryClient注解启用服务发现:

```java
@Configuration
@EnableAutoConfiguration
@EnableDiscoveryClient
@EnableAdminServer
public class SpringBootAdminApplication {
  public static void main(String[] args) {
    SpringApplication.run(SpringBootAdminApplication.class, args);
  }
}
```

- 配置服务发现地址:

```yaml
eureka:
  instance:
    leaseRenewalIntervalInSeconds: 10
  client:
    registryFetchIntervalSeconds: 5
    serviceUrl:
      defaultZone: ${EUREKA_SERVICE_URL:http://localhost:8761}/eureka/
```

# 监控效果

浏览器访问http://localhost:8080

![upload successful](/images/pasted-44.png)

![upload successful](/images/pasted-45.png)

![upload successful](/images/pasted-46.png)

## 更多

> [Github](https://github.com/codecentric/spring-boot-admin)
> [更多功能和官方文档](https://codecentric.github.io/spring-boot-admin/1.5.3/)