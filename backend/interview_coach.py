from __future__ import annotations

import json


def extract_skill_tree(jd_info: dict) -> dict:
    keywords = jd_info.get("keywords", [])
    required = []
    preferred = []
    basic = []

    mapping = {
        "AI产品": {"skill": "AI产品设计", "category": "LLM/Agent", "importance": "高"},
        "用户研究": {"skill": "用户研究", "category": "产品", "importance": "高"},
        "跨团队协作": {"skill": "跨团队协作", "category": "通用能力", "importance": "高"},
        "增长策略": {"skill": "增长策略", "category": "增长", "importance": "中"},
        "数据分析": {"skill": "数据分析", "category": "分析", "importance": "中"},
        "搜索推荐": {"skill": "搜索推荐", "category": "AI应用", "importance": "中"},
        "产品设计": {"skill": "产品设计", "category": "产品", "importance": "中"},
    }

    for kw in keywords:
        if kw in mapping:
            required.append(mapping[kw])

    basic.append({"skill": "结构化表达", "category": "基础", "importance": "门槛"})
    basic.append({"skill": "项目复盘能力", "category": "基础", "importance": "门槛"})

    if "AI产品" in keywords:
        preferred.append({"skill": "Prompt Engineering", "category": "LLM/Agent", "importance": "中"})
        preferred.append({"skill": "RAG / Agent基础", "category": "LLM/Agent", "importance": "中"})

    return {
        "required": required,
        "preferred": preferred,
        "basic": basic,
    }


def generate_study_path(skill_tree: dict, target_weeks: int = 4) -> str:
    required_skills = [item["skill"] for item in skill_tree.get("required", [])]
    preferred_skills = [item["skill"] for item in skill_tree.get("preferred", [])]

    lines = [
        f"# {target_weeks}周面试准备计划",
        "",
        "## 第1周：建立基础认知",
        "- 梳理岗位要求与核心技能",
        "- 准备自我介绍与项目经历主线",
        "- 输出 1 版岗位匹配说明",
        "",
        "## 第2周：补齐关键能力",
        f"- 重点学习：{', '.join(required_skills[:3]) if required_skills else '产品分析、需求拆解'}",
        "- 针对 JD 关键词补充案例表达",
        "- 整理 3 个可深挖项目故事",
        "",
        "## 第3周：模拟面试专项训练",
        "- 练习项目拷打题、行为面试题",
        "- 针对薄弱点进行二次补强",
        f"- 加分项补充：{', '.join(preferred_skills[:3]) if preferred_skills else 'AI应用理解、行业案例'}",
        "",
        "## 第4周：冲刺与查漏补缺",
        "- 完整模拟 1~2 轮面试",
        "- 复盘表达逻辑与案例深度",
        "- 准备高频反问问题",
    ]
    return "\n".join(lines)


def generate_mock_questions(jd_info: dict, resume_data: dict | None = None) -> str:
    keywords = jd_info.get("keywords", [])

    questions = [
        "请用 3 分钟介绍一个你做过的产品项目，并说明你的核心贡献。",
        "这个岗位为什么适合你？",
        "如果让你为一个 AI 功能设计产品方案，你会怎么拆解需求？",
        "你如何判断一个功能是否真的解决了用户问题？",
        "遇到跨团队协作推进困难时，你会怎么处理？",
    ]

    if "AI产品" in keywords:
        questions += [
            "你如何理解大模型产品和传统产品的差异？",
            "Prompt Engineering 在真实产品中的价值是什么？",
            "你会如何评估一个 AI Agent 产品的效果？",
        ]

    if "增长策略" in keywords:
        questions += [
            "如果一个增长漏斗转化下降，你会怎么分析？",
            "你会如何设计一个 A/B Test 来验证增长假设？",
        ]

    if "数据分析" in keywords:
        questions += [
            "你最常用哪些指标来评估产品效果？",
            "如果指标上涨但用户反馈变差，你会怎么解释？",
        ]

    questions += [
        "请讲一个你推进项目落地的例子。",
        "请讲一个你做错判断、后来修正的经历。",
        "你对这个岗位还有哪些问题想问？",
    ]

    lines = ["# 模拟面试题", ""]
    for i, q in enumerate(questions[:15], start=1):
        lines.append(f"{i}. {q}")

    return "\n".join(lines)


def generate_interview_pack(jd_info: dict, resume_data: dict | None = None) -> dict:
    skill_tree = extract_skill_tree(jd_info)
    study_path = generate_study_path(skill_tree)
    mock_questions = generate_mock_questions(jd_info, resume_data)

    return {
        "skill_tree": skill_tree,
        "study_path": study_path,
        "mock_questions": mock_questions,
    }