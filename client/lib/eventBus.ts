type Listener = (payload: any) => void;

const listeners: Record<string, Listener[]> = {};

export const eventBus = {
  on(event: string, cb: Listener) {
    listeners[event] = listeners[event] || [];
    listeners[event].push(cb);
    return () => {
      listeners[event] = (listeners[event] || []).filter(l => l !== cb);
    };
  },
  emit(event: string, payload?: any) {
    (listeners[event] || []).slice().forEach(cb => {
      try { cb(payload); } catch (e) { console.error('eventBus handler error', e); }
    });
  }
};
