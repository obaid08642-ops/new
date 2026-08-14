"""
NestJS Proxy Module.
Forwards any request matching /api/v2/* to the NestJS Core backend at http://localhost:8002/api/*.

This is what lets the public-facing Patient App (which can only reach /api/*) talk to
the new NestJS backend without exposing port 8002 publicly.
"""
import httpx
from fastapi import APIRouter, Request, Response

NEST_BASE = "http://localhost:8002/api"
proxy_router = APIRouter()

# Long-lived client for connection pooling
_client = httpx.AsyncClient(timeout=30.0, follow_redirects=False)


async def _forward(request: Request, path: str) -> Response:
    url = f"{NEST_BASE}/{path}"
    # Strip hop-by-hop & host headers
    drop = {"host", "content-length", "connection", "transfer-encoding"}
    headers = {k: v for k, v in request.headers.items() if k.lower() not in drop}
    body = await request.body()
    try:
        upstream = await _client.request(
            method=request.method,
            url=url,
            headers=headers,
            content=body,
            params=request.query_params,
        )
    except httpx.RequestError as e:
        return Response(content=f'{{"error":"upstream_unreachable","detail":"{str(e)}"}}', status_code=502, media_type="application/json")
    # Filter headers we should not pass through
    skip = {"content-encoding", "transfer-encoding", "content-length", "connection"}
    out_headers = {k: v for k, v in upstream.headers.items() if k.lower() not in skip}
    return Response(content=upstream.content, status_code=upstream.status_code, headers=out_headers, media_type=upstream.headers.get("content-type"))


@proxy_router.api_route("/api/v2/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"])
async def proxy_v2(path: str, request: Request):
    return await _forward(request, path)


@proxy_router.api_route("/api/v2", methods=["GET", "POST", "OPTIONS"])
async def proxy_v2_root(request: Request):
    return await _forward(request, "")
