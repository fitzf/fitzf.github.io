---
title: Docker的Secrets管理
tags:
  - Docker
  - Secret
categories:
  - 容器技术
abbrlink: b8062d72
date: 2017-05-18 20:41:58
---
我相信当我们意识到重要且敏感的访问信息已经暴露到公共网络上，并可能使您的微服务无条件被访问。随着我们依赖于的开发出来的服务化的量不断增加， 这时跟踪敏感细节的数量也有所增加。为了应对这个问题，在“secrets managemen”领域出现了工具。

在这篇文章中，我们将看Docker Secrets，要求在Docker 1.13及更高版本的新秘密管理功能。

从Docker的角度来看，该功能不需要太多的工作，但是您可能需要重构应用程序以利用它。我们将介绍如何做到这一点的想法，但不是详细的。

Docker的 Secrets只适用于Docker群集，主要是因为这是秘密管理最有意义的领域。毕竟，Swarm是针对多个Docker实例需要在他们之间共享访问细节的生产用途。如果要在独立容器中使用秘密管理，则需要运行

scale值设置为1 的容器。适用于Mac和Windows的Docker不支持多节点群集模式，但您可以使用它们使用Docker Machine创建多节点群集。

创建两个机器，然后创建一个两个节点，并从该组中的一个swarm环境中运行本文中的案例。

### 获得Secrets

当您从命令行创建Secrets时，您可以使用所有可用的工具来创建随机密码和管道输出。例如，为数据库用户创建一个随机密码：

opensslrand-base6420|dockersecretcreatemariadb_password-

这将返回一个秘密的ID。

您需要再次发出此命令以生成MariaDB root用户的密码。您将需要这样才能开始使用，但您不需要为每项服务。

opensslrand-base6420|dockersecretcreatemariadb_root_password-

如果你已经忘记了你创建的秘密， 可以用ls查看，也可以用以下命令查看docker secret ls

### 替换secrets

为了保持秘密，良好的秘密，服务之间的通信发生在您定义的覆盖网络中。它们只能通过调用其ID来在该覆盖网络中使用。

dockernetworkcreate-doverlaymariadb_private

这也将返回该网络的ID。再次，你可以docker network ls查看相关网络

### 创建服务

这个例子将有一个Docker节点运行MariaDB，一个运行Python的节点。在最终的应用程序中，Python应用程序将读取和写入数据库。

首先，添加一个MariaDB服务。此服务使用您创建的网络进行通信，之前创建的秘密保存为两个文件：一个用于根密码，一个用于默认用户密码。然后将所需的所有变量作为环境变量传递给服务。

dockerservicecreate\ --namemariadb\ --replicas1\ --networkmariadb_private\ --mounttype=volume,source=mydata,destination=/var/lib/mariadb\ --secretsource=mariadb_root_password,target=mariadb_root_password\ --secretsource=mariadb_password,target=mariadb_password\ -eMARIADB_ROOT_PASSWORD_FILE="/run/secrets/mariadb_root_password"\ -eMARIADB_PASSWORD_FILE="/run/secrets/mariadb_password"\ -eMARIADB_USER="python"\ -eMARIADB_DATABASE="python"\

Python实例再次使用您创建的专用网络，并复制网络中可访问的秘密。一个更好的（生产就绪的）选项将是创建您的应用程序在管理程序中需要的数据库，而不会给应用程序访问根密码，但这仅仅是一个例子。

dockerservicecreate\ --namecspython\ --replicas1\ --networkmariadb_private\ --publish50000:5000\ --mounttype=volume,source=pydata,destination=/var/www/html\ --secretsource=mariadb_root_password,target=python_root_password,mode=0400\ --secretsource=mariadb_password,target=python_password,mode=0400\ -ePYTHON_DB_USER="python"\ -ePYTHON_DB_ROOT_PASSWORD_FILE="/run/secrets/python_root_password"\ -ePYTHON_DB_PASSWORD_FILE="/run/secrets/python_password"\ -ePYTHON_DB_HOST="mariadb:3306"\ -ePYTHON_DB_NAME="python"\

上面的示例使用我创建的一个简单的Docker映像，它设置用于使用Flask创建Web应用程序的软件包，用于提供Web页面和PyMySQL来进行数据库访问。代码没有做太多，但显示了如何从Docker容器访问环境变量。

例如，要连接到没有指定数据库的数据库服务器：

importos importMySQLdb db=MySQLdb.connect(host=os.environ['PYTHON_DB_HOST'], user=os.environ['PYTHON_DB_ROOT_USER'], passwd=os.environ['PYTHON_DB_PASSWORD_FILE']) cur=db.cursor() print(db) db.close()

更新secrets

频繁更改敏感信息是个好习惯。但是，您可能知道，在应用程序中更新这些细节是一个沉闷的过程，最不愿意避免。通过服务，Docker Secrets管理允许您更改值，而无需更改代码。

创建一个新秘密：

opensslrand-base6420|dockersecretcreatemariadb_password_march-

从MariaDB服务中删除当前密码的访问权限：

dockerserviceupdate\ --secret-rmmariadb_password\

并让它访问新的秘密，将目标指向新的值：

dockerserviceupdate\ --secret-addsource=mariadb_password_march,target=mysql_password\

更新Python服务：

dockerserviceupdate\ --secret-rmmariadb_password\ --secret-addsource=mariadb_password_march,target=python_password,mode=0400\

并删除旧秘密：

dockersecretrmmariadb_password

### 扩展说明

Docker Secrets是一个新功能，但Docker鼓励镜像维护人员尽快为Docker用户提供更好的安全性。这需要允许与上述示例类似的过程，其中容器可以从通过生成秘密而不是硬编码到应用中创建的文件来读取其需要的每个参数。这可以强制实施集装箱应用程序，因为容器可以来回走动，但是始终可以访问您的应用程序运行所需的重要信息。
