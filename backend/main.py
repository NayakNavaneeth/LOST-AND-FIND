import os
from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from supabase import create_client
from matching import find_matches

load_dotenv(override=True)
db = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_KEY"))

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173"],
                   allow_methods=["*"], allow_headers=["*"])

THRESHOLD = 0.6


def current_user(authorization: str = Header(None)) -> str:
    if not authorization:
        raise HTTPException(401, "Missing token")
    try:
        user = db.auth.get_user(authorization.replace("Bearer ", ""))
        return user.user.id
    except Exception:
        raise HTTPException(401, "Invalid token")


class ItemIn(BaseModel):
    item_name: str
    description: str = ""
    category: str
    location: str
    report_type: str  # lost | found
    image_url: str | None = None


@app.post("/items")
def create_item(body: ItemIn, authorization: str = Header(None)):
    uid = current_user(authorization)
    item = db.table("items").insert({**body.model_dump(), "user_id": uid}).execute().data[0]
    run_matching(item)
    return item


@app.get("/items")
def list_items(report_type: str | None = None, category: str | None = None):
    q = db.table("items").select("*").eq("status", "active")
    if report_type: q = q.eq("report_type", report_type)
    if category: q = q.eq("category", category)
    return q.order("created_at", desc=True).execute().data


@app.get("/notifications")
def my_notifications(authorization: str = Header(None)):
    uid = current_user(authorization)
    return db.table("notifications").select("*").eq("user_id", uid)\
             .order("created_at", desc=True).execute().data


@app.patch("/notifications/{nid}/read")
def mark_read(nid: str, authorization: str = Header(None)):
    uid = current_user(authorization)
    db.table("notifications").update({"is_read": True}).eq("id", nid).eq("user_id", uid).execute()
    return {"ok": True}


@app.patch("/items/{item_id}/claim")
def claim(item_id: str, authorization: str = Header(None)):
    current_user(authorization)
    db.table("items").update({"status": "claim_pending"}).eq("id", item_id).execute()
    return {"ok": True}


@app.patch("/items/{item_id}/returned")
def returned(item_id: str, authorization: str = Header(None)):
    uid = current_user(authorization)
    me = db.table("profiles").select("role").eq("id", uid).single().execute().data
    if me["role"] != "admin":
        raise HTTPException(403, "Admin only")
    db.table("items").update({"status": "returned"}).eq("id", item_id).execute()
    return {"ok": True}


def run_matching(item: dict):
    opposite = "found" if item["report_type"] == "lost" else "lost"
    candidates = db.table("items").select("*").eq("report_type", opposite)\
                   .eq("status", "active").execute().data
    for m in find_matches(item, candidates):
        if m["score"] < THRESHOLD:
            continue
        lost_id = item["id"] if item["report_type"] == "lost" else m["other_id"]
        found_id = m["other_id"] if item["report_type"] == "lost" else item["id"]
        match = db.table("matches").insert({
            "lost_item_id": lost_id, "found_item_id": found_id,
            "similarity_score": m["score"], "match_reason": m["reason"],
        }).execute().data[0]
        other = next(c for c in candidates if c["id"] == m["other_id"])
        for uid in {item["user_id"], other["user_id"]}:
            db.table("notifications").insert({
                "user_id": uid, "match_id": match["id"],
                "message": "Potential match found for your item!",
            }).execute()
        db.table("items").update({"status": "potential_match"})\
          .in_("id", [lost_id, found_id]).execute()