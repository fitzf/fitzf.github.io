---
title: 'EL表达式fn:endsWith函数的bug'
tags:
  - Java
  - Jstl
categories: Collection
abbrlink: 73c8edbb
date: 2017-03-24 23:31:59
---
jstl-1.2.jar

```java
  public static boolean endsWith(String input, String substring) {
    if (input == null) 
      input = "";
    if (substring == null) 
      substring = "";
    int index = input.indexOf(substring); // should be indexOf应该是lastIndexOf 才对
    if (index == -1) 
      return false;
    if ((index == 0) && (substring.length() == 0)) 
      return true;
    return index == input.length() - substring.length();
  }
  
```

