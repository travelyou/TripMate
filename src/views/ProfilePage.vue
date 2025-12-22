<script setup>
import { ref, computed, reactive, watch } from 'vue';
import { useUserStore } from '@/stores/user';
import { useDiscussionsStore } from '@/stores/discussions';
import { useItineraryStore } from '@/stores/itinerary';
import PostCard from '@/components/posts/PostCard.vue';
import { Camera, Tag, Star, X, Plus, Settings } from 'lucide-vue-next';

// Store setup
const userStore = useUserStore();
const discussionsStore = useDiscussionsStore();
const itineraryStore = useItineraryStore();

const user = computed(() => userStore.currentUser);

// Mapping Itineraries to Post Structure for "Hosted Trips" tab
const hostedTrips = computed(() => {
    return itineraryStore.myItineraries.map(trip => ({
        id: trip.id,
        title: trip.title,
        content: trip.description,
        image: trip.image,
        author: user.value.name,
        avatar: user.value.avatar,
        time: trip.startDate,
        tags: ['行程', trip.status],
        hearts: 0,
        comments: trip.participants, // Mocking comments as participants number
        type: 'find_traveler',
        isAuthor: true
    }));
});

// Filter for Posts
const myPosts = computed(() => {
    let posts = discussionsStore.discussions.filter(p => p.author === user.value.name);
    return posts;
});

const activeTab = ref('hosted_trips');
const isCurrentUser = true;

// Edit Form State
const isEditingProfile = ref(false);
const editForm = reactive({});

// Init form
watch(() => userStore.currentUser, (newUser) => {
    Object.assign(editForm, JSON.parse(JSON.stringify(newUser)));
}, { immediate: true, deep: true });

function saveProfile() {
    userStore.updateProfile(editForm);
    isEditingProfile.value = false;
}

// Places Visited State
const newDomesticPlace = ref('');
const newDomesticDate = ref('');
const newInternationalPlace = ref('');
const newInternationalDate = ref('');

function addPlace(type) {
    const nameVal = type === 'domestic' ? newDomesticPlace.value.trim() : newInternationalPlace.value.trim();
    const dateVal = type === 'domestic' ? newDomesticDate.value : newInternationalDate.value;

    if (nameVal) {
        // Construct place object
        const newPlaceObj = { name: nameVal, date: dateVal || new Date().toISOString().slice(0, 7).replace('-', '.') };

        // Call store action
        userStore.addVisitedPlace(newPlaceObj, type);

        // Clear input
        if (type === 'domestic') { newDomesticPlace.value = ''; newDomesticDate.value = ''; }
        else { newInternationalPlace.value = ''; newInternationalDate.value = ''; }
    }
}

function removePlace(type, index) {
      const places = type === 'domestic' ? userStore.visitedPlaces.domestic : userStore.visitedPlaces.international;
      places.splice(index, 1);
}

// Wishlist Physics Logic
const ballContainer = ref(null);
function handleMouseMove(e) {
    if (!ballContainer.value) return;
    const balls = ballContainer.value.querySelectorAll('.wish-ball');
    const rect = ballContainer.value.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    balls.forEach(ball => {
        const ballRect = ball.getBoundingClientRect();
        const ballX = ballRect.left - rect.left + ballRect.width / 2;
        const ballY = ballRect.top - rect.top + ballRect.height / 2;

        const dx = ballX - mouseX;
        const dy = ballY - mouseY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = 100; // Interaction radius

        if (dist < minDist) {
            const force = (minDist - dist) / minDist;
            const moveX = (dx / dist) * force * 50; // Push strength
            const moveY = (dy / dist) * force * 50;

            ball.style.transform = `translate(${moveX}px, ${moveY}px)`;
        } else {
            ball.style.transform = 'translate(0, 0)';
        }
    });
}
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

    <!-- Profile Header -->
    <div class="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-3xl p-8 mb-8 text-white relative overflow-hidden shadow-xl">
      <div class="absolute inset-0 bg-black/10"></div>
      <div class="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
      <div class="absolute -bottom-24 -left-24 w-64 h-64 bg-indigo-900/20 rounded-full blur-3xl"></div>

      <div class="relative z-10 flex flex-col md:flex-row items-center md:items-end gap-6">
        <!-- Avatar -->
        <div class="relative group">
          <img
            class="w-32 h-32 rounded-full border-4 border-white/30 shadow-2xl object-cover bg-white"
            :src="user.avatar"
            alt="Avatar"
          />
          <button class="absolute bottom-2 right-2 p-2 bg-indigo-600 rounded-full border border-white/50 hover:bg-indigo-700 transition shadow-lg group-hover:scale-110">
            <Camera class="w-4 h-4 text-white" />
          </button>
        </div>

        <!-- User Info -->
        <div class="flex-1 text-center md:text-left">
          <div class="flex items-center justify-center md:justify-start gap-3 mb-2">
            <h1 class="text-3xl font-bold tracking-tight">{{ user.name }}</h1>
            <span v-if="user.nickname" class="px-3 py-1 bg-white/20 rounded-full text-sm font-medium backdrop-blur-sm">@{{ user.nickname }}</span>

            <!-- Settings Button (Only visible to owner) -->
            <button v-if="isCurrentUser" class="p-2 bg-white/20 hover:bg-white/30 rounded-full text-white transition backdrop-blur-sm" title="帳號設定" @click="isEditingProfile = true">
                <Settings class="w-5 h-5" />
            </button>
          </div>
          <p class="text-indigo-100 mb-4 max-w-xl text-lg font-light leading-relaxed">
            {{ user.bio || '這傢伙很懶，什麼都沒留下...' }}
          </p>
          <div class="flex flex-wrap justify-center md:justify-start gap-2">
            <span v-for="tag in user.tags" :key="tag" class="px-3 py-1 bg-indigo-800/40 rounded-lg text-xs font-medium text-indigo-100 border border-indigo-400/30 flex items-center">
              <Tag class="w-3 h-3 mr-1" /> {{ tag }}
            </span>
          </div>
        </div>

        <!-- Quick Stats -->
        <div class="flex gap-4 md:gap-8 bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
            <div class="text-center">
                <div class="text-2xl font-bold">{{ hostedTrips.length }}</div>
                <div class="text-xs text-indigo-200">主揪</div>
            </div>
            <div class="text-center">
                <div class="text-2xl font-bold">{{ myPosts.length }}</div>
                <div class="text-xs text-indigo-200">貼文</div>
            </div>
            <div class="text-center">
                <div class="text-2xl font-bold">{{ user.reviews ? user.reviews.length : 0 }}</div>
                <div class="text-xs text-indigo-200">好評</div>
            </div>
        </div>
      </div>
    </div>

    <!-- Main Grid Layout -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">

        <!-- Left Column: Content Tabs -->
        <div class="lg:col-span-2 space-y-6">
            <!-- Navigation Tabs -->
            <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-2 flex space-x-1">
                <button
                    v-for="tab in [{k:'hosted_trips', l:'主揪的旅行'}, {k:'visited_places', l:'去過的地方'}, {k:'posts', l:'貼文'}, {k:'reviews', l:'好評'}]"
                    :key="tab.k"
                    :class="['flex-1 py-3 text-sm font-semibold rounded-xl transition flex items-center justify-center gap-2', activeTab === tab.k ? 'bg-indigo-50 text-indigo-600 shadow-sm' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700']"
                    @click="activeTab = tab.k">
                    {{ tab.l }}
                </button>
            </div>

            <!-- Tab Content -->
            <div class="bg-white rounded-2xl shadow-sm border border-gray-100 min-h-[400px] p-6">

                <!-- 1. Hosted Trips -->
                <div v-if="activeTab === 'hosted_trips'" class="space-y-4">
                    <div v-if="hostedTrips.length > 0">
                        <PostCard v-for="post in hostedTrips" :key="post.id" :post="post" />
                    </div>
                    <div v-else class="text-center py-20 text-gray-400">
                        <p>還沒有發布過旅遊揪團喔！</p>
                    </div>
                </div>

                <!-- 2. Visited Places -->
                <div v-if="activeTab === 'visited_places'" class="space-y-8 animate-fade-in">
                    <!-- Domestic -->
                    <div>
                        <h3 class="font-bold text-gray-800 mb-4 flex items-center text-lg"><span class="text-indigo-500 mr-2">🇹🇼</span> 國內足跡</h3>
                        <div class="flex flex-wrap gap-3 mb-3">
                             <div v-for="(place, idx) in userStore.visitedPlaces.domestic" :key="idx" class="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg font-medium flex items-center group relative pr-10">
                                <div class="flex flex-col">
                                    <span>{{ place.name }}</span>
                                    <span class="text-[10px] text-indigo-400">{{ place.date }}</span>
                                </div>
                                <button v-if="isCurrentUser" class="absolute right-2 top-1/2 transform -translate-y-1/2 text-indigo-300 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition" @click="removePlace('domestic', idx)"><X class="w-4 h-4"/></button>
                             </div>
                        </div>
                        <div v-if="isCurrentUser" class="flex gap-2 max-w-md items-center">
                            <input v-model="newDomesticPlace" placeholder="新增國內城市..." class="px-4 py-2 border rounded-xl text-sm flex-1 focus:ring-2 focus:ring-indigo-500 outline-none" @keyup.enter="addPlace('domestic')" />
                            <input v-model="newDomesticDate" type="month" class="px-4 py-2 border rounded-xl text-sm w-32 focus:ring-2 focus:ring-indigo-500 outline-none text-gray-500" />
                            <button class="p-2 bg-gray-100 rounded-xl hover:bg-gray-200" @click="addPlace('domestic')"><Plus class="w-5 h-5 text-gray-600"/></button>
                        </div>
                    </div>
                     <!-- International -->
                    <div>
                        <h3 class="font-bold text-gray-800 mb-4 flex items-center text-lg"><span class="text-indigo-500 mr-2">✈️</span> 國外足跡</h3>
                        <div class="flex flex-wrap gap-3 mb-3">
                             <div v-for="(place, idx) in userStore.visitedPlaces.international" :key="idx" class="px-4 py-2 bg-orange-50 text-orange-700 rounded-lg font-medium flex items-center group relative pr-10">
                                <div class="flex flex-col">
                                    <span>{{ place.name }}</span>
                                    <span class="text-[10px] text-orange-400">{{ place.date }}</span>
                                </div>
                                <button v-if="isCurrentUser" class="absolute right-2 top-1/2 transform -translate-y-1/2 text-orange-300 hover:text-orange-600 opacity-0 group-hover:opacity-100 transition" @click="removePlace('international', idx)"><X class="w-4 h-4"/></button>
                             </div>
                        </div>
                         <div v-if="isCurrentUser" class="flex gap-2 max-w-md items-center">
                            <input v-model="newInternationalPlace" placeholder="新增國外城市..." class="px-4 py-2 border rounded-xl text-sm flex-1 focus:ring-2 focus:ring-indigo-500 outline-none" @keyup.enter="addPlace('international')" />
                            <input v-model="newInternationalDate" type="month" class="px-4 py-2 border rounded-xl text-sm w-32 focus:ring-2 focus:ring-indigo-500 outline-none text-gray-500" />
                            <button class="p-2 bg-gray-100 rounded-xl hover:bg-gray-200" @click="addPlace('international')"><Plus class="w-5 h-5 text-gray-600"/></button>
                        </div>
                    </div>
                </div>

                <!-- 3. Posts -->
                <div v-if="activeTab === 'posts'" class="space-y-4">
                     <div v-if="myPosts.length > 0">
                        <PostCard v-for="post in myPosts" :key="post.id" :post="post" />
                    </div>
                    <div v-else class="text-center py-20 text-gray-400">
                        <p>還沒有發布過心得文章喔！</p>
                    </div>
                </div>

                <!-- 4. Reviews -->
                <div v-if="activeTab === 'reviews'" class="space-y-4">
                    <div v-if="user.reviews && user.reviews.length > 0" class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div v-for="review in user.reviews" :key="review.id" class="p-4 border border-gray-100 rounded-xl bg-gray-50 flex gap-4 items-start">
                            <img :src="review.avatar" class="w-10 h-10 rounded-full bg-gray-200" alt="Reviewer" />
                            <div>
                                <div class="flex items-center gap-2 mb-1">
                                    <span class="font-bold text-gray-800">{{ review.author }}</span>
                                    <span class="text-xs text-gray-500">{{ review.date }}</span>
                                </div>
                                <div class="flex text-yellow-400 mb-2">
                                    <Star v-for="n in 5" :key="n" :class="{'fill-current': n <= review.rating, 'text-gray-300': n > review.rating}" class="w-3 h-3" />
                                </div>
                                <p class="text-sm text-gray-600 leading-relaxed">{{ review.content }}</p>
                            </div>
                        </div>
                    </div>
                    <div v-else class="text-center py-20 text-gray-400">
                        <p>目前還沒有收到評論。</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- Right Sidebar -->
        <div class="space-y-6">
             <!-- Spirit Animal -->
            <div class="bg-gradient-to-br from-orange-400 to-pink-500 rounded-2xl p-1 shadow-lg transform transition hover:-translate-y-1 duration-300">
                <div class="bg-white rounded-[14px] p-6 h-full text-center">
                    <h3 class="text-lg font-bold text-gray-800 mb-2">🧩 性格測驗結果</h3>
                    <div class="text-5xl mb-2 animate-bounce-slow">{{ user.spiritAnimal.split(' ')[0] }}</div>
                    <div class="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-pink-600">{{ user.spiritAnimal.split(' ')[1] }}</div>
                </div>
            </div>

             <!-- Wishlist Ball Pool (Physics Effect) -->
            <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 overflow-hidden">
                <h3 class="text-lg font-bold text-gray-800 mb-4">🔮 許願球池</h3>
                <!-- Ball Container -->
                <div
                    ref="ballContainer"
                    class="relative h-[300px] bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 p-4 flex flex-wrap content-end items-end justify-center gap-2 transition-all"
                    @mousemove="handleMouseMove"
                    @mouseleave="$event.target.querySelectorAll('.wish-ball').forEach(b => b.style.transform = 'translate(0,0)')"
                >

                    <div v-if="userStore.wishlist.length === 0" class="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
                        快去許願吧！
                    </div>

                    <div
                        v-for="(item, index) in userStore.wishlist"
                        :key="index"
                        class="wish-ball w-16 h-16 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-xs font-bold text-indigo-700 shadow-md border-2 border-white select-none transition-transform duration-300 ease-out z-10 text-center leading-tight p-1 break-words"
                    >
                        {{ item }}
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Edit Profile Modal (Replaces Settings Tab) -->
    <div v-if="isEditingProfile" class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" @click.self="isEditingProfile = false">
        <div class="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-fade-in-up">
            <div class="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
                <h2 class="text-xl font-bold text-gray-800">編輯個人資料</h2>
                <button class="p-2 hover:bg-gray-100 rounded-full transition" @click="isEditingProfile = false"><X class="w-6 h-6 text-gray-500"/></button>
            </div>
            <div class="p-6 space-y-6">
                 <!-- Basic Info -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">顯示名稱</label>
                        <input v-model="editForm.name" type="text" class="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                     <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">暱稱</label>
                        <input v-model="editForm.nickname" type="text" class="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                    <div class="md:col-span-2">
                        <label class="block text-sm font-medium text-gray-700 mb-2">個人簡介</label>
                        <textarea v-model="editForm.bio" rows="3" class="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none"></textarea>
                    </div>
                </div>

                <!-- Wishlist Management in Modal -->
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">許願清單 (球池)</label>
                    <div class="flex flex-wrap gap-2 mb-3">
                        <span v-for="(wish, idx) in editForm.wishlist" :key="idx" class="px-3 py-1 bg-purple-50 text-purple-700 rounded-full flex items-center">
                            {{ wish }}
                            <button class="ml-1 hover:text-red-500" @click="editForm.wishlist.splice(idx, 1)"><X class="w-3 h-3"/></button>
                        </span>
                    </div>
                    <div class="flex gap-2">
                         <input placeholder="輸入願望按 Enter 新增" class="flex-1 px-4 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" @keyup.enter="($event) => { if($event.target.value.trim()){ editForm.wishlist.push($event.target.value.trim()); $event.target.value = ''; } }" />
                    </div>
                </div>
            </div>
             <div class="p-6 border-t border-gray-100 bg-gray-50 flex justify-end">
                <button class="px-6 py-2 text-gray-600 font-medium hover:underline mr-4" @click="isEditingProfile = false">取消</button>
                <button class="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition" @click="saveProfile">儲存變更</button>
             </div>
        </div>
    </div>

  </div>
</template>

<style scoped>
<<<<<<< HEAD
.pixel-card {
  border: 3px solid #8b6f47;
  box-shadow: 4px 4px 0px 0px rgba(139, 111, 71, 0.2);
=======
.animate-bounce-slow {
    animation: bounce 3s infinite;
}
@keyframes bounce {
    0%, 100% { transform: translateY(-5%); }
    50% { transform: translateY(0); }
}
.animate-fade-in-up {
    animation: fadeInUp 0.3s ease-out;
}
@keyframes fadeInUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
>>>>>>> 87034c9 (fix: code問題修正)
}
</style>
