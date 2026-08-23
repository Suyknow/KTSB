// Visual-viewport layout helper.
//
// 架构（2026-08 重构）：放弃一切 transform / offsetTop 追逐方案（MDN device-fixed
// 示例自述会闪烁；iOS 26 另有 offsetTop 不复位的已知回归）。改为「resize 驱动」：
// 前端只在 vv.resize 时调用本函数，把返回的 appHeight 写入 <html> 的 --vvh 变量，
// app 容器高度随之缩放，输入条作为流内子元素自然贴到键盘上沿。
//
// 本函数是纯函数，便于离线单测；前端与测试共用同一份几何契约。

/**
 * @param {{ height?: number, offsetTop?: number, scale?: number } | null | undefined} vv
 *        window.visualViewport 的快照。
 * @param {number} fallbackHeight 无 vv API 时的回退高度（window.innerHeight）。
 * @returns {{ appHeight: number, needsPanReset: boolean }}
 *          appHeight：app 容器应有的高度（px，取整）；needsPanReset：检测到
 *          残留的 VV 平移/缩放（offsetTop>0 或 scale≠1）时应做 scrollTo 复位。
 *          正常态两者都来自 vv；异常输入回退到 fallbackHeight 且不复位。
 */
export function computeViewportLayout(vv, fallbackHeight) {
  const fb = Number.isFinite(fallbackHeight) ? Math.max(0, Math.round(fallbackHeight)) : 0;
  if (!vv
    || typeof vv.height !== 'number'
    || typeof vv.offsetTop !== 'number'
    || typeof fallbackHeight !== 'number'
    || !Number.isFinite(vv.height)) {
    return { appHeight: fb, needsPanReset: false };
  }
  return {
    appHeight: Math.max(0, Math.round(vv.height)),
    needsPanReset: vv.offsetTop > 0.5
      || (typeof vv.scale === 'number' && Math.abs(vv.scale - 1) > 0.001),
  };
}
