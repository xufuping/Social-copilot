/**
 * 阶段一专用 Mock 数据与模拟函数。
 *
 * 目的：在没有系统探针（阶段三）和 AI SDK（阶段二）的情况下，
 *       让 UI 层可以跑通完整交互链路（画像增删 → 选择意图 → 获取建议 → 复制）。
 *
 * 使用约定：
 *   - 所有导出内容都是"只读种子数据"；组件内部自行用 useState 管理副本。
 *   - `generateMockSuggestions` 用 setTimeout 模拟网络延迟。
 *   - Mock 返回的 `text` 仅为自然可发送的中文对白，不注入调试前缀或「已知画像」等元信息。
 */

import type { AiSuggestionRequest, Contact, Intent, Message, Suggestion } from "./types";

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

const STYLE_POOL = [
  "温和",
  "风趣",
  "直接",
  "结构化",
  "极简",
  "稳妥",
  "真诚",
  "幽默",
  "专业",
  "克制",
];

function clampSuggestionCount(n: number | undefined): number {
  const v = n ?? 3;
  return Math.min(10, Math.max(3, Math.floor(v)));
}

/**
 * 模拟调用 AI：按 `suggestionCount`（3～10）生成 n 条建议。
 */
export async function generateMockSuggestions(request: AiSuggestionRequest): Promise<Suggestion[]> {
  const delay = 600 + Math.random() * 600;
  await new Promise((resolve) => setTimeout(resolve, delay));

  const n = clampSuggestionCount(request.suggestionCount);
  const { contact, intent } = request;
  const name = contact.name.trim() || "对方";

  const variantsForIntent = (count: number): Array<Pick<Suggestion, "style" | "text">> => {
    const out: Array<Pick<Suggestion, "style" | "text">> = [];
    for (let i = 0; i < count; i++) {
      const style = STYLE_POOL[i % STYLE_POOL.length];
      const tone = i % 3;
      let text: string;
      if (intent.id === "upward") {
        text =
          tone === 0
            ? `${name}，一句话进展：A 项如期、B 项延 1 天（已排修复）、C 项数据今晚出。需要您决策：是否本周过一次风险清单。`
            : tone === 1
              ? `${name}，进展 OK，B 项延 1 天已有补救；成本数据今晚同步给您。`
              : `${name}，本周关键指标：进度 87%，较上周 +5pct；阻塞 1 项（预计 24h 内恢复）；成本测算今日 22:00 前同步。`;
      } else if (intent.id === "customer") {
        text =
          tone === 0
            ? `${name} 您好，围绕上次您关心的 ROI 问题，我们做了一版更细的测算，方便占用您 10 分钟同步吗？`
            : tone === 1
              ? `${name}，上周聊到的方案我这边补了两个数据，您方便时我发您看看？`
              : `${name}，同行业一家客户上线 3 周已经回本，我整理了对比给您，要不先发文字版？`;
      } else {
        text =
          tone === 0
            ? "哈哈，最近挺忙的，抽空喝一杯？"
            : tone === 1
              ? "我就说嘛，这周总感觉缺点啥——原来是缺你一条消息 😄"
              : "在忙啥呢，一起吃饭？";
      }
      out.push({ style, text });
    }
    return out;
  };

  const variants = variantsForIntent(n);
  const ts = Date.now();
  return variants.map((v, i) => ({
    id: `mock-${ts}-${i}`,
    style: v.style,
    text: v.text,
  }));
}
