import { useState, useEffect, useRef, useCallback } from 'react';
import type { Defect } from '../types';

type WsMessageType = 'PROGRESS' | 'DEFECT' | 'COMPLETE';

interface ProgressPayload {
  step: number;
  totalSteps: number;
  stepName: string;
  log: string;
}

interface WsMessage {
  type: WsMessageType;
  payload: ProgressPayload | Defect | Record<string, never>;
}

interface UseWebSocketReturn {
  progress: ProgressPayload | null;
  defects: Defect[];
  isConnected: boolean;
  error: string | null;
  logs: string[];
}

const RECONNECT_DELAY_MS = 3000;
const MAX_RECONNECT_ATTEMPTS = 5;

export function useWebSocket(runId: number | null): UseWebSocketReturn {
  const [progress, setProgress] = useState<ProgressPayload | null>(null);
  const [defects, setDefects] = useState<Defect[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unmountedRef = useRef(false);

  const connect = useCallback(() => {
    if (runId === null || unmountedRef.current) return;

    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const host = window.location.host;
    const url = `${protocol}://${host}/ws/test-runs/${runId}`;

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      if (unmountedRef.current) { ws.close(); return; }
      setIsConnected(true);
      setError(null);
      reconnectAttempts.current = 0;
    };

    ws.onmessage = (event: MessageEvent<string>) => {
      if (unmountedRef.current) return;
      try {
        const message = JSON.parse(event.data) as WsMessage;
        if (message.type === 'PROGRESS') {
          const p = message.payload as ProgressPayload;
          setProgress(p);
          if (p.log) {
            setLogs((prev) => [...prev, p.log]);
          }
        } else if (message.type === 'DEFECT') {
          setDefects((prev) => [...prev, message.payload as Defect]);
        } else if (message.type === 'COMPLETE') {
          setIsConnected(false);
        }
      } catch {
        // ignore malformed messages
      }
    };

    ws.onerror = () => {
      if (!unmountedRef.current) {
        setError('WebSocket connection error');
      }
    };

    ws.onclose = () => {
      if (unmountedRef.current) return;
      setIsConnected(false);
      if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts.current += 1;
        reconnectTimerRef.current = setTimeout(connect, RECONNECT_DELAY_MS);
      } else {
        setError('Connection lost. Max reconnect attempts reached.');
      }
    };
  }, [runId]);

  useEffect(() => {
    unmountedRef.current = false;

    if (runId !== null) {
      connect();
    }

    return () => {
      unmountedRef.current = true;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [runId, connect]);

  return { progress, defects, isConnected, error, logs };
}
