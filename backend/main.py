"""Entry point shim for Railway/production deployment.
Re-exports the FastAPI app from app.main so both
`uvicorn main:app` and `uvicorn app.main:app` work.

Wraps the FastAPI app with Socket.IO ASGI middleware
for real-time collaboration support.
"""
import uvicorn
import socketio
from app.main import app as fastapi_app  # noqa: F401
from app.collaboration import sio

# Wrap FastAPI with Socket.IO ASGI app
app = socketio.ASGIApp(sio, other_asgi_app=fastapi_app, socketio_path="/ws/socket.io")

if __name__ == "__main__":
    import os
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port)
