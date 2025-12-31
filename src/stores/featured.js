// src/stores/itinerary.js

import { ref } from 'vue'
import { defineStore } from 'pinia'

// 1. 大量模擬使用者
const mockCommenters = [
  { nickname: '愛旅行的貓', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=cat' },
  { nickname: '背包客Jack', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=jack' },
  { nickname: '攝影師小李', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=lee' },
  { nickname: '快樂媽咪', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=mom' },
  { nickname: '山野達人', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=mountain' },
  { nickname: '美食獵人', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=foodie' },
  { nickname: '自由靈魂', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=soul' },
  { nickname: '週末旅人', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=weekend' },
  { nickname: '咖啡中毒者', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=coffee' },
  { nickname: '海邊的卡夫卡', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=kafka' },
  { nickname: '追風箏的人', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=kite' },
  { nickname: '城市漫遊者', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=city' },
  { nickname: '森林系女孩', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=forest' },
  { nickname: '極光獵人', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=aurora' },
  { nickname: '鐵道迷阿豪', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=train' },
  { nickname: '單車環島中', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=bike' },
  { nickname: '露營愛好者', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=camp' },
  { nickname: '潛水教練Max', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=dive' },
  { nickname: '文青小安', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ann' },
  { nickname: '歷史系書蟲', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=book' },
  { nickname: '飛行日記', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=fly' },
  { nickname: '抹茶控', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=matcha' },
  { nickname: '貓奴一號', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=cat1' },
  { nickname: '狗派大叔', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=dog' },
  { nickname: '甜點鑑賞家', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sweet' },
  { nickname: '老街探險隊', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=street' },
  { nickname: '秘境探索者', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=secret' },
  { nickname: '溫泉巡禮', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=hotspring' },
  { nickname: '夜市達人', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=nightmarket' },
  { nickname: '晨跑俱樂部', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=run' },
  { nickname: '瑜珈生活', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=yoga' },
  { nickname: '素食地圖', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=vege' },
  { nickname: '底片相機', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=film' },
  { nickname: '聽團仔', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=band' },
  { nickname: '博物館驚魂夜', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=museum' },
  { nickname: '建築欣賞', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=arch' },
  { nickname: '手作職人', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=craft' },
  { nickname: '花藝師Rose', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=rose' },
  { nickname: '煮夫日記', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=cook' },
  { nickname: '新手爸媽', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=parent' },
  { nickname: '退休生活', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=retire' },
  { nickname: '股票觀察家', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=stock' },
  { nickname: '科技阿宅', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=tech' },
  { nickname: '動漫迷', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=anime' },
  { nickname: 'Cosplayer', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=cos' },
  { nickname: '占星師', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=star' },
  { nickname: '塔羅日記', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=tarot' },
  { nickname: '水晶療癒', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=crystal' },
  { nickname: '身心靈探索', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=spiritual' },
  { nickname: '快樂小資女', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=petty' },
]

// 2. 豐富的留言內容庫
const commentTemplates = [
  '請問這個行程還有名額嗎？',
  '感覺很棒耶！想帶家人一起去。',
  '請問費用包含機票稅金嗎？',
  '這個季節去適合嗎？會不會太冷？',
  '已收藏！下次休假就去這裡。',
  '行程看起來很緊湊，長輩體力可以負荷嗎？',
  '請問集合地點在哪裡？',
  '照片好漂亮，期待！',
  '請問有素食餐點的安排嗎？',
  '如果是單人報名需要補房差嗎？',
  '請問導遊會講中文嗎？',
  '這個行程可以帶寵物嗎？',
  '請問小朋友（5歲）適合參加嗎？',
  '有沒有包含機場接送？',
  '請問需要給小費嗎？大概多少？',
  '住宿的飯店等級如何？',
  '行程中會有自由活動的時間嗎？',
  '請問購物站會不會強迫消費？',
  '有沒有早鳥優惠價？',
  '請問這個團通常幾個人成團？',
  '如果天氣不好行程會怎麼調整？',
  '請問可以延回嗎？',
  '之前參加過這家的團，導遊很專業！推推！',
  '看起來CP值很高耶！',
  '請問有詳細的每日行程表可以參考嗎？',
  '這個景點我一直很想去！',
  '請問刷卡有優惠嗎？',
  '請問保險的部分包含哪些？',
  '這團的伙食看起來很不錯。',
  '請問有其他出發日期嗎？這時間剛好沒空QQ',
  '好心動喔！揪團中～',
  '請問如果不參加自費行程可以在車上休息嗎？',
]

// 3. 生成隨機留言函數
const generateMockComments = (postId) => {
  const count = Math.floor(Math.random() * 5) + 5
  const shuffledCommenters = [...mockCommenters].sort(() => 0.5 - Math.random())

  return Array.from({ length: count }, (_, i) => {
    const commenter = shuffledCommenters[i % shuffledCommenters.length]
    const content = commentTemplates[Math.floor(Math.random() * commentTemplates.length)]

    return {
      id: `c-${postId}-${i}`,
      author: commenter.nickname,
      avatar: commenter.avatar,
      content: content,
      time: `${Math.floor(Math.random() * 24) + 1} 小時前`,
      likes: Math.floor(Math.random() * 20),
      replies: [],
      isLiked: false,
    }
  })
}

// 4. 模擬作者與旅行社
const mockAuthors = [
  {
    id: 101,
    nickname: '旅人Hannah',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Hannah',
    spiritAnimal: 'Cat',
  },
  {
    id: 102,
    nickname: '探險家Leo',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Leo',
    spiritAnimal: 'Eagle',
  },
  {
    id: 103,
    nickname: '背包客Mike',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mike',
    spiritAnimal: 'Wolf',
  },
  {
    id: 104,
    nickname: '美食家Amy',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Amy',
    spiritAnimal: 'Panda',
  },
]

const mockAgencies = ['星空旅行社', '地球嚮導', '樂遊假期', '深度文化團', '極致探險隊']

// 5. 生成行程數據
const generateItinerary = (id) => {
  const isAgency = id % 3 !== 0
  const authorIndex = Math.floor(Math.random() * mockAuthors.length)
  const agencyName = isAgency ? mockAgencies[Math.floor(Math.random() * mockAgencies.length)] : null
  const days = Math.floor(Math.random() * 8) + 3
  const price = Math.round((Math.random() * 50000 + 15000) / 1000) * 1000
  const commentsArray = generateMockComments(id)

  return {
    id: id,
    title: `【${isAgency ? '旅行社' : '達人'}】精選行程體驗 #${id}`,
    agencyName: agencyName,
    author: mockAuthors[authorIndex],
    durationDays: days,
    destinations: ['東京', '大阪', '京都'],
    coverImage: `https://picsum.photos/500/350?random=${id + 20}`,
    summary: `這是一個為期 ${days} 天，充滿探索與驚喜的行程。`,
    price: price,
    totalViews: Math.floor(Math.random() * 10000) + 1000,
    totalSaves: Math.floor(Math.random() * 1500) + 100,
    comments: commentsArray,
    commentsCount: commentsArray.length,
    isFeatured: id % 5 === 0,
    fullContent: `這是行程 ID ${id} 的完整詳細內容...`,
  }
}

const itineraryData = Array.from({ length: 20 }, (_, i) => generateItinerary(i + 1))

// 🟢 修改處：使用 useItineraryStore (單數)，內部變數為 itineraries
export const useItineraryStore = defineStore('featured', () => {
  const itineraries = ref(itineraryData)

  const getItineraryById = (id) => {
    return itineraries.value.find((i) => i.id === id)
  }

  return { itineraries, getItineraryById }
})
