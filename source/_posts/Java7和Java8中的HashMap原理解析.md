---
title: Java7和Java8中的HashMap原理解析
tags:
  - Java
  - Map
categories:
  - 源码分析
  - Java
abbrlink: 9cb319e
date: 2020-02-20 11:05:11
---
HashMap可能是面试的时候必问的题目了，面试官为什么都偏爱拿这个问应聘者？因为HashMap它的设计结构和原理比较有意思，它既可以考初学者对Java集合的了解又可以深度的发现应聘者的数据结构功底。
阅读前提：本文分析的是源码，所以至少读者要熟悉它们的接口使用，同时，对于并发，读者至少要知道CAS、ReentrantLock、Unsafe操作这几个基本的知识，文中不会对这些知识进行介绍。Java8用到了红黑树，不过本文不会进行展开，感兴趣的读者请自行查找相关资料。

## 1. Java7中HashMap

HashMap是最简单的，一来我们非常熟悉，二来就是它不支持并发操作，所以源码也非常简单。
首先，我们用下面这张图来介绍HashMap的结构。

![upload successful](/images/pasted-63.png)

大方向上，HashMap 里面是一个数组，然后数组中每个元素是一个单向链表。为什么是这种的结构，这涉及到数据结构方面的知识了。

### 1.1. HashMap的数据结构

数据结构中有数组和链表来实现对数据的存储，但这两者基本上是两个极端。
**数组**
数组存储区间是连续的，占用内存严重，故空间复杂的很大。但数组的二分查找时间复杂度小，为O(1)；数组的特点是：寻址容易，插入和删除困难；
**链表**
链表存储区间离散，占用内存比较宽松，故空间复杂度很小，但时间复杂度很大，为O(N)。
链表的特点是：寻址困难，插入和删除容易。
**哈希表**
那么我们能不能综合两者的特性，做出一种寻址容易，插入删除也容易的数据结构？答案是肯定的，这就是我们要提起的哈希表。哈希表(Hash table)既满足了数据的查找方便，同时不占用太多的内容空间，使用也十分方便。
哈希表有多种不同的实现方法，我接下来解释的是最常用的一种方法—— **拉链法**，我们可以理解为**“链表的数组”**，如图：

![upload successful](/images/pasted-64.png)

当添加数据的时候，整个结构大致如下：

![upload successful](/images/pasted-65.png)

从上图我们可以发现哈希表是由`数组+链表`组成的，一个长度为16的数组中，每个数组中元素存储的是一个链表的头结点。
那么这些元素是按照什么样的规则存储到数组中呢。一般情况我们首先想到的就是元素的 key 的哈希值对数组长度取模得到( `hash(key)%(length -1)`)，这样一来，元素的分布相对来说是比较均匀的。但是，“模”运算的消耗还是比较大的，能不能找一种更快速，消耗更小的方式那？Java中是这样做的：

```java
static int indexFor(int h, int length) {  
   return h & (length-1);  
}
```

我们知道每个数据对象的hash对应唯一一个值，但是一个hash值不一定对应唯一的数据对象。如果两个不同对象的 hashCode 相同，此情况即称为**哈希冲突**。
比如上述HashMap中，12%16=12，28%16=12，108%16=12，140%16=12。所以12、28、108以及140都存储在数组下标为12的位置，然后依次放在数组中该位置的链表上。
> **注意：**
> 对于那些hash冲突的数据，最新(最后)put的值放在链表的头部，为什么这样做呢？因为我们程序设计中认为最新放进去的值它的使用率会更高些，放在链表头比较容易查询获取到。

HashMap里面实现一个静态内部类Entry，Entry包含四个属性：key，value，hash值和用于单向链表的 next。从属性key，value我们就能很明显的看出来Entry就是HashMap键值对实现的一个基础bean，我们上面说到HashMap的基础就是一个线性数组，这个数组就是Entry[]，Map里面的内容都保存在Entry[]里面。上图中，每个绿色的实体是嵌套类Entry的实例。

- **capacity**：当前数组容量，始终保持 `2^n`，可以扩容，扩容后数组大小为当前的2倍。
- **loadFactor**：负载因子，默认为`0.75`。
- **threshold**：扩容的阈值，等于 `capacity * loadFactor`。

> **注意问题：**
> 1、**扩容的数组的长度为什么保持 2^n？**
> 其实这是为了保证通过hash方式获取下标的时候分布均匀。数组长度为2的n次幂的时候，不同的key算得得index相同的几率较小，那么数据在数组上分布就比较均匀，也就是说碰撞的几率小，相对的，查询的时候就不用遍历某个位置上的链表，这样查询效率也就较高了。
> 2、**为什么负载因子的值默认为 0.75？**
> 加载因子是表示Hash表中元素的填满的程度。
> 加载因子越大，填满的元素越多，空间利用率越高，但冲突的机会加大了。
> 反之,加载因子越小，填满的元素越少，冲突的机会减小，但空间浪费多了。
> 冲突的机会越大，则查找的成本越高。反之，查找的成本越小。
> 因此,必须在 "冲突的机会"与"空间利用率"之间寻找一种平衡与折衷。

### 1.2. put过程分析

还是比较简单的，跟着代码走一遍吧。

```java
public V put(K key, V value) {
    // 当插入第一个元素的时候，需要先初始化数组大小
    if (table == EMPTY_TABLE) {
        inflateTable(threshold);
    }
    // 如果 key 为 null，感兴趣的可以往里看，最终会将这个 entry 放到 table[0] 中
    if (key == null)
        return putForNullKey(value);
    // 1. 求 key 的 hash 值
    int hash = hash(key);
    // 2. 找到对应的数组下标
    int i = indexFor(hash, table.length);
    // 3. 遍历一下对应下标处的链表，看是否有重复的 key 已经存在，
    //    如果有，直接覆盖，put 方法返回旧值就结束了
    for (Entry<K,V> e = table[i]; e != null; e = e.next) {
        Object k;
        if (e.hash == hash && ((k = e.key) == key || key.equals(k))) {
            V oldValue = e.value;
            e.value = value;
            e.recordAccess(this);
            return oldValue;
        }
    }
    modCount++;
    // 4. 不存在重复的 key，将此 entry 添加到链表中，细节后面说
    addEntry(hash, key, value, i);
    return null;
}
```

### 1.3. 数组初始化(inflateTable)

在第一个元素插入HashMap的时候做一次数组的初始化，就是先确定初始的数组大小，并计算数组扩容的阈值。

```java
private void inflateTable(int toSize) {
    // 保证数组大小一定是 2 的 n 次方。
    // 比如这样初始化：new HashMap(20)，那么处理成初始数组大小是 32
    int capacity = roundUpToPowerOf2(toSize);
    // 计算扩容阈值：capacity * loadFactor
    threshold = (int) Math.min(capacity * loadFactor, MAXIMUM_CAPACITY + 1);
    // 算是初始化数组吧
    table = new Entry[capacity];
    initHashSeedAsNeeded(capacity); //ignore
}
```

这里有一个将数组大小保持为2的n次方的做法，Java7和Java8的HashMap和ConcurrentHashMap都有相应的要求，只不过实现的代码稍微有些不同，后面再看到的时候就知道了。

### 1.4. 计算具体数组位置(indexFor)

这个简单，我们自己也能YY一个：使用key的hash值对数组长度进行取模就可以了。

```java
static int indexFor(int hash, int length) {
    // assert Integer.bitCount(length) == 1 : "length must be a non-zero power of 2";
    return hash & (length-1);
}
```

这个方法很简单，简单说就是取hash值的低n位。如在数组长度为32的时候，其实取的就是key的hash值的低5位，作为它在数组中的下标位置。

### 1.5. 添加节点到链表中(addEntry)

找到数组下标后，会先进行key判重，如果没有重复，就准备将新值放入到链表的表头。

```java
void addEntry(int hash, K key, V value, int bucketIndex) {
    // 如果当前 HashMap 大小已经达到了阈值，并且新值要插入的数组位置已经有元素了，那么要扩容
    if ((size >= threshold) && (null != table[bucketIndex])) {
        // 扩容，后面会介绍一下
        resize(2 * table.length);
        // 扩容以后，重新计算 hash 值
        hash = (null != key) ? hash(key) : 0;
        // 重新计算扩容后的新的下标
        bucketIndex = indexFor(hash, table.length);
    }
    // 往下看
    createEntry(hash, key, value, bucketIndex);
}
// 这个很简单，其实就是将新值放到链表的表头，然后 size++
void createEntry(int hash, K key, V value, int bucketIndex) {
    Entry<K,V> e = table[bucketIndex];
    table[bucketIndex] = new Entry<>(hash, key, value, e);
    size++;
}
```

这个方法的主要逻辑就是先判断是否需要扩容，需要的话先扩容，然后再将这个新的数据插入到扩容后的数组的相应位置处的链表的表头。

### 1.6. 数组扩容(resize)

前面我们看到，在插入新值的时候，如果当前的size已经达到了阈值，并且要插入的数组位置上已经有元素，那么就会触发扩容，扩容后，数组大小为原来的2倍。

```java
void resize(int newCapacity) {
    Entry[] oldTable = table;
    int oldCapacity = oldTable.length;
    if (oldCapacity == MAXIMUM_CAPACITY) {
        threshold = Integer.MAX_VALUE;
        return;
    }
    // 新的数组
    Entry[] newTable = new Entry[newCapacity];
    // 将原来数组中的值迁移到新的更大的数组中
    transfer(newTable, initHashSeedAsNeeded(newCapacity));
    table = newTable;
    threshold = (int)Math.min(newCapacity * loadFactor, MAXIMUM_CAPACITY + 1);
}
```

扩容就是用一个新的大数组替换原来的小数组，并将原来数组中的值迁移到新的数组中。
由于是双倍扩容，迁移过程中，会将原来table[i]中的链表的所有节点，分拆到新的数组的 `newTable[i]`和 `newTable[i + oldLength]` 位置上。如原来数组长度是16，那么扩容后，原来 table[0] 处的链表中的所有元素会被分配到新数组中 `newTable[0]` 和 `newTable[16]` 这两个位置。代码比较简单，这里就不展开了。

### 1.7. get过程分析

相对于put过程，get过程是非常简单的。

- 根据key计算hash值。
- 找到相应的数组下标：`hash & (length - 1)`。
- 遍历该数组位置处的链表，直到找到相等(==或equals)的key。

```java
public V get(Object key) {
    // 之前说过，key 为 null 的话，会被放到 table[0]，所以只要遍历下 table[0] 处的链表就可以了
    if (key == null)
        return getForNullKey();
    // 
    Entry<K,V> entry = getEntry(key);
    return null == entry ? null : entry.getValue();
}
```

**getEntry(key):**

```java
final Entry<K,V> getEntry(Object key) {
    if (size == 0) {
        return null;
    }
    int hash = (key == null) ? 0 : hash(key);
    // 确定数组下标，然后从头开始遍历链表，直到找到为止
    for (Entry<K,V> e = table[indexFor(hash, table.length)];
         e != null;
         e = e.next) {
        Object k;
        if (e.hash == hash &&
            ((k = e.key) == key || (key != null && key.equals(k))))
            return e;
    }
    return null;
}
```

## 2. Java8中HashMap

Java8对HashMap进行了一些修改，最大的不同就是利用了红黑树，所以其由 `数组+链表+红黑树 组成`。
根据Java7HashMap的介绍，我们知道，查找的时候，根据 hash 值我们能够快速定位到数组的具体下标，但是之后的话，需要顺着链表一个个比较下去才能找到我们需要的，时间复杂度取决于链表的长度，为O(n)。
**为了降低这部分的开销，在Java8中，当链表中的元素达到了8个时，会将链表转换为红黑树，在这些位置进行查找的时候可以降低时间复杂度为O(logN)。**
来一张图简单示意一下吧：

![upload successful](/images/pasted-66.png)

> 注意，上图是示意图，主要是描述结构，不会达到这个状态的，因为这么多数据的时候早就扩容了。

下面，我们还是用代码来介绍吧，个人感觉，Java8的源码可读性要差一些，不过精简一些。
Java7中使用Entry来代表每个HashMap中的数据节点，Java8中使用Node，基本没有区别，都是key，value，hash 和 next这四个属性，不过，Node只能用于链表的情况，红黑树的情况需要使用TreeNode。
我们根据数组元素中，第一个节点数据类型是Node还是TreeNode来判断该位置下是链表还是红黑树的。

### 2.1. put过程分析

```java
public V put(K key, V value) {
    return putVal(hash(key), key, value, false, true);
}
// 第三个参数 onlyIfAbsent 如果是 true，那么只有在不存在该 key 时才会进行 put 操作
// 第四个参数 evict 我们这里不关心
final V putVal(int hash, K key, V value, boolean onlyIfAbsent,
               boolean evict) {
    Node<K,V>[] tab; Node<K,V> p; int n, i;
    // 第一次 put 值的时候，会触发下面的 resize()，类似 java7 的第一次 put 也要初始化数组长度
    // 第一次 resize 和后续的扩容有些不一样，因为这次是数组从 null 初始化到默认的 16 或自定义的初始容量
    if ((tab = table) == null || (n = tab.length) == 0)
        n = (tab = resize()).length;
    // 找到具体的数组下标，如果此位置没有值，那么直接初始化一下 Node 并放置在这个位置就可以了
    if ((p = tab[i = (n - 1) & hash]) == null)
        tab[i] = newNode(hash, key, value, null);
    else {// 数组该位置有数据
        Node<K,V> e; K k;
        // 首先，判断该位置的第一个数据和我们要插入的数据，key 是不是"相等"，如果是，取出这个节点
        if (p.hash == hash &&
            ((k = p.key) == key || (key != null && key.equals(k))))
            e = p;
        // 如果该节点是代表红黑树的节点，调用红黑树的插值方法，本文不展开说红黑树
        else if (p instanceof TreeNode)
            e = ((TreeNode<K,V>)p).putTreeVal(this, tab, hash, key, value);
        else {
            // 到这里，说明数组该位置上是一个链表
            for (int binCount = 0; ; ++binCount) {
                // 插入到链表的最后面(Java7 是插入到链表的最前面)
                if ((e = p.next) == null) {
                    p.next = newNode(hash, key, value, null);
                    // TREEIFY_THRESHOLD 为 8，所以，如果新插入的值是链表中的第 8 个
                    // 会触发下面的 treeifyBin，也就是将链表转换为红黑树
                    if (binCount >= TREEIFY_THRESHOLD - 1) // -1 for 1st
                        treeifyBin(tab, hash);
                    break;
                }
                // 如果在该链表中找到了"相等"的 key(== 或 equals)
                if (e.hash == hash &&
                    ((k = e.key) == key || (key != null && key.equals(k))))
                    // 此时 break，那么 e 为链表中[与要插入的新值的 key "相等"]的 node
                    break;
                p = e;
            }
        }
        // e!=null 说明存在旧值的key与要插入的key"相等"
        // 对于我们分析的put操作，下面这个 if 其实就是进行 "值覆盖"，然后返回旧值
        if (e != null) {
            V oldValue = e.value;
            if (!onlyIfAbsent || oldValue == null)
                e.value = value;
            afterNodeAccess(e);
            return oldValue;
        }
    }
    ++modCount;
    // 如果 HashMap 由于新插入这个值导致 size 已经超过了阈值，需要进行扩容
    if (++size > threshold)
        resize();
    afterNodeInsertion(evict);
    return null;
}
```

和 Java7 稍微有点不一样的地方就是，Java7 是先扩容后插入新值的，Java8 先插值再扩容，不过这个不重要。

### 2.2. 数组扩容

resize()方法用于初始化数组或数组扩容，每次扩容后，容量为原来的2倍，并进行数据迁移。

```java
final Node<K,V>[] resize() {
    Node<K,V>[] oldTab = table;
    int oldCap = (oldTab == null) ? 0 : oldTab.length;
    int oldThr = threshold;
    int newCap, newThr = 0;
    if (oldCap > 0) { // 对应数组扩容
        if (oldCap >= MAXIMUM_CAPACITY) {
            threshold = Integer.MAX_VALUE;
            return oldTab;
        }
        // 将数组大小扩大一倍
        else if ((newCap = oldCap << 1) < MAXIMUM_CAPACITY &&
                 oldCap >= DEFAULT_INITIAL_CAPACITY)
            // 将阈值扩大一倍
            newThr = oldThr << 1; // double threshold
    }
    else if (oldThr > 0) // 对应使用 new HashMap(int initialCapacity) 初始化后，第一次 put 的时候
        newCap = oldThr;
    else {// 对应使用 new HashMap() 初始化后，第一次 put 的时候
        newCap = DEFAULT_INITIAL_CAPACITY;
        newThr = (int)(DEFAULT_LOAD_FACTOR * DEFAULT_INITIAL_CAPACITY);
    }
    if (newThr == 0) {
        float ft = (float)newCap * loadFactor;
        newThr = (newCap < MAXIMUM_CAPACITY && ft < (float)MAXIMUM_CAPACITY ?
                  (int)ft : Integer.MAX_VALUE);
    }
    threshold = newThr;
    // 用新的数组大小初始化新的数组
    Node<K,V>[] newTab = (Node<K,V>[])new Node[newCap];
    table = newTab; // 如果是初始化数组，到这里就结束了，返回 newTab 即可
    if (oldTab != null) {
        // 开始遍历原数组，进行数据迁移。
        for (int j = 0; j < oldCap; ++j) {
            Node<K,V> e;
            if ((e = oldTab[j]) != null) {
                oldTab[j] = null;
                // 如果该数组位置上只有单个元素，那就简单了，简单迁移这个元素就可以了
                if (e.next == null)
                    newTab[e.hash & (newCap - 1)] = e;
                // 如果是红黑树，具体我们就不展开了
                else if (e instanceof TreeNode)
                    ((TreeNode<K,V>)e).split(this, newTab, j, oldCap);
                else { 
                    // 这块是处理链表的情况，
                    // 需要将此链表拆成两个链表，放到新的数组中，并且保留原来的先后顺序
                    // loHead、loTail 对应一条链表，hiHead、hiTail 对应另一条链表，代码还是比较简单的
                    Node<K,V> loHead = null, loTail = null;
                    Node<K,V> hiHead = null, hiTail = null;
                    Node<K,V> next;
                    do {
                        next = e.next;
                        if ((e.hash & oldCap) == 0) {
                            if (loTail == null)
                                loHead = e;
                            else
                                loTail.next = e;
                            loTail = e;
                        }
                        else {
                            if (hiTail == null)
                                hiHead = e;
                            else
                                hiTail.next = e;
                            hiTail = e;
                        }
                    } while ((e = next) != null);
                    if (loTail != null) {
                        loTail.next = null;
                        // 第一条链表
                        newTab[j] = loHead;
                    }
                    if (hiTail != null) {
                        hiTail.next = null;
                        // 第二条链表的新的位置是 j + oldCap，这个很好理解
                        newTab[j + oldCap] = hiHead;
                    }
                }
            }
        }
    }
    return newTab;
}
```

### 2.3. get过程分析

相对于put来说，get真的太简单了。

- 计算key的hash值，根据hash值找到对应数组下标: `hash & (length-1)`.
- 判断数组该位置处的元素是否刚好就是我们要找的，如果不是，走第三步.
- 判断该元素类型是否是TreeNode，如果是，用红黑树的方法取数据，如果不是，走第四步.
- 遍历链表，直到找到相等(==或equals)的key.

```java
public V get(Object key) {
    Node<K,V> e;
    return (e = getNode(hash(key), key)) == null ? null : e.value;
}
```

```java
final Node<K,V> getNode(int hash, Object key) {
    Node<K,V>[] tab; Node<K,V> first, e; int n; K k;
    if ((tab = table) != null && (n = tab.length) > 0 &&
        (first = tab[(n - 1) & hash]) != null) {
        // 判断第一个节点是不是就是需要的
        if (first.hash == hash && // always check first node
            ((k = first.key) == key || (key != null && key.equals(k))))
            return first;
        if ((e = first.next) != null) {
            // 判断是否是红黑树
            if (first instanceof TreeNode)
                return ((TreeNode<K,V>)first).getTreeNode(hash, key);
            // 链表遍历
            do {
                if (e.hash == hash &&
                    ((k = e.key) == key || (key != null && key.equals(k))))
                    return e;
            } while ((e = e.next) != null);
        }
    }
    return null;
}
```

参考：

1. [Javadoop](https://javadoop.com/post/hashmap)
2. [HashMap中hash函数h & (length-1)详解](https://blog.csdn.net/sd_csdn_scy/article/details/55510453)
3. [HashMap](https://blog.csdn.net/doujinlong1/article/details/81196048)

> **原文：**[https://www.cnblogs.com/jajian/p/10385063.html](https://www.cnblogs.com/jajian/p/10385063.html)