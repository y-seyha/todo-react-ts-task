import type { UserProfile } from '../types/todo.ts'
import { getAvatarColor, getInitials } from '../lib/utils.ts'
import { CheckIcon, LogoutIcon, UserIcon } from './icons.tsx'

interface HeaderProps {
  profile: UserProfile
  onEditProfile: () => void
  onLogout?: () => void
}

export const Header = ({ profile, onEditProfile, onLogout }: HeaderProps) => {
  const avatarColor = getAvatarColor(profile.avatarColor)

  return (
    <header className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/25">
          <CheckIcon className="h-6 w-6" strokeWidth={2.4} />
        </span>
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-slate-900">TaskFlow</h1>
          <p className="text-sm text-slate-500">Plan it. Track it. Finish it.</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onEditProfile}
          aria-label="Edit profile"
          className="flex flex-1 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-left transition hover:border-indigo-200 hover:bg-indigo-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 sm:flex-initial"
        >
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white ${avatarColor.swatch}`}
          >
            {getInitials(profile.name)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-slate-900">{profile.name}</span>
            <span className="block truncate text-xs text-slate-500">
              {profile.email !== '' ? profile.email : 'Add your details'}
            </span>
          </span>
          <UserIcon className="h-4 w-4 shrink-0 text-slate-400" />
        </button>

        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            title="Log out"
            aria-label="Log out"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500"
          >
            <LogoutIcon className="h-4 w-4" />
          </button>
        )}
      </div>
    </header>
  )
}

