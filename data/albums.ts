// 本文件由 astr_zerasos_home 管理
export interface Photo { url: string; caption?: string; }
export interface Album { id: string; title: string; description: string; cover: string; date: string; photos: Photo[]; }

export const albums: Album[] = [
  {
    "id": "chatter-covers",
    "title": "说说杂谈用",
    "description": "默认封面图集，用于说说和杂谈",
    "cover": "https://opa-1316532755.cos.ap-guangzhou.myqcloud.com/zarasos-home/photo_04.jpg",
    "date": "2026.07",
    "photos": [
      { "url": "https://opa-1316532755.cos.ap-guangzhou.myqcloud.com/zarasos-home/photo_01.jpg", "caption": "原来的人" },
      { "url": "https://opa-1316532755.cos.ap-guangzhou.myqcloud.com/zarasos-home/photo_02.jpg", "caption": "星空漫游" },
      { "url": "https://opa-1316532755.cos.ap-guangzhou.myqcloud.com/zarasos-home/photo_03.jpg", "caption": "古都夕阳" },
      { "url": "https://opa-1316532755.cos.ap-guangzhou.myqcloud.com/zarasos-home/photo_04.jpg", "caption": "飞檐翘角" },
      { "url": "https://opa-1316532755.cos.ap-guangzhou.myqcloud.com/zarasos-home/photo_05.jpg", "caption": "青石板小路" }
    ]
  }
];
