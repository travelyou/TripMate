// src/stores/discussions.js
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchPosts, fetchPostById, createPost, updatePost, deletePost } from '@/api/posts'
import { db } from '@/firebase/config'
import { doc, getDoc } from 'firebase/firestore'

// --- 輔助數據：旅遊人格 ---
const travelPersonalities = [
  { emoji: '🦁', label: '樂天派' },
  { emoji: '🦉', label: '觀察家' },
  { emoji: '🦅', label: '冒險王' },
  { emoji: '🐺', label: '獨行者' },
  { emoji: '🐧', label: '慢活者' },
  { emoji: '🦊', label: '藝術家' },
  { emoji: '🐼', label: '美食家' },
  { emoji: '🦋', label: '追夢人' },
  { emoji: '🐢', label: '佛系派' },
  { emoji: '🐬', label: '交際花' },
]

// --- 輔助數據：可用標籤 ---
const availableTags = [
  '背包客',
  '打工度假',
  '歷史古蹟',
  '極光',
  '美食探索',
  '海島度假',
  '自駕遊',
  '攝影聖地',
  '跨年活動',
  '文化體驗',
  '登山健行',
  '省錢攻略',
  '住宿推薦',
  '交通指南',
  '單人旅行',
  '情侶出遊',
  '親子旅行',
  '城市漫遊',
  '深度旅遊',
  '療癒之旅',
  '沙灘排球',
  '潛水',
  '博物館',
  '咖啡廳巡禮',
]

// --- 輔助數據：核心留言內容數據庫 (共 70 則不同內容) ---
const allCommentContents = [
  // 1. 北海道/美食/雪景
  '雪景真的太夢幻了，請問雪胎在當地租車店好租嗎？',
  '三角市場的海鮮丼絕對是必吃！我去了兩次！',
  '小樽運河的夜景是不是要搶位子才能拍到沒人？',
  '天狗山的纜車停駛真的好可惜，希望你下次能看到！',
  '看到這麼多雪，我的單眼都快結冰了！請問相機防護怎麼做？',
  '超讚的遊記！期待看到更多關於札幌美食的介紹。',
  '請問是幾月去的呢？想避開人潮最多的時候。',
  // 2. 歐洲自助/窮遊
  '40天15萬太厲害了！跪求省錢攻略，想知道怎麼訂便宜機票。',
  '羅馬扒手真的超多，我上次差點被偷走護照！一定要小心！',
  '瑞士的物價真的是硬傷，但風景絕對值得！',
  '背包旅行需要帶多少重量才不會太累？',
  '一個人旅遊最大的挑戰是什麼？是寂寞嗎？',
  '巴黎的街頭咖啡廳文化很棒，但地鐵味道真的不太好。',
  '住青旅是不是分攤住宿費最好的方式？',
  // 3. 台灣環島/機車/人情味
  '機車環島的自由感無可取代！東部海岸線超療癒！',
  '老闆娘人真好！台灣最美的風景果然是人情味。',
  '蘇花公路現在騎起來安全性提升了嗎？有點害怕。',
  '逆時針環島是對的，把最美風景留到最後！',
  '環島是不是建議用一個禮拜以上比較不會趕？',
  '請問有沒有推薦的機車環島路線圖？',
  '下次環島可以考慮去台南吃爆所有小吃！',
  // 4. 曼谷/美食/高空酒吧
  'Jay Fai 的歐姆蛋排隊三小時值得嗎？我還在猶豫！',
  '高空酒吧的反差體驗真的很有趣，推薦哪間調酒？',
  '請問鄭王廟的泰服租借價格大概是多少？',
  '曼谷的 Grab 真的比計程車便宜又方便嗎？',
  '除了米其林，有推薦什麼在地人常吃的小店嗎？',
  '夜市文化真的超讚！泰國是永遠去不膩的國家。',
  '有沒有試試看泰式按摩？長途旅行後超需要！',
  // 5. 京都/賞楓/攝影
  '琉璃光院的倒影真的美到不真實！值得那個門票！',
  '嵐山小火車的富貴號要怎麼買才比較容易搶到？',
  '早上七點前的京都真的超棒，可以避開所有遊客。',
  '除了嵐山，還有哪裡是賞楓的私房景點？',
  '請問小火車沿途的楓葉紅了嗎？我準備下個月去！',
  '穿和服去拍照是不是很需要勇氣？',
  '我建議可以去永觀堂，那裡的夜楓非常壯觀。',
  // 6. 冰島/自駕/極光
  '看到極光大爆發真的太幸運了！恭喜！',
  '四輪驅動車租金是不是非常貴？需要注意什麼保險？',
  '冰島天氣變化真的很快，一定要多層次穿搭。',
  '請問是住在哪個區域看到極光的？有推薦的 APP 嗎？',
  '黑沙灘的玄武岩柱真的很特別，像外星基地。',
  '自駕環島的行程規劃大概要幾天比較不趕？',
  '自己煮飯真的可以省下很多錢，超市物價還可以接受。',
  // 7. 首爾/滑雪/烤肉
  '新手滑雪真的要請教練，不然摔一次會懷疑人生！',
  '滑完雪後的烤肉配燒酒，完美的收尾！',
  '芝山滑雪場的雪況怎麼樣？適合初學者嗎？',
  '漢南洞的確是年輕人很喜歡去的地方，小店很有設計感。',
  '手機會被凍到自動關機是常態，暖暖包很重要！',
  '請問滑雪的服裝和裝備是在當地租比較划算嗎？',
  '下次試試看韓國的汗蒸幕，放鬆肌肉超舒服！',
  // 8. 越南/峴港/放空
  '峴港的 CP 值真的高，五星級海景飯店太吸引人了！',
  '巴拿山的佛手橋雖然很美，但人擠人真的有點考驗耐心。',
  '美溪沙灘躺著發呆，這才是度假的真諦！',
  '請問越南咖啡推薦哪一種口味？我喜歡偏甜的。',
  '溝通不順利時，大家是用哪個翻譯軟體比較有效？',
  '有沒有推薦的峴港在地海鮮餐廳？',
  '一個人去峴港會不會很無聊？還是適合放空？',
  // 9. 紐約/跨年/瘋狂
  '時代廣場跨年真的是人生清單！但不能上廁所是極限挑戰！',
  '穿成人紙尿褲這段我笑了，真的要這麼拼嗎？',
  '現場氣氛一定超級棒，但真的等 12 小時嗎？太佩服了！',
  '請問清場後要怎麼快速離開？地鐵會不會塞爆？',
  '紐約冬天真的超冷，保暖衣物一定要準備好。',
  '我建議下次可以去中央公園跨年，雖然沒水晶球但比較舒適。',
  '看到紙花飛舞的照片，感覺所有的等待都值了！',
  // 10. 西藏/朝聖/淨化
  '坐青藏鐵路進藏是最好的選擇，風景變化很美。',
  '布達拉宮的莊嚴感，真的只有親臨現場才能感受。',
  '高海拔走路真的要慢，不然很容易高反。',
  '看著藏民磕長頭，那種信仰的力量令人動容。',
  '請問剛進藏時，有做什麼來預防高山症嗎？',
  '西藏真的是一次心靈的洗滌之旅，我打算明年去！',
  '建議可以帶點紅景天或高山藥品備用。',
]

// --- 輔助數據：文章模板 (確保內容超過 150 字) ---
const postTemplates = [
  {
    title: '🇯🇵 #北海道 札幌小樽五天四夜：雪國的浪漫與美食',
    content:
      '第一次在冬天造訪北海道，一下飛機就被滿世界的銀白震撼了！這次行程主要集中在札幌和小樽，兩地間的交通我們主要依靠 JR，非常方便。不得不推小樽運河的夜景，雖然遊客很多，但燈光映照在河面上的氛圍真的很夢幻，感覺時間都慢了下來。我們還去了著名的三角市場吃海鮮丼，那個螃蟹和海膽的鮮甜程度真的是人生新高度！特別提醒，大家冬天去一定要穿防滑鞋，路面真的超級滑！此外，我們也去了白色戀人公園，雖然很商業化，但拍照還是很出片的。這趟旅程雖然短暫，但充滿了幸福的回憶，強烈推薦給喜歡雪景和美食的朋友們。',
  },
  {
    title: '🇪🇺 #歐洲自助 義法瑞 40天窮遊挑戰成功！(附花費明細)',
    content:
      '終於完成了人生清單上的歐洲壯遊！這次單獨背包旅行，從羅馬進、巴黎出。我們嚴格控制預算，主要以青年旅館和自煮餐點為主，成功將總花費控制在 15 萬台幣以內！義大利的古蹟真的看不完，羅馬競技場的歷史厚重感無與倫比，但在羅馬地鐵真的要非常小心扒手。瑞士的風景美得像畫，隨便拍都能當桌布，但物價也是驚人的高，一杯咖啡的價格讓人心痛。最後一站巴黎，雖然地鐵有點髒亂，但在艾菲爾鐵塔下野餐的那個下午，看著夕陽西下，真的覺得一切辛苦都值得了。這趟旅程讓我學會了獨立和解決問題的能力，非常推薦給想挑戰自己的朋友。',
  },
  {
    title: '🇹🇼 #台灣環島 騎機車環島的那些人那些事',
    content:
      '原本以為環島只是在騎車，沒想到最美的風景真的是人。這次從西部出發，繞過南端，沿著東部海岸線騎行，在花蓮時遇到了大雨，整個人都濕透了。幸運的是，我躲進一家不起眼的咖啡店，老闆娘不僅熱情地招待我喝熱湯，還幫我烘乾了衣服，讓我覺得超級溫暖。蘇花公路雖然有點驚險，但看著太平洋的漸層藍，心裡的煩惱好像都被海風吹散了。這次環島總共花了九天，用慢速度重新認識我們的土地，發現了許多以前開車時忽略的美好細節。推薦大家這輩子一定要試一次，用機車的視角感受台灣的人情味與美景。',
  },
  {
    title: '🇹🇭 #曼谷 米其林街頭小吃與高空酒吧的反差體驗',
    content:
      '曼谷真的是一個充滿活力的城市！這次目標是吃遍米其林推薦的街頭小吃，Jay Fai 的蟹肉歐姆蛋排隊排了足足三小時，但咬下去那滿滿的蟹肉真的太銷魂了，覺得這三個小時的等待完全值得！白天穿梭在擁擠喧囂的街頭，享受泰奶和芒果糯米飯。晚上轉戰高空酒吧 Sky Bar，看著湄南河的夜景喝雞尾酒，跟白天的喧囂形成強烈對比，感覺來到了另一個世界。交通建議多利用 Grab 或是捷運，尖峰時刻的曼谷塞車真的會讓人崩潰，大家要抓好時間。這次的曼谷之旅，完美結合了平民美食和奢華享受，是味蕾和視覺的雙重盛宴。',
  },
  {
    title: '🇯🇵 #京都賞楓 嵐山小火車搶票心得與私房景點',
    content:
      '京都的秋天真的是紅色的！這次為了搶嵐山小火車的票，開賣當天早上五點就守在電腦前，幸好順利搶到第五車廂的富貴號，位置非常棒。沿途保津川的溪谷配上滿山楓紅，美到讓人捨不得眨眼。建議大家賞楓季一定要早起，早上七點前的京都街道，有一種難得的寧靜美，可以拍到沒有人的花見小路喔！除了著名的清水寺和金閣寺，我還推薦東福寺，那裡的楓葉密度非常高，是內行人才知道的私房景點。這次旅程唯一的遺憾是沒有看到夜楓，下次一定要再來彌補。',
  },
  {
    title: '🇮🇸 #冰島自駕 追尋歐若拉女神的七個夜晚',
    content:
      '冰島絕對是地球上最像外星球的地方！我們租了一台四輪驅動車環島，沿途經過了壯觀的瀑布、黑沙灘、還有巨大的冰河湖，每一個景點都讓人讚嘆大自然的鬼斧神工。最幸運的是在第三個晚上，我們在荒郊野外看到了極光大爆發！綠色、紫色的光帶在天空中舞動，當下真的感動到流淚，感覺所有的寒冷都被驅散了。自駕雖然有點挑戰，因為風很大，但卻能讓我們自由地停在任何想停留的地方。這趟旅程雖然噴了不少錢，但看到極光的那一刻，覺得每一分錢都花得值得，是一次永生難忘的經驗。',
  },
  {
    title: '🇰🇷 #首爾滑雪 新手滑雪裝備與教練課分享',
    content:
      '這是我第一次看到真正的雪！我們選擇了距離首爾較近的芝山滑雪場，搭乘接駁巴士很方便。對於完全沒有經驗的新手，強烈建議一定要請教練，不然真的會摔到懷疑人生，而且容易受傷。學會煞車和落葉飄之後，那種在雪地上滑行的速度感真的會上癮！滑完雪後去吃一頓熱騰騰的韓式烤肉配燒酒，簡直是人間享受。這次裝備是在當地租借的，價格合理，而且款式都很新。推薦給大家，滑雪真的是一項很棒的冬季運動，讓人充滿活力！',
  },
  {
    title: '🇻🇳 #越南峴港 放空度假首選：巴拿山與美溪沙灘',
    content:
      '如果想找個便宜又能享受度假感的地方，峴港真的是首選！機票住宿都超便宜，我們住五星級海景飯店一晚才三千多台幣，CP值超高。巴拿山的佛手橋雖然遊客很多，但真的很壯觀，記得要抓好時間上山。最喜歡的是美溪沙灘，沙子又白又細，在那裡躺一個下午發呆喝椰子水超愜意，完全放鬆身心。交通上，我們主要使用 Grab，價格透明又方便。是一趟 CP 值超高的放鬆之旅，適合所有想逃離城市喧囂的人。',
  },
  {
    title: '🇺🇸 #紐約跨年 時代廣場倒數的瘋狂體驗',
    content:
      '從小看電影就夢想著要在時代廣場跨年，今年終於圓夢了！我們中午 12 點就進場佔位置，等待的時間長達 12 個小時，要穿著成人紙尿褲因為不能上廁所，這真的是意志力的考驗，也是一種非常特別的經驗。等待的 12 個小時真的很漫長。但是！當水晶球降落，紙花漫天飛舞，現場幾十萬人一起合唱《New York, New York》的時候，那種氣氛真的震撼到起雞皮疙瘩，所有的等待都值得了。這是一生一定要體驗一次的瘋狂旅程，但下次我會選擇在溫暖一點的地方跨年。',
  },
  {
    title: '🇨🇳 #西藏 朝聖之旅：在布達拉宮前尋找內心的平靜',
    content:
      '西藏一直是我心中的淨土。坐了 40 個小時的青藏鐵路火車進藏，沿途的風景從草原變成雪山，真的美不勝收，是一場視覺的盛宴。到了拉薩，看到雄偉的布達拉宮，心裡充滿了敬畏，那種歷史的厚重感和信仰的力量讓人感動。在大昭寺前看著虔誠的藏民磕長頭，那種信仰的力量讓我很震撼。這裡的空氣很稀薄但很純淨，記得要準備好防高山症的藥物。這是一趟不僅是身體上的旅行，更是心靈上的朝聖之旅，推薦給所有對文化和信仰有興趣的朋友。',
  },
]

export const useDiscussionsStore = defineStore('discussions', () => {
  // 🎯 Store 名稱變更

  // 輔助函式：從標籤庫中隨機選取 N 個標籤
  const getRandomTags = (count) => {
    if (count > availableTags.length) count = availableTags.length
    const shuffled = availableTags.sort(() => 0.5 - Math.random())
    return shuffled.slice(0, count)
  }

  // 輔助函式：生成留言數據 (確保留言數和回覆數一致)
  const generateComments = (postId) => {
    // 確保每篇文章能獲得一組不同的留言 (7則)
    const startIndex = (postId - 1) * 7
    const commentsSlice = allCommentContents.slice(startIndex, startIndex + 7)

    const generatedComments = commentsSlice.map((content, index) => {
      const commentId = postId * 1000 + index
      const authorName = `用戶${index + 1}${postId}`

      const comment = {
        id: commentId,
        author: authorName,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${authorName}`,
        content: content,
        time: `${1 + index}小時前`,
        likes: Math.floor(Math.random() * 20),
        isLiked: false,
        replies: [],
      }

      // 隨機在第 3 則留言下增加回覆
      if (index === 2) {
        comment.replies.push({
          id: postId * 10000 + index,
          author: '史努比',
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=reply-${postId}`,
          content: `@${authorName} 感謝您的提問！租車資訊我整理在文章後續更新中。`,
          time: '1分鐘前',
          likes: 3,
          isLiked: false,
        })
      }
      return comment
    })

    // 計算總留言數：主留言數 + 所有回覆數
    const totalCount =
      generatedComments.length + generatedComments.reduce((sum, c) => sum + c.replies.length, 0)

    return {
      commentsData: generatedComments,
      commentsCount: totalCount, // 用來更新 post.comments
    }
  }

    // --- 貼文資料（從 API 獲取） ---
    const discussions = ref([])
    const loading = ref(false)
    const error = ref(null)

    // 將後端數據格式轉換為前端格式
    const transformPost = (post) => {
    // 格式化時間（將 timestamp 轉換為 "X小時前" 格式）
    const formatTime = (timestamp) => {
      if (!timestamp) return '剛剛'
      const now = new Date()
      const postTime = new Date(timestamp)
      const diffMs = now - postTime
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
      const diffDays = Math.floor(diffHours / 24)

      if (diffDays > 0) return `${diffDays}天前`
      if (diffHours > 0) return `${diffHours}小時前`
      const diffMins = Math.floor(diffMs / (1000 * 60))
      if (diffMins > 0) return `${diffMins}分鐘前`
      return '剛剛'
    }

    // 格式化留言數據
    const formatComments = (comments) => {
      if (!Array.isArray(comments)) return []
      return comments.map((comment) => ({
        id: comment.id,
        author: comment.author_nickname || comment.author_uid || '匿名用戶',
        author_uid: comment.author_uid,
        avatar: comment.author_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.author_uid}`,
        time: formatTime(comment.created_at),
        content: comment.content,
        likes: comment.likes || 0,
        isLiked: comment.isLiked || false,
        replies: comment.replies || [],
        created_at: comment.created_at,
      }))
    }

    return {
      id: post.id,
      author: post.author_nickname || post.author_uid || '匿名用戶',
      author_uid: post.author_uid,
      spiritAnimal: post.author_spirit_animal || '',
      avatar: post.author_avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.author_uid}`,
      time: formatTime(post.created_at),
      title: post.title,
      content: post.content,
      image: post.image_urls && post.image_urls.length > 0 ? post.image_urls[0] : null, // 取第一張圖片
      image_urls: post.image_urls || [],
      likes: post.likes_count || post.likes || 0, // 從資料庫獲取按讚數
      comments: post.comments_count || post.comments || (post.commentsData ? post.commentsData.length : 0),
      tags: post.tags || [],
      commentsData: formatComments(post.commentsData || []), // 格式化留言數據
      board: post.board,
      created_at: post.created_at,
      updated_at: post.updated_at,
    }
  }

    // 從 Firestore 獲取用戶資訊
    const getUserInfoFromFirestore = async (uid) => {
      if (!uid) return null
      try {
        const userDocRef = doc(db, 'users', uid)
        const userDoc = await getDoc(userDocRef)
        if (userDoc.exists()) {
          return userDoc.data()
        }
      } catch (error) {
        console.error(`獲取用戶 ${uid} 資訊失敗：`, error)
      }
      return null
    }

    // 批量獲取用戶資訊並更新貼文
    const enrichPostsWithUserInfo = async (posts) => {
      // 獲取所有唯一的 author_uid
      const uniqueUids = [...new Set(posts.map(p => p.author_uid).filter(Boolean))]

      // 批量獲取用戶資訊
      const userInfoMap = {}
      await Promise.all(
        uniqueUids.map(async (uid) => {
          const userInfo = await getUserInfoFromFirestore(uid)
          if (userInfo) {
            userInfoMap[uid] = userInfo
          }
        })
      )

      // 更新貼文資訊
      return posts.map(post => {
        const userInfo = userInfoMap[post.author_uid]
        if (userInfo) {
          post.author_nickname = userInfo.nickname
          post.author_avatar = userInfo.avatar
          post.author_spirit_animal = userInfo.spiritAnimal
        }
        return post
      })
    }

    // 獲取所有貼文
    const loadDiscussions = async (page = 1, limit = 10) => {
      loading.value = true
      error.value = null
      try {
        const data = await fetchPosts(page, limit)
        // 從 Firestore 獲取用戶資訊並更新貼文
        const enrichedPosts = await enrichPostsWithUserInfo(data.posts)
        discussions.value = enrichedPosts.map(transformPost)
        return data
      } catch (err) {
        error.value = err.message
        console.error('獲取貼文失敗：', err)
        throw err
      } finally {
        loading.value = false
      }
    }

    // 獲取單個貼文詳情
    const loadPostById = async (id) => {
      loading.value = true
      error.value = null
      try {
        const post = await fetchPostById(id)
        // 從 Firestore 獲取貼文作者資訊
        if (post.author_uid) {
          const userInfo = await getUserInfoFromFirestore(post.author_uid)
          if (userInfo) {
            post.author_nickname = userInfo.nickname
            post.author_avatar = userInfo.avatar
            post.author_spirit_animal = userInfo.spiritAnimal
          }
        }

        // 從 Firestore 獲取留言作者資訊
        if (post.commentsData && Array.isArray(post.commentsData)) {
          const commentUids = [...new Set(post.commentsData.map(c => c.author_uid).filter(Boolean))]
          const commentUserInfoMap = {}
          await Promise.all(
            commentUids.map(async (uid) => {
              const userInfo = await getUserInfoFromFirestore(uid)
              if (userInfo) {
                commentUserInfoMap[uid] = userInfo
              }
            })
          )

          post.commentsData = post.commentsData.map(comment => ({
            ...comment,
            author_nickname: commentUserInfoMap[comment.author_uid]?.nickname,
            author_avatar: commentUserInfoMap[comment.author_uid]?.avatar,
            author_spirit_animal: commentUserInfoMap[comment.author_uid]?.spiritAnimal,
          }))
        }

        return transformPost(post)
      } catch (err) {
        error.value = err.message
        console.error('獲取貼文失敗：', err)
        throw err
      } finally {
        loading.value = false
      }
    }

    // 創建新貼文
    const addPost = async (postData) => {
      try {
        const newPost = await createPost(postData)

        // 從 Firestore 獲取作者資訊
        if (newPost.author_uid) {
          const userInfo = await getUserInfoFromFirestore(newPost.author_uid)
          if (userInfo) {
            newPost.author_nickname = userInfo.nickname
            newPost.author_avatar = userInfo.avatar
            newPost.author_spirit_animal = userInfo.spiritAnimal
          }
        }

        const transformedPost = transformPost(newPost)
        discussions.value.unshift(transformedPost) // 添加到開頭
        return transformedPost
      } catch (err) {
        console.error('建立貼文失敗：', err)
        throw err
      }
    }

    // 更新貼文
    const editPost = async (id, postData) => {
      try {
        const updatedPost = await updatePost(id, postData)
        const transformedPost = transformPost(updatedPost)
        const index = discussions.value.findIndex((p) => p.id === id)
        if (index !== -1) {
          discussions.value[index] = transformedPost
        }
        return transformedPost
      } catch (err) {
        console.error('更新貼文失敗：', err)
        throw err
      }
    }

    // 刪除貼文
    const removePost = async (id) => {
      try {
        await deletePost(id)
        discussions.value = discussions.value.filter((p) => p.id !== id)
      } catch (err) {
        console.error('刪除貼文失敗：', err)
        throw err
      }
    }


  return {
    discussions,
    loading,
    error,
    loadDiscussions,
    loadPostById,
    addPost,
    editPost,
    removePost,
  }
})

