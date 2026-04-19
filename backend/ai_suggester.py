def generate_suggestion(application: dict) -> dict:
    status = application.get("status", "")
    company = application.get("company", "")
    role = application.get("role", "")
    days_left = application.get("daysLeft", 999)
    materials_done = application.get("materialsDone", 0)
    materials_total = application.get("materialsTotal", 0)

    if days_left <= 2 and materials_done < materials_total:
        ai_tip = f"{company} 的 {role} 截止时间很近，建议优先补齐材料后尽快投递。"
        next_action = "今天先补齐缺失材料，完成后立即投递。"
        risk = "高"
    elif status == "prepare":
        ai_tip = f"{company} 的 {role} 还处于待准备阶段，建议先完成简历与作品集整理。"
        next_action = "先完成基础材料准备，再评估是否需要针对 JD 做定制化优化。"
        risk = "中"
    elif status == "apply":
        ai_tip = f"{company} 的 {role} 已进入待投递阶段，建议优先提交申请。"
        next_action = "确认材料无误后尽快完成投递，并记录截止时间。"
        risk = "中"
    elif status == "submitted":
        ai_tip = f"{company} 的 {role} 已投递，建议提前准备常见面试问题。"
        next_action = "整理项目案例，准备自我介绍与高频问题回答。"
        risk = "低"
    elif status == "assessment":
        ai_tip = f"{company} 的 {role} 正在测评阶段，建议优先完成笔试或在线测评。"
        next_action = "预留完整时间完成测评，并记录题型与感受。"
        risk = "中"
    elif status == "interview":
        ai_tip = f"{company} 的 {role} 已进入面试阶段，建议尽快完成复盘并准备下一轮。"
        next_action = "回顾本轮问题，补齐薄弱项，准备下一轮表达。"
        risk = "中"
    elif status == "done":
        ai_tip = f"{company} 的 {role} 已结束，建议整理经验，复用到其他岗位。"
        next_action = "归档本岗位材料和复盘，总结可迁移经验。"
        risk = "低"
    else:
        ai_tip = f"{company} 的 {role} 已完成基础分析。"
        next_action = "继续推进当前阶段任务。"
        risk = "低"

    return {
        "ai_tip": ai_tip,
        "next_action": next_action,
        "risk": risk,
    }