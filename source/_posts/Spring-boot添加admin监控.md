---
title: Spring Boot添加admin监控
tags:
  - Java
  - Spring
  - Spring Boot
  - Monitor
categories:
  - Spring
abbrlink: 5ec24585
date: 2017-08-17 22:46:57
---
## 什么是Spring Boot Admin？

Spring Boot Admin是一个用于管理和监控Spring Boot应用程序的Web应用程序。应用程序通过我们的Spring Boot Admin Client（通过HTTP）注册，或者使用Spring Cloud（例如Eureka, Consul）进行注册。

## 入门

### 设置Admin Server服务

- 添加`Spring Boot Admin Server starter`依赖:

```xml
<dependency>
  <groupId>de.codecentric</groupId>
  <artifactId>spring-boot-admin-starter-server</artifactId>
  <version>${spring-boot-admin.version}</version>
</dependency>
<dependency>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-starter-web</artifactId>
</dependency>
```

- 在主配置类上添加`@EnableAdminServer`注解启用Server:

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

### 注册客户端应用

#### Spring Boot Admin Client

- 添加`spring-boot-admin-starter-client`依赖:

```xml
<dependency>
  <groupId>de.codecentric</groupId>
  <artifactId>spring-boot-admin-starter-client</artifactId>
  <version>${spring-boot-admin.version}</version>
</dependency>
```

- 配置`Spring Boot Admin Server`的URL已注册应用:

```properties
spring.boot.admin.client.url=http://localhost:8080
management.endpoints.web.exposure.include=*
```

#### 使用 Spring Cloud Discovery 注册

- 添加`spring-cloud-starter-eureka`依赖:

```xml
<dependency>
  <groupId>org.springframework.cloud</groupId>
  <artifactId>spring-cloud-starter-netflix-eureka-client</artifactId>
</dependency>
```

- 添加`@EnableDiscoveryClient`注解启用服务发现:

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
    health-check-url-path: /actuator/health
    metadata-map:
      startup: ${random.int} #needed to trigger info and endpoint update after restart
  client:
    registryFetchIntervalSeconds: 5
    serviceUrl:
      defaultZone: ${EUREKA_SERVICE_URL:http://localhost:8761}/eureka/

management:
  endpoints:
    web:
      exposure:
        include: "*"  
  endpoint:
    health:
      show-details: ALWAYS
```

## 监控效果

浏览器访问http://localhost:8080

![upload successful](https://github.com/codecentric/spring-boot-admin/raw/master/images/screenshot.png)

![upload successful](https://github.com/codecentric/spring-boot-admin/raw/master/images/screenshot-details.png)

![upload successful](https://github.com/codecentric/spring-boot-admin/raw/master/images/screenshot-metrics.png)

![upload successful](https://github.com/codecentric/spring-boot-admin/raw/master/images/screenshot-logfile.png)

![upload successful](https://github.com/codecentric/spring-boot-admin/raw/master/images/screenshot-environment.png)

![upload successful](https://github.com/codecentric/spring-boot-admin/raw/master/images/screenshot-logging.png)

![upload successful](https://github.com/codecentric/spring-boot-admin/raw/master/images/screenshot-jmx.png)

![upload successful](https://github.com/codecentric/spring-boot-admin/raw/master/images/screenshot-threads.png)

![upload successful](https://github.com/codecentric/spring-boot-admin/raw/master/images/screenshot-trace.png)

![upload successful](https://github.com/codecentric/spring-boot-admin/raw/master/images/screenshot-journal.png)

## 更多

> [Github](https://github.com/codecentric/spring-boot-admin)
> [更多功能和官方文档](https://codecentric.github.io/spring-boot-admin/current/)
