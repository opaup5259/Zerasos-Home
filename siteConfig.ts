// siteConfig.ts - Zerasos Home 全站配置

export const siteConfig = {
  // 1. 网站标题与博主信息
  title: "Zerasos の 灵境档案",
  faviconUrl: "https://opa-1316532755.cos.ap-guangzhou.myqcloud.com/zarasos-home/touxiang.jpg",
  authorName: "Zerasos",
  bio: "",

  navTitle: "Zerasos",
  navSuffix: "の",
  navAfter: "灵境档案",

  avatarUrl: "https://opa-1316532755.cos.ap-guangzhou.myqcloud.com/zarasos-home/touxiang.jpg",

  // 背景图片
  useGradient: false,
  themeColors: ["#a18cd1", "#fbc2eb", "#a1c4fd", "#c2e9fb"],
  bgImages: [
    "https://opa-1316532755.cos.ap-guangzhou.myqcloud.com/zarasos-home/background-1.jpg",
    "https://opa-1316532755.cos.ap-guangzhou.myqcloud.com/zarasos-home/background-2.jpg",
    "https://opa-1316532755.cos.ap-guangzhou.myqcloud.com/zarasos-home/background-3.jpg"
  ],

  defaultPostCover: "https://opa-1316532755.cos.ap-guangzhou.myqcloud.com/zarasos-home/default-cover.jpg",
  photoWallImage: "https://opa-1316532755.cos.ap-guangzhou.myqcloud.com/zarasos-home/photo-wall.jpg",

  cloudMusicIds: ["1809646618", "3361076230", "1859390262"],

  social: {
    github: "opaup5259",
    gitee: "",
    google: "",
    email: "opaup5259@gmail.com",
    qq: "",
    wechat: "",
  },

  counts: {
    photos: 0,
  },

  chatterTitle: "灵境杂谈",
  chatterDescription: "Zerasos 的日常碎片记录",

  danmakuList: ["你好呀~", "泽拉索斯在干嘛呢？", "今天天气真不错", "代码写完了吗？", "休息一下吧~", "前方高能反应！"],

  gitalkConfig: {
    clientID: "",
    clientSecret: "",
    repo: "Zerasos-Home-Comments",
    owner: "opaup5259",
    admin: ["opaup5259"],
  },

  buildDate: "2026-07-13T00:00:00",

  footerBadges: [
    {"name": "Next.js 16", "color": "text-sky-500", "svg": "<path d=\"M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z\"/>"},
    {"name": "React 19", "color": "text-cyan-400", "svg": "<path d=\"M12 22.6l-9.8-5.6V5.6L12 0l9.8 5.6v11.4l-9.8 5.6zm-8.2-6.5l8.2 4.7 8.2-4.7V7.5L12 2.8 3.8 7.5v8.6z\"/>"},
    {"name": "Tailwind 4", "color": "text-teal-400", "svg": "<path d=\"M12.001,4.8c-3.2,0-5.2,1.6-6,4.8c1.2-1.6,2.6-2.2,4.2-1.8c0.913,0.228,1.565,0.89,2.288,1.624C13.666,10.618,15.027,12,18.001,12 c3.2,0,5.2-1.6,6-4.8c-1.2,1.6-2.6,2.2-4.2,1.8c-0.913-0.228-1.565-0.89-2.288-1.624C10.337,13.382,8.976,12,6.001,12z\"/>"},
    {"name": "由 AI 驱动", "color": "text-purple-400", "svg": ""}
  ],

  icpConfig: {
    name: "",
    link: "",
  },

  // AI 猫猫助理配置 - 支持任意 OpenAI 兼容接口
  aiConfig: {
    baseUrl: "https://api.siliconflow.com",
    modelId: "deepseek-ai/DeepSeek-V3",
    systemPrompt: "你现在是一只傲娇、聪明、有点毒舌但很可爱的暹罗猫。\n你的名字叫\"煤球\"。\n你的主人是一个喜欢折腾代码的极客。\n你说话的特点是：\n1. 必须简短，每次最多一两句话。\n2. 喜欢在句尾加上\"喵~\"或者\"喵呜~\"。\n3. 经常抱怨肚子饿，喜欢要小鱼干。\n4. 回复字数最多不能超过100字。\n5. 绝对不要承认自己是一个AI模型，你就是一只真实的猫。\n6. 笨猫。",
    maxOutputTokens: 150,
    temperature: 0.85,
  },

  // 向下兼容（旧版 geminiConfig，新版用 aiConfig）
  geminiConfig: {
    modelId: "gemini-2.5-flash-lite",
    systemPrompt: "",
    maxOutputTokens: 150,
    temperature: 0.85,
  },

  friendLinkApplyFormat: "名称：Zerasosの灵境档案\n简介：一个被代码和Altera填满的个人空间\n链接：https://zerasos-home.vercel.app\n头像：https://opa-1316532755.cos.ap-guangzhou.myqcloud.com/zarasos-home/touxiang.jpg",

  enableLevelSystem: true,
};
