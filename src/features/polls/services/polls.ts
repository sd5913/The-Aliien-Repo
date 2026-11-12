// Poll-specific LocalStorage persistence. / 投票数据专用的 LocalStorage 持久化模块。
import type { Poll } from "../../../types/poll";
import { POLLS_STORAGE_KEY, readLocalJson, writeLocalJson } from "../../../lib/storage/localStorage";

const seedPolls: Poll[] = [
  {
    id: "seed-coat",
    title: "周末出门穿哪件外套？",
    description: "想要温柔一点，也要适合春天。",
    createdAt: "2026-11-09T08:30:00.000Z",
    status: "open",
    options: [
      { id: "coat-camel", name: "驼色羊毛大衣", imageUrl: "https://picsum.photos/seed/bothpls-coat-a/500/500" },
      { id: "coat-pink", name: "樱花粉短外套", imageUrl: "https://picsum.photos/seed/bothpls-coat-b/500/500" },
      { id: "coat-cream", name: "奶油白针织开衫", imageUrl: "https://picsum.photos/seed/bothpls-coat-c/500/500" },
    ],
    votes: [
      { id: "vote-1", voter: { id: "friend-1", nickname: "小桃" }, selectedOptionId: "coat-camel", ranking: ["coat-camel"], submittedAt: "2026-11-10T09:00:00.000Z" },
      { id: "vote-2", voter: { id: "friend-2", nickname: "阿圆" }, selectedOptionId: "coat-pink", ranking: ["coat-pink"], submittedAt: "2026-11-10T10:00:00.000Z" },
      { id: "vote-3", voter: { id: "friend-3", nickname: "柚子" }, selectedOptionId: "coat-camel", ranking: ["coat-camel"], submittedAt: "2026-11-10T11:00:00.000Z" },
      { id: "vote-4", voter: { id: "friend-4", nickname: "棉花糖" }, selectedOptionId: "coat-cream", ranking: ["coat-cream"], submittedAt: "2026-11-10T12:00:00.000Z" },
    ],
    comments: [
      { id: "comment-1", voteId: "vote-1", voter: { id: "friend-1", nickname: "小桃" }, text: "驼色很衬你，拍照也会很温柔！", createdAt: "2026-11-10T09:10:00.000Z", optionId: "coat-camel" },
      { id: "comment-2", voteId: "vote-2", voter: { id: "friend-2", nickname: "阿圆" }, text: "粉色更有春天的感觉～", createdAt: "2026-11-10T10:10:00.000Z", optionId: "coat-pink" },
    ],
  },
  {
    id: "seed-cup",
    title: "帮我挑一个新杯子吧",
    description: "每天带去办公室用的随行杯。",
    createdAt: "2026-11-07T06:00:00.000Z",
    status: "open",
    options: [
      { id: "cup-lilac", name: "薰衣草紫", imageUrl: "https://picsum.photos/seed/bothpls-cup-a/500/500" },
      { id: "cup-mint", name: "薄荷绿", imageUrl: "https://picsum.photos/seed/bothpls-cup-b/500/500" },
    ],
    votes: [
      { id: "vote-5", voter: { id: "friend-5", nickname: "小鹿" }, selectedOptionId: "cup-mint", ranking: ["cup-mint"], submittedAt: "2026-11-08T10:00:00.000Z" },
      { id: "vote-6", voter: { id: "friend-6", nickname: "奶油" }, selectedOptionId: "cup-lilac", ranking: ["cup-lilac"], submittedAt: "2026-11-08T11:00:00.000Z" },
    ],
    comments: [],
  },
  {
    id: "seed-dessert",
    title: "聚会甜品选哪一款？",
    description: "周五晚上和朋友们的小聚。",
    createdAt: "2026-11-02T06:00:00.000Z",
    endsAt: "2026-11-03T06:00:00.000Z",
    status: "closed",
    options: [
      { id: "cake-matcha", name: "抹茶草莓蛋糕", imageUrl: "https://picsum.photos/seed/bothpls-dessert-a/500/500" },
      { id: "cake-mango", name: "芒果奶油千层", imageUrl: "https://picsum.photos/seed/bothpls-dessert-b/500/500" },
    ],
    votes: [
      { id: "vote-7", voter: { id: "friend-7", nickname: "小满" }, selectedOptionId: "cake-matcha", ranking: ["cake-matcha"], submittedAt: "2026-11-02T08:00:00.000Z" },
      { id: "vote-8", voter: { id: "friend-8", nickname: "星星" }, selectedOptionId: "cake-mango", ranking: ["cake-mango"], submittedAt: "2026-11-02T09:00:00.000Z" },
      { id: "vote-9", voter: { id: "friend-9", nickname: "桃子" }, selectedOptionId: "cake-matcha", ranking: ["cake-matcha"], submittedAt: "2026-11-02T10:00:00.000Z" },
    ],
    comments: [
      { id: "comment-3", voteId: "vote-7", voter: { id: "friend-7", nickname: "小满" }, text: "抹茶和草莓的组合不会太甜！", createdAt: "2026-11-02T08:10:00.000Z", optionId: "cake-matcha" },
    ],
  },
];

function isPoll(value: unknown): value is Poll {
  if (!value || typeof value !== "object") return false;
  const poll = value as Record<string, unknown>;
  return (
    typeof poll.id === "string" &&
    typeof poll.title === "string" &&
    Array.isArray(poll.options) &&
    Array.isArray(poll.votes) &&
    Array.isArray(poll.comments)
  );
}

function isPollList(value: unknown): value is Poll[] {
  return Array.isArray(value) && value.every(isPoll);
}

export function readPolls(): Poll[] {
  return readLocalJson(POLLS_STORAGE_KEY, seedPolls, isPollList);
}

export function writePolls(polls: Poll[]): void {
  writeLocalJson(POLLS_STORAGE_KEY, polls);
}

export function savePoll(poll: Poll): void {
  const polls = readPolls();
  writePolls([poll, ...polls.filter((item) => item.id !== poll.id)]);
}

export function deletePoll(pollId: string): void {
  writePolls(readPolls().filter((poll) => poll.id !== pollId));
}
