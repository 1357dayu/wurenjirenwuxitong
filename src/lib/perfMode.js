// 性能模式工具：控制 3D 渲染与动画开关，降低老旧设备 GPU/CPU 占用
// 每个浏览器独立（localStorage），不影响其他用户
const KEY = 'drone_perf_mode';

// 检测设备性能：CPU 线程数 <= 4 或 内存 <= 4GB 视为低性能设备
function detectLowPerf() {
  try {
    const cores = navigator.hardwareConcurrency || 4;
    const memory = navigator.deviceMemory || 4; // 单位 GB，仅 Chromium 系支持
    return cores <= 4 || memory <= 4;
  } catch {
    return false;
  }
}

// 读取性能模式：localStorage 有记录用记录值，否则用设备检测结果
export function isPerfMode() {
  try {
    const v = localStorage.getItem(KEY);
    if (v === '1') return true;
    if (v === '0') return false;
    return detectLowPerf();
  } catch {
    return false;
  }
}

// 写入性能模式选择
export function setPerfModeStore(enabled) {
  try {
    localStorage.setItem(KEY, enabled ? '1' : '0');
  } catch {}
}
