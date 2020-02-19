---
title: Spring为REST实现异常处理
tags:
  - Java
  - Spring
  - Spring Boot
  - Rest
categories:
  - Collection
abbrlink: ca1a43ab
date: 2017-08-13 00:30:24
---
> 在Spring 3.2之前，在Spring MVC应用程序中处理异常的两种主要方法是：HandlerExceptionResolver或@ExceptionHandler注释。这两个都有一些明显的缺点。3.2之后，我们现在有了新的@ControllerAdvice注释来解决前面两个解决方案的局限性。所有这些都有一个共同点 - 他们处理分离问题非常好。应用程序可以正常抛出异常以指示某种类型的异常 - 然后将单独处理异常。

## 解决方案1 - 控制器级别@ExceptionHandler

在@Controller class中定义一个方法来处理异常, 并加上@ExceptionHandler annotation：

```java
@RestController
public class FooController{
    //...
    @ExceptionHandler({ CustomException1.class, CustomException2.class })
    public void handleException() {
        //
    }
}
```

主要缺点: @ExceptionHandler注释方法只对该该Controller有效, 不能全局使用。

## 解决方案2 - HandlerExceptionResolver

定义一个  HandlerExceptionResolver 统一处理决应用程序抛出的任何异常。

### Spring 3.1 ExceptionHandlerExceptionResolve

默认在DispatcherServlet中启用, @ExceptionHandler就是通过它实现的

### Spring 3.0 DefaultHandlerExceptionResolver

默认在DispatcherServlet中启用, 他会将Spring的异常解析为相应的HTTP status codes, e.g. 400, 500 ...
[完整的异常和对应的HTTP status code](http://docs.spring.io/spring/docs/3.2.x/spring-framework-reference/html/mvc.html#mvc-ann-rest-spring-mvc-exceptions), 但是他没有设置任何的response body.

### Spring 3.0 ResponseStatusExceptionResolver

默认在DispatcherServlet中启用, 自定义异常的@ResponseStatus注释，并将这些异常映射到HTTP状态代码:

```java
@ResponseStatus(value = HttpStatus.NOT_FOUND)
publi class ResourceNotFoundException extends RuntimeException {
    public ResourceNotFoundException() {
        super();
    }
    public ResourceNotFoundException(String message, Throwable cause) {
        super(message, cause);
    }
    public ResourceNotFoundException(String message) {
        super(message);
    }
    public ResourceNotFoundException(Throwable cause) {
        super(cause);
    }
}
```

### 自定义HandlerExceptionResolver

```java
@Component
public class RestResponseStatusExceptionResolver extends AbstractHandlerExceptionResolver {

    @Override
    protected ModelAndView doResolveException
      (HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex) {
        try {
            if (ex instanceof IllegalArgumentException) {
                return handleIllegalArgument((IllegalArgumentException) ex, response, handler);
            }
            ...
        } catch (Exception handlerException) {
            logger.warn("Handling of [" + ex.getClass().getName() + "]
              resulted in Exception", handlerException);
        }
        return null;
    }

    private ModelAndView handleIllegalArgument
      (IllegalArgumentException ex, HttpServletResponse response) throws IOException {
        response.sendError(HttpServletResponse.SC_CONFLICT);
        String accept = request.getHeader(HttpHeaders.ACCEPT);
        ...
        return new ModelAndView();
    }
}
```

## 解决方案3 - 使用@ControllerAdvice(@RestControllerAdvice)注解(需要Spring 3.2及以上de版本)

@ControllerAdvice注释来支持全局@ExceptionHandler。

```java
@ControllerAdvice
public class RestResponseEntityExceptionHandler extends ResponseEntityExceptionHandler {

    @ExceptionHandler(value = { IllegalArgumentException.class, IllegalStateException.class })
    @ResponseBody
    protected ResponseEntity<Object> handleConflict(RuntimeException ex, WebRequest request) {
        String bodyOfResponse = "This should be application specific";
        return handleExceptionInternal(ex, bodyOfResponse,
          new HttpHeaders(), HttpStatus.CONFLICT, request);
    }
}
```

解决@ExceptionHandler不能全局处理。

> 原文链接: [https://docs.spring.io/spring-framework/docs/current/spring-framework-reference/web.html#mvc-ann-exceptionhandler](https://docs.spring.io/spring-framework/docs/current/spring-framework-reference/web.html#mvc-ann-exceptionhandler)
