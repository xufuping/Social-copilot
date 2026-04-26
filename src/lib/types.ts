/**
 * Core domain types for Social Copilot.
 *
 * 这些类型对应方案 1.0.md 中的核心领域模型：
 *   - 聊天对象（Contact）与其画像（ContactSkill）
 *   - 沟通意图（Intent）
 *   - AI 建议（Suggestion）
 *   - 原始聊天消息（Message）——后续由 Rust 探针层注入
 *
 * 注意：本文件只做类型声明，不持有运行时逻辑。
 */

/** 聊天消息方向：来自对方 / 来自本人 */
export type MessageSender = "peer" | "self";

/** 单条聊天记录（阶段三由 Rust 探针采集，阶段一为 Mock） */
export interface Message {
  id: string;
  sender: MessageSender;
  /** 纯文本内容。后续若引入富媒体，再扩展 type 字段 */
  text: string;
  /** ISO 时间戳（阶段一允许为空） */
  timestamp?: string;
}

/**
 * 聊天对象画像 (`contact.skill`)。
 *
 * 该结构同时承担两个角色：
 *   1. 本地持久化（阶段四由 Rust 写入 `[contact_name].json`）；
 *   2. RAG System Prompt 的输入（阶段二）。
 *
 * 字段语义：
 *   - `manual_tags`      用户手工标注的画像标签（例如"强势"、"幽默"）
 *   - `distilled_traits` 由 AI 基于历史消息自动提炼的结构化特征
 *   - `notes`            用户的自由文本备忘（可空）
 *   - `updated_at`       最近一次修改时间（ISO 字符串）
 */
export interface ContactSkill {
  manual_tags: string[];
  distilled_traits: DistilledTrait[];
  notes?: string;
  updated_at: string;
}

/** 由 AI 从聊天记录中提炼的单条特征（阶段二才会被写入，阶段一保持空数组） */
export interface DistilledTrait {
  /** 特征标题，例如"决策风格"、"语气偏好" */
  key: string;
  /** 特征描述 */
  value: string;
  /** 置信度 0~1，便于未来在 UI 中淡化低置信特征 */
  confidence?: number;
}

/** 聊天对象基础信息（从微信窗口 Title 捕获） */
export interface Contact {
  /** 阶段一：取聊天窗口 Title 作为稳定 ID；阶段四考虑改为 hash */
  id: string;
  name: string;
  /** 头像 URL，可空。阶段一不使用 */
  avatarUrl?: string;
  skill: ContactSkill;
}

export interface WorkspaceContact extends Contact {
  relation: string;
  attributeDefinition: string;
  lastActive: string;
  summary: string;
}

export interface ComposerDraft {
  incomingMessage: string;
  expectation: string;
}

export interface ContactWorkspaceState {
  draft: ComposerDraft;
  suggestions: Suggestion[];
  selectedSuggestionId?: string;
  error: string | null;
}

/**
 * 沟通意图（Intent）。
 * 内置三种之外允许用户自定义，因此 id 保持为 string 而非 enum。
 */
export interface Intent {
  id: string;
  label: string;
  /** 用于 Prompt 的英文/语义描述，便于模型理解 */
  description: string;
  /** 是否为用户自定义（自定义项未来可删除） */
  custom?: boolean;
}

/** 单条 AI 回复建议 */
export interface Suggestion {
  id: string;
  /** 该建议的风格标签，用于在卡片上展示（如"温和"、"果断"、"幽默"） */
  style: string;
  /** 建议正文 */
  text: string;
}

/** 获取建议时的完整请求上下文（阶段二会被序列化发送给模型） */
export interface SuggestionRequestContext {
  contact: Contact;
  intent: Intent;
  recentMessages: Message[];
}

export interface AiSuggestionRequest {
  model: string;
  contact: WorkspaceContact;
  draft: ComposerDraft;
  intent: Intent;
  recentMessages: Message[];
  workspaceContext: {
    source: "manual-paste";
    generatedAt: string;
  };
}

export interface AiProviderConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}
