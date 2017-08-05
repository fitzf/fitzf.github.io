---
title: 四个Kubernetes集群管理工具
author: Zhang Fei
date: 2017-05-18 20:33:40
tags:
  - Kubernetes
  - Docker
categories: [Essay]
---
几乎所有用过Kubernetes的人都会发现其缺点，随着大K在负载平衡和工作管理方面的重大改进，用户可以将注意力逐渐转移到其他地方了，这里有四个项目可以减轻Kubernetes集群管理的负载。

![Kubernetes](http://p1.pstatp.com/large/212f0004094fad2d1aa6)

# Kube-applier

Kubernetes成功的关键是其与除Google以外的IT厂商和产品的接触。云存储公司Box收购了Kubernetes，并开放了一些用于帮助其内部部署的项目，kube-applier就是这样一个项目。

作为Kubernetes服务运行的Kube-applier，为Gube仓库中托管的Kubernetes集群提供了一组声明性配置文件，并将其持续应用于集群中的pod。无论何时对定义文件进行任何更改，它们都将被自动提取并应用于相关的pod。

更改也可以按计划或按需应用。Kube应用程序每次运行时都会记录其行为，并提供与Prometheus兼容的指标，以便用户及时了解影响集群的行为。

# Kubetop

有时最简单的工具反而是最有用的，比如Kubetop，它用Python编写，Kubetop会列出所有当前运行的节点，这些节点上所有的pod，这些pod中的所有容器，每个节点的CPU和内存利用率，类似于Unix/Linux top的命令。它不应该用来替代更精细的日志记录或报告工具，因为它产生的信息太简单了，但有时候简单会让阅读Kubernetes集群报告更节省时间。

如果您只需要快速了解哪些因素和命令行影响了集群，这是一个很方便的选项。Kubernetes的kubectl也有类似的功能，但是Kubetop的输出格式更加整齐。

# Kubectx/K8senv

Kubernetes有一个“上下文”的概念，用于引用具有不同配置数据的离散集群。用kubectl命令行工具在上下文之间切换可能是冗长和笨拙的，所以第三方提出了在flash中切换上下文的方法。

一个简单的shell脚本，Kubectx可以为Kubernetes上下文分配短名称，并使用短名称在它们之间切换。将破折号（-）传递给kubectx，将被切换回以前的内容，而无需记住名称。该脚本还支持完成名称的选项卡，因此用户不必挖掘长名称并手动重新键入。

另外一个shell脚本K8senv要简单得多，但功能远远不够强大。例如，它不能在当前和最后一个上下文之间进行翻转。

# kubeadm-dind-cluster

如果你想启动一个本地的单节点Kubernetes实例进行测试，那么Kubernetes提供了一个很好的默认组件：Minikube。但是对于那些想要测试和开发多节点集群Kubernetes的人还有一个选择：Mirantis的kubeadm-dind-cluster（KDC）。

KDC通过使用Kubernetes的kubeadm应用程序来启动由Docker容器而不是VM组成的集群。这可以让您在使用Kubernetes时更快地重新启动集群，因此可以更快速地查看任何代码更改造成的影响，也可以在持续集成环境中使用KDC，而不会遇到嵌套虚拟化问题。KDC运行跨平台的Linux，MacOS，Windows，并且不需要Go安装，因为它使用了Dockerized构建的Kubernetes。