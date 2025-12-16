<script setup>
import PostModal from './components/PostModal.vue'
</script>

<template>
  <PostModal />
  <div class="modal-overlay">

    <div class="modal-container">

      <div class="modal-header">
        <h3>建立新貼文</h3>
        <button class="close-btn">&times;</button>
      </div>

      <div class="modal-body">
        <textarea placeholder="在想些什麼？..."></textarea>
      </div>

      <div class="modal-footer">
        <button class="submit-btn">發布</button>
      </div>

    </div>
  </div>
</template>

<style scoped>
/* scoped 代表這些 CSS 只會影響這個檔案，不會汙染到別人的元件 */

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: flex; /* 讓內容置中 */
  justify-content: center;
  align-items: center;
}

.modal-container {
  background-color: white;
  width: 90%;
  max-width: 500px;
  border-radius: 12px;
  box-shadow: 0 4px 10px rgba(0,0,0,0.2);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: fadeIn 0.3s ease; /* 加一點點進場動畫 */
}

.modal-header {
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.2rem;
  color: #333;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #999;
}

.modal-body {
  padding: 20px;
}

.modal-body textarea {
  width: 100%;
  height: 150px;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  resize: none;
  font-size: 1rem;
  box-sizing: border-box; /* 重要：避免寬度跑版 */
}

.modal-body textarea:focus {
  outline: none;
  border-color: #4CAF50; /* 聚焦時變色 */
}

.modal-footer {
  padding: 12px 20px;
  border-top: 1px solid #f0f0f0;
  text-align: right;
  background-color: #fafafa;
}

.submit-btn {
  background-color: #4CAF50;
  color: white;
  border: none;
  padding: 8px 24px;
  border-radius: 20px;
  cursor: pointer;
  font-weight: bold;
  transition: background 0.2s;
}

.submit-btn:hover {
  background-color: #45a049;
}

/* 簡單的淡入動畫 */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-20px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
