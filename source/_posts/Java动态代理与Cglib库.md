---
title: Java动态代理与Cglib库
tags: Java
categories: Essay
abbrlink: 3a5f5aec
date: 2017-03-22 18:20:58
---
JDK动态代理

　　代理模式是常用的Java设计模式，他的特征是代理类与委托类有同样的接口，代理类主要负责为委托类预处理消息、过滤消息、把消息转发给委托类，以及事后处理消息等。代理类与委托类之间通常会存在关联关系，一个代理类的对象与一个委托类的对象关联，代理类的对象本身并不真正实现服务，而是通过调用委托类的对象的相关方法，来提供特定的服务。 
　　按照代理的创建时期，代理类可以分为两种。 
　　静态代理：由程序员创建或特定工具自动生成源代码，再对其编译。在程序运行前，代理类的.class文件就已经存在了。 
　　动态代理：在程序运行时，运用反射机制动态创建而成。 
　　为什么使用动态代理？因为动态代理可以对请求进行任何处理。
　　哪些地方需要动态代理？不允许直接访问某些类；对访问要做特殊处理等。
　　目前Java开发包中包含了对动态代理的支持，但是其实现只支持对接口的的实现。 其实现主要通过java.lang.reflect.Proxy类和java.lang.reflect.InvocationHandler接口。 Proxy类主要用来获取动态代理对象，InvocationHandler接口用来约束调用者实现。
　　以下为模拟案例，通过动态代理实现在方法调用前后向控制台输出两句字符串。
　　定义一个HelloWorld接口：
[java] view plain copy
package com.ljq.test;  
  
 /** 
 * 定义一个HelloWorld接口 
 *  
 * @author jiqinlin 
 * 
 */  
 public interface HelloWorld {  
    public void sayHelloWorld();  
}  
　　类HelloWorldImpl是HelloWorld接口的实现：
[java] view plain copy
package com.ljq.test;  
  
 /** 
 * 类HelloWorldImpl是HelloWorld接口的实现 
 *  
 * @author jiqinlin 
 * 
 */  
 public class HelloWorldImpl implements HelloWorld{  
  
    public void sayHelloWorld() {  
        System.out.println("HelloWorld!");  
    }  
  
}  
　　HelloWorldHandler是 InvocationHandler接口实现：
[java] view plain copy
package com.ljq.test;  
  
 import java.lang.reflect.InvocationHandler;  
 import java.lang.reflect.Method;  
  
 /** 
 * 实现在方法调用前后向控制台输出两句字符串 
 *  
 * @author jiqinlin 
 * 
 */  
 public class HelloWorldHandler implements InvocationHandler{  
    //要代理的原始对象  
     private Object obj;  
      
    public HelloWorldHandler(Object obj) {  
        super();  
        this.obj = obj;  
    }  
  
    /** 
     * 在代理实例上处理方法调用并返回结果 
     *  
     * @param proxy 代理类 
     * @param method 被代理的方法 
     * @param args 该方法的参数数组 
     */  
    public Object invoke(Object proxy, Method method, Object[] args) throws Throwable {  
        Object result = null;  
        //调用之前  
         doBefore();  
        //调用原始对象的方法  
        result=method.invoke(obj, args);  
        //调用之后  
        doAfter();  
        return result;  
    }  
      
    private void doBefore(){  
        System.out.println("before method invoke");  
    }  
      
    private void doAfter(){  
        System.out.println("after method invoke");  
    }  
      
}  
　　测试类：
[java] view plain copy
package com.ljq.test;  
  
import java.lang.reflect.InvocationHandler;  
import java.lang.reflect.Proxy;  
  
  
public class HelloWorldTest {  
  
    public static void main(String[] args) {  
        HelloWorld helloWorld=new HelloWorldImpl();  
        InvocationHandler handler=new HelloWorldHandler(helloWorld);  
  
        //创建动态代理对象  
        HelloWorld proxy=(HelloWorld)Proxy.newProxyInstance(  
            helloWorld.getClass().getClassLoader(),  
            helloWorld.getClass().getInterfaces(),  
            handler);  
        proxy.sayHelloWorld();  
    }  
}  
　　运行结果为：
[plain] view plain copy
before method invoke  
HelloWorld!  
after method invoke  
　　基本流程：用Proxy类创建目标类的动态代理，创建时需要指定一个自己实现InvocationHandler接口的回调类的对象，这个回调类中有一个invoke()用于拦截对目标类各个方法的调用。创建好代理后就可以直接在代理上调用目标对象的各个方法。
　　JDK自从1.3版本开始，就引入了动态代理，并且经常被用来动态地创建代理。JDK的动态代理用起来非常简单，但它有一个限制，就是使用动态代理的对象必须实现一个或多个接口。比如上面的HelloWorldImpl类，实现了HelloWorld接口，所以可以用JDK的动态代理。如果想代理没有实现接口的继承的类，该怎么办？ CGLIB就是最好的选择（https://github.com/cglib/cglib，使用apache license 2.0）。其他比较有名的还有从JBoss项目衍生出来的Javassist（https://github.com/jboss-javassist/javassist），这里介绍Cglib。

Cglib代码生成库

　　CGlib是一个强大的，高性能，高质量的Code生成类库。它可以在运行期扩展Java类与实现Java接口。其底层是通过小而快的字节码处理框架ASM（http://forge.ow2.org/projects/asm，使用BSD License）来转换字节码并生成新的类。大部分功能实际上是asm所提供的，CGlib只是封装了asm，简化了asm的操作，实现了在运行期动态生成新的class。
　　CGlib被许多AOP的框架使用，例如spring AOP和dynaop，为他们提供方法的interception（拦截）；最流行的OR Mapping工具hibernate也使用CGLIB来代理单端single-ended（多对一和一对一）关联（对集合的延迟抓取，是采用其他机制实现的）；EasyMock和jMock是通过使用模仿（moke）对象来测试java代码的包，它们都通过使用CGLIB来为那些没有接口的类创建模仿（moke）对象。
　　CGLIB包的基本代码很少，但学起来有一定的困难，主要是缺少文档，API描述过于简单，这也是开源软件的一个不足之处。目前CGLIB的版本是cglib-2.2.jar，主要由一下部分组成：
　　（1）net.sf.cglib.core：底层字节码处理类，他们大部分与ASM有关系。
　　（2）net.sf.cglib.transform：编译期或运行期类和类文件的转换。
　　（3）net.sf.cglib.proxy ：实现创建代理和方法拦截器的类。
　　（4）net.sf.cglib.reflect ：实现快速反射和C#风格代理的类。
　　（5）net.sf.cglib.util：集合排序工具类。
　　（6）net.sf.cglib.beans：JavaBean相关的工具类。
　　CGLIB包是在ASM之上的一个高级别的层。对代理那些没有实现接口的类非常有用。本质上，它是通过动态的生成一个子类去覆盖所要代理类的不是final的方法，并设置好callback，则原有类的每个方法调用就会转变成调用用户定义的拦截方法（interceptors），这比JDK动态代理方法快多了。可见，Cglib的原理是对指定的目标类动态生成一个子类，并覆盖其中方法实现增强，但因为采用的是继承，所以不能对final修饰的类和final方法进行代理。

用Cglib创建动态代理

　　下图表示Cglib常用到的几类。

图1 Cglib主要的接口
　　创建一个具体类的代理时，通常要用到的CGLIB包的APIs：
　　net.sf.cglib.proxy.Callback接口：在CGLIB包中是一个很关键的接口，所有被net.sf.cglib.proxy.Enhancer类调用的回调（callback）接口都要继承这个接口。
　　net.sf.cglib.proxy.MethodInterceptor接口：是最通用的回调（callback）类型，它经常被AOP用来实现拦截（intercept）方法的调用。这个接口只定义了一个方法。
[java] view plain copy
public Object intercept(Object object, java.lang.reflect.Method method, Object[] args, MethodProxy proxy) throws Throwable;  
　　当net.sf.cglib.proxy.MethodInterceptor做为所有代理方法的回调 （callback）时，当对基于代理的方法调用时，在调用原对象的方法的之前会调用这个方法，如图下图所示。第一个参数是代理对像，第二和第三个参数分别 是拦截的方法和方法的参数。原来的方法可能通过使用java.lang.reflect.Method对象的一般反射调用，或者使用 net.sf.cglib.proxy.MethodProxy对象调用。net.sf.cglib.proxy.MethodProxy通常被首选使用，因为它更快。在这个方法中，我们可以在调用原方法之前或之后注入自己的代码。

图1
　　net.sf.cglib.proxy.MethodInterceptor能够满足任何的拦截（interception ）需要，当对有些情况下可能过度。为了简化和提高性能，CGLIB包提供了一些专门的回调（callback）类型。例如：
　　net.sf.cglib.proxy.FixedValue：为提高性能，FixedValue回调对强制某一特别方法返回固定值是有用的。
　　net.sf.cglib.proxy.NoOp：NoOp回调把对方法调用直接委派到这个方法在父类中的实现。
　　net.sf.cglib.proxy.LazyLoader：当实际的对象需要延迟装载时，可以使用LazyLoader回调。一旦实际对象被装载，它将被每一个调用代理对象的方法使用。
　　net.sf.cglib.proxy.Dispatcher：Dispathcer回调和LazyLoader回调有相同的特点，不同的是，当代理方法被调用时，装载对象的方法也总要被调用。
　　 net.sf.cglib.proxy.ProxyRefDispatcher：ProxyRefDispatcher回调和Dispatcher一样，不同的是，它可以把代理对象作为装载对象方法的一个参数传递。
　　代理类的所以方法经常会用到回调（callback），当然你也可以使用net.sf.cglib.proxy.CallbackFilter 有选择的对一些方法使用回调（callback），这种考虑周详的控制特性在JDK的动态代理中是没有的。在JDK代理中，对 java.lang.reflect.InvocationHandler方法的调用对代理类的所有方法都有效。
　　CGLIB的代理包也对net.sf.cglib.proxy.Mixin提供支持。基本上，它允许多个对象被绑定到一个单一的大对象。在代理中对方法的调用委托到下面相应的对象中。
　　接下来我们看看如何使 用CGLIB代理APIs创建代理。
　　1、创建一个简单的代理
　　CGLIB代理最核心类net.sf.cglib.proxy.Enhancer， 为了创建一个代理，最起码你要用到这个类。首先，让我们使用NoOp回调创建一个代理。
[java] view plain copy
/**  
 
* Create a proxy using NoOp callback. The target class  
* must have a default zero-argument constructor 
*  
* @param targetClass the super class of the proxy  
* @return a new proxy for a target class instance  
*/   
public Object createProxy(Class targetClass) {   
    Enhancer enhancer = new Enhancer();  
    enhancer.setSuperclass(targetClass);  
    enhancer.setCallback(NoOp.INSTANCE);  
    return enhancer.create();  
}   
　　返回值是target类一个实例的代理。在这个例子中，我们为net.sf.cglib.proxy.Enhancer 配置了一个单一的回调（callback）。我们可以看到很少直接创建一个简单的代理，而是创建一个net.sf.cglib.proxy.Enhancer的实例，在net.sf.cglib.proxy.Enhancer类中你可使用静态帮助方法创建一个简单的代理。一般推荐使用上面例子的方法创建代理，因为它允许你通过配置net.sf.cglib.proxy.Enhancer实例很好的控制代理的创建。
　　要注意的是，target类是作为产生的代理的父类传进来的。不同于JDK的动态代理，它不能在创建代理时传target对象，target对象必须被CGLIB包来创建。在这个例子中，默认的无参数构造器时用来创建target实例的。如果你想用CGLIB来创建有参数的实例，用net.sf.cglib.proxy.Enhancer.create(Class[], Object[])方法替代net.sf.cglib.proxy.Enhancer.create()就可以了。方法中第一个参数定义了参数的类型，第 二个是参数的值。在参数中，基本类型应被转化成类的类型。
　　2、使用MethodInterceptor创建一个代理
　　为了更好的使用代理，我们可以使用自己定义的MethodInterceptor类型回调（callback）来代替net.sf.cglib.proxy.NoOp回调。当对代理中所有方法的调用时，都会转向MethodInterceptor类型的拦截（intercept）方法，在拦截方法中再调用底层对象相应的方法。下面我们举个例子，假设你想对目标对象的所有方法调用进行权限的检查，如果没有经过授权，就抛出一个运行时的异常AuthorizationException。其中AuthorizationService.java接口的代码如下：
[java] view plain copy
package com.lizjason.cglibproxy;   
  
import java.lang.reflect.Method;   
  
/**  
 * A simple authorization service for illustration purpose.  
 * @author Jason Zhicheng Li (jason@lizjason.com)  
 */   
public interface AuthorizationService {   
    void authorize(Method method);   
}  
　　对net.sf.cglib.proxy.MethodInterceptor接口的实现的类AuthorizationInterceptor.java代码如下：
[java] view plain copy
package com.lizjason.cglibproxy.impl;  
import java.lang.reflect.Method;  
import net.sf.cglib.proxy.MethodInterceptor;  
import net.sf.cglib.proxy.MethodProxy;  
  
import com.lizjason.cglibproxy.AuthorizationService;  
  
/** 
 * A simple MethodInterceptor implementation to 
 * apply authorization checks for proxy method calls. 
 */  
public class AuthorizationInterceptor implements MethodInterceptor {  
  
    private AuthorizationService authorizationService;  
  
    /** 
     * Create a AuthorizationInterceptor with the given AuthorizationService 
     */  
    public AuthorizationInterceptor (AuthorizationService authorizationService) {  
        this.authorizationService = authorizationService;  
    }  
  
    /** 
     * Intercept the proxy method invocations to inject authorization check. * The original 
     * method is invoked through MethodProxy. 
     */  
    public Object intercept(Object object, Method method, Object[] args, MethodProxy methodProxy) throws Throwable {  
        if (authorizationService != null) {  
            //may throw an AuthorizationException if authorization failed  
            authorizationService.authorize(method);  
        }  
        return methodProxy.invokeSuper(object, args);  
    }  
}  
　　我们可以看到在拦截方法中，首先进行权限的检查，如果通过权限的检查，拦截方法再调用目标对象的原始方法。由于性能的原因，对原始方法的调用我们使用CGLIB的net.sf.cglib.proxy.MethodProxy对象，而不是反射中一般使用java.lang.reflect.Method对象。
　　下面是一个完整的使用MethodInterceptor的例子。
[java] view plain copy
package cglibexample;  
  
import java.lang.reflect.Method;  
import net.sf.cglib.proxy.Enhancer;  
import net.sf.cglib.proxy.MethodInterceptor;  
import net.sf.cglib.proxy.MethodProxy;  
  
/** 
 * 定义一个HelloWorld类，没有实现接口 
 * 
 */  
class HelloWorld {  
  
    public void sayHelloWorld() {  
        System.out.println("HelloWorld!");  
    }  
}  
  
/** 
 * 通过Cglib实现在方法调用前后向控制台输出两句字符串 
 * 
 */  
class CglibProxy implements MethodInterceptor {  
  
    //要代理的原始对象  
    private Object obj;  
  
    public Object createProxy(Object target) {  
        this.obj = target;  
        Enhancer enhancer = new Enhancer();  
        // 设置要代理的目标类，以扩展它的功能  
        enhancer.setSuperclass(this.obj.getClass());  
        // 设置单一回调对象，在回调中拦截对目标方法的调用  
        enhancer.setCallback(this);  
        //设置类装载器  
        enhancer.setClassLoader(target.getClass().getClassLoader());  
        //创建代理对象  
        return enhancer.create();  
    }  
  
    /** 
     * 回调方法:在代理实例上拦截并处理目标方法的调用，返回结果 
     * 
     * @param proxy 代理类 
     * @param method 被代理的方法 
     * @param params 该方法的参数数组 
     * @param methodProxy 
     */  
    @Override  
    public Object intercept(Object proxy, Method method, Object[] params,  
            MethodProxy methodProxy) throws Throwable {  
        Object result = null;  
        // 调用之前  
        doBefore();  
        // 调用目标方法，用methodProxy,  
        // 而不是原始的method，以提高性能  
        result = methodProxy.invokeSuper(proxy, params);  
        // 调用之后  
        doAfter();  
        return result;  
    }  
  
    private void doBefore() {  
        System.out.println("before method invoke");  
    }  
  
    private void doAfter() {  
        System.out.println("after method invoke");  
    }  
}  
  
public class TestCglib {  
  
    public static void main(String[] args) {  
        CglibProxy cglibProxy = new CglibProxy();  
        HelloWorld hw = (HelloWorld) cglibProxy.createProxy(new HelloWorld());  
        hw.sayHelloWorld();  
    }  
}  
　　输出结果：
[plain] view plain copy
before method invoke  
HelloWorld!  
after method invoke  
　　基本流程：需要自己写代理类，它实现MethodInterceptor接口，有一个intercept()回调方法用于拦截对目标方法的调用，里面使用methodProxy来调用目标方法。创建代理对象要用Enhance类，用它设置好代理的目标类、有intercept()回调的代理类实例、最后用create()创建并返回代理实例。
　　3、使用CallbackFilter在方法层设置回调
　　net.sf.cglib.proxy.CallbackFilter允许我们在方法层设置回调（callback）。假如你有一个PersistenceServiceImpl类，它有两个方法：save和load，其中方法save需要权限检查，而方法load不需要权限检查。
[java] view plain copy
import com.lizjason.cglibproxy.PersistenceService;  
import java.lang.reflect.Method;  
import net.sf.cglib.proxy.CallbackFilter;  
  
/** 
 * A simple implementation of PersistenceService interface 
 */  
class PersistenceServiceImpl implements PersistenceService {  
  
    //需要权限检查  
    public void save(long id, String data) {  
        System.out.println(data + " has been saved successfully.");  
    }  
  
    //不需要权限检查  
    public String load(long id) {  
        return "Test CGLIB CallBackFilter";  
    }  
}  
  
/** 
 * An implementation of CallbackFilter for PersistenceServiceImpl 
 */  
public class PersistenceServiceCallbackFilter implements CallbackFilter {   
    //callback index for save method  
    private static final int SAVE = 0;  
    //callback index for load method  
    private static final int LOAD = 1;  
  
    /** 
     * Specify which callback to use for the method being invoked.  
     * @param method the method being invoked. 
     * @return  
     */  
    @Override  
    public int accept(Method method) {  
        //指定各方法的代理回调索引  
        String name = method.getName();  
        if ("save".equals(name)) {  
            return SAVE;  
        }  
        // for other methods, including the load method, use the  
        // second callback  
        return LOAD;  
    }  
}  
　　accept方法中对代理方法和回调进行了匹配，返回的值是某方法在回调数组中的索引。下面是PersistenceServiceImpl类代理的实现。
[java] view plain copy
...  
Enhancer enhancer = new Enhancer();  
enhancer.setSuperclass(PersistenceServiceImpl.class);  
//设置回调过滤器  
CallbackFilter callbackFilter = new PersistenceServiceCallbackFilter();  
enhancer.setCallbackFilter(callbackFilter);  
//创建各个目标方法的代理回调  
AuthorizationService authorizationService = ...  
Callback saveCallback = new AuthorizationInterceptor(authorizationService);  
Callback loadCallback = NoOp.INSTANCE;  
//顺序要与指定的回调索引一致  
Callback[] callbacks = new Callback[]{saveCallback, loadCallback };  
enhancer.setCallbacks(callbacks);  //设置回调  
...  
return (PersistenceServiceImpl)enhancer.create();  //创建代理对象  
　　在这个例子中save方法使用了AuthorizationInterceptor实例，load方法使用了NoOp实例。此外，你也可以通过net.sf.cglib.proxy.Enhancer.setInterfaces(Class[])方法指定代理对象所实现的接口。
　　除了为net.sf.cglib.proxy.Enhancer指定回调数组，你还可以通过net.sf.cglib.proxy.Enhancer.setCallbackTypes(Class[]) 方法指定回调类型数组。当创建代理时，如果你没有回调实例的数组，就可以使用回调类型。象使用回调一样，你必须使用net.sf.cglib.proxy.CallbackFilter为每一个方法指定一个回调类型索引。
　　4、使用Mixin
　　Mixin通过代理方式将多种类型的对象绑定到一个大对象上，这样对各个目标类型中的方法调用可以直接在这个大对象上进行。下面是一个例子。

[java] view plain copy
import net.sf.cglib.proxy.Mixin;  
  
interface MyInterfaceA {  
  
    public void methodA();  
}  
  
interface MyInterfaceB {  
  
    public void methodB();  
}  
  
class MyInterfaceAImpl implements MyInterfaceA {  
  
    @Override  
    public void methodA() {  
        System.out.println("MyInterfaceAImpl.methodA()");  
    }  
}  
  
class MyInterfaceBImpl implements MyInterfaceB {  
  
    @Override  
    public void methodB() {  
        System.out.println("MyInterfaceBImpl.methodB()");  
    }  
}  
  
public class Main {  
  
    public static void main(String[] args) {  
        //各个对象对应的类型  
        Class[] interfaces = new Class[]{MyInterfaceA.class, MyInterfaceB.class};  
        //各个对象  
        Object[] delegates = new Object[]{new MyInterfaceAImpl(), new MyInterfaceBImpl()};  
        //将多个对象绑定到一个大对象上  
        Object obj = Mixin.create(interfaces, delegates);  
        //直接在大对象上调用各个目标方法  
        ((MyInterfaceA)obj).methodA();  
        ((MyInterfaceB)obj).methodB();  
    }  
}  

动态生成Bean

　　我们知道，Java Bean包含一组属性字段，用这些属性来存储和获取值。通过指定一组属性名和属性值的类型，我们可以使用Cglib的BeanGenerator和BeanMap来动态生成Bean。下面是一个例子。
[java] view plain copy
import java.lang.reflect.Method;  
import java.util.HashMap;  
import java.util.Iterator;  
import java.util.Map;  
import java.util.Set;  
import net.sf.cglib.beans.BeanGenerator;  
import net.sf.cglib.beans.BeanMap;  
  
/** 
 * 动态实体bean 
 * 
 * @author cuiran 
 * @version 1.0 
 */  
class CglibBean {  
  
    //Bean实体Object  
    public Object object = null;  
    //属性map  
    public BeanMap beanMap = null;  
  
    public CglibBean() {  
        super();  
    }  
  
    @SuppressWarnings("unchecked")  
    public CglibBean(Map<String, Class> propertyMap) {  
        //用一组属性生成实体Bean  
        this.object = generateBean(propertyMap);  
        //用实体Bean创建BeanMap，以便可以设置和获取Bean属性的值  
        this.beanMap = BeanMap.create(this.object);  
    }  
  
    /** 
     * 给bean中的属性赋值 
     * 
     * @param property 属性名 
     * @param value 值 
     */  
    public void setValue(String property, Object value) {  
        beanMap.put(property, value);  
    }  
  
    /** 
     * 获取bean中属性的值 
     * 
     * @param property 属性名 
     * @return 值 
     */  
    public Object getValue(String property) {  
        return beanMap.get(property);  
    }  
  
    /** 
     * 得到该实体bean对象 
     * 
     * @return 
     */  
    public Object getObject() {  
        return this.object;  
    }  
  
    @SuppressWarnings("unchecked")  
    private Object generateBean(Map<String, Class> propertyMap) {  
        //根据一组属性名和属性值的类型，动态创建Bean对象  
        BeanGenerator generator = new BeanGenerator();  
        Set keySet = propertyMap.keySet();  
        for (Iterator i = keySet.iterator(); i.hasNext();) {  
            String key = (String) i.next();  
            generator.addProperty(key, (Class) propertyMap.get(key));  
        }  
        return generator.create();  //创建Bean  
    }  
}  
  
/** 
 * Cglib测试类 
 * 
 * @author cuiran 
 * @version 1.0 
 */  
public class CglibTest {  
  
    @SuppressWarnings("unchecked")  
    public static void main(String[] args) throws ClassNotFoundException { // 设置类成员属性  
        HashMap<String, Class> propertyMap = new HashMap<>();  
        propertyMap.put("id", Class.forName("java.lang.Integer"));  
        propertyMap.put("name", Class.forName("java.lang.String"));  
        propertyMap.put("address", Class.forName("java.lang.String")); // 生成动态Bean  
        CglibBean bean = new CglibBean(propertyMap);  
        // 给Bean设置值  
        bean.setValue("id", 123);  //Auto-boxing  
        bean.setValue("name", "454");  
        bean.setValue("address", "789");  
        // 从Bean中获取值，当然获得值的类型是Object  
        System.out.println(" >> id = " + bean.getValue("id"));  
        System.out.println(" >> name = " + bean.getValue("name"));  
        System.out.println(" >> address = " + bean.getValue("address"));  
        // 获得bean的实体  
        Object object = bean.getObject();  
        // 通过反射查看所有方法名  
        Class clazz = object.getClass();  
        Method[] methods = clazz.getDeclaredMethods();  
        for (Method curMethod : methods) {  
            System.out.println(curMethod.getName());  
        }  
    }  
}  
　　输出结果：
[java] view plain copy
 >> id = 123  
 >> name = 454  
 >> address = 789  
getAddress  
getName  
getId  
setName  
setId  
setAddress  

CGLIB轻松实现延迟加载

　　通过使用LazyLoader，可以实现延迟加载，即在没有访问对象的字段或方法之前并不加载对象，只有当要访问对象的字段或方法时才进行加载。下面是一个例子。
[java] view plain copy
import net.sf.cglib.proxy.Enhancer;  
import net.sf.cglib.proxy.LazyLoader;  
  
class TestBean {  
    private String userName;  
  
    /** 
     * @return the userName 
     */  
    public String getUserName() {  
        return userName;  
    }  
  
    /** 
     * @param userName the userName to set 
     */  
    public void setUserName(String userName) {  
        this.userName = userName;  
    }  
}  
  
//延迟加载代理类  
class LazyProxy implements LazyLoader {  
  
    //拦截Bean的加载，本方法会延迟处理  
    @Override  
    public Object loadObject() throws Exception {  
        System.out.println("开始延迟加载!");  
        TestBean bean = new TestBean(); //创建实体Bean  
        bean.setUserName("test");  //给一个属性赋值  
        return bean;  //返回Bean  
    }  
}  
  
public class BeanTest {  
  
    public static void main(String[] args) {  
        //创建Bean类型的延迟加载代理实例  
        TestBean bean = (TestBean) Enhancer.create(TestBean.class, new LazyProxy());  
        System.out.println("------");  
        System.out.println(bean.getUserName());  
    }  
}  
　　输出结果：
[java] view plain copy
------  
开始延迟加载!  
test  
　　我们创建TestBean类的延迟代理，通过LazyLoader中的loadObject()方法的拦截，实现对TestBean类的对象进行延迟加载。从输出可以看出，当创建延迟代理时，并没有立刻加载目标对象（因为还有输出“开始延迟加载!”），当通过代理访问目标对象的getUserName()方法时，就会加载目标对象。可见loadObject()是延迟执行的。
