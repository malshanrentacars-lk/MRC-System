"use client";

import { useState, useTransition } from "react";
import { createTodo, toggleTodo, deleteTodo } from "@/app/actions/users";
import { Todo } from "@/types";
import { CheckSquare, Square, Trash2, Plus, AlertTriangle, Wrench, CalendarDays, Tag } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";

interface TodoWidgetProps {
  todos: Todo[];
}

const typeConfig: Record<string, { icon: React.ElementType; color: string }> = {
  rental_end: { icon: CalendarDays, color: "text-blue-500" },
  service_due: { icon: Wrench, color: "text-amber-500" },
  service_overdue: { icon: AlertTriangle, color: "text-red-500" },
  booked_pickup: { icon: CalendarDays, color: "text-green-500" },
  custom: { icon: Tag, color: "text-gray-400" },
};

export default function TodoWidget({ todos: initialTodos }: TodoWidgetProps) {
  const [todos, setTodos] = useState<Todo[]>(initialTodos);
  const [newTask, setNewTask] = useState("");
  const [adding, setAdding] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function handleAdd() {
    if (!newTask.trim()) return;
    startTransition(async () => {
      const result = await createTodo(newTask.trim());
      if (result.data) {
        setTodos(prev => [result.data as Todo, ...prev]);
      }
      setNewTask("");
      setAdding(false);
    });
  }

  async function handleToggle(id: string, isDone: boolean) {
    setTodos(prev => prev.map(t => t.id === id ? { ...t, is_done: !isDone } : t));
    startTransition(async () => {
      await toggleTodo(id, !isDone);
    });
  }

  async function handleDelete(id: string) {
    setTodos(prev => prev.filter(t => t.id !== id));
    startTransition(async () => {
      await deleteTodo(id);
    });
  }

  const active = todos.filter(t => !t.is_done);
  const done = todos.filter(t => t.is_done);

  return (
    <div className="section-card flex flex-col">
      <div className="section-card-header">
        <h3 className="section-card-title flex items-center gap-2">
          <CheckSquare className="w-4 h-4 text-blue-500" /> To-Do List
        </h3>
        <button
          onClick={() => setAdding(!adding)}
          className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Add Task
        </button>
      </div>

      <div className="flex-1 overflow-y-auto max-h-[360px] custom-scrollbar">
        {/* Add new task */}
        {adding && (
          <div className="px-5 py-3 border-b border-border flex gap-2">
            <input
              type="text"
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              placeholder="New task..."
              className="form-input flex-1 text-sm"
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              autoFocus
            />
            <button onClick={handleAdd} disabled={isPending || !newTask.trim()}
              className="btn-primary text-xs px-3 py-1.5">
              Add
            </button>
            <button onClick={() => { setAdding(false); setNewTask(""); }}
              className="btn-secondary text-xs px-3 py-1.5">
              Cancel
            </button>
          </div>
        )}

        {/* Active todos */}
        {active.length === 0 && (
          <div className="px-5 py-8 text-center text-sm text-muted-foreground">
            All caught up! No pending tasks 🎉
          </div>
        )}
        {active.map((todo) => {
          const cfg = typeConfig[todo.type] ?? typeConfig.custom;
          const Icon = cfg.icon;
          return (
            <div key={todo.id} className="flex items-start gap-3 px-5 py-3 hover:bg-muted/50 group transition-colors border-b border-border last:border-0">
              <button onClick={() => handleToggle(todo.id, todo.is_done)} className="mt-0.5 flex-shrink-0">
                <Square className="w-4 h-4 text-muted-foreground hover:text-blue-500 transition-colors" />
              </button>
              <Icon className={cn("w-4 h-4 mt-0.5 flex-shrink-0", cfg.color)} />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground">{todo.title}</p>
                {todo.due_date && (
                  <p className="text-xs text-muted-foreground mt-0.5">{formatDate(todo.due_date)}</p>
                )}
              </div>
              <button onClick={() => handleDelete(todo.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-600">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}

        {/* Done todos - collapsed */}
        {done.length > 0 && (
          <div className="border-t border-border mt-1">
            <p className="px-5 py-2 text-xs text-muted-foreground font-medium">Completed ({done.length})</p>
            {done.slice(0, 3).map((todo) => (
              <div key={todo.id} className="flex items-center gap-3 px-5 py-2 hover:bg-muted/50 group">
                <button onClick={() => handleToggle(todo.id, todo.is_done)} className="flex-shrink-0">
                  <CheckSquare className="w-4 h-4 text-blue-400" />
                </button>
                <p className="text-sm text-muted-foreground line-through flex-1 min-w-0 truncate">{todo.title}</p>
                <button onClick={() => handleDelete(todo.id)}
                  className="opacity-0 group-hover:opacity-100 text-red-400">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
