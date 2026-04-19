'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { seedCards } from '@/lib/mock-data';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const columns = [
  { key: 'prepare', title: '待准备' },
  { key: 'apply', title: '待投递' },
  { key: 'submitted', title: '已投递' },
  { key: 'assessment', title: '测评中' },
  { key: 'interview', title: '面试中' },
  { key: 'done', title: '已结束' },
] as const;

type StatusKey = (typeof columns)[number]['key'];

type ApplicationCard = (typeof seedCards)[0] & {
  jdText?: string;
  lastFollowUpAt?: string;
  lastFollowUpNote?: string;
};

type ReviewItem = {
  id: number;
  applicationId: number;
  round: string;
  time: string;
  questions: string;
  reflection: string;
};

type JDParseResult = {
  keywords: string[];
  materials: string[];
  priority: string;
  summary: string;
  raw?: {
    keywords?: string[];
    required_skills?: string[];
    preferred_skills?: string[];
    basic_requirements?: string[];
    responsibilities?: string[];
    title?: string;
    company?: string;
    location?: string;
    salary?: string;
    job_type?: string;
  };
};

type InterviewPack = {
  skill_tree: {
    required: Array<{ skill: string; category: string; importance: string }>;
    preferred: Array<{ skill: string; category: string; importance: string }>;
    basic: Array<{ skill: string; category: string; importance: string }>;
  };
  study_path: string;
  mock_questions: string;
};

type SuggestionResult = {
  ai_tip: string;
  next_action: string;
  risk: string;
};

const statusMeta: Record<
  StatusKey,
  { stage: string; interviewStage: string }
> = {
  prepare: { stage: '待准备', interviewStage: '未开始' },
  apply: { stage: '待投递', interviewStage: '未开始' },
  submitted: { stage: '已投递', interviewStage: '待反馈' },
  assessment: { stage: '测评中', interviewStage: '笔试中' },
  interview: { stage: '面试中', interviewStage: '进行中' },
  done: { stage: '已结束', interviewStage: '已结束' },
};

function getStageBadgeClass(status: string) {
  switch (status) {
    case 'prepare':
      return 'bg-slate-100 text-slate-700 border-slate-200';
    case 'apply':
      return 'bg-orange-50 text-orange-700 border-orange-200';
    case 'submitted':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'assessment':
      return 'bg-violet-50 text-violet-700 border-violet-200';
    case 'interview':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'done':
      return 'bg-slate-100 text-slate-500 border-slate-200';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
}

function getProgressPercent(done: number, total: number) {
  if (total === 0) return 0;
  return Math.round((done / total) * 100);
}

function getDeadlineBadgeClass(daysLeft: number) {
  if (daysLeft < 0) {
    return 'bg-slate-100 text-slate-500 border-slate-200';
  }
  if (daysLeft <= 2) {
    return 'bg-red-50 text-red-700 border-red-200';
  }
  if (daysLeft <= 5) {
    return 'bg-orange-50 text-orange-700 border-orange-200';
  }
  return 'bg-amber-50 text-amber-700 border-amber-200';
}

function formatFollowUpTime(value?: string) {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getFollowUpLabel(note?: string) {
  if (!note) return '已跟进';
  return note;
}

function getMockMaterials(card: ApplicationCard) {
  const presets = [
    { name: '简历', completed: true },
    { name: '作品集', completed: card.materialsDone >= 2 },
    { name: '自我介绍', completed: card.materialsDone >= 3 },
    { name: '测评 / 笔试', completed: card.materialsDone >= 4 },
  ];

  return presets.slice(0, card.materialsTotal);
}

function getDefaultJdInfo(card: ApplicationCard) {
  const keywords = [card.tag, card.stage].filter(Boolean);
  return {
    keywords,
    required_skills: keywords,
    preferred_skills: [],
    basic_requirements: ['结构化表达', '沟通协作'],
    responsibilities: ['需求分析', '项目推进'],
    title: card.role,
    company: card.company,
    location: '',
    salary: '',
    job_type: '',
  };
}

const STORAGE_KEYS = {
  cards: 'offerflow_cards_v2',
  reviews: 'offerflow_reviews_v2',
  jdResults: 'offerflow_jd_results_v2',
  suggestions: 'offerflow_suggestions_v2',
  interviewPacks: 'offerflow_interview_packs_v2',
};

export default function ApplicationsPage() {
  const [hasHydrated, setHasHydrated] = useState(false);
  const [cards, setCards] = useState<ApplicationCard[]>(seedCards);
  const [selectedCardId, setSelectedCardId] = useState<number | null>(null);
  const [openNewDialog, setOpenNewDialog] = useState(false);
  const [openReviewDialog, setOpenReviewDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);

  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [jdResultsByCardId, setJdResultsByCardId] = useState<
    Record<number, JDParseResult>
  >({});
  const [interviewPackByCardId, setInterviewPackByCardId] = useState<
    Record<number, InterviewPack>
  >({});
  const [isGeneratingInterviewPack, setIsGeneratingInterviewPack] =
    useState(false);

  const [suggestionsByCardId, setSuggestionsByCardId] = useState<
    Record<number, SuggestionResult>
  >({});
  const [isGeneratingSuggestion, setIsGeneratingSuggestion] = useState(false);

  const [newCompany, setNewCompany] = useState('');
  const [newRole, setNewRole] = useState('');
  const [newDeadline, setNewDeadline] = useState('');
  const [newJD, setNewJD] = useState('');

  const [jdResult, setJdResult] = useState<JDParseResult | null>(null);
  const [isParsingJD, setIsParsingJD] = useState(false);

  const [reviewRound, setReviewRound] = useState('');
  const [reviewTime, setReviewTime] = useState('');
  const [reviewQuestions, setReviewQuestions] = useState('');
  const [reviewReflection, setReviewReflection] = useState('');

  const [editingReviewId, setEditingReviewId] = useState<number | null>(null);

  const [editCompany, setEditCompany] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editDeadline, setEditDeadline] = useState('');
  const [editJD, setEditJD] = useState('');
  const [isParsingEditJD, setIsParsingEditJD] = useState(false);
  const [followUpNote, setFollowUpNote] = useState('');

  const selectedCard =
    cards.find((card) => card.id === selectedCardId) ?? null;

  const selectedJdResult = selectedCardId
    ? jdResultsByCardId[selectedCardId] ?? null
    : null;

  const selectedInterviewPack = selectedCardId
    ? interviewPackByCardId[selectedCardId] ?? null
    : null;

  const selectedSuggestion = selectedCardId
    ? suggestionsByCardId[selectedCardId] ?? null
    : null;

  const currentReviews = selectedCard
    ? reviews.filter((item) => item.applicationId === selectedCard.id)
    : [];

  const urgentCount = cards.filter(
    (card) => card.daysLeft >= 0 && card.daysLeft <= 2
  ).length;

  const applyCount = cards.filter((card) => card.status === 'apply').length;
  const targetCount = cards.filter((card) => card.tag === '目标岗位').length;
  const totalCount = cards.length;

  const mostUrgentCard = [...cards]
    .filter((card) => card.daysLeft >= 0)
    .sort((a, b) => a.daysLeft - b.daysLeft)[0];

  const urgentSuggestion = mostUrgentCard
    ? suggestionsByCardId[mostUrgentCard.id] ?? null
    : null;

  useEffect(() => {
    try {
      const savedCards = window.localStorage.getItem(STORAGE_KEYS.cards);
      const savedReviews = window.localStorage.getItem(STORAGE_KEYS.reviews);
      const savedJdResults = window.localStorage.getItem(STORAGE_KEYS.jdResults);
      const savedSuggestions = window.localStorage.getItem(STORAGE_KEYS.suggestions);
      const savedInterviewPacks = window.localStorage.getItem(STORAGE_KEYS.interviewPacks);

      if (savedCards) setCards(JSON.parse(savedCards));
      if (savedReviews) setReviews(JSON.parse(savedReviews));
      if (savedJdResults) setJdResultsByCardId(JSON.parse(savedJdResults));
      if (savedSuggestions) setSuggestionsByCardId(JSON.parse(savedSuggestions));
      if (savedInterviewPacks) setInterviewPackByCardId(JSON.parse(savedInterviewPacks));
    } catch (error) {
      console.error('Failed to restore local data:', error);
    } finally {
      setHasHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hasHydrated) return;
    window.localStorage.setItem(STORAGE_KEYS.cards, JSON.stringify(cards));
  }, [cards, hasHydrated]);

  useEffect(() => {
    if (!hasHydrated) return;
    window.localStorage.setItem(STORAGE_KEYS.reviews, JSON.stringify(reviews));
  }, [reviews, hasHydrated]);

  useEffect(() => {
    if (!hasHydrated) return;
    window.localStorage.setItem(
      STORAGE_KEYS.jdResults,
      JSON.stringify(jdResultsByCardId)
    );
  }, [jdResultsByCardId, hasHydrated]);

  useEffect(() => {
    if (!hasHydrated) return;
    window.localStorage.setItem(
      STORAGE_KEYS.suggestions,
      JSON.stringify(suggestionsByCardId)
    );
  }, [suggestionsByCardId, hasHydrated]);

  useEffect(() => {
    if (!hasHydrated) return;
    window.localStorage.setItem(
      STORAGE_KEYS.interviewPacks,
      JSON.stringify(interviewPackByCardId)
    );
  }, [interviewPackByCardId, hasHydrated]);

  async function handleParseJD() {
    if (!newJD.trim()) {
      alert('请先粘贴岗位描述');
      return;
    }

    try {
      setIsParsingJD(true);
      const data = await parseJDText(newJD);
      setJdResult(data);
    } catch (error) {
      console.error(error);
      alert('JD 解析失败，请确认后端服务是否启动');
    } finally {
      setIsParsingJD(false);
    }
  }

  async function parseJDText(jdText: string) {
    const res = await fetch('http://127.0.0.1:8000/parse-jd', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jd_text: jdText }),
    });

    if (!res.ok) {
      throw new Error('parse jd failed');
    }

    return res.json();
  }

  async function generateSuggestionForCard(card: {
    id: number;
    company: string;
    role: string;
    deadline: string;
    daysLeft: number;
    status: string;
    materialsDone: number;
    materialsTotal: number;
    stage: string;
    aiTip: string;
    tag: string;
    interviewStage: string;
  }) {
    const res = await fetch('http://127.0.0.1:8000/generate-suggestion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        application: {
          company: card.company,
          role: card.role,
          deadline: card.deadline,
          daysLeft: card.daysLeft,
          status: card.status,
          materialsDone: card.materialsDone,
          materialsTotal: card.materialsTotal,
          stage: card.stage,
          aiTip: card.aiTip,
          tag: card.tag,
          interviewStage: card.interviewStage,
        },
      }),
    });

    if (!res.ok) {
      throw new Error('generate suggestion failed');
    }

    const data = await res.json();

    setSuggestionsByCardId((prev) => ({
      ...prev,
      [card.id]: data,
    }));

    setCards((prev) =>
      prev.map((item) =>
        item.id === card.id
          ? {
              ...item,
              aiTip: data.ai_tip,
            }
          : item
      )
    );

    return data;
  }

  async function handleRefreshUrgentSuggestion() {
    if (!mostUrgentCard) return;

    try {
      setIsGeneratingSuggestion(true);
      await generateSuggestionForCard(mostUrgentCard);
    } catch (error) {
      console.error(error);
      alert('重新生成建议失败，请确认后端服务是否启动');
    } finally {
      setIsGeneratingSuggestion(false);
    }
  }

  async function handleGenerateInterviewPack() {
    if (!selectedCard) return;

    const jdInfo = selectedJdResult?.raw ?? getDefaultJdInfo(selectedCard);

    try {
      setIsGeneratingInterviewPack(true);
      const res = await fetch('http://127.0.0.1:8000/generate-interview-pack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jd_info: jdInfo,
          resume_data: null,
        }),
      });

      if (!res.ok) {
        throw new Error('面试准备包生成失败');
      }

      const data = await res.json();

      setInterviewPackByCardId((prev) => ({
        ...prev,
        [selectedCard.id]: data,
      }));
    } catch (error) {
      console.error(error);
      alert('面试准备包生成失败，请确认后端服务是否启动');
    } finally {
      setIsGeneratingInterviewPack(false);
    }
  }

  function handleSaveApplication() {
    if (!newCompany.trim() || !newRole.trim() || !newDeadline.trim()) {
      alert('请先填写公司、岗位名称和截止时间');
      return;
    }

    const newId = Date.now();

    const newCard = {
      id: newId,
      company: newCompany.trim(),
      role: newRole.trim(),
      deadline: newDeadline.trim(),
      daysLeft: 3,
      status: 'prepare' as const,
      materialsDone: 0,
      materialsTotal: 4,
      stage: '待准备',
      aiTip: jdResult?.summary
        ? jdResult.summary
        : newJD.trim()
        ? '已录入岗位描述，下一步可接入 AI 自动解析。'
        : '建议补充岗位描述，便于后续生成更准确的 AI 建议。',
      tag: jdResult?.priority === 'high' ? '高优先级' : '新申请',
      interviewStage: '未开始',
      jdText: newJD.trim(),
    };

    setCards((prev) => [newCard, ...prev]);

    if (jdResult) {
      setJdResultsByCardId((prev) => ({
        ...prev,
        [newId]: jdResult,
      }));
    }

    generateSuggestionForCard(newCard).catch((error) => {
      console.error(error);
    });

    setOpenNewDialog(false);
    setNewCompany('');
    setNewRole('');
    setNewDeadline('');
    setNewJD('');
    setJdResult(null);
  }

  async function handleStatusChange(nextStatus: StatusKey) {
    if (!selectedCard) return;

    const nextMeta = statusMeta[nextStatus];

    const updatedCard = {
      ...selectedCard,
      status: nextStatus,
      stage: nextMeta.stage,
      interviewStage: nextMeta.interviewStage,
    };

    setCards((prev) =>
      prev.map((card) =>
        card.id === selectedCard.id ? updatedCard : card
      )
    );

    try {
      setIsGeneratingSuggestion(true);
      await generateSuggestionForCard(updatedCard);
    } catch (error) {
      console.error(error);
    } finally {
      setIsGeneratingSuggestion(false);
    }
  }

  function handleSaveReview() {
    if (!selectedCard) return;

    if (
      !reviewRound.trim() ||
      !reviewTime.trim() ||
      !reviewQuestions.trim() ||
      !reviewReflection.trim()
    ) {
      alert('请完整填写面试轮次、时间、问题和复盘内容');
      return;
    }

    if (editingReviewId !== null) {
      setReviews((prev) =>
        prev.map((item) =>
          item.id === editingReviewId
            ? {
                ...item,
                round: reviewRound.trim(),
                time: reviewTime.trim(),
                questions: reviewQuestions.trim(),
                reflection: reviewReflection.trim(),
              }
            : item
        )
      );
    } else {
      const newReview: ReviewItem = {
        id: Date.now(),
        applicationId: selectedCard.id,
        round: reviewRound.trim(),
        time: reviewTime.trim(),
        questions: reviewQuestions.trim(),
        reflection: reviewReflection.trim(),
      };

      setReviews((prev) => [newReview, ...prev]);
    }

    setOpenReviewDialog(false);
    setEditingReviewId(null);
    setReviewRound('');
    setReviewTime('');
    setReviewQuestions('');
    setReviewReflection('');
  }

  function openEditForSelected() {
    if (!selectedCard) return;
    setEditCompany(selectedCard.company);
    setEditRole(selectedCard.role);
    setEditDeadline(selectedCard.deadline);
    setEditJD(selectedCard.jdText ?? '');
    setOpenEditDialog(true);
  }

  async function handleParseEditJD() {
    if (!selectedCard) return;
    if (!editJD.trim()) {
      alert('请先填写 JD / 岗位描述');
      return;
    }

    try {
      setIsParsingEditJD(true);
      const data = await parseJDText(editJD);

      setJdResultsByCardId((prev) => ({
        ...prev,
        [selectedCard.id]: data,
      }));
    } catch (error) {
      console.error(error);
      alert('JD 解析失败，请确认后端服务是否启动');
    } finally {
      setIsParsingEditJD(false);
    }
  }

  function openEditReview(review: ReviewItem) {
    setEditingReviewId(review.id);
    setReviewRound(review.round);
    setReviewTime(review.time);
    setReviewQuestions(review.questions);
    setReviewReflection(review.reflection);
    setOpenReviewDialog(true);
  }

  function handleDeleteReview(reviewId: number) {
    const confirmed = window.confirm('确认删除这条面试复盘吗？');
    if (!confirmed) return;

    setReviews((prev) => prev.filter((item) => item.id !== reviewId));
  }

  async function handleSaveEdit() {
    if (!selectedCard) return;

    if (!editCompany.trim() || !editRole.trim() || !editDeadline.trim()) {
      alert('请先填写公司、岗位名称和截止时间');
      return;
    }

    let nextJdResult = selectedJdResult ?? null;

    if (editJD.trim()) {
        try {
          setIsParsingEditJD(true);
          const parsedResult = await parseJDText(editJD);
          nextJdResult = parsedResult;
  
          setJdResultsByCardId((prev) => ({
            ...prev,
            [selectedCard.id]: parsedResult,
          }));
        } catch (error) {
          console.error(error);
          alert('JD 解析失败，请确认后端服务是否启动');
          return;
        } finally {
          setIsParsingEditJD(false);
        }
      }

    const updatedCard = {
      ...selectedCard,
      company: editCompany.trim(),
      role: editRole.trim(),
      deadline: editDeadline.trim(),
      aiTip: nextJdResult?.summary ?? selectedCard.aiTip,
      tag: nextJdResult?.priority === 'high' ? '高优先级' : selectedCard.tag,
      jdText: editJD.trim() || selectedCard.jdText || '',
    };

    setCards((prev) =>
      prev.map((card) =>
        card.id === selectedCard.id ? updatedCard : card
      )
    );

    try {
      setIsGeneratingSuggestion(true);
      await generateSuggestionForCard(updatedCard);
    } catch (error) {
      console.error(error);
      alert('更新 AI 建议失败，请确认后端服务是否启动');
    } finally {
      setIsGeneratingSuggestion(false);
    }

    setOpenEditDialog(false);
    setEditJD('');
  }

  function handleMarkFollowedUp() {
    if (!selectedCard) return;

    const now = new Date().toISOString();
    const trimmedNote = followUpNote.trim();

    setCards((prev) =>
      prev.map((card) =>
        card.id === selectedCard.id
          ? {
              ...card,
              lastFollowUpAt: now,
              lastFollowUpNote: trimmedNote || '已跟进',
            }
          : card
      )
    );

    setFollowUpNote('');
  }

  function handleDeleteApplication() {
    if (!selectedCard) return;

    const confirmed = window.confirm(
      `确认删除「${selectedCard.company} · ${selectedCard.role}」这条申请吗？`
    );

    if (!confirmed) return;

    setCards((prev) => prev.filter((card) => card.id !== selectedCard.id));
    setReviews((prev) =>
      prev.filter((review) => review.applicationId !== selectedCard.id)
    );
    setJdResultsByCardId((prev) => {
      const next = { ...prev };
      delete next[selectedCard.id];
      return next;
    });
    setInterviewPackByCardId((prev) => {
      const next = { ...prev };
      delete next[selectedCard.id];
      return next;
    });
    setSuggestionsByCardId((prev) => {
      const next = { ...prev };
      delete next[selectedCard.id];
      return next;
    });
    setSelectedCardId(null);
    setOpenEditDialog(false);
    setOpenReviewDialog(false);
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fffaf7_0%,#f8fafc_40%,#f5f7fb_100%)] p-8">
      <div className="max-w-[1600px] mx-auto">
        <div className="mb-8 rounded-[28px] bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-8 shadow-[0_24px_60px_rgba(15,23,42,0.18)]">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs text-slate-200">
              AI 驱动的求职流程管理
            </div>
            <Link
              href="/"
              className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/15"
            >
              返回首页
            </Link>
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-3">
            OfferFlow · AI 求职申请管理看板
          </h1>
          <p className="text-slate-300 max-w-2xl leading-7">
            帮助你统一管理岗位申请、截止日期、材料状态和面试进度，
            不只是记录状态，更能帮助你明确下一步动作。
          </p>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="rounded-[24px] bg-white border border-slate-200 p-5 shadow-sm">
            <div className="text-sm text-slate-500">总申请数</div>
            <div className="text-3xl font-bold text-slate-900 mt-2">
              {totalCount}
            </div>
          </div>

          <div className="rounded-[24px] bg-white border border-slate-200 p-5 shadow-sm">
            <div className="text-sm text-slate-500">紧急岗位</div>
            <div className="text-3xl font-bold text-orange-600 mt-2">
              {urgentCount}
            </div>
          </div>

          <div className="rounded-[24px] bg-white border border-slate-200 p-5 shadow-sm">
            <div className="text-sm text-slate-500">待投递</div>
            <div className="text-3xl font-bold text-slate-900 mt-2">
              {applyCount}
            </div>
          </div>

          <div className="rounded-[24px] bg-white border border-slate-200 p-5 shadow-sm">
            <div className="text-sm text-slate-500">目标岗位</div>
            <div className="text-3xl font-bold text-violet-600 mt-2">
              {targetCount}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-9">
            <div className="rounded-[28px] bg-white border border-slate-200 shadow-sm p-4">
              <div className="flex items-center justify-between px-2 pt-2 pb-5">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">
                    申请进度总览
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    按阶段管理所有申请任务
                  </p>
                </div>
                <button
                  onClick={() => setOpenNewDialog(true)}
                  className="rounded-full bg-slate-900 text-white px-4 py-2 text-sm"
                >
                  新增申请
                </button>
              </div>

              <div className="grid grid-cols-6 gap-4">
                {columns.map((col) => {
                  const items = cards.filter((card) => card.status === col.key);

                  return (
                    <div
                      key={col.key}
                      className="rounded-[24px] bg-slate-50 border border-slate-200 p-3"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-sm font-medium text-slate-700">
                          {col.title}
                        </div>
                        <div className="rounded-full bg-white border border-slate-200 px-2 py-0.5 text-xs text-slate-500">
                          {items.length}
                        </div>
                      </div>

                      <div className="space-y-3">
                        {items.length > 0 ? (
                          items.map((card) => (
                            <div
                              key={card.id}
                              onClick={() => setSelectedCardId(card.id)}
                              className="rounded-[20px] bg-white border border-slate-200 p-4 shadow-sm cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="text-xs text-slate-400">
                                    {card.company}
                                  </div>
                                  <div className="text-sm font-semibold text-slate-900 mt-1 leading-6">
                                    {card.role}
                                  </div>
                                </div>

                                <div
                                  className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${getStageBadgeClass(
                                    card.status
                                  )}`}
                                >
                                  {card.stage}
                                </div>
                              </div>

                              <div
                                className={`mt-3 inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium ${getDeadlineBadgeClass(
                                  card.daysLeft
                                )}`}
                              >
                                {card.daysLeft < 0
                                  ? `已截止：${card.deadline}`
                                  : `截止：${card.deadline}`}
                              </div>

                              {card.lastFollowUpAt ? (
                                <div className="mt-3 flex flex-wrap gap-2">
                                  <div className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full px-2.5 py-1 inline-flex">
                                    最近跟进：{formatFollowUpTime(card.lastFollowUpAt)}
                                  </div>
                                  <div className="text-[11px] text-slate-700 bg-slate-100 border border-slate-200 rounded-full px-2.5 py-1 inline-flex">
                                    {getFollowUpLabel(card.lastFollowUpNote)}
                                  </div>
                                </div>
                              ) : null}
                              <div className="mt-3">
                                <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1.5">
                                  <span>材料进度</span>
                                  <span>
                                    {card.materialsDone}/{card.materialsTotal}
                                  </span>
                                </div>

                                <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                                  <div
                                    className="h-full rounded-full bg-slate-900 transition-all"
                                    style={{
                                      width: `${getProgressPercent(
                                        card.materialsDone,
                                        card.materialsTotal
                                      )}%`,
                                    }}
                                  />
                                </div>
                              </div>

                              <div className="mt-3 rounded-2xl bg-violet-50 border border-violet-100 p-3">
                                <div className="text-[11px] font-medium text-violet-700 mb-1">
                                  AI 建议
                                </div>
                                <div className="text-xs text-slate-700 leading-5">
                                  {suggestionsByCardId[card.id]?.ai_tip ?? card.aiTip}
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="rounded-[20px] border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400 bg-white">
                            暂无申请
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="col-span-3">
            <div className="rounded-[28px] bg-white border border-slate-200 shadow-sm p-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-1">
                AI 助手
              </h2>
              <p className="text-sm text-slate-500 mb-5">
                根据当前申请状态给出下一步建议
              </p>

              <div className="space-y-4">
                <div className="rounded-2xl bg-orange-50 border border-orange-100 p-4">
                  <div className="text-sm font-medium text-orange-700 mb-2">
                    今日最紧急
                  </div>
                  <div className="text-sm text-slate-700">
                    {mostUrgentCard
                      ? `${mostUrgentCard.company} · ${mostUrgentCard.role}`
                      : '暂无紧急岗位'}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {mostUrgentCard
                      ? '截止时间较近，建议优先处理材料或推进流程'
                      : '当前没有临近截止的岗位'}
                  </div>
                </div>

                <div className="rounded-2xl bg-violet-50 border border-violet-100 p-4">
                  <div className="text-sm font-medium text-violet-700 mb-2">
                    推荐动作
                  </div>
                  <div className="text-sm text-slate-700 leading-6">
                    {urgentSuggestion?.next_action ?? '建议优先处理临近截止岗位，并补齐关键申请材料。'}
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-900 text-white p-4">
                  <div className="text-sm font-medium mb-2">AI 总结</div>
                  <div className="text-sm text-slate-300 leading-6">
                    {urgentSuggestion?.ai_tip ?? '系统会根据岗位阶段、截止时间与材料进度，动态生成下一步建议。'}
                  </div>
                  <button
                    onClick={handleRefreshUrgentSuggestion}
                    disabled={!mostUrgentCard || isGeneratingSuggestion}
                    className="mt-4 w-full rounded-full border border-white/15 px-4 py-2 text-sm text-white disabled:opacity-50"
                  >
                    {isGeneratingSuggestion ? '生成中...' : '重新生成建议'}
                  </button>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setOpenNewDialog(true)}
                    className="flex-1 rounded-full bg-slate-900 text-white px-4 py-2 text-sm"
                  >
                    新增申请
                  </button>
                  <button
                    onClick={() => {
                      const confirmed = window.confirm('确认清空当前本地演示数据吗？');
                      if (!confirmed) return;

                      setCards(seedCards);
                      setReviews([]);
                      setJdResultsByCardId({});
                      setSuggestionsByCardId({});
                      setInterviewPackByCardId({});
                      setSelectedCardId(null);

                      window.localStorage.removeItem(STORAGE_KEYS.cards);
                      window.localStorage.removeItem(STORAGE_KEYS.reviews);
                      window.localStorage.removeItem(STORAGE_KEYS.jdResults);
                      window.localStorage.removeItem(STORAGE_KEYS.suggestions);
                      window.localStorage.removeItem(STORAGE_KEYS.interviewPacks);
                      window.localStorage.removeItem('offerflow_cards');
                      window.localStorage.removeItem('offerflow_reviews');
                      window.localStorage.removeItem('offerflow_jd_results');
                      window.localStorage.removeItem('offerflow_suggestions');
                      window.localStorage.removeItem('offerflow_interview_packs');
                    }}
                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700"
                  >
                    重置
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <Dialog
          open={!!selectedCard}
          onOpenChange={(open) => !open && setSelectedCardId(null)}
        >
          <DialogContent className="max-w-3xl rounded-[28px] p-0 overflow-hidden">
            {selectedCard && (
              <>
                <div className="px-6 pt-6 pb-4 border-b bg-white sticky top-0 z-10">
                  <DialogHeader>
                    <div className="flex items-start justify-between gap-4 pr-8">
                      <div>
                        <DialogTitle className="text-2xl font-bold text-slate-900">
                          {selectedCard.company} · {selectedCard.role}
                        </DialogTitle>
                        <DialogDescription className="text-sm text-slate-500 leading-6 mt-2">
                          查看当前岗位的截止时间、申请阶段、材料准备情况与 AI 建议，
                          帮助你快速判断下一步动作。
                        </DialogDescription>
                      </div>
                      <div
                        className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium ${getStageBadgeClass(
                          selectedCard.status
                        )}`}
                      >
                        {selectedCard.stage}
                      </div>
                    </div>
                  </DialogHeader>
                </div>

                <div className="max-h-[70vh] overflow-y-auto px-6 py-5 space-y-5">
                  <div className="grid grid-cols-4 gap-4">
                    <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200">
                      <div className="text-xs text-slate-400 mb-1">截止时间</div>
                      <div className="text-sm font-medium text-slate-900">
                        {selectedCard.deadline}
                      </div>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200">
                      <div className="text-xs text-slate-400 mb-1">面试阶段</div>
                      <div className="text-sm font-medium text-slate-900">
                        {selectedCard.interviewStage}
                      </div>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200">
                      <div className="text-xs text-slate-400 mb-1">材料进度</div>
                      <div className="text-sm font-medium text-slate-900">
                        {selectedCard.materialsDone}/{selectedCard.materialsTotal}
                      </div>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200">
                      <div className="text-xs text-slate-400 mb-1">最近跟进</div>
                      <div className="text-sm font-medium text-slate-900">
                        {selectedCard.lastFollowUpAt
                          ? formatFollowUpTime(selectedCard.lastFollowUpAt)
                          : '暂无记录'}
                      </div>
                      {selectedCard.lastFollowUpNote ? (
                        <div className="mt-2 text-xs text-slate-500">
                          {selectedCard.lastFollowUpNote}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex gap-3 flex-wrap">
                    <button
                      onClick={openEditForSelected}
                      className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      编辑申请
                    </button>
                    <button
                      onClick={handleDeleteApplication}
                      className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 hover:bg-red-100"
                    >
                      删除申请
                    </button>
                    <button
                      onClick={handleGenerateInterviewPack}
                      disabled={isGeneratingInterviewPack}
                      className="rounded-full border border-violet-200 bg-violet-50 px-4 py-2 text-sm text-violet-700 hover:bg-violet-100 disabled:opacity-50"
                    >
                      {isGeneratingInterviewPack ? '生成中...' : '生成面试准备包'}
                    </button>
                  </div>

                  <div className="rounded-2xl bg-white border border-slate-200 p-4">
                    <div className="text-sm font-medium text-slate-900 mb-3">
                      流程状态切换
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {columns.map((col) => (
                        <button
                          key={col.key}
                          onClick={() => handleStatusChange(col.key)}
                          className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                            selectedCard.status === col.key
                              ? `${getStageBadgeClass(col.key)} ring-2 ring-offset-1 ring-slate-200`
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {col.title}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-white border border-slate-200 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-sm font-medium text-slate-900">
                        材料清单
                      </div>
                      <div className="text-xs text-slate-400">
                        已完成 {selectedCard.materialsDone}/
                        {selectedCard.materialsTotal}
                      </div>
                    </div>

                    <div className="space-y-3">
                      {getMockMaterials(selectedCard).map((item, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3"
                        >
                          <div className="text-sm text-slate-700">
                            {item.name}
                          </div>
                          <div
                            className={`rounded-full px-2.5 py-1 text-[11px] font-medium border ${
                              item.completed
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}
                          >
                            {item.completed ? '已完成' : '待补充'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-violet-50 border border-violet-100 p-4">
                    <div className="text-sm font-medium text-violet-700 mb-2">
                      AI 建议
                    </div>
                    <div className="text-sm text-slate-700 leading-6">
                      {selectedSuggestion?.ai_tip ?? selectedCard.aiTip}
                    </div>
                  </div>

                  {selectedInterviewPack && (
                    <>
                      <div className="rounded-2xl bg-white border border-slate-200 p-4">
                        <div className="text-sm font-medium text-slate-900 mb-3">
                          技能树
                        </div>

                        <div className="space-y-4">
                          <div>
                            <div className="text-xs font-medium text-slate-500 mb-2">
                              必备能力
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {selectedInterviewPack.skill_tree.required.map(
                                (item, index) => (
                                  <div
                                    key={index}
                                    className="rounded-full bg-red-50 text-red-700 border border-red-200 px-3 py-1 text-xs"
                                  >
                                    {item.skill} · {item.category}
                                  </div>
                                )
                              )}
                            </div>
                          </div>

                          <div>
                            <div className="text-xs font-medium text-slate-500 mb-2">
                              加分能力
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {selectedInterviewPack.skill_tree.preferred.map(
                                (item, index) => (
                                  <div
                                    key={index}
                                    className="rounded-full bg-violet-50 text-violet-700 border border-violet-200 px-3 py-1 text-xs"
                                  >
                                    {item.skill} · {item.category}
                                  </div>
                                )
                              )}
                            </div>
                          </div>

                          <div>
                            <div className="text-xs font-medium text-slate-500 mb-2">
                              基础门槛
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {selectedInterviewPack.skill_tree.basic.map(
                                (item, index) => (
                                  <div
                                    key={index}
                                    className="rounded-full bg-slate-100 text-slate-700 border border-slate-200 px-3 py-1 text-xs"
                                  >
                                    {item.skill}
                                  </div>
                                )
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-2xl bg-white border border-slate-200 p-4">
                        <div className="text-sm font-medium text-slate-900 mb-3">
                          学习路径
                        </div>
                        <pre className="whitespace-pre-wrap text-sm text-slate-700 leading-6 font-sans">
                          {selectedInterviewPack.study_path}
                        </pre>
                      </div>

                      <div className="rounded-2xl bg-white border border-slate-200 p-4">
                        <div className="text-sm font-medium text-slate-900 mb-3">
                          模拟面试题
                        </div>
                        <pre className="whitespace-pre-wrap text-sm text-slate-700 leading-6 font-sans">
                          {selectedInterviewPack.mock_questions}
                        </pre>
                      </div>
                    </>
                  )}

                  <div className="rounded-2xl bg-slate-900 text-white p-4">
                    <div className="text-sm font-medium mb-2">下一步动作</div>
                    <div className="text-sm text-slate-300 leading-6">
                      {isGeneratingSuggestion
                        ? 'AI 正在根据当前阶段刷新建议...'
                        : selectedSuggestion?.next_action ??
                          '建议优先处理当前岗位的关键阻塞项，并在截止时间前完成材料补齐或流程推进。'}
                    </div>

                    <div className="mt-4">
                      <label className="block text-xs text-slate-300 mb-2">
                        跟进备注
                      </label>
                      <input
                        value={followUpNote}
                        onChange={(e) => setFollowUpNote(e.target.value)}
                        className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-2 text-sm text-white placeholder:text-slate-400 outline-none"
                        placeholder="例如：已内推 / 已发邮件 / 已催进度 / 已约面试"
                      />
                    </div>
                    <div className="flex gap-3 mt-4">
                      <button
                        onClick={handleMarkFollowedUp}
                        className="rounded-full bg-white text-slate-900 px-4 py-2 text-sm font-medium"
                      >
                        标记为已跟进
                      </button>
                      <button
                        onClick={() => {
                          setEditingReviewId(null);
                          setReviewRound('');
                          setReviewTime('');
                          setReviewQuestions('');
                          setReviewReflection('');
                          setOpenReviewDialog(true);
                        }}
                        className="rounded-full border border-white/20 text-white px-4 py-2 text-sm"
                      >
                        记录面试复盘
                      </button>
                    </div>
                    <div className="mt-4 text-xs text-slate-300">
                      {selectedCard.lastFollowUpAt
                        ? `最近跟进于 ${formatFollowUpTime(selectedCard.lastFollowUpAt)} · ${getFollowUpLabel(selectedCard.lastFollowUpNote)}`
                        : '你还没有记录这条申请的最近跟进时间'}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-white border border-slate-200 p-4">
                    <div className="text-sm font-medium text-slate-900 mb-3">
                      面试记录
                    </div>

                    {currentReviews.length > 0 ? (
                      <div className="space-y-3">
                        {currentReviews.map((item) => (
                          <div
                            key={item.id}
                            className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4"
                          >
                            <div className="flex items-start justify-between gap-4 mb-2">
                              <div>
                                <div className="text-sm font-medium text-slate-900">
                                  {item.round}
                                </div>
                                <div className="text-xs text-slate-400 mt-1">
                                  {item.time}
                                </div>
                              </div>

                              <div className="flex gap-2">
                                <button
                                  onClick={() => openEditReview(item)}
                                  className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700 hover:bg-slate-50"
                                >
                                  编辑
                                </button>
                                <button
                                  onClick={() => handleDeleteReview(item.id)}
                                  className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs text-red-700 hover:bg-red-100"
                                >
                                  删除
                                </button>
                              </div>
                            </div>

                            <div className="mb-3">
                              <div className="text-xs font-medium text-slate-500 mb-1">
                                被问到的问题
                              </div>
                              <div className="text-sm text-slate-700 leading-6">
                                {item.questions}
                              </div>
                            </div>

                            <div>
                              <div className="text-xs font-medium text-slate-500 mb-1">
                                复盘与改进
                              </div>
                              <div className="text-sm text-slate-700 leading-6">
                                {item.reflection}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-400 text-center">
                        暂无面试记录。点击“记录面试复盘”即可保存当前岗位的面试内容。
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={openNewDialog} onOpenChange={setOpenNewDialog}>
          <DialogContent className="max-w-2xl rounded-[28px] p-0 overflow-hidden">
            <div className="px-6 pt-6 pb-4 border-b bg-white sticky top-0 z-10">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold text-slate-900">
                  新增申请
                </DialogTitle>
                <DialogDescription className="text-sm text-slate-500 leading-6">
                  录入新的岗位申请信息，后续可继续接入 AI 自动解析 JD 与生成建议。
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-2">
                      公司名称
                    </label>
                    <input
                      value={newCompany}
                      onChange={(e) => setNewCompany(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
                      placeholder="例如：美团"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-2">
                      岗位名称
                    </label>
                    <input
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
                      placeholder="例如：AI 产品经理实习生"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-2">
                      截止时间
                    </label>
                    <input
                      value={newDeadline}
                      onChange={(e) => setNewDeadline(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
                      placeholder="例如：4月22日"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-2">
                      JD / 岗位描述
                    </label>
                    <textarea
                      value={newJD}
                      onChange={(e) => setNewJD(e.target.value)}
                      className="w-full min-h-[220px] rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
                      placeholder="粘贴岗位描述，后续这里可以接 AI 自动解析..."
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleParseJD}
                      disabled={isParsingJD}
                      className="rounded-full bg-violet-600 text-white px-4 py-2 text-sm disabled:opacity-50"
                    >
                      {isParsingJD ? '解析中...' : 'AI 解析 JD'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-6 rounded-2xl bg-violet-50 border border-violet-100 p-4">
                <div className="text-sm font-medium text-violet-700 mb-2">
                  AI 解析结果
                </div>

                {jdResult ? (
                  <div className="space-y-3 text-sm text-slate-700">
                    <div>
                      <span className="font-medium">关键词：</span>
                      {jdResult.keywords.join('、')}
                    </div>
                    <div>
                      <span className="font-medium">建议材料：</span>
                      {jdResult.materials.join('、')}
                    </div>
                    <div>
                      <span className="font-medium">优先级：</span>
                      {jdResult.priority}
                    </div>
                    <div>
                      <span className="font-medium">总结：</span>
                      {jdResult.summary}
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-slate-600 leading-6">
                    点击“AI 解析 JD”后，这里会展示岗位关键词、建议材料、优先级与总结。
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-6">
                <button
                  onClick={() => {
                    setOpenNewDialog(false);
                    setJdResult(null);
                  }}
                  className="rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-600"
                >
                  取消
                </button>
                <button
                  onClick={handleSaveApplication}
                  className="rounded-full bg-slate-900 text-white px-4 py-2 text-sm"
                >
                  保存申请
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={openReviewDialog} onOpenChange={setOpenReviewDialog}>
          <DialogContent className="max-w-2xl rounded-[28px] p-0 overflow-hidden">
            <div className="px-6 pt-6 pb-4 border-b bg-white sticky top-0 z-10">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold text-slate-900">
                  {editingReviewId !== null ? '编辑面试复盘' : '记录面试复盘'}
                </DialogTitle>
                <DialogDescription className="text-sm text-slate-500 leading-6">
                  {editingReviewId !== null
                    ? '修改当前岗位的面试复盘内容，保存后会同步更新到面试记录。'
                    : '保存当前岗位的面试轮次、问题摘要与复盘结论，便于后续继续准备。'}
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-2">
                      面试轮次
                    </label>
                    <input
                      value={reviewRound}
                      onChange={(e) => setReviewRound(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
                      placeholder="例如：一面 / 二面 / HR 面"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-2">
                      面试时间
                    </label>
                    <input
                      value={reviewTime}
                      onChange={(e) => setReviewTime(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
                      placeholder="例如：2026-04-18 14:00"
                    />
                  </div>

                  <div className="rounded-2xl bg-violet-50 border border-violet-100 p-4">
                    <div className="text-sm font-medium text-violet-700 mb-2">
                      AI 预留能力位
                    </div>
                    <div className="text-sm text-slate-700 leading-6">
                      后续这里可以接入：自动总结问题主题、提炼薄弱点、生成下一轮准备建议。
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-2">
                      被问到的问题
                    </label>
                    <textarea
                      value={reviewQuestions}
                      onChange={(e) => setReviewQuestions(e.target.value)}
                      className="w-full min-h-[140px] rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
                      placeholder="记录本轮面试中被问到的关键问题..."
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-2">
                      复盘与改进
                    </label>
                    <textarea
                      value={reviewReflection}
                      onChange={(e) => setReviewReflection(e.target.value)}
                      className="w-full min-h-[180px] rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
                      placeholder="记录答得好的地方、不足点、下一轮要加强的内容..."
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6">
                <button
                  onClick={() => {
                    setOpenReviewDialog(false);
                    setEditingReviewId(null);
                    setReviewRound('');
                    setReviewTime('');
                    setReviewQuestions('');
                    setReviewReflection('');
                  }}
                  className="rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-600"
                >
                  取消
                </button>
                <button
                  onClick={handleSaveReview}
                  className="rounded-full bg-slate-900 text-white px-4 py-2 text-sm"
                >
                  {editingReviewId !== null ? '保存修改' : '保存复盘'}
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={openEditDialog} onOpenChange={setOpenEditDialog}>
          <DialogContent className="max-w-2xl rounded-[28px] p-0 overflow-hidden">
            <div className="px-6 pt-6 pb-4 border-b bg-white sticky top-0 z-10">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold text-slate-900">
                  编辑申请与 JD
                </DialogTitle>
                <DialogDescription className="text-sm text-slate-500 leading-6">
                  修改当前岗位的基础信息与 JD / 岗位描述，保存后会重新解析岗位并更新 AI 建议。
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-2">
                      公司名称
                    </label>
                    <input
                      value={editCompany}
                      onChange={(e) => setEditCompany(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
                      placeholder="例如：美团"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-2">
                      岗位名称
                    </label>
                    <input
                      value={editRole}
                      onChange={(e) => setEditRole(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
                      placeholder="例如：AI 产品经理实习生"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-2">
                      截止时间
                    </label>
                    <input
                      value={editDeadline}
                      onChange={(e) => setEditDeadline(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
                      placeholder="例如：4月22日"
                    />
                    <div className="mt-2 text-xs text-slate-400">
                      右侧区域现在编辑的是 JD 文本，保存后会重新生成 AI 建议。
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    这里编辑的是岗位 JD 原文，不是 AI 建议文案。保存后会重新解析 JD，并自动刷新 AI 建议。
                  </div>
                  <div>
                    <label className="text-sm font-medium text-violet-700 block mb-2">
                      JD / 岗位描述（这里不是 AI 建议）
                    </label>
                    <textarea
                      value={editJD}
                      onChange={(e) => setEditJD(e.target.value)}
                      className="w-full min-h-[220px] rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
                      placeholder="这里显示并编辑当前保存的 JD 原文；修改后可重新解析岗位要求并自动更新 AI 建议..."
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleParseEditJD}
                      disabled={isParsingEditJD}
                      className="rounded-full bg-violet-600 text-white px-4 py-2 text-sm disabled:opacity-50"
                    >
                      {isParsingEditJD ? '解析中...' : '重新解析 JD'}
                    </button>
                  </div>

                  <div className="rounded-2xl bg-violet-50 border border-violet-100 p-4">
                    <div className="text-sm font-medium text-violet-700 mb-2">
                      JD 解析结果（AI 建议会根据这里自动更新）
                    </div>
                    <div className="space-y-2 text-sm text-slate-700">
                      <div>
                        <span className="font-medium">关键词：</span>
                        {selectedJdResult?.keywords?.join('、') || '暂无'}
                      </div>
                      <div>
                        <span className="font-medium">建议材料：</span>
                        {selectedJdResult?.materials?.join('、') || '暂无'}
                      </div>
                      <div>
                        <span className="font-medium">优先级：</span>
                        {selectedJdResult?.priority || '暂无'}
                      </div>
                      <div>
                        <span className="font-medium">总结：</span>
                        {selectedJdResult?.summary || '暂无'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6">
                <button
                  onClick={() => {
                    setOpenEditDialog(false);
                    setEditJD('');
                  }}
                  className="rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-600"
                >
                  取消
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="rounded-full bg-slate-900 text-white px-4 py-2 text-sm"
                >
                  保存修改
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </main>
  );
}