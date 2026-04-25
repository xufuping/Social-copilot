/**
 * 阶段一专用 Mock 数据与模拟函数。
 *
 * 目的：在没有系统探针（阶段三）和 AI SDK（阶段二）的情况下，
 *       让 UI 层可以跑通完整交互链路（画像增删 → 选择意图 → 获取建议 → 复制）。
 *
 * 使用约定：
 *   - 所有导出内容都是"只读种子数据"；组件内部自行用 useState 管理副本。
 *   - `generateMockSuggestions` 用 setTimeout 模拟网络延迟，阶段二替换为真实 AI 调用。
 */

import type { Contact, Intent, Message, Suggestion, SuggestionRequestContext } from "./types";

/** 预置的三种意图（用户仍可在 UI 中追加自定义） */
export const PRESET_INTENTS: Intent[] = [
  {
    id: "casual",
    label: "日常闲聊",
    description: "Warm, friendly small talk; keep it light and natural.",
  },
  {
    id: "customer",
    label: "客户跟进",
    description: "Professional customer follow-up; push value without being pushy.",
  },
  {
    id: "upward",
    label: "向上管理",
    description: "Report upward with structure: status, risks, next steps, ask.",
  },
];

/** 阶段一固定的 Mock 聊天对象："张总" */
export const MOCK_CONTACT: Contact = {
  id: "zhang-zong",
  name: "张总",
  skill: {
    manual_tags: ["强势", "注重效率", "喜欢数据"],
    distilled_traits: [],
    notes: "去年 Q4 起合作，偏好简洁直接的沟通。",
    updated_at: new Date().toISOString(),
  },
};

/** 阶段一固定的 Mock 最近消息（阶段三将由 Rust 探针替换） */
export const MOCK_RECENT_MESSAGES: Message[] = [
  {
    id: "m1",
    sender: "peer",
    text: "这周的项目进展给我发一下，简单点，别太长。",
    timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
  },
  {
    id: "m2",
    sender: "self",
    text: "好的，马上整理。",
    timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
  },
  {
    id: "m3",
    sender: "peer",
    text: "另外那个成本测算的数据，今天能出结果吗？",
    timestamp: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
  },
];

/**
 * 模拟"调用 AI 生成 3 条建议"。
 *
 * 输入：完整的请求上下文（contact + intent + messages）
 * 输出：Promise<Suggestion[]>（3 条不同风格）
 *
 * 延迟：随机 600~1200ms，模拟网络波动。
 *
 * 阶段二实现时，将此函数签名保持不变，内部换成 Vercel AI SDK 调用即可，
 * UI 层无需修改。
 */
export async function generateMockSuggestions(
  context: SuggestionRequestContext,
): Promise<Suggestion[]> {
  const delay = 600 + Math.random() * 600;
  await new Promise((resolve) => setTimeout(resolve, delay));

  const { contact, intent } = context;
  const tagsHint =
    contact.skill.manual_tags.length > 0
      ? `（已知画像：${contact.skill.manual_tags.join("、")}）`
      : "";

  // 为了让 Mock 输出看起来"像那么回事"，按意图分叉生成三条差异化文案。
  const base = `[Mock · 意图=${intent.label}]${tagsHint}`;

  const variants: Array<Pick<Suggestion, "style" | "text">> = (() => {
    switch (intent.id) {
      case "upward":
        return [
          {
            style: "结构化",
            text: `${base} 张总，一句话进展：A 项如期、B 项延 1 天（已排修复）、C 项数据今晚出。需要您决策：是否本周过一次风险清单。`,
          },
          {
            style: "极简",
            text: `${base} 进展OK，B 项延1天已有补救；成本数据今晚给您。`,
          },
          {
            style: "数据导向",
            text: `${base} 本周关键指标：进度 87%，较上周 +5pct；阻塞 1 项（预计 24h 内恢复）；成本测算今日 22:00 前同步。`,
          },
        ];
      case "customer":
        return [
          {
            style: "专业稳重",
            text: `${base} 您好，这边是 XX。围绕上次您关心的 ROI 问题，我们做了一版更细的测算，方便占用您 10 分钟同步吗？`,
          },
          {
            style: "轻量推进",
            text: `${base} 张总，上周聊到的方案我这边补了两个数据，随时您方便我发您看看？`,
          },
          {
            style: "价值导向",
            text: `${base} 同行业一家客户上线 3 周已经回本，我整理了对比给您，要不先发文字版？`,
          },
        ];
      case "casual":
      default:
        return [
          {
            style: "温和",
            text: `${base} 哈哈，最近挺忙的，抽空喝一杯？`,
          },
          {
            style: "风趣",
            text: `${base} 我就说嘛，这周总感觉缺点啥——原来是缺您一条消息 😄`,
          },
          {
            style: "直接",
            text: `${base} 在忙啥呢，一起吃个饭？`,
          },
        ];
    }
  })();

  return variants.map((v, i) => ({
    id: `mock-${Date.now()}-${i}`,
    style: v.style,
    text: v.text,
  }));
}
