---
title: Spring Retry
tags:
  - Java
  - Spring
  - Spring Boot
categories:
  - Collection
abbrlink: 69b13214
date: 2017-08-14 23:50:34
---
## 使用场景

在实际工作中,重处理是一个非常常见的场景,比如:发送消息失败,调用远程服务失败,争抢锁失败,等等,这些错误可能是因为网络波动造成的,等待过后重处理就能成功.通常来说,会用try/catch,while循环之类的语法来进行重处理,但是这样的做法缺乏统一性,并且不是很方便,要多写很多代码.然而spring-retry却可以通过注解,在不入侵原有业务逻辑代码的方式下,优雅的实现重处理功能.

## Maven Dependencies

```xml
<dependency>
  <groupId>org.springframework.retry</groupId>
  <artifactId>spring-retry</artifactId>
  <version>1.2.5.RELEASE</version>
</dependency>
```

## 如何启用

- Spring boot application

```java
@Configuration
@EnableRetry
public class AppConfig { ... }
```

指定方法上添加@Retryable，启用重试功能：

```java
@Service
public interface MyService {
    @Retryable(
      value = { SQLException.class },
      maxAttempts = 2,
      backoff = @Backoff(delay = 5000))
    void retryService(String sql) throws SQLException;
    ...
}
```

`value`: 指定异常重试， `maxAttempts`: 最大重试次数， `backoff`: 延时， 单位毫秒
默认任何异常都重试， 最多3次， 延时1秒

为标注了@Retryable的方法单独指定执行的方法
指定方法上添加@Recover来开启重试失败后调用的方法:

```java
@Service
public interface MyService {
    ...
    @Recover
    void recover(SQLException e, String sql);
}
```

> [原文链接](http://www.baeldung.com/spring-retry)
> [文档地址http://docs.spring.io/spring-batch/reference/html/retry.html](http://docs.spring.io/spring-batch/reference/html/retry.html)