import type { WorkspaceContact } from "@/lib/types";

interface ContactHeaderProps {
  contact: WorkspaceContact;
}

export function ContactHeader({ contact }: ContactHeaderProps) {
  const skillSummary = contact.skill.manual_tags.join("、") || "待沉淀";
  const traits = contact.skill.distilled_traits
    .map((trait) => `${trait.key}：${trait.value}`)
    .join("\n");
  const detail = [
    `联系人：${contact.name}`,
    `关系：${contact.relation}`,
    `属性定义：${contact.attributeDefinition}`,
    `摘要：${contact.summary}`,
    `Skill：${skillSummary}`,
    contact.skill.notes ? `备注：${contact.skill.notes}` : "",
    traits ? `蒸馏特征：\n${traits}` : "",
    `更新时间：${contact.skill.updated_at}`,
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <header
      title={detail}
      className="flex h-12 items-center gap-3 border-b bg-card px-5 text-sm"
    >
      <div className="min-w-0 shrink-0 font-semibold">{contact.name}</div>
      <div className="shrink-0 text-xs text-muted-foreground">{contact.relation}</div>
      <div className="min-w-0 flex-1 truncate text-muted-foreground">
        {contact.attributeDefinition}
      </div>
      <div className="min-w-0 max-w-[280px] truncate text-xs text-muted-foreground">
        Skill: {skillSummary}
      </div>
    </header>
  );
}
