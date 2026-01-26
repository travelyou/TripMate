# 上传预设头像到 Firebase Storage

## 说明

预设头像需要上传到 Firebase Storage 的 `preset-avatars` 文件夹中。

## 存储结构

```
preset-avatars/
  ├── 再見機器人/
  │   ├── 503026428_17900151630206516_9027118801905319489_n.jpg
  │   ├── 503028228_17900150613206516_2543615467695018920_n.jpg
  │   └── ...
  ├── 下課後/
  │   ├── 541820327_17911666599206516_7836574572989899172_n.jpg
  │   └── ...
  └── 阿甘妙世界/
      ├── 562804708_17915872989206516_8711178082981341502_n.jpg
      └── ...
```

## 上传方式

### 方式 1：使用 Firebase Console

1. 打开 [Firebase Console](https://console.firebase.google.com/)
2. 选择你的项目
3. 进入 **Storage** 页面
4. 创建文件夹结构：
   - 创建 `preset-avatars` 文件夹
   - 在每个分类文件夹下创建对应的子文件夹（如 `再見機器人`、`下課後` 等）
5. 上传图片文件到对应的分类文件夹

### 方式 2：使用 Firebase CLI

```bash
# 安装 Firebase CLI（如果还没有）
npm install -g firebase-tools

# 登录
firebase login

# 初始化（如果还没有）
firebase init storage

# 上传文件
firebase storage:upload "c:\Users\hp\OneDrive\圖片\頭貼\再見機器人\*" preset-avatars/再見機器人/
firebase storage:upload "c:\Users\hp\OneDrive\圖片\頭貼\下課後\*" preset-avatars/下課後/
firebase storage:upload "c:\Users\hp\OneDrive\圖片\頭貼\阿甘妙世界\*" preset-avatars/阿甘妙世界/
```

### 方式 3：使用代码脚本（推荐）

可以创建一个 Node.js 脚本来批量上传，但需要先配置 Firebase Admin SDK。

## 注意事项

1. **文件路径**：确保文件路径与 `src/config/avatars.js` 中配置的文件名完全一致
2. **权限设置**：确保 Firebase Storage 规则允许读取这些文件：
   ```javascript
   match /preset-avatars/{allPaths=**} {
     allow read: if true;
   }
   ```
3. **文件大小**：建议图片文件不要太大，以提升加载速度

## 验证

上传完成后，可以在浏览器中测试：
1. 打开个人资料页面
2. 点击头像旁的相机图标
3. 选择"選擇頭像"
4. 选择分类，应该能看到对应的头像

