import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeViewportLayout } from '../public/viewport.js';

// 单测不连接真实浏览器/iOS，只锁定 computeViewportLayout 的几何契约：
// bodyTransformY == vv.offsetTop（反向抵消平移），inputBarBottom == innerHeight
// − vv.height（钉键盘上沿，不含 offsetTop）。前端 syncViewport 只是套用这些值，
// 因此守住此函数即守住“内容钉死 + 输入条贴键盘 + 不露白”的数学前提。

test('无 visualViewport API 时回退到初始态', () => {
  assert.deepEqual(computeViewportLayout(null, 800), { bodyTransformY: 0, inputBarBottom: 0 });
  assert.deepEqual(computeViewportLayout(undefined, 800), { bodyTransformY: 0, inputBarBottom: 0 });
  assert.deepEqual(computeViewportLayout({}, 800), { bodyTransformY: 0, inputBarBottom: 0 });
});

test('键盘未弹出（任意浏览器）：内容不动、输入条贴底', () => {
  const r = computeViewportLayout({ height: 800, offsetTop: 0 }, 800);
  assert.equal(r.bodyTransformY, 0);
  assert.equal(r.inputBarBottom, 0);
});

test('iOS 键盘弹出且 VV 平移：transform 抵消平移、输入条贴键盘上沿', () => {
  // 键盘高 300，VV 下移 200 以露出底部输入框；innerHeight 不变。
  const r = computeViewportLayout({ height: 500, offsetTop: 200 }, 800);
  assert.equal(r.bodyTransformY, 200);       // 反向平移 = offsetTop
  assert.equal(r.inputBarBottom, 300);       // = 键盘高，落在 VV 底
});

test('iOS 过冲（露出白底）：transform 扩展 body 覆盖过冲区、输入条仍贴键盘上沿', () => {
  // offsetTop+height=830>800：VV 底越过 layout 底，旧公式 max(0,800-480-350)=0
  // 会令输入条落回 layout 底而悬空露白；新公式不受 offsetTop 影响。
  const r = computeViewportLayout({ height: 480, offsetTop: 350 }, 800);
  assert.equal(r.bodyTransformY, 350);
  assert.equal(r.inputBarBottom, 320);        // = innerHeight − vv.height
});

test('Android Chrome（layout 缩短、无 VV 平移）：transform 为 0、输入条贴底', () => {
  // 安卓键盘弹出时 innerHeight 缩到 500、vv.height≈innerHeight、offsetTop≈0。
  const r = computeViewportLayout({ height: 500, offsetTop: 0 }, 500);
  assert.equal(r.bodyTransformY, 0);
  assert.equal(r.inputBarBottom, 0);
});

test('键盘弹出/收起动画中间态：输入条始终等于键盘高、与 offsetTop 解耦', () => {
  // 中间帧：键盘已升起一部分，VV 也平移了一部分。
  const r = computeViewportLayout({ height: 600, offsetTop: 120 }, 800);
  assert.equal(r.bodyTransformY, 120);
  assert.equal(r.inputBarBottom, 200);       // = 800−600，与 offsetTop 无关
});

test('inputBarBottom 永不为负（防 vv.height 异常大于 innerHeight）', () => {
  const r = computeViewportLayout({ height: 1000, offsetTop: 0 }, 800);
  assert.equal(r.bodyTransformY, 0);
  assert.equal(r.inputBarBottom, 0);
});
