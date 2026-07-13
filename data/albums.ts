// 本文件由 astr_zerasos_home 管理
export interface Photo { url: string; caption?: string; }
export interface Album { id: string; title: string; description: string; cover: string; date: string; photos: Photo[]; }

export const albums: Album[] = [
  {
    "id": "chatter-covers",
    "title": "说说杂谈用",
    "description": "默认封面图集，用于说说和杂谈",
    "cover": "https://bu.dusays.com/2026/03/24/69c24230a5ff8.jpg",
    "date": "2026.07",
    "photos": [
      { "url": "https://bu.dusays.com/2026/03/31/69cb69bb530d8.jpg", "caption": "原来的人" },
      { "url": "https://bu.dusays.com/2026/03/24/69c24230de927.jpg", "caption": "星空漫游" },
      { "url": "https://bu.dusays.com/2026/03/24/69c24230a4efe.jpg", "caption": "古都夕阳" },
      { "url": "https://bu.dusays.com/2026/03/24/69c24230d661d.jpg", "caption": "青石板小路" },
      { "url": "https://bu.dusays.com/2026/03/24/69c24230de927.jpg", "caption": "飞檐翘角" }
    ]
  }
];
