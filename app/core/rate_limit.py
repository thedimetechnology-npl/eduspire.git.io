from collections import defaultdict, deque
from threading import Lock
from time import monotonic

from fastapi import HTTPException, Request, status


_requests: dict[tuple[str, str], deque[float]] = defaultdict(deque)
_lock = Lock()


def rate_limit(name: str, limit: int, window_seconds: int):
    def dependency(request: Request):
        client = request.client.host if request.client else "unknown"
        key = (name, client)
        now = monotonic()

        with _lock:
            timestamps = _requests[key]
            while timestamps and now - timestamps[0] >= window_seconds:
                timestamps.popleft()

            if len(timestamps) >= limit:
                retry_after = max(1, int(window_seconds - (now - timestamps[0])))
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Too many requests. Please try again later.",
                    headers={"Retry-After": str(retry_after)},
                )

            timestamps.append(now)

            if len(_requests) > 10000:
                expired = [
                    request_key
                    for request_key, request_times in _requests.items()
                    if not request_times or now - request_times[-1] >= window_seconds
                ]
                for request_key in expired:
                    _requests.pop(request_key, None)

    return dependency