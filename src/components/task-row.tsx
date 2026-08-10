"use client";

import { useTransition } from "react";
import { toggleTask, deleteTask } from "@/app/(app)/dashboard/actions";

type Task = {
  id: string;
  title: string;
  done: boolean;
};

export function TaskRow({ task }: { task: Task }) {
  const [isPending, startTransition] = useTransition();

  return (
    <li className="flex items-center justify-between gap-3 py-2.5">
      <label className="flex min-w-0 items-center gap-2.5">
        <input
          type="checkbox"
          checked={task.done}
          disabled={isPending}
          onChange={(e) => startTransition(() => toggleTask(task.id, e.target.checked))}
          className="h-4 w-4 shrink-0 rounded border-ink-200 accent-brand-500"
        />
        <span className={task.done ? "truncate text-ink-400 line-through" : "truncate text-ink-800"}>
          {task.title}
        </span>
      </label>
      <button
        onClick={() => startTransition(() => deleteTask(task.id))}
        disabled={isPending}
        className="btn-ghost btn-sm shrink-0"
      >
        Zmazať
      </button>
    </li>
  );
}
