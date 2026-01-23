<script setup>
import PostCard from '@/components/cards/DiscussionCard.vue'

defineProps({
  posts: {
    type: Array,
    default: () => []
  }
})

defineEmits(['open-detail', 'open-comment', 'edit'])
</script>

<template>
  <div class="space-y-4">
    <div v-if="posts.length > 0">
      <PostCard
        v-for="post in posts"
        :key="post.id"
        :post="post"
        @click="$emit('open-detail', post)"
        @comment="$emit('open-comment', post)"
        @edit="$emit('edit', post)"
      />
    </div>
    <div v-else class="text-center py-20 text-secondary-400">
      <p>還沒有發布過心得文章喔！</p>
    </div>
  </div>
</template>
