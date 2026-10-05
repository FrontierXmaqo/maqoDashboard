// People the dashboard hides, by Lark open_id. Tasks where a hidden person is Task
// Responsible or Task Accountable are hidden too; hidden people are also dropped from Task
// Support on other tasks. Nothing is changed in Lark.
// Current entries: accounts linked only to sample rows left over from Lark's Task Breakdown
// template (not Maqo staff).

export const HIDDEN_PEOPLE: { openId: string; note: string }[] = [
  { openId: 'ou_14c84872e039b004970427fe9e48a9ff', note: '李铭 (template sample rows)' },
  { openId: 'ou_d1dcf43f79c7b32dffe319f7d4019603', note: 'Sophia 钟宛彤 (template sample rows)' },
  { openId: 'ou_3e4ddad7d3c27c40d9b466452e8fb9cd', note: 'Sophia (template sample rows)' },
];
