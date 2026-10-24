import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Todo, TodoFilter, TodoStats, TodoStatus, UserProfile } from './types/todo.ts'
import { DEFAULT_PROFILE } from './types/todo.ts'
import { fetchProfile, saveProfile as saveProfileApi } from './lib/profile-api.ts'
import {
  bulkDeleteTodos,
  bulkUpdateTodoStatus,
  createTodo,
  deleteTodo,
  fetchTodoStats,
  fetchTodos,
  updateTodo,
} from './lib/todos-api.ts'
import { STATUS_DOT_CLASSES } from './lib/utils.ts'
import { Header } from './components/Header.tsx'
import { ProfileModal } from './components/ProfileModal.tsx'
import { TodoForm } from './components/TodoForm.tsx'
import { TodoFilters } from './components/TodoFilters.tsx'
import { TodoList } from './components/TodoList.tsx'
import { BulkActionsBar } from './components/BulkActionsBar.tsx'
import { AuthProvider } from './context/AuthContext.tsx'
import { useAuth } from './context/auth-context.ts'
import { AuthPage } from './components/AuthPage.tsx'

const EMPTY_STATS: TodoStats = { total: 0, todo: 0, inProgress: 0, done: 0, starred: 0 }

/** Waits for the user to pause typing before searching, so we don't hit the API per keystroke. */
const SEARCH_DEBOUNCE_MS = 300

interface StatTileProps {
  label: string
  value: number
  dotClass?: string
  sub?: string
}

const StatTile = ({ label, value, dotClass, sub }: StatTileProps) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
    <div className="flex items-center gap-2">
      {dotClass !== undefined && <span className={`h-2 w-2 rounded-full ${dotClass}`} />}
      <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">{label}</p>
    </div>
    <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
    {sub !== undefined && <p className="mt-0.5 text-xs font-medium text-amber-500">{sub}</p>}
  </div>
)

const Dashboard = () => {
  const { user, logout } = useAuth()
  const [todos, setTodos] = useState<Todo[]>([])
  const [stats, setStats] = useState<TodoStats>(EMPTY_STATS)
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE)
  const [filter, setFilter] = useState<TodoFilter>('All')
  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Bumped after every mutation to re-run the list + stats fetches.
  const [refreshKey, setRefreshKey] = useState(0)

  const refresh = useCallback(() => setRefreshKey((key) => key + 1), [])

  // Load the profile once on mount.
  useEffect(() => {
    const controller = new AbortController()
    fetchProfile(controller.signal)
      .then((p) => {
        if (user) {
          setProfile({
            ...p,
            name: `${user.firstName} ${user.lastName}`.trim(),
            email: user.email,
          })
        } else {
          setProfile(p)
        }
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return
        setError(cause instanceof Error ? cause.message : 'Could not load the profile.')
      })
    return () => controller.abort()
  }, [user])

  // Load the todo list whenever the filter, search, or refresh key changes.
  useEffect(() => {
    const controller = new AbortController()
    const debounce = setTimeout(
      () => {
        fetchTodos({ status: filter, search }, controller.signal)
          .then((nextTodos) => {
            setTodos(nextTodos)
            setError(null)
          })
          .catch((cause: unknown) => {
            if (controller.signal.aborted) return
            setError(cause instanceof Error ? cause.message : 'Could not load tasks.')
          })
          .finally(() => {
            if (!controller.signal.aborted) setIsLoading(false)
          })
      },
      search === '' ? 0 : SEARCH_DEBOUNCE_MS,
    )

    return () => {
      clearTimeout(debounce)
      controller.abort()
    }
  }, [filter, search, refreshKey])

  // Counts are global, so they refresh after every mutation too.
  useEffect(() => {
    const controller = new AbortController()
    fetchTodoStats(controller.signal)
      .then(setStats)
      .catch(() => {
        // Stats are decorative — keep the previous numbers on failure.
      })
    return () => controller.abort()
  }, [refreshKey])

  const visibleTodos = useMemo(
    () =>
      [...todos].sort((a, b) => {
        if (a.starred !== b.starred) return a.starred ? -1 : 1
        return b.createdAt - a.createdAt
      }),
    [todos],
  )

  // Count only ids that still exist, so deleted tasks never linger in the bulk bar.
  const selectedCount = useMemo(() => {
    let count = 0
    for (const todo of todos) {
      if (selectedIds.has(todo.id)) count += 1
    }
    return count
  }, [todos, selectedIds])

  const allVisibleSelected =
    visibleTodos.length > 0 && visibleTodos.every((todo) => selectedIds.has(todo.id))

  const openProfile = useCallback(() => setIsProfileOpen(true), [])
  const closeProfile = useCallback(() => setIsProfileOpen(false), [])

  const runMutation = async (action: () => Promise<unknown>) => {
    try {
      await action()
      setError(null)
      refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Something went wrong.')
      // Re-sync with the server so the UI never shows a state that wasn't saved.
      refresh()
    }
  }

  const addTodo = (title: string, status: TodoStatus) => {
    void runMutation(() => createTodo(title, status))
  }

  const toggleStar = (id: string) => {
    const current = todos.find((todo) => todo.id === id)
    if (current === undefined) return
    void runMutation(() => updateTodo(id, { starred: !current.starred }))
  }

  const changeStatus = (id: string, status: TodoStatus) => {
    void runMutation(() => updateTodo(id, { status }))
  }

  const submitEdit = (id: string, title: string, status: TodoStatus) => {
    setEditingId(null)
    void runMutation(() => updateTodo(id, { title, status }))
  }

  const removeTodo = (id: string) => {
    setEditingId((current) => (current === id ? null : current))
    void runMutation(() => deleteTodo(id))
  }

  const toggleSelected = (id: string) => {
    setSelectedIds((previous) => {
      const next = new Set(previous)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAllVisible = () => {
    setSelectedIds((previous) => {
      const next = new Set(previous)
      if (allVisibleSelected) {
        for (const todo of visibleTodos) next.delete(todo.id)
      } else {
        for (const todo of visibleTodos) next.add(todo.id)
      }
      return next
    })
  }

  const clearSelection = () => setSelectedIds(new Set())

  const bulkUpdateStatus = (status: TodoStatus) => {
    const ids = todos.filter((todo) => selectedIds.has(todo.id)).map((todo) => todo.id)
    if (ids.length === 0) return
    setSelectedIds(new Set())
    setEditingId((current) => (current !== null && ids.includes(current) ? null : current))
    void runMutation(() => bulkUpdateTodoStatus(ids, status))
  }

  const bulkDelete = () => {
    const ids = todos.filter((todo) => selectedIds.has(todo.id)).map((todo) => todo.id)
    if (ids.length === 0) return
    setSelectedIds(new Set())
    setEditingId((current) => (current !== null && ids.includes(current) ? null : current))
    void runMutation(() => bulkDeleteTodos(ids))
  }

  const changeFilter = (nextFilter: TodoFilter) => {
    setFilter(nextFilter)
    setSelectedIds(new Set())
  }

  const changeSearch = (value: string) => {
    setSearch(value)
    setSelectedIds(new Set())
  }

  const clearFilters = () => {
    setFilter('All')
    setSearch('')
    setSelectedIds(new Set())
  }

  const startEditing = (id: string) => setEditingId(id)
  const stopEditing = () => setEditingId(null)

  const saveProfile = (nextProfile: UserProfile) => {
    setIsProfileOpen(false)
    void runMutation(async () => {
      const saved = await saveProfileApi(nextProfile)
      setProfile(saved)
    })
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-8 sm:px-6 lg:py-12">
        <Header profile={profile} onEditProfile={openProfile} onLogout={logout} />

        {error !== null && (
          <div
            role="alert"
            className="animate-fade flex items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
          >
            <p className="font-medium">{error}</p>
            <button
              type="button"
              onClick={refresh}
              className="shrink-0 rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-100"
            >
              Retry
            </button>
          </div>
        )}

        <section aria-label="Task summary" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile
            label="Total"
            value={stats.total}
            sub={stats.starred > 0 ? `★ ${stats.starred} starred` : undefined}
          />
          <StatTile label="To Do" value={stats.todo} dotClass={STATUS_DOT_CLASSES['To Do']} />
          <StatTile
            label="In Progress"
            value={stats.inProgress}
            dotClass={STATUS_DOT_CLASSES['In Progress']}
          />
          <StatTile label="Done" value={stats.done} dotClass={STATUS_DOT_CLASSES.Done} />
        </section>

        <TodoForm onAdd={addTodo} />

        <TodoFilters
          search={search}
          onSearchChange={changeSearch}
          filter={filter}
          onFilterChange={changeFilter}
          stats={stats}
          visibleCount={visibleTodos.length}
          allVisibleSelected={allVisibleSelected}
          onToggleSelectAll={toggleSelectAllVisible}
        />

        {isLoading ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white/70 px-6 py-14 text-center">
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600" />
            <p className="text-sm font-medium text-slate-500">Loading tasks…</p>
          </div>
        ) : (
          <TodoList
            todos={visibleTodos}
            selectedIds={selectedIds}
            editingId={editingId}
            hasAnyTodos={todos.length > 0}
            onToggleSelected={toggleSelected}
            onToggleStar={toggleStar}
            onChangeStatus={changeStatus}
            onSubmitEdit={submitEdit}
            onDelete={removeTodo}
            onStartEditing={startEditing}
            onStopEditing={stopEditing}
            onClearFilters={clearFilters}
          />
        )}

        <BulkActionsBar
          count={selectedCount}
          onMarkStatus={bulkUpdateStatus}
          onDelete={bulkDelete}
          onClearSelection={clearSelection}
        />

        {isProfileOpen && (
          <ProfileModal profile={profile} onSave={saveProfile} onClose={closeProfile} />
        )}
      </div>
    </div>
  )
}

const SessionLoader = () => (
  <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
    <div className="flex flex-col items-center gap-3">
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600" />
      <p className="text-sm font-medium text-slate-500">Restoring your session…</p>
    </div>
  </div>
)

const MainApp = () => {
  const { isAuthenticated, isInitializing } = useAuth()
  if (isInitializing) {
    return <SessionLoader />
  }
  if (!isAuthenticated) {
    return <AuthPage />
  }
  return <Dashboard />
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  )
}
