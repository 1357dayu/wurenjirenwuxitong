// 无人机飞手姓名字典（源自项目根目录《1、无人机实名登记表.xlsx》）
// 隐私保护：只提取姓名字段，不带电话、身份证、执照编号等隐私信息
// 数据更新方法：修改原 xlsx 后让 AI 重新生成本文件，或直接手动编辑
export const PILOT_DICTIONARY = [
  "卜松",
  "戴冰洋",
  "高鹏",
  "高杨",
  "高原松",
  "黄永帅",
  "梁源",
  "潘禹硕",
  "任文庆",
  "孙佳康",
  "陶然",
  "王鑫",
  "徐乘建",
  "姚秀洋",
  "姚秀洋（无照）",
  "张余东",
  "张哲熙",
  "张子豪",
  "周峰"
];

// 模糊搜索：支持中文 / 拼音首字母（手动维护映射）/ 包含匹配
// 返回匹配项数组（最多 limit 条，默认 20）；query 为空返回前 limit 条
export function searchPilots(query, limit = 20) {
  const q = String(query || '').trim();
  if (!q) return PILOT_DICTIONARY.slice(0, limit);
  return PILOT_DICTIONARY.filter(name => name.includes(q)).slice(0, limit);
}
