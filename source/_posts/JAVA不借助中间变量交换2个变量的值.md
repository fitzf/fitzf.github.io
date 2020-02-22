---
title: JAVA不借助中间变量交换2个变量的值
tags:
  - Java
categories:
  - Java基础
abbrlink: f07e5cea
date: 2017-04-09 13:29:50
---
```java
public static void main(String[] args) {
    /*方法一*/
    int a = 3;
    int b = 4;
    a=a+b;
    b=a-b;
    a=a-b;
    System.out.println("a="+a+",b="+b);

    /*方法二利用位运算交换，效率很高*/
    int aa=3;
    int bb=4;
    aa=aa^bb;
    bb=bb^aa;
    aa=aa^bb;
    System.out.println("aa="+aa+",bb="+bb);
}

```
