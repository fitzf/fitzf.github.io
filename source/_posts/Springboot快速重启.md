---
title: Springboot快速重启
tags:
  - Java
  - Spring
  - Spring Boot
categories:
  - Collection
abbrlink: eb48025f
date: 2017-08-09 23:15:52
---
![upload successful](/images/pasted-43.png)

> 在平时的开发过程中，大家一定遇到在修改某个类或者配置文件后需要手动重启应用程序才会生效的情况，可能大家对这样的事情也感到比较的烦。其实Springboot为了使应用程序的开发比较方便快捷，提供了一些额外的工具（spring-boot-devtools），其中就包括快速重启。接下来，我们介绍如何使用spring-boot-devtools。

## 如何使用

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-devtools</artifactId>
    <!-- 防止传递 -->
    <optional>true</optional>
</dependency>
```

需要说明的是，运行完全打包应用程序时，开发人员工具会自动禁用。如果应用程序通过java -jar启动，会被认为是生产应用。

## 默认属性

Springboot中一些包为了提升性能使用了缓存（例如，为了避免重复解析模板文件，模板引擎就缓存了编译之后的模板。此外，在访问静态文件时向响应中添加HTTP缓存头）。虽然缓存在生产环境中起到比较好的效果，但是在开发环境中却会起到反作用，它会让你不能及时看到你修改后的结果。基于这样的原因，spring-boot-devtools默认会禁用缓存。

我们可以通过源码看出，spring-boot-devtools禁用了哪些缓存：

```java
@Order(Ordered.LOWEST_PRECEDENCE)
public class DevToolsPropertyDefaultsPostProcessor implements EnvironmentPostProcessor {
	private static final Map<String, Object> PROPERTIES;
	static {
		Map<String, Object> properties = new HashMap<>();
		properties.put("spring.thymeleaf.cache", "false");
		properties.put("spring.freemarker.cache", "false");
		properties.put("spring.groovy.template.cache", "false");
		properties.put("spring.mustache.cache", "false");
		properties.put("server.session.persistent", "true");
		properties.put("spring.h2.console.enabled", "true");
		properties.put("spring.resources.cache-period", "0");
		properties.put("spring.resources.chain.cache", "false");
		properties.put("spring.template.provider.cache", "false");
		properties.put("spring.mvc.log-resolved-exception", "true");
		properties.put("server.servlet.jsp.init-parameters.development", "true");
		properties.put("spring.reactor.stacktrace-mode.enabled", "true");
		PROPERTIES = Collections.unmodifiableMap(properties);
	}
    // ...
}
```

你同时也可以在application.properties(yml)中通过上述的属性设置是否支持缓存。

## 自动重启触发条件

使用了spring-boot-devtools的应用程序在classpath上的文件发生变化时，重启应用程序。默认情况下，静态文件的修改是不会触发重启应用程序的，但是会触发live reload。

你可以通过

```yaml
spring:
  devtools:
    restart:
      exclude: static/**
      additional-exclude: static/**,public/**
```

来排除触发重启的文件。另外，当需要做到对不在classpath中文件进行修改时也触发重新启动，你可以通过spring.devtools.restart.additional-paths配置文件来将不在classpath中的文件夹路径加入到监控中，配合spring.devtools.restart.exclude来判断文件修改时是否重启。

## 自动重启为什么会快

Springboot的自动重启技术是通过两个类加载器完成的，对于那些不会改变的类（比如第三方包）被加载到基础类加载器中，对于你正在开发的类被加载到重启的类加载器中。当应用程序重启时，重新启动类加载器将被丢弃，并创建一个新的类加载器。这就是为什么自动重启比冷启动要快的原因。

如果想重新加载基础类加载器中的jar包，可以新建一个META-INF/spring-devtools.properties,在这个文件中可以定义以restart.include.和restart.exclude.开头的属性来设置需要重新加载和不需要重新加载的jar

```java
restart.exclude.toplinecommonlibs=/topline-common-[\w-]+.jar
restart.include.toplinecommon=/topline-myproj-[\w-]+.jar
```

## 如何禁用

可以在application.properties(yml)中配置spring.devtools.restart.enable=false来禁用自动重启。

```yaml
spring:
  devtools:
    restart:
      enable: false
```

> [官方文档 https://docs.spring.io/spring-boot/docs/current/reference/html/using-boot-devtools.html](https://docs.spring.io/spring-boot/docs/current/reference/html/using-boot-devtools.html)