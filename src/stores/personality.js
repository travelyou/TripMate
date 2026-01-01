import { defineStore } from 'pinia'

// 題目資料
const QUESTIONS = [
  {
    id: 1,
    question: '出發前一週，你通常在做什麼？',
    options: [
      { label: '行程、交通、餐廳都查好了 ✈️', value: 'J' },
      { label: '到時候再看心情 😎', value: 'P' },
    ],
  },
  {
    id: 2,
    question: '旅行中突然多出半天空檔，你會？',
    options: [
      { label: '揪大家一起決定要去哪 🗺️', value: 'E' },
      { label: '自己找個地方放空 ☕', value: 'I' },
    ],
  },
  {
    id: 3,
    question: '以下哪種行程最吸引你？',
    options: [
      { label: '經典景點＋必吃美食 📸', value: 'S' },
      { label: '私房路線＋神秘小店 🌌', value: 'N' },
    ],
  },
  {
    id: 4,
    question: '遇到突發狀況（下雨 / 取消）你會？',
    options: [
      { label: '冷靜想備案 ☔', value: 'T' },
      { label: '先顧大家心情 🧡', value: 'F' },
    ],
  },
  {
    id: 5,
    question: '團體旅行時，你通常是？',
    options: [
      { label: '氣氛製造機 ✨', value: 'E' },
      { label: '安靜配合型 👀', value: 'I' },
    ],
  },
  {
    id: 6,
    question: '旅行中你比較在意？',
    options: [
      { label: '吃住品質與安全 🛏️', value: 'S' },
      { label: '特別的體驗與故事 🎒', value: 'N' },
    ],
  },
  {
    id: 7,
    question: '朋友臨時改行程，你的第一反應？',
    options: [
      { label: '先看怎麼調整最合理 🧠', value: 'T' },
      { label: '先確認大家會不會不開心 ❤️', value: 'F' },
    ],
  },
  {
    id: 8,
    question: '旅行結束後，你最常做的是？',
    options: [
      { label: '整理照片、寫心得 📓', value: 'J' },
      { label: '回味當下的感覺 💭', value: 'P' },
    ],
  },
]

// 計分與對照工具

function calcMbti(answers) {
  const c = { E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 }
  answers.forEach((a) => a && c[a]++)
  const pick = (a, b) => (c[a] >= c[b] ? a : b)
  return `${pick('E', 'I')}${pick('S', 'N')}${pick('T', 'F')}${pick('J', 'P')}`
}

function mbtiToAnimalKey(mbti) {
  const E = mbti.includes('E')
  const J = mbti.includes('J')
  const S = mbti.includes('S') // N = !S

  if (E && J && S) return 'dog_leader'
  if (E && J && !S) return 'fox_planner'
  if (E && !J && S) return 'leopard_dash'
  if (E && !J && !S) return 'otter_free_spirit'
  if (!E && J && S) return 'bear_caretaker'
  if (!E && J && !S) return 'wolf_strategist'
  if (!E && !J && S) return 'turtle_slow'
  return 'cat_solo'
}

// 動物人格資料

const ANIMAL_PROFILES = {
  otter_free_spirit: {
    animalEmoji: '🦦',
    animalName: '水獺樂天',
    summary: '開心最重要，計畫只是參考。',
    tags: ['隨性', '愛體驗', '新鮮感', '氣氛王'],
    strengths: [
      '很會把平凡行程玩成精彩回憶',
      '遇到變動不容易崩潰，能快速轉念',
      '很適合帶動氣氛，旅伴跟你不無聊',
    ],
    pitfalls: ['太隨性可能錯過熱門景點/餐廳的預約時段', '行程彈性太大時，旅伴可能跟不上節奏'],
    oneLiner: '把「1 個必做預約」加進行程，其餘全部留給當下的驚喜。',
    compatibleBuddies: [
      {
        id: 'dog_leader',
        emoji: '🐶',
        name: '狗狗領隊',
        tagline: '合群照顧型',
        reason: '你負責玩，他負責把大家照顧好；節奏輕鬆但不會亂。',
        tags: ['好相處', '氣氛穩', '能協調'],
      },
      {
        id: 'monkey_adventure',
        emoji: '🐒',
        name: '猴子闖關',
        tagline: '點子多、愛嘗鮮',
        reason: '你們都不怕變動，臨時改行程反而更有趣。',
        tags: ['嘗鮮', '冒險', '即興'],
      },
      {
        id: 'bear_caretaker',
        emoji: '🐻',
        name: '熊熊管家',
        tagline: '舒適安心派',
        reason: '你們能互補：他幫你守住住宿與交通，你讓旅程更有驚喜。',
        tags: ['安心感', '互補', '不容易吵架'],
      },
    ],
  },

  fox_planner: {
    animalEmoji: '🦊',
    animalName: '狐狸策劃師',
    summary: '行程在我手上，玩得最有效率。',
    tags: ['行程控', '效率派', '掌控感', '準時派'],
    strengths: [
      '規劃能力強，行程幾乎不會踩雷',
      '時間安排精準，玩得到重點又不累',
      '遇到問題能快速做決策與替代方案',
    ],
    pitfalls: ['太在意照表操課，容易因小延誤不開心', '旅伴若偏隨性，可能覺得被管得太緊'],
    oneLiner: '把必去的 2–3 個點固定，其餘留白，旅程會更順也更快樂。',
    compatibleBuddies: [
      {
        id: 'bear_caretaker',
        emoji: '🐻',
        name: '熊熊管家',
        tagline: '舒適安心派',
        reason: '他顧住宿交通與細節，你顧節奏與效率，組隊超穩。',
        tags: ['互補', '安心感', '少失誤'],
      },
      {
        id: 'wolf_strategist',
        emoji: '🐺',
        name: '狼型規劃',
        tagline: '冷靜策略型',
        reason: '你們都重視品質與效率，討論行程像專業旅行團。',
        tags: ['同頻', '高效率', '低風險'],
      },
      {
        id: 'dog_leader',
        emoji: '🐶',
        name: '狗狗領隊',
        tagline: '合群照顧型',
        reason: '你負責排、他負責協調氣氛，團體旅行不容易吵架。',
        tags: ['能協調', '氣氛穩', '好溝通'],
      },
    ],
  },

  dog_leader: {
    animalEmoji: '🐶',
    animalName: '狗狗領隊',
    summary: '大家玩得開心，我就開心。',
    tags: ['合群', '照顧型', '氣氛製造', '好溝通'],
    strengths: [
      '很會照顧團體節奏，大家都覺得安心',
      '溝通與協調能力強，衝突容易被你化解',
      '自然會把旅程氣氛帶起來',
    ],
    pitfalls: ['太在意大家感受，可能把自己累壞', '遇到難搞旅伴容易委屈自己吞下去'],
    oneLiner: '你的任務不是照顧全部人：先顧好自己，氣氛才會真的好。',
    compatibleBuddies: [
      {
        id: 'otter_free_spirit',
        emoji: '🦦',
        name: '水獺樂天',
        tagline: '隨性體驗派',
        reason: '你顧秩序與協調，他負責讓旅程充滿驚喜與笑聲。',
        tags: ['互補', '好玩', '不無聊'],
      },
      {
        id: 'bear_caretaker',
        emoji: '🐻',
        name: '熊熊管家',
        tagline: '舒適安心派',
        reason: '你顧情緒，他顧細節，旅程幾乎不會出事。',
        tags: ['安心感', '穩', '少衝突'],
      },
      {
        id: 'leopard_dash',
        emoji: '🐆',
        name: '豹豹快閃',
        tagline: '行動快節奏',
        reason: '你能把他的衝勁整理成可行的節奏，不會一路亂衝。',
        tags: ['節奏掌控', '有效率', '玩得到重點'],
      },
    ],
  },

  leopard_dash: {
    animalEmoji: '🐆',
    animalName: '豹豹快閃',
    summary: '快狠準，玩完就走，踩點就是爽。',
    tags: ['行動派', '快節奏', '決策快', '城市踩點'],
    strengths: [
      '行動力超強，想到就去，完全不拖',
      '很會抓重點景點，短時間也能玩得很滿',
      '臨場反應快，遇到狀況能立刻換方案',
    ],
    pitfalls: ['節奏太快，旅伴可能跟不上或累爆', '容易忽略休息與用餐品質，後半段疲勞爆發'],
    oneLiner: '每 2–3 個點安排一次「補血休息」，你的續航會直接翻倍。',
    compatibleBuddies: [
      {
        id: 'fox_planner',
        emoji: '🦊',
        name: '狐狸策劃師',
        tagline: '效率規劃派',
        reason: '你負責衝，他負責排得剛好，快但不亂。',
        tags: ['高效率', '不踩雷', '節奏穩'],
      },
      {
        id: 'dog_leader',
        emoji: '🐶',
        name: '狗狗領隊',
        tagline: '合群照顧型',
        reason: '你衝的時候他能顧隊友狀態，避免團滅。',
        tags: ['能協調', '不吵架', '顧狀態'],
      },
      {
        id: 'raccoon_adapt',
        emoji: '🦝',
        name: '浣熊機動',
        tagline: '問題來了再解',
        reason: '你們都很機動，臨場改路線超順。',
        tags: ['機動', '不怕變動', '實戰派'],
      },
    ],
  },

  wolf_strategist: {
    animalEmoji: '🐺',
    animalName: '狼型規劃',
    summary: '安靜可靠，行程零失誤。',
    tags: ['穩定', '策略型', '風險控管', '低調可靠'],
    strengths: [
      '行程安排務實，幾乎不會踩雷或走冤枉路',
      '遇到突發狀況很冷靜，能穩住整團',
      '做事有條理，旅伴跟你出門很省心',
    ],
    pitfalls: ['太追求效率與正確，可能少了點「隨性樂趣」', '不太表達需求，容易默默不爽但不說'],
    oneLiner: '在行程裡塞 1 個「完全不計畫的時段」，你會更享受旅行。',
    compatibleBuddies: [
      {
        id: 'fox_planner',
        emoji: '🦊',
        name: '狐狸策劃師',
        tagline: '效率規劃派',
        reason: '你們同頻：品質、效率、備案都到位，超像專業隊伍。',
        tags: ['同頻', '低風險', '有效率'],
      },
      {
        id: 'bear_caretaker',
        emoji: '🐻',
        name: '熊熊管家',
        tagline: '舒適安心派',
        reason: '他顧舒適，你顧安排，旅程穩又舒服。',
        tags: ['安心感', '穩', '少衝突'],
      },
      {
        id: 'turtle_slow',
        emoji: '🐢',
        name: '烏龜慢旅',
        tagline: '慢節奏舒適派',
        reason: '他讓節奏更放鬆，你守住品質與安全感，剛剛好。',
        tags: ['平衡', '舒服', '續航高'],
      },
    ],
  },

  bear_caretaker: {
    animalEmoji: '🐻',
    animalName: '熊熊管家',
    summary: '住得舒服、走得安心，旅程才算成功。',
    tags: ['舒適派', '安心感', '細節控', '照顧型'],
    strengths: [
      '很會把旅程安排得舒適順暢，大家不容易累',
      '細節照顧到位：住宿、交通、備品都很齊全',
      '遇到狀況能穩住大家情緒，給人安全感',
    ],
    pitfalls: ['太重視舒適與安全，可能錯過一些刺激有趣的體驗', '容易替大家操心，導致自己壓力過大'],
    oneLiner: '舒適是你的超能力：把關鍵細節顧好，其餘就放心交給旅程。',
    compatibleBuddies: [
      {
        id: 'otter_free_spirit',
        emoji: '🦦',
        name: '水獺樂天',
        tagline: '隨性體驗派',
        reason: '你守住底線與舒適，他帶來驚喜與笑點，互補剛好。',
        tags: ['互補', '不會亂', '好玩'],
      },
      {
        id: 'dog_leader',
        emoji: '🐶',
        name: '狗狗領隊',
        tagline: '合群照顧型',
        reason: '你顧細節，他顧氣氛，團隊幸福感會很高。',
        tags: ['安心感', '氣氛穩', '少衝突'],
      },
      {
        id: 'fox_planner',
        emoji: '🦊',
        name: '狐狸策劃師',
        tagline: '效率規劃派',
        reason: '你顧舒適，他顧效率，旅程會又順又完整。',
        tags: ['穩', '有效率', '低踩雷'],
      },
    ],
  },

  turtle_slow: {
    animalEmoji: '🐢',
    animalName: '烏龜慢旅',
    summary: '慢慢走，細細看，旅程不急。',
    tags: ['慢旅', '放鬆', '細品', '續航高'],
    strengths: [
      '很會享受當下，景色與氛圍都能記很久',
      '節奏穩，旅程不容易累，適合長天數旅行',
      '對小細節敏感，常能發現別人忽略的美好',
    ],
    pitfalls: ['行程太鬆可能玩不到重點，留下遺憾', '遇到快節奏旅伴，容易被催到心情差'],
    oneLiner: '每天挑「1 個重點」就好：既不趕，也不會覺得沒玩到。',
    compatibleBuddies: [
      {
        id: 'cat_solo',
        emoji: '🐱',
        name: '貓咪獨旅',
        tagline: '自在空間派',
        reason: '你們都喜歡舒服自在，不會互相逼迫社交或趕行程。',
        tags: ['低干擾', '自在', '好相處'],
      },
      {
        id: 'bear_caretaker',
        emoji: '🐻',
        name: '熊熊管家',
        tagline: '舒適安心派',
        reason: '你們都重視舒適與續航，旅程穩又放鬆。',
        tags: ['舒服', '安心感', '少衝突'],
      },
      {
        id: 'wolf_strategist',
        emoji: '🐺',
        name: '狼型規劃',
        tagline: '冷靜策略型',
        reason: '他守住必要安排，你維持舒服節奏，互補不壓迫。',
        tags: ['平衡', '省心', '穩'],
      },
    ],
  },

  cat_solo: {
    animalEmoji: '🐱',
    animalName: '貓咪獨旅',
    summary: '想去哪就去哪，保有自己的空間感。',
    tags: ['獨旅', '感受派', '彈性', '自在'],
    strengths: [
      '很懂得照顧自己的節奏，旅行質感高',
      '能在旅途中充電，不需要一直社交也能很快樂',
      '對氣氛與細節敏感，容易找到好店與好角落',
    ],
    pitfalls: ['太需要空間時，旅伴可能覺得你很冷或難接近', '不愛溝通需求，容易默默不舒服'],
    oneLiner: '先講清楚「每天需要 1 小時自己的時間」，旅伴反而更好相處。',
    compatibleBuddies: [
      {
        id: 'turtle_slow',
        emoji: '🐢',
        name: '烏龜慢旅',
        tagline: '慢節奏舒適派',
        reason: '他不會逼你社交，你們都喜歡安靜舒服的旅程。',
        tags: ['低干擾', '自在', '慢旅'],
      },
      {
        id: 'bear_caretaker',
        emoji: '🐻',
        name: '熊熊管家',
        tagline: '舒適安心派',
        reason: '他會顧到必要細節，你能保有空間又不必操心。',
        tags: ['安心感', '省心', '好相處'],
      },
      {
        id: 'wolf_strategist',
        emoji: '🐺',
        name: '狼型規劃',
        tagline: '冷靜策略型',
        reason: '他把必要安排處理好，你維持自由與彈性，互不打擾。',
        tags: ['穩', '不干擾', '省心'],
      },
    ],
  },
}

// Pinia Store

export const usePersonalityStore = defineStore('personalityTest', {
  state: () => ({
    step: 'start',
    questions: [],
    currentIndex: 0,
    answers: [],
    result: null,
  }),

  getters: {
    currentQuestion(state) {
      return state.questions[state.currentIndex] || null
    },
    isLast(state) {
      return state.currentIndex >= state.questions.length - 1
    },
  },

  actions: {
    startTest() {
      this.questions = QUESTIONS
      this.currentIndex = 0
      this.answers = new Array(QUESTIONS.length).fill(null)
      this.result = null
      this.step = 'quiz'
    },

    selectAnswer(value) {
      this.answers[this.currentIndex] = value
    },

    next() {
      if (this.currentIndex < this.questions.length - 1) {
        this.currentIndex++
      }
    },

    prev() {
      if (this.currentIndex > 0) {
        this.currentIndex--
      }
    },

    finishTest() {
      const mbti = calcMbti(this.answers)

      // 用 8 種分組 key（對應 ANIMAL_PROFILES 的 key）
      const key = mbtiToAnimalKey(mbti)
      const profile = ANIMAL_PROFILES[key] || ANIMAL_PROFILES.cat_solo

      const shareLink = `${window.location.origin}/test`
      const shareText =
        `${profile.animalEmoji} 我是「${profile.animalName}」\n` +
        `${profile.summary}\n\n` +
        `#旅遊動物人格 ${profile.tags.map((t) => `#${t}`).join(' ')}\n\n` +
        `來測看看：${shareLink}`

      this.result = {
        key,
        mbti,
        shareLink,
        shareText,
        ...profile,
      }

      this.step = 'result'
      console.log('[finishTest]', { mbti, key, result: this.result })
    },
    resetTest() {
      this.step = 'start'
      this.questions = []
      this.currentIndex = 0
      this.answers = []
      this.result = null
    },
  },
})
