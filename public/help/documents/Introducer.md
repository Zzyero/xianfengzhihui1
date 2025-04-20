# 漫画生成软件介绍

## 一、漫画生成软件简介
  
漫画是一种以某现象、人物、事件为题材，运用夸张、比喻、象征等手法，对社会问题、政治现象、文化现象等进行讽刺、批评或表达的艺术形式。通过幽默或者讽刺的方式，漫画不仅能引发读者的思考和共鸣，还能够通过轻松的视觉表现形式传达深刻的观点和情感，在舆论宣传中被广泛使用。但漫画创作本身具有一定门槛，且宣传报道突发的热点事件往往要求创作者在较短时间内完成创作，这就对漫画创作者提出了较高的要求。
  
本软件主要包括漫画图像生成、智能修图、提示词增强等功能，主要支撑政治漫画和宣传漫画的成品制作，能够快速生成漫画底图并智能修改画面，提高漫画创作效率。

---

## 二、功能介绍
  
### (一) 漫画生成
  
#### 1、通用漫画生成
   
   
   输入文本描述，输出与描述基本相符的多种风格、多种场景的漫画，可以用于描述现象、宣传观点。

1. **下图一**：

   A cartoon-style image of an officer facing a group of people holding signs demonstrating.

   （一幅漫画风格的图片，画面上是一个军官面对着一群举着牌子示威的人）  
   
   ![图片1 [width:60%]](image1.png)
     
2. **下图**二：
     
   A comic-book style image of an entire Taiwanese island marked with dollar signs.

   （一幅漫画风格的图片，画面上是一整个台湾岛屿，岛上标着很多美元符号）

   ![图片2 [width:60%]](image2.jpeg)
     

#### 2、特定人物漫画生成
  
   可生成带有特定人物形象的漫画，目前支持的政治人物形象有赖清德、蔡英文、山姆大叔、特朗普等，漫画人物形象有身着迷彩、常服、体能的漫画军人形象等，该功能需要收集特 定人物的漫画数据进行训练，后续将持续扩展支持人物数量。

   1. （1）、部分政治人物形象:

      ![图片3 [width:20%]](image3.png)
      ![图片4 [width:20%]](image4.png)
      ![图片5 [width:20%]](image5.png)
      ![图片6 [width:20%]](image6.jpeg)

   2. （2）、宣传漫画人物形象:

      ![图片7 [width:20%]](image7.png)
      ![图片8 [width:20%]](image8.png)
      ![图片9 [width:20%]](image9.png)
      ![图片10 [width:20%]](image10.jpeg)
---

### (二) 智能修图
  
#### 1、局部重绘

   可对底图进行部分区域重绘，在已有底图的基础上，涂抹需要重新绘制的区域，并填写提示词描述进行区域重绘，方便修改漫画中效果不好的部分。
   
   ![图片11 [width:20rem] [text:原图]](image11.png) 
   ![图片12 [width:20rem] [text:涂抹重绘区域]](image12.png)
   ![图片13 [width:20rem] [text:最终图片]](image13.jpeg)
#### 2、去除背景

   上传图片后可一键去除背景，抠出画面的主体。

   ![图片14 [width:20rem] [text:原图]](image14.jpeg) 
   ![图片15 [width:20rem] [text:去除背景后]](image15.png)

#### 3、高清修复

   可增大图片的分辨率，使图片更加清晰。


   ![图片16 [width:20rem] [text:原图(158KB)]](image16.jpeg) 
   ![图片17 [width:20rem] [text:放大后(13.3MB)]](image17.jpeg)

#### 4、一键精修
   在生成的图像中可能会出现去噪不完全的情况，其表现在主体轮廓周围会出现彩色噪点，一键精修功能可去除噪点，使画面更加平滑、细致。对生成的漫画、人脸、物体表面有较好 的修复效果。


   ![图片18 [width:20rem] [text:原图]](image18.jpeg) 
   ![图片19 [width:20rem] [text:精修后]](image19.png)

#### 5、去除水印

   涂抹图片上的水印部分，可去除图片中的水印。


   ![图片20 [width:20rem] [text:原图]](image20.png) 
   ![图片21 [width:20rem] [text:去除水印后]](image21.jpeg)

#### 6、物体消除

   涂抹画面中需要消除的部分，可将其用合适的背景填充替换。


   ![图片22 [width:20rem] [text:原图]](image22.png) 
   ![图片23 [width:20rem] [text:消除物体后]](image23.jpeg)


---

### (三) 画廊
  
   由于生成模型的效果取决于模型参数的设置，对于同一画面描述需要更改参数多次生成才可 能达到满意的效果，画廊中记录着生成效果较好的图片信息，包含其文本描述、参数设置等 ，并支持手动添加标签以供查找，其能够方便使用者学习上手软件，熟悉不同参数的效果。 


   ![图片24 [width:40rem] [text:画廊界面]](image24.png) 


   ![图片25 [width:40rem] [text:图片详细信息]](image25.png)

---

### (四) 提示词增强

   由于生图模型需要输入专业的英文提示词才能达到良好的表现效果，专业英文提示词书写具 有特定格式，但需要一定的生图经验和英语基础，本功能基于国产大语言模型，能够实现理 解用户意图、生成专业的英文提示词，降低生图门槛。

1. 原输入：


   ```
   "写一份讽刺漫画的提示词,画面中心是特朗普化身小丑，
   踩着"125%关税"标牌堆砌的危楼，左手挥动写着"5000%"的锤子砸向地球仪，
   右腿被"美股暴跌"铁链缠住。背景中自由女神像头戴"企鹅税"项圈倾倒，
   抗议人群举着"物价飞涨"横幅如潮水涌来，地面裂痕蔓延出"反制"的岩浆。
   ```

2. 增强后：


   ```
      Satirical Political Cartoon in the Style of Banksy Meets Honore Daumier
   Central Figure: Donald Trump as grotesque clown with exaggerated red nose and 
   tiny hands Costume: Oversized stars-and-stripes jester suit with unraveling golden 
   threads Action 1: Crumbling skyscraper made of "125% Tariff" neon signs under clown 
   shoes Action 2: Swinging comically large hammer labeled "5000%" smashing cracked 
   globe (visible fissures showing "EU/China/Mexico" labels)
   Restraint: "Stock Crash" iron shackle on ankle dragging NASDAQ ticker tape chain
   Background 1: Leaning Statue of Liberty with "Tech Tax" penguin-shaped collar,
   torch replaced by burning dollar billsBackground 2: Protest wave carrying 
   "Inflation Surge" banners with supermarket price tags as cresting foam Foreground: 
   Lava cracks forming Chinese characters "Retaliatory Measures" in glowing magma
   Color Palette: High-contrast political cartoon red/blue with corruption yellow 
   accents Texturing: Crosshatched shadows mimicking newspaper print, speech bubbles 
   as policy documents Symbolism: Every element dripping with ironic metaphors 
   about trade wars Perspective: Dutch angle emphasizing instability
   ```
   ![图片26 [width:40rem] [text:前端页面展示]](image26.png)


---

## 三、任务和部分案例

### （一）赖清德窜访南岛
   台湾地区领导人赖清德于11月30日至12月6日展开所谓“繁荣南岛 智慧永续”之旅，窜访帕劳、图瓦卢、马绍尔群岛三国。这是赖清德上任后，首次窜访“友邦”并“过境”美国，是台湾 当局领导人就任后的例行操作，意在巩固所谓“邦交”，提升国际能见度，并借此勾连美国反 华势力，强化美台实质关系。

   生成的配图:

   ![图片27 [width:30%]](image27.jpeg)
   ![图片28 [width:30%]](image28.jpeg)

   ![图片29 [width:30%]](image29.jpeg)
   ![图片30 [width:30%]](image30.jpeg)

### （二）台年轻人拒绝服兵役
   台海网发“台年轻人花式拒绝服兵役”文章，其通过减肥、增重、断手指、躲境外等方式逃兵役。

   台湾网文章：

   ![图片31 [width:60%]](image31.png)

   生成的配图：

   ![图片32 [width:30%]](image32.png)
   ![图片33 [width:30%]](image33.png)

   ![图片34 [width:30%]](image34.png)
   ![图片35 [width:30%]](image35.png)



### （三）充电宝泄密事件警示教育案例
   ![图片36 [width:60%]](image36.png)

   


### （四）不要妄评妄议警示教育案例
   ![图片37 [width:60%]](image37.png)
    
   

### （五）其他政治人物漫画作品
   ![图片38 [width:30%]](image38.png)
   ![图片39 [width:30%]](image39.png)

   ![图片40 [width:30%]](image40.png)
   ![图片41 [width:30%]](image41.png)

   ![图片42 [width:30%]](image42.png)
   ![图片43 [width:30%]](image43.png)

   

---

## 四、配置要求

1. Windows 10/11系统的工作站
2. 配置英伟达显卡，显存不少于24G，安装对应版本的CUDA
3. 大于100G的存储空间