"""
Stream Bus — thread-safe SSE event queue for QAIP pipeline progress.

main.py owns the asyncio event loop reference.
qaip_pipeline_v2.py calls push() from background threads.
main.py's /stream/{run_id} reads from the queue.
"""
from __future__ import annotations

import asyncio
import logging
from typing import Any

logger = logging.getLogger("qaip.stream_bus")

_queues: dict[str, asyncio.Queue] = {}
_loop: asyncio.AbstractEventLoop | None = None


def set_loop(loop: asyncio.AbstractEventLoop) -> None:
    global _loop
    _loop = loop


def register(run_id: str) -> asyncio.Queue:
    """Create and register a queue for a run. Call from the async endpoint."""
    q: asyncio.Queue = asyncio.Queue()
    _queues[run_id] = q
    return q


def deregister(run_id: str) -> None:
    _queues.pop(run_id, None)


def push(run_id: str, event: dict[str, Any]) -> None:
    """Push an event from a background thread into the run's SSE queue."""
    q = _queues.get(run_id)
    if q is None or _loop is None or _loop.is_closed():
        return
    try:
        asyncio.run_coroutine_threadsafe(q.put(event), _loop)
    except Exception as exc:
        logger.debug("stream_bus.push failed for %s: %s", run_id, exc)
