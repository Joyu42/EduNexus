/**
 * EduNexus 移动端 Hooks
 *
 * 提供移动端开发所需的各种 React Hooks
 */

// 媒体查询
export {
  useMediaQuery,
  useIsMobile,
  useIsTablet,
  useIsDesktop,
  useIsSmallMobile,
} from './use-media-query';

// 触摸手势
export { useTouchGesture } from './use-touch-gesture';
export type { TouchGestureOptions } from './use-touch-gesture';

// 安全区域
export { useSafeArea } from './use-safe-area';

// 屏幕方向
export { useOrientation } from './use-orientation';
export type { Orientation } from './use-orientation';

// 键盘快捷键
export { useKeyboardShortcut } from './use-keyboard-shortcut';

// 拖拽
export { useDraggable } from './use-draggable';

// 可调整大小
export { useResizable } from './use-resizable';

// 语音合成
export { useSpeechSynthesis } from './use-speech-synthesis';
