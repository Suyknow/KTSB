// Visual-viewport layout helper.
//
// iOS Safari 平移的是 visual viewport（offsetTop 增大，可过冲），属于 visual
// viewport 层，overflow:hidden / position:fixed 只锁 document scroll、管不到它。
// 解法不是阻止平移，而是给 body 反向平移抵消：body 设 position:fixed;inset:0
// 等于 layout viewport，translateY(offsetTop) 后 fixed 后代改以 body 为包含块，
// 内容坐标经“+offsetTop(transform) − offsetTop(VV 平移)”抵消，视觉钉死；输入条
// bottom = innerHeight − vv.height 落在键盘上沿，与 offsetTop 无关。
//
// 此函数为纯函数，便于离线单元测试；前端与测试共用同一份几何契约。

/**
 * @param {{ height?: number, offsetTop?: number } | null | undefined} vv
 *        window.visualViewport 的快照（仅需 height 与 offsetTop）。
 * @param {number} innerHeight window.innerHeight（layout viewport 高度）。
 * @returns {{ bodyTransformY: number, inputBarBottom: number }}
 *          bodyTransformY：反向平移量（px），0 表示无需平移；inputBarBottom：
 *          输入条 bottom 值（px）。
 */
export function computeViewportLayout(vv, innerHeight) {
  if (!vv || typeof vv.height !== 'number' || typeof vv.offsetTop !== 'number') {
    return { bodyTransformY: 0, inputBarBottom: 0 };
  }
  const bodyTransformY = vv.offsetTop;
  // 输入条落在 visual viewport 底部（键盘上沿）。不要减 offsetTop 也不要依赖
  // max 钳位——offsetTop 已由 body 的 transform 抵消；max 仅防 vv.height 异常
  // 大于 innerHeight（缩放小于 1 时）产生负值。
  const inputBarBottom = Math.max(0, innerHeight - vv.height);
  return { bodyTransformY, inputBarBottom };
}
