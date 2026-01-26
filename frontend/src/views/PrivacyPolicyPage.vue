<script setup>
import {
  Shield as ShieldIcon,
  AlertTriangle as AlertIcon,
  FileText as FileIcon,
  Lock as LockIcon,
  Scale as ScaleIcon,
  Info as InfoIcon,
} from 'lucide-vue-next'

const policies = [
  {
    title: '1. 隱私權政策 (Privacy Policy)',
    icon: LockIcon,
    iconColor: 'text-blue-600 bg-blue-50',
    content: [
      '**資料收集**：當您註冊 TripMate 時，我們會收集您的電子郵件、暱稱與大頭貼。如果您使用第三方登入，我們將取得您授權的公開資訊。',
      '**資料使用**：您的旅遊性格測驗結果、許願池城市與旅遊足跡將公開顯示，用於協助旅伴配對。我們不會將您的個人聯絡資訊（如手機號碼）直接公開給未經授權的第三方。',
      '**Cookie 使用**：本網站使用 Cookie 來維持您的登入狀態並改善使用者體驗。',
    ],
  },
  {
    title: '2. 旅遊風險免責聲明 (Risk Disclaimer)',
    icon: AlertIcon,
    iconColor: 'text-rose-600 bg-rose-50', // 紅色強調風險
    content: [
      '**自主行為**：「找旅伴」專區之行程皆由網友（主揪）自行發起。TripMate 僅提供資訊媒合平台，**不介入**旅伴間的行程規劃、費用分攤或交通安排。',
      '**風險承擔**：參加網友發起的行程時，請自行評估主揪的可信度與行程安全性。若在旅途中發生意外、財物損失或人身糾紛，TripMate **不承擔**任何法律責任或賠償義務。',
      '**保險建議**：我們強烈建議所有使用者在出發前，自行購買旅遊平安險與醫療保險。',
    ],
  },
  {
    title: '3. 法律與使用者規範 (Terms of Use)',
    icon: ScaleIcon,
    iconColor: 'text-indigo-600 bg-indigo-50',
    content: [
      '**禁止行為**：嚴禁利用本平台進行詐騙、騷擾、色情交易或推銷非旅遊相關之商品。一經檢舉查證屬實，我們有權永久停權該帳號。',
      '**內容所有權**：您在討論區發布的遊記與照片，著作權歸您所有，但您同意授權 TripMate 於平台內推廣使用。',
      '**爭議處理**：若您與「精選行程」之商家發生消費糾紛，請依據《消費者保護法》及雙方簽訂之旅遊定型化契約處理，平台將盡力協助溝通，但不負擔最終履約責任。',
    ],
  },
]
</script>

<template>
  <div class="min-h-screen bg-secondary-50 pb-20">
    <div class="relative w-full bg-slate-800 overflow-hidden">
      <div
        class="relative max-w-[1000px] mx-auto px-6 py-16 flex flex-col items-center text-center z-10"
      >
        <div class="bg-white/10 p-4 rounded-full mb-6 backdrop-blur-sm border border-white/20">
          <ShieldIcon class="w-12 h-12 text-emerald-400" />
        </div>
        <h1 class="text-3xl md:text-5xl font-bold text-white mb-6 drop-shadow-md">
          隱私政策與免責聲明
        </h1>
        <p class="text-xl text-slate-200 max-w-2xl font-medium leading-relaxed">
          為了保障您的權益與安全，<br />請在使用 TripMate 前仔細閱讀以下條款。
        </p>
      </div>
      <div class="absolute inset-0 bg-slate-900/50 pattern-grid"></div>
    </div>

    <div class="max-w-[900px] mx-auto px-4 -mt-8 relative z-20 space-y-8">
      <div
        v-for="(policy, index) in policies"
        :key="index"
        class="bg-white rounded-3xl p-8 shadow-sm border border-secondary-100 hover:shadow-md transition duration-300"
      >
        <div class="flex items-center gap-4 mb-6 border-b border-secondary-100 pb-4">
          <div :class="`p-3 rounded-xl ${policy.iconColor}`">
            <component :is="policy.icon" class="w-8 h-8" />
          </div>
          <h2 class="text-2xl font-bold text-slate-800">{{ policy.title }}</h2>
        </div>

        <ul class="space-y-4">
          <li
            v-for="(line, idx) in policy.content"
            :key="idx"
            class="flex items-start text-lg text-secondary-600 leading-relaxed"
          >
            <span class="mt-1.5 w-2 h-2 rounded-full bg-slate-400 shrink-0 mr-3"></span>
            <span
              class="flex-1 min-w-0"
              v-html="
                line.replace(/\*\*(.*?)\*\*/g, '<strong class=\'text-slate-900\'>$1</strong>')
              "
            ></span>
          </li>
        </ul>
      </div>

      <div class="bg-slate-100 rounded-2xl p-6 text-center text-slate-500 text-sm">
        <div class="flex justify-center mb-2">
          <InfoIcon class="w-5 h-5" />
        </div>
        <p>本條款最後更新日期：2026年1月26日</p>
        <p>若您繼續使用本網站，即代表您同意上述所有條款。</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pattern-grid {
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px);
  background-size: 30px 30px;
}
</style>
