from __future__ import annotations

import re


def analyze_jd(jd_text: str) -> dict:
    """
    从 analyst.py 抽出来的可运行版本。
    当前先用规则解析，后续可替换成你原项目里的 llm_client / OpenAI 调用。
    """
    text = jd_text.strip()

    if not text:
        return {
            "title": "",
            "company": "",
            "location": "",
            "salary": "",
            "job_type": "",
            "required_skills": [],
            "preferred_skills": [],
            "basic_requirements": [],
            "responsibilities": [],
            "keywords": [],
        }

    # 岗位名称粗提取
    title = ""
    title_candidates = [
        "AI产品经理",
        "产品经理",
        "增长产品",
        "商业化产品",
        "运营产品",
        "数据产品",
        "策略产品",
    ]
    for candidate in title_candidates:
        if candidate in text:
            title = candidate
            break

    # 公司名粗提取
    company = ""
    company_candidates = [
        "美团",
        "腾讯",
        "字节跳动",
        "阿里巴巴",
        "小红书",
        "携程",
        "百度",
        "京东",
        "网易",
    ]
    for candidate in company_candidates:
        if candidate in text:
            company = candidate
            break

    # 地点粗提取
    location = ""
    location_candidates = [
        "北京",
        "上海",
        "深圳",
        "广州",
        "杭州",
        "武汉",
        "成都",
        "远程",
    ]
    for candidate in location_candidates:
        if candidate in text:
            location = candidate
            break

    # 薪资粗提取
    salary_match = re.search(r'(\d+[-~到]\d+[kK]|\d+元/天|\d+[-~到]\d+元/天)', text)
    salary = salary_match.group(1) if salary_match else ""

    # 类型粗提取
    job_type = ""
    if "暑期实习" in text:
      job_type = "暑期实习"
    elif "日常实习" in text:
      job_type = "日常实习"
    elif "校招" in text:
      job_type = "校招"
    elif "社招" in text:
      job_type = "社招"

    required_map = {
        "AI产品": ["AI", "人工智能", "大模型", "LLM", "Agent"],
        "用户研究": ["用户研究", "用户需求", "用户洞察"],
        "跨团队协作": ["跨部门", "协作", "沟通协调"],
        "增长策略": ["增长", "转化", "留存", "拉新"],
        "数据分析": ["数据分析", "SQL", "指标", "分析能力"],
        "产品设计": ["PRD", "原型", "Axure", "Figma", "交互设计"],
        "搜索推荐": ["搜索", "推荐", "召回", "排序"],
    }

    preferred_map = {
        "有 AI 项目经验": ["AI项目", "大模型项目", "智能体"],
        "有实习经历": ["实习经验", "相关经验"],
        "有内容/社区经验": ["内容", "社区", "UGC"],
        "有电商/商业化经验": ["商业化", "广告", "电商"],
    }

    basic_requirements_map = {
        "本科及以上": ["本科", "硕士", "研究生"],
        "良好沟通能力": ["沟通能力", "表达能力"],
        "逻辑清晰": ["逻辑", "结构化思维"],
        "执行力强": ["执行力", "推动能力"],
    }

    responsibility_map = {
        "需求分析": ["需求分析", "需求拆解"],
        "产品设计": ["产品设计", "原型设计", "PRD"],
        "项目推进": ["项目推进", "跨团队协作", "跟进落地"],
        "数据分析": ["数据分析", "效果评估", "指标追踪"],
    }

    def extract_items(mapping: dict[str, list[str]]) -> list[str]:
        found = []
        for label, patterns in mapping.items():
            if any(p.lower() in text.lower() for p in patterns):
                found.append(label)
        return found

    required_skills = extract_items(required_map)
    preferred_skills = extract_items(preferred_map)
    basic_requirements = extract_items(basic_requirements_map)
    responsibilities = extract_items(responsibility_map)

    keyword_pool = (
        required_skills
        + preferred_skills
        + basic_requirements
        + responsibilities
    )
    keywords = list(dict.fromkeys(keyword_pool))[:8]

    return {
        "title": title,
        "company": company,
        "location": location,
        "salary": salary,
        "job_type": job_type,
        "required_skills": required_skills,
        "preferred_skills": preferred_skills,
        "basic_requirements": basic_requirements,
        "responsibilities": responsibilities,
        "keywords": keywords,
    }