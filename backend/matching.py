def find_matches(item: dict, candidates: list[dict]) -> list[dict]:
    return [
        {"other_id": c["id"], "score": 0.9, "reason": {"category": True}}
        for c in candidates
        if c["category"] == item["category"]
    ]
