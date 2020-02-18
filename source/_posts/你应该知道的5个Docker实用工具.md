---
title: 你应该知道的5个Docker实用工具
tags: Docker
categories:
  - Collection
abbrlink: 112e552d
date: 2017-05-27 13:44:37
---

【摘要】网上有很多不错的Docker工具，大部分在github上都是开源的。最近两年，我一直在使用Docker，并将其应用到了一些开发项目上。如果你刚开始使用Docker，你会发现它能应用到的实例远远多于预想。Docker能为你做更多，不会让你失望的！

Docker社区非常活跃，每天都有许多新的实用工具出现。因此，天天去检查更新，试图跟上社区的步伐确实有点困难。所以我在此分享在工作中收集到的一些有趣而实用的Docker工具，帮助大家提高日常工作效率。

下面开始一一介绍我在使用Docker的过程中找到的有用工具吧。

### watchtower：自动更新Docker容器

watchtower监视容器运行过程，并且能够捕捉到容器中的变化。当watchtower检测到有镜像发生变化，会自动使用新镜像重启容器。我在本地开发环境中创建的最后一个镜像就用到了watchtower。

watchtower本身就像一个Docker镜像，所以它启动容器的方式和别的镜像无异。运行watchtower的命令如下：

![upload successful](/images/pasted-4.png)

上面的代码中，我们用到了一个安装文件/var/run/docker.sock。这个文件主要用来使watchtower与Docker后台API交互。 interval30秒的选项主要用来定义watchtower的轮询间隔时间。watchtower还支持一些别的选项，具体可以查看他们的文档。

现在，开启一个容器，用watchtower来监控。

![upload successful](/images/pasted-8.png)

watchtower会开始监控friendlyhello容器。接下来我把新镜像push到Docker Hub，watchtower接下来就会检测到有新镜像可用。它会关掉容器，然后用新镜像重启容器。这里会用到我们刚刚传到运行命令中的选项，换句话说，容器会在4000:80 公共端口选项上开启。

默认情况下，watchtower会轮询Dockder Hub注册表查找更新的镜像。你也可以通过在环境变量REPO_USER和REPO_PASS中添加指定注册表证书，来设置watchtower轮询私有注册表。

了解更多watchtower的用法，我推荐watchtower文档。

### docker-gc：收集垃圾容器和镜像

docker-gc工具能够帮助Docker host清理不需要的容器和镜像。它可以删除存在一小时以上的容器。同时，它也可以删除没有容器的镜像。

docker-gc可以被当做脚本，也可以被视为容器。我们用容器方法运行docker-gc，用它来查找可以被删除的容器和镜像。

![upload successful](/images/pasted-9.png)

在上述命令中，我们安装Docker socket文件，这样docker-gc就可以和Docker API进行交互。设置环境变量DRY_RUN=1，查找可被删除的容器和镜像。如果我们不这样设置，docker-gc直接删除它们。所以在删除之前，还是先确认一下。以上代码的输出结果如下：

![upload successful](/images/pasted-10.png)

确认需要删除的容器和镜像之后，再次运行docker-gc来进行删除清理，这次就不用再设置DRY_RUN参数了。

![upload successful](/images/pasted-11.png)

上述命令运行后的输出会告诉你哪些容器和镜像已经被docker-gc删除。

了解更多docker-gc支持的选项，我推荐阅读docker-gc documentation。

### docker-slim：给你的容器瘦身

如果你对Docker镜像的大小有过担忧，docker-slim绝对是一丸灵丹妙药。

docker-slim工具可以通过静态和动态分析，针对你的“胖镜像”创建对应的“瘦镜像”。在Github上下载二进制文件，即可使用docker-slim。该二进制文件在Linux和Mac可用。下载之后添加到路径PATH。

我创建了一个Docker镜像示例应用“friendlyhello”，Docker官方文档中有用到。这个镜像的大小如下图所示，194MB。

![upload successful](/images/pasted-12.png)

这么简单的一个应用，我们就要下载194MB的数据。再来看看docker-slim究竟能让它“瘦”多少。

![upload successful](/images/pasted-13.png)

docker-slim工具先是对“胖镜像”进行一系列的检测，最终创建了对应的“瘦镜像”。看一下“瘦镜像”的大小：

![upload successful](/images/pasted-14.png)

正如上图所示，“瘦镜像”大小为24.9MB。开启容器，运行照旧。docker-slim对java、python、ruby、和Node.js应用都非常友好。

你自己也试一下吧，看看结果如何。以我个人的项目来说，我认为docker-slim在大部分情况下都能适用。阅读docker-slim文档了解更多。

### rocker：打破Dockerfile限制

很多Docker用户都用Dockerfile来构建镜像。Dockerfile是定义命令的声明方式，通过在命令行调用这些命令，可以对镜像进行操作。

rocker给Dockerfile的指令集增加了新的指令。rocker是由Grammaryly创建的，原意是用来解决Dockerfile格式的问题。Grammaryly团队写过一篇博客解释当初的动机。我建议你也看一下这篇博客，可以更好的理解rocker。他们在博客中提出的两个关键问题是：

Docker镜像的大小
构建速度缓慢
博客还提到了rocker添加的一些新指令。查看rocker文档了解更多。

MOUNT用来分享volume，这样依赖管理工具就可以重用。
FROM指令在Dockerfile中也存在。rocker添加了不止一条FROM指令。这就意味着，一个Rockerfile可以通过创建多个镜像。首个指令集使用所有依赖来创建artifact，第二个指令集可以使用已有的artifact。这种做法极大的降低了镜像的大小。
TAG用来标记处于不同构建阶段的镜像。这样一来就不在需要手动标记镜像了。
PUSH用来把镜像push到registry。
ATTACH用来和中间步骤交互，在debug的时候非常有用。
安装rocker，对Mac用户来说，只要运行几条brew命令就行了：

![upload successful](/images/pasted-15.png)

安装完成后，就可以使用rocker创建镜像。

![upload successful](/images/pasted-16.png)

创建镜像并将其push到Docker Hub，可以用下面这条命令：

![upload successful](/images/pasted-17.png)

rocker功能十分完备，了解更多，请参阅其文档。

### ctop：容器的顶层界面工具

ctop是我最近才开始使用的工具，它可以为多个容器提供实时显示的数据视图。如果你是Mac用户，可以按下面的命令安装ctop。

![upload successful](/images/pasted-18.png)

安装之后，只需配置DOCKER_HOST环境变量，即可使用ctop。

运行ctop命令，可以查看所有容器的状态。

运行

ctop-a命令，可以仅查看当前运行的容器。

ctop简单好用，查看机器上运行的容器非常方便。了解更多，请看ctop文档。