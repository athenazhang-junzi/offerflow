'use client';

import Link from 'next/link';

const features = [
  {
    title: '申请看板管理',
    desc: '按阶段管理所有岗位申请，统一查看截止时间、材料进度、面试阶段、最近跟进状态与后续动作。',
  },
  {
    title: 'JD 智能解析',
    desc: '粘贴岗位描述后自动提取关键词、建议材料与优先级，帮助你更快判断岗位价值与准备方向。',
  },
  {
    title: '面试复盘与跟进沉淀',
    desc: '记录面试问题、复盘内容、最近跟进时间与备注，让每一次申请都能沉淀为可复用经验。',
  },
];

const steps = [
  {
    title: '1. 新增申请',
    desc: '点击“新增申请”，填写公司、岗位、截止时间，并粘贴 JD / 岗位描述。',
  },
  {
    title: '2. 解析 JD',
    desc: '点击“AI 解析 JD”，系统会自动生成关键词、建议材料、优先级与岗位总结。',
  },
  {
    title: '3. 管理申请阶段',
    desc: '在看板中查看不同阶段的岗位，并在详情页切换状态、查看 AI 建议与下一步动作。',
  },
  {
    title: '4. 记录复盘与跟进',
    desc: '在详情页记录面试复盘，并通过“标记为已跟进”保存最近跟进时间与备注。',
  },
  {
    title: '5. 持续更新岗位信息',
    desc: '你可以在“编辑申请与 JD”中修改岗位信息或 JD，重新解析后系统会自动刷新 AI 建议。',
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fffaf7_0%,#f8fafc_38%,#f5f7fb_100%)] text-slate-900">
      <div className="mx-auto max-w-6xl px-6 py-8 md:px-8 md:py-10">
        <header className="mb-8 flex items-center justify-between rounded-full border border-slate-200 bg-white/80 px-5 py-3 backdrop-blur">
          <div>
            <div className="text-sm font-semibold text-slate-900">OfferFlow</div>
            <div className="text-xs text-slate-500">AI 求职申请管理系统</div>
          </div>
          <Link
            href="/applications"
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white"
          >
            进入看板
          </Link>
        </header>

        <section className="rounded-[32px] bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-8 py-10 text-white shadow-[0_24px_60px_rgba(15,23,42,0.18)] md:px-10 md:py-14">
          <div className="inline-flex rounded-full bg-white/10 px-3 py-1 text-xs text-slate-200">
            面向求职季的 AI 管理工具
          </div>
          <h1 className="mt-5 text-4xl font-bold tracking-tight md:text-5xl">
            OfferFlow · AI 求职申请管理系统
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-8 text-slate-300 md:text-lg">
            帮你把零散的岗位申请、截止时间、材料准备、面试复盘与跟进动作整合到一个统一流程中。
            不只是“记下来”，而是通过 AI 解析 JD、生成建议、辅助复盘，让求职管理真正可执行。
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/applications"
              className="rounded-full bg-white px-5 py-3 text-sm font-medium text-slate-900 transition hover:-translate-y-0.5"
            >
              立即开始使用
            </Link>
            <a
              href="#guide"
              className="rounded-full border border-white/20 px-5 py-3 text-sm font-medium text-white"
            >
              查看使用说明
            </a>
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          {features.map((item) => (
            <div
              key={item.title}
              className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="inline-flex rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700">
                核心能力
              </div>
              <h2 className="mt-4 text-xl font-semibold text-slate-900">
                {item.title}
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">{item.desc}</p>
            </div>
          ))}
        </section>

        <section
          id="guide"
          className="mt-8 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm md:p-8"
        >
          <div className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
            使用说明
          </div>
          <h2 className="mt-4 text-2xl font-bold text-slate-900">如何使用 OfferFlow</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
            第一次使用时，建议先从一个真实岗位开始完整体验一遍：新增申请 → 解析 JD → 查看建议 → 记录复盘 → 添加跟进备注。
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {steps.map((step) => (
              <div
                key={step.title}
                className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-5"
              >
                <div className="text-base font-semibold text-slate-900">{step.title}</div>
                <div className="mt-2 text-sm leading-7 text-slate-600">{step.desc}</div>
              </div>
            ))}
          </div>

        </section>

        <section className="mt-8 rounded-[28px] border border-slate-200 bg-white p-8 shadow-sm">
          <div className="text-sm font-medium text-slate-500">开始体验</div>
          <h2 className="mt-2 text-2xl font-bold text-slate-900">现在就进入申请看板</h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
            你可以直接从真实岗位开始，把它当作一个 AI 求职操作台使用，也可以作为作品集项目对外展示。
          </p>
          <div className="mt-6">
            <Link
              href="/applications"
              className="inline-flex rounded-full bg-slate-900 px-5 py-3 text-sm font-medium text-white"
            >
              打开 OfferFlow 看板
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}