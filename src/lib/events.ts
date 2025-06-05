type Handler<T = unknown> = (data: T) => void;

type Emitter = {
  on: <T>(event: string, handler: Handler<T>) => void;
  off: <T>(event: string, handler: Handler<T>) => void;
  emit: <T>(event: string, data: T) => void;
};

function createEmitter(): Emitter {
  const listeners: { [event: string]: Handler<any>[] } = {};

  return {
    on<T = unknown>(event: string, handler: Handler<T>) {
      if (!listeners[event]) {
        listeners[event] = [];
      }
      listeners[event].push(handler);
    },

    off<T = unknown>(event: string, handler: Handler<T>) {
      if (listeners[event]) {
        listeners[event] = listeners[event].filter(h => h !== handler);
      }
    },

    emit<T = unknown>(event: string, data: T) {
      if (listeners[event]) {
        listeners[event].forEach(handler => handler(data));
      }
    },
  };
}

export const timelineChannel = createEmitter(); 