from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from jd_analyst import analyze_jd
from ai_suggester import generate_suggestion
from interview_coach import generate_interview_pack


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class JDRequest(BaseModel):
    jd_text: str


class SuggestionRequest(BaseModel):
    application: dict


class InterviewPackRequest(BaseModel):
    jd_info: dict
    resume_data: dict | None = None


@app.get("/")
def root():
    return {"message": "OfferFlow backend is running"}


@app.post("/parse-jd")
def parse_jd(req: JDRequest):
    parsed = analyze_jd(req.jd_text)

    priority = "high" if ("AI产品" in parsed["keywords"] or "增长策略" in parsed["keywords"]) else "medium"

    summary_parts = []
    if parsed["title"]:
        summary_parts.append(f"岗位方向偏向{parsed['title']}")
    if parsed["required_skills"]:
        summary_parts.append(f"重点能力包括：{'、'.join(parsed['required_skills'][:3])}")
    if parsed["location"]:
        summary_parts.append(f"工作地点为{parsed['location']}")

    summary = "；".join(summary_parts) if summary_parts else "该岗位已完成基础解析。"

    materials = ["简历", "作品集", "自我介绍"]
    if "数据分析" in parsed["required_skills"]:
        materials.append("数据分析案例")
    if "AI产品" in parsed["required_skills"]:
        materials.append("AI 项目案例")

    materials = list(dict.fromkeys(materials))

    return {
        "keywords": parsed["keywords"],
        "materials": materials,
        "priority": priority,
        "summary": summary,
        "raw": parsed,
    }


@app.post("/generate-suggestion")
def generate_suggestion_api(req: SuggestionRequest):
    return generate_suggestion(req.application)


@app.post("/generate-interview-pack")
def generate_interview_pack_api(req: InterviewPackRequest):
    return generate_interview_pack(req.jd_info, req.resume_data)