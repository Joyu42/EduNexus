# EduNexus 动画快速参考

## 🎨 常用动画配置

### 基础淡入动画
```typescript
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3, ease: "easeOut" }}
>
  内容
</motion.div>
```

### 序列动画（Stagger）
```typescript
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

<motion.div variants={containerVariants} initial="hidden" animate="visible">
  {items.map(item => (
    <motion.div key={item.id} variants={itemVariants}>
      {item.content}
    </motion.div>
  ))}
</motion.div>
```

### 悬停和点击动画
```typescript
<motion.button
  whileHover={{ scale: 1.05 }}
  whileTap={{ scale: 0.95 }}
  transition={{ type: "spring", stiffness: 300 }}
>
  按钮
</motion.button>
```

### 条件渲染动画
```typescript
<AnimatePresence>
  {isVisible && (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.2 }}
    >
      内容
    </motion.div>
  )}
</AnimatePresence>
```

### 布局动画
```typescript
<motion.div
  layout
  layoutId="shared-element"
  transition={{ type: "spring", stiffness: 300, damping: 30 }}
>
  内容
</motion.div>
```

### 宽度/高度动画
```typescript
<motion.div
  animate={{ width: isExpanded ? 256 : 64 }}
  transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
>
  内容
</motion.div>
```

---

## 🎯 CSS 动画类

### 淡入动画
```html
<div class="animate-in">内容</div>
```

### 上滑动画
```html
<div class="animate-slide-up">内容</div>
```

### 缩放动画
```html
<div class="animate-scale-in">内容</div>
```

### 微妙弹跳
```html
<div class="animate-bounce-subtle">内容</div>
```

---

## 🎨 样式类

### 卡片悬停
```html
<div class="card-hover">卡片内容</div>
```

### 主要按钮
```html
<button class="btn-primary">按钮</button>
```

### 增强输入框
```html
<input class="input-enhanced" />
```

### 玻璃态效果
```html
<div class="glass-card">内容</div>
```

---

## ⏱️ 时长参考

- **快速**: 150-200ms（按钮、小元素）
- **标准**: 250-300ms（卡片、面板）
- **慢速**: 400-500ms（页面过渡）

---

## 🎭 缓动函数

- **ease-out**: 元素进入（推荐）
- **ease-in**: 元素退出
- **ease-in-out**: 状态切换
- **spring**: 弹性效果

---

## 🚀 性能优化

### ✅ 推荐使用
- transform (translateY, scale, rotate)
- opacity

### ❌ 避免使用
- width, height
- top, left, right, bottom
- margin, padding

---

## 📱 响应式动画

```typescript
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{
    duration: 0.3,
    delay: isMobile ? 0 : 0.1
  }}
>
  内容
</motion.div>
```

---

## 🎨 主题色动画

```typescript
<motion.div
  animate={{
    backgroundColor: isDark ? "#1a1a1a" : "#ffffff"
  }}
  transition={{ duration: 0.3 }}
>
  内容
</motion.div>
```

---

## 🔄 循环动画

```typescript
<motion.div
  animate={{
    rotate: [0, 360],
    scale: [1, 1.1, 1]
  }}
  transition={{
    duration: 2,
    repeat: Infinity,
    ease: "linear"
  }}
>
  内容
</motion.div>
```

---

## 📊 进度动画

```typescript
<motion.div
  initial={{ width: 0 }}
  animate={{ width: `${progress}%` }}
  transition={{ duration: 0.5, ease: "easeOut" }}
  className="h-2 bg-primary rounded-full"
/>
```

---

## 🎯 滚动触发动画

```typescript
import { useInView } from "framer-motion";

const ref = useRef(null);
const isInView = useInView(ref, { once: true });

<motion.div
  ref={ref}
  initial={{ opacity: 0, y: 50 }}
  animate={isInView ? { opacity: 1, y: 0 } : {}}
  transition={{ duration: 0.5 }}
>
  内容
</motion.div>
```

---

## 🎨 渐变动画

```typescript
<motion.div
  animate={{
    background: [
      "linear-gradient(to right, #ff6b6b, #feca57)",
      "linear-gradient(to right, #feca57, #48dbfb)",
      "linear-gradient(to right, #48dbfb, #ff6b6b)"
    ]
  }}
  transition={{
    duration: 3,
    repeat: Infinity,
    ease: "linear"
  }}
>
  内容
</motion.div>
```

---

## 🎭 手势动画

```typescript
<motion.div
  drag
  dragConstraints={{ left: 0, right: 300, top: 0, bottom: 300 }}
  dragElastic={0.2}
  whileDrag={{ scale: 1.1 }}
>
  可拖拽内容
</motion.div>
```

---

## 📝 文字动画

```typescript
const text = "Hello World";

<motion.div>
  {text.split("").map((char, index) => (
    <motion.span
      key={index}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      {char}
    </motion.span>
  ))}
</motion.div>
```

---

## 🎨 路径动画

```typescript
<motion.svg>
  <motion.path
    d="M 0 0 L 100 100"
    initial={{ pathLength: 0 }}
    animate={{ pathLength: 1 }}
    transition={{ duration: 2, ease: "easeInOut" }}
  />
</motion.svg>
```

---

## 🔔 通知动画

```typescript
<AnimatePresence>
  {notifications.map(notification => (
    <motion.div
      key={notification.id}
      initial={{ opacity: 0, x: 300 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 300 }}
      transition={{ type: "spring", stiffness: 300 }}
    >
      {notification.message}
    </motion.div>
  ))}
</AnimatePresence>
```

---

## 🎯 加载动画

```typescript
<motion.div
  animate={{
    rotate: 360
  }}
  transition={{
    duration: 1,
    repeat: Infinity,
    ease: "linear"
  }}
  className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full"
/>
```

---

## 📱 移动端优化

```typescript
const isMobile = window.innerWidth < 768;

<motion.div
  initial={{ opacity: 0, y: isMobile ? 10 : 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{
    duration: isMobile ? 0.2 : 0.3,
    ease: "easeOut"
  }}
>
  内容
</motion.div>
```

---

## 🎨 主题切换动画

```typescript
<motion.div
  key={theme}
  initial={{ opacity: 0, scale: 0.9 }}
  animate={{ opacity: 1, scale: 1 }}
  exit={{ opacity: 0, scale: 0.9 }}
  transition={{ duration: 0.2 }}
>
  内容
</motion.div>
```

---

## 🔍 搜索结果动画

```typescript
<motion.div
  initial="hidden"
  animate="visible"
  variants={{
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  }}
>
  {results.map(result => (
    <motion.div
      key={result.id}
      variants={{
        hidden: { opacity: 0, x: -20 },
        visible: { opacity: 1, x: 0 }
      }}
    >
      {result.content}
    </motion.div>
  ))}
</motion.div>
```

---

## 🎯 快捷键

- **Cmd/Ctrl + K**: 打开搜索
- **Esc**: 关闭弹窗
- **Tab**: 切换焦点
- **Enter**: 确认操作

---

## 📚 参考资源

- [Framer Motion 文档](https://www.framer.com/motion/)
- [Tailwind CSS 动画](https://tailwindcss.com/docs/animation)
- [UI_OPTIMIZATION_GUIDE.md](./UI_OPTIMIZATION_GUIDE.md)
- [UI_OPTIMIZATION_SUMMARY.md](./UI_OPTIMIZATION_SUMMARY.md)

---

**版本**: 1.0
**更新**: 2026-03-10
