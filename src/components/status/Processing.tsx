"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  Suspense,
} from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

type Task = { id: string; label: string };

type ProcessingContextValue = {
  start: (label: string) => string;
  startNavigation: (label?: string) => string;
  stop: (id: string) => void;
  run: <T>(label: string, fn: () => Promise<T>) => Promise<T>;
  tasks: Task[];
};

const ProcessingContext = createContext<ProcessingContextValue | null>(null);

export function ProcessingProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const navigationIds = useRef(new Set<string>());

  const stop = useCallback((id: string) => {
    navigationIds.current.delete(id);
    setTasks((current) => current.filter((task) => task.id !== id));
  }, []);

  const start = useCallback((label: string) => {
    const id = crypto.randomUUID();
    setTasks((current) => [...current.filter((task) => task.label !== label), { id, label }]);
    window.setTimeout(() => stop(id), 20000);
    return id;
  }, [stop]);

  const startNavigation = useCallback(
    (label = "Opening page") => {
      const id = start(label);
      navigationIds.current.add(id);
      return id;
    },
    [start],
  );

  const run = useCallback(
    async <T,>(label: string, fn: () => Promise<T>) => {
      const id = start(label);
      try {
        return await fn();
      } finally {
        stop(id);
      }
    },
    [start, stop],
  );

  const clearNavigation = useCallback(() => {
    for (const id of [...navigationIds.current]) {
      stop(id);
    }
  }, [stop]);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = (event.target as HTMLElement | null)?.closest("a[href]");
      if (!(target instanceof HTMLAnchorElement)) return;
      if (target.target && target.target !== "_self") return;
      if (target.hasAttribute("download")) return;

      const url = new URL(target.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search && !url.hash) {
        return;
      }

      startNavigation(url.pathname.startsWith("/a/") ? "Opening record" : "Opening page");
    }

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [startNavigation]);

  const value = useMemo(
    () => ({ start, startNavigation, stop, run, tasks }),
    [start, startNavigation, stop, run, tasks],
  );

  return (
    <ProcessingContext.Provider value={value}>
      {children}
      <Suspense fallback={null}>
        <NavigationJanitor onChange={clearNavigation} />
      </Suspense>
      <ProcessingBanner tasks={tasks} />
    </ProcessingContext.Provider>
  );
}

function NavigationJanitor({ onChange }: { onChange: () => void }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    onChange();
  }, [pathname, searchParams, onChange]);

  return null;
}

export function useProcessing() {
  const context = useContext(ProcessingContext);
  if (context) return context;

  return {
    start: () => "",
    startNavigation: () => "",
    stop: () => undefined,
    run: async <T,>(_label: string, fn: () => Promise<T>) => fn(),
    tasks: [] as Task[],
  };
}

function ProcessingBanner({ tasks }: { tasks: Task[] }) {
  const task = tasks[tasks.length - 1];
  if (!task) return null;

  return (
    <div className="processing-banner pointer-events-none fixed inset-x-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-[80] sm:inset-x-auto sm:right-6 lg:bottom-6">
      <div className="status-banner pointer-events-auto flex w-full items-center gap-3 rounded-2xl bg-cf-ink px-4 py-3 text-white shadow-[0_18px_50px_rgba(10,13,20,0.28)] sm:min-w-[220px] sm:w-auto">
        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-white/75" />
        <div>
          <p className="text-sm font-medium">{task.label}</p>
          <p className="text-[11px] text-white/50">{tasks.length > 1 ? `${tasks.length} tasks running` : "Working"}</p>
        </div>
      </div>
    </div>
  );
}
