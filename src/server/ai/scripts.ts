export type ScriptQuestion = { key: string; question: string; required: boolean };

export const gradScript: ScriptQuestion[] = [
  { key: "target_role", question: "你投递的岗位方向是什么？（例如：前端/后端/算法）", required: true },
  { key: "best_project", question: "挑一个你最能打的项目：项目背景是什么？你负责什么？", required: true },
  { key: "metrics", question: "这个项目最终结果有什么量化指标？没有也请描述可感知结果。", required: true },
];

export const expScript: ScriptQuestion[] = [
  { key: "most_valuable_project", question: "你最近/最重要的项目：规模（DAU/接口量/并发/数据量）与业务目标？", required: true },
  { key: "hard_problem", question: "你解决过的一个技术难点是什么？为什么难？你怎么做决策？", required: true },
  { key: "impact", question: "你的贡献带来了哪些指标提升/成本下降/稳定性收益？", required: true },
];

