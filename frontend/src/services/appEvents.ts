/**
 * Central Reactive Event Bus for real-time app-wide updates.
 * Dispatches updates when complaints are created, updated, or revalidated
 * so all dashboards (Citizen, Admin, Transport) update immediately without page refresh.
 */

type EventCallback<T = any> = (data: T) => void;

class AppEventBus {
  private listeners: Record<string, Set<EventCallback>> = {};

  on<T = any>(event: string, callback: EventCallback<T>): () => void {
    if (!this.listeners[event]) {
      this.listeners[event] = new Set();
    }
    this.listeners[event].add(callback);
    return () => {
      this.listeners[event]?.delete(callback);
    };
  }

  emit<T = any>(event: string, data?: T) {
    if (this.listeners[event]) {
      this.listeners[event].forEach((cb) => {
        try {
          cb(data);
        } catch (err) {
          console.error(`[EventBus] Error in listener for "${event}":`, err);
        }
      });
    }
  }
}

export const appEvents = new AppEventBus();
export default appEvents;
