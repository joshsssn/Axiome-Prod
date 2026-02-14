import { useState, useEffect, useCallback } from 'react';
import { usePortfolio } from '@/context/PortfolioContext';
import { useAuth } from '@/context/AuthContext';
import { users as mockUsers } from '@/data/mockData';
import { api } from '@/services/api';
import {
  Share2, UserPlus, X, Shield, Eye, Edit3, Trash2,
  Users, Copy, Check, Crown, Globe, Lock
} from 'lucide-react';

interface SimpleUser { id: number; username: string; email: string; }

export function Sharing() {
  const {
    activePortfolio, portfolios, addCollaborator, removeCollaborator,
    updateCollaboratorPermission, duplicatePortfolio, currentUserId,
    setActivePortfolioId
  } = usePortfolio();
  const { user: authUser } = useAuth();

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteSearch, setInviteSearch] = useState('');
  const [invitePermission, setInvitePermission] = useState<'view' | 'edit'>('view');
  const [removeConfirm, setRemoveConfirm] = useState<number | null>(null);
  const [allUsers, setAllUsers] = useState<SimpleUser[]>([]);
  const [copied, setCopied] = useState(false);
  const [showDuplicateConfirm, setShowDuplicateConfirm] = useState(false);

  // Fetch users list from API (fallback to mockUsers)
  const fetchUsers = useCallback(async () => {
    try {
      const data = await api.users.list();
      if (data && data.length > 0) {
        setAllUsers(data.map((u: any) => ({ id: u.id, username: u.username, email: u.email ?? '' })));
        return;
      }
    } catch { /* ignore */ }
    setAllUsers(mockUsers.map(u => ({ id: u.id, username: u.username, email: u.email })));
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  if (!activePortfolio) return <div className="text-slate-400 p-8">Select a portfolio first.</div>;
  const { collaborators, summary, ownerId } = activePortfolio;

  const isOwner = ownerId === currentUserId;

  // Users that can be invited (not already collaborating and not the owner)
  const availableUsers = allUsers.filter(u =>
    u.id !== ownerId &&
    !collaborators.some(c => c.userId === u.id) &&
    (inviteSearch === '' ||
      u.username.toLowerCase().includes(inviteSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(inviteSearch.toLowerCase()))
  );

  // Shared portfolios (portfolios where current user is a collaborator)
  const sharedWithMe = portfolios.filter(p =>
    p.ownerId !== currentUserId &&
    p.collaborators.some(c => c.userId === currentUserId)
  );

  const handleInvite = (userId: number) => {
    const usr = allUsers.find(u => u.id === userId);
    if (!usr) return;
    addCollaborator({
      userId: usr.id,
      username: usr.username,
      email: usr.email,
      permission: invitePermission,
      addedDate: new Date().toISOString().split('T')[0],
      avatar: usr.username.slice(0, 2).toUpperCase(),
    });
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`https://portfolio.io/shared/${activePortfolio.id}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDuplicate = () => {
    duplicatePortfolio(activePortfolio.id);
    setShowDuplicateConfirm(false);
  };

  const ownerUser = allUsers.find(u => u.id === ownerId) || { username: authUser?.username || 'admin', email: authUser?.email || '' };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Share2 className="w-7 h-7 text-blue-400" />
            Sharing & Collaboration
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage access to <span className="text-white font-medium">{summary.name}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowDuplicateConfirm(true)}
            className="flex items-center gap-2 px-4 py-2.5 border border-slate-700 text-slate-300 text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors"
          >
            <Copy className="w-4 h-4" /> Duplicate
          </button>
          {isOwner && (
            <button
              onClick={() => setShowInviteModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <UserPlus className="w-4 h-4" /> Invite User
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Access Management */}
        <div className="lg:col-span-2 space-y-6">
          {/* Portfolio Info Card */}
          <div className="bg-slate-900/50 border border-slate-800/60 rounded-xl p-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="text-base font-semibold text-white">{summary.name}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{summary.description}</div>
                  <div className="flex items-center gap-3 mt-2 text-xs">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium ${
                      collaborators.length > 0 ? 'bg-blue-500/10 text-blue-400' : 'bg-slate-700/50 text-slate-400'
                    }`}>
                      {collaborators.length > 0 ? (
                        <><Globe className="w-3 h-3" /> Shared</>
                      ) : (
                        <><Lock className="w-3 h-3" /> Private</>
                      )}
                    </span>
                    <span className="text-slate-500">{summary.currency} • {summary.positionCount} positions</span>
                  </div>
                </div>
              </div>
              <button
                onClick={handleCopyLink}
                className="flex items-center gap-1.5 px-3 py-2 border border-slate-700 text-slate-300 text-xs rounded-lg hover:bg-slate-800 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied!' : 'Copy Link'}
              </button>
            </div>
          </div>

          {/* Owner */}
          <div className="bg-slate-900/50 border border-slate-800/60 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-800/60">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Crown className="w-4 h-4 text-amber-400" />
                Owner
              </h3>
            </div>
            <div className="p-4">
              <div className="flex items-center gap-3 px-3 py-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white text-xs font-bold">
                  {ownerUser.username.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-white">{ownerUser.username}</div>
                  <div className="text-xs text-slate-400">{ownerUser.email || `${ownerUser.username}@portfolio.io`}</div>
                </div>
                <span className="px-2.5 py-1 bg-amber-500/15 text-amber-400 text-[10px] font-semibold rounded-full uppercase tracking-wider">
                  Owner
                </span>
              </div>
            </div>
          </div>

          {/* Collaborators */}
          <div className="bg-slate-900/50 border border-slate-800/60 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-800/60 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-400" />
                Collaborators
                <span className="ml-1 px-1.5 py-0.5 bg-slate-700/50 text-slate-400 text-[10px] rounded-full font-mono">
                  {collaborators.length}
                </span>
              </h3>
            </div>
            <div className="divide-y divide-slate-800/40">
              {collaborators.length === 0 ? (
                <div className="px-5 py-10 text-center">
                  <Users className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                  <p className="text-sm text-slate-500">No collaborators yet</p>
                  <p className="text-xs text-slate-600 mt-1">Invite team members to view or edit this portfolio</p>
                  {isOwner && (
                    <button
                      onClick={() => setShowInviteModal(true)}
                      className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg transition-colors"
                    >
                      <UserPlus className="w-3.5 h-3.5" /> Invite User
                    </button>
                  )}
                </div>
              ) : (
                collaborators.map(collab => (
                  <div key={collab.id} className="flex items-center gap-3 px-5 py-3.5 group hover:bg-slate-800/20 transition-colors">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {collab.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white">{collab.username}</div>
                      <div className="text-xs text-slate-400 truncate">{collab.email}</div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span>Added {collab.addedDate}</span>
                    </div>
                    {isOwner ? (
                      <div className="flex items-center gap-2">
                        {/* Permission toggle */}
                        <div className="flex rounded-lg border border-slate-700 overflow-hidden">
                          <button
                            onClick={() => updateCollaboratorPermission(collab.id, 'view')}
                            className={`flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium transition-all ${
                              collab.permission === 'view'
                                ? 'bg-blue-600/20 text-blue-400'
                                : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
                            }`}
                          >
                            <Eye className="w-3 h-3" /> View
                          </button>
                          <button
                            onClick={() => updateCollaboratorPermission(collab.id, 'edit')}
                            className={`flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium transition-all border-l border-slate-700 ${
                              collab.permission === 'edit'
                                ? 'bg-emerald-600/20 text-emerald-400'
                                : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
                            }`}
                          >
                            <Edit3 className="w-3 h-3" /> Edit
                          </button>
                        </div>

                        {/* Remove */}
                        {removeConfirm === collab.id ? (
                          <div className="flex gap-1">
                            <button
                              onClick={() => { removeCollaborator(collab.id); setRemoveConfirm(null); }}
                              className="px-2 py-1 rounded bg-red-500/20 text-red-400 text-[10px] font-medium hover:bg-red-500/30"
                            >
                              Remove
                            </button>
                            <button
                              onClick={() => setRemoveConfirm(null)}
                              className="px-2 py-1 rounded bg-slate-700/50 text-slate-400 text-[10px] font-medium hover:bg-slate-700"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setRemoveConfirm(collab.id)}
                            className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ) : (
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium ${
                        collab.permission === 'edit'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-blue-500/10 text-blue-400'
                      }`}>
                        {collab.permission === 'edit' ? <Edit3 className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        {collab.permission === 'edit' ? 'Can Edit' : 'View Only'}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="bg-slate-900/50 border border-slate-800/60 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Access Summary</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Total users</span>
                <span className="text-sm font-mono font-semibold text-white">{1 + collaborators.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">View access</span>
                <span className="text-sm font-mono text-blue-400">{collaborators.filter(c => c.permission === 'view').length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Edit access</span>
                <span className="text-sm font-mono text-emerald-400">{collaborators.filter(c => c.permission === 'edit').length}</span>
              </div>
              <div className="border-t border-slate-800 pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Visibility</span>
                  <span className={`inline-flex items-center gap-1 text-xs font-medium ${
                    collaborators.length > 0 ? 'text-blue-400' : 'text-slate-500'
                  }`}>
                    {collaborators.length > 0 ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                    {collaborators.length > 0 ? 'Shared' : 'Private'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Permission Levels */}
          <div className="bg-slate-900/50 border border-slate-800/60 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Permission Levels</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-500/5 border border-blue-500/10">
                <Eye className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs font-semibold text-blue-400">View Only</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Can view all portfolio data, analytics, positions, and reports. Cannot make changes.</div>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                <Edit3 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs font-semibold text-emerald-400">Edit Access</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Full access to add/remove positions, record transactions, run optimizations, and modify settings.</div>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
                <Crown className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs font-semibold text-amber-400">Owner</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Full control including sharing, deleting the portfolio, and managing collaborators.</div>
                </div>
              </div>
            </div>
          </div>

          {/* Shared With Me */}
          {sharedWithMe.length > 0 && (
            <div className="bg-slate-900/50 border border-slate-800/60 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <Share2 className="w-4 h-4 text-indigo-400" />
                Shared With Me
              </h3>
              <div className="space-y-2">
                {sharedWithMe.map(pf => (
                  <button
                    key={pf.id}
                    onClick={() => setActivePortfolioId(pf.id)}
                    className="w-full text-left p-3 rounded-lg hover:bg-slate-800/40 transition-colors border border-slate-800/40"
                  >
                    <div className="text-sm text-white font-medium truncate">{pf.summary.name}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Owner: {allUsers.find(u => u.id === pf.ownerId)?.username || 'Unknown'}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowInviteModal(false)}>
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-white">Invite Collaborator</h2>
              <button onClick={() => setShowInviteModal(false)} className="p-1 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Permission selector */}
              <div>
                <label className="text-xs text-slate-400 block mb-2 font-medium">Permission Level</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setInvitePermission('view')}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all border ${
                      invitePermission === 'view'
                        ? 'bg-blue-600/20 border-blue-500 text-blue-400'
                        : 'bg-slate-900/50 border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Eye className="w-4 h-4" /> View Only
                  </button>
                  <button
                    onClick={() => setInvitePermission('edit')}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all border ${
                      invitePermission === 'edit'
                        ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400'
                        : 'bg-slate-900/50 border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Edit3 className="w-4 h-4" /> Can Edit
                  </button>
                </div>
              </div>

              {/* Search */}
              <div>
                <label className="text-xs text-slate-400 block mb-1.5 font-medium">Search Users</label>
                <input
                  type="text"
                  placeholder="Search by username or email..."
                  value={inviteSearch}
                  onChange={e => setInviteSearch(e.target.value)}
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-lg text-sm text-white px-3 py-2.5 focus:outline-none focus:border-blue-500 placeholder:text-slate-600"
                  autoFocus
                />
              </div>

              {/* User list */}
              <div className="max-h-60 overflow-y-auto space-y-1">
                {availableUsers.length === 0 ? (
                  <div className="text-center py-6 text-sm text-slate-500">
                    {inviteSearch ? 'No matching users found' : 'All active users already have access'}
                  </div>
                ) : (
                  availableUsers.map(u => (
                    <div
                      key={u.id}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-700/40 transition-colors cursor-pointer group"
                      onClick={() => { handleInvite(u.id); }}
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                        {u.username.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-white">{u.username}</div>
                        <div className="text-xs text-slate-400 truncate">{u.email}</div>
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 text-xs text-blue-400 font-medium transition-opacity">
                        + Invite
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="pt-2">
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="w-full px-4 py-2.5 border border-slate-700 text-slate-300 rounded-lg text-sm hover:bg-slate-700 transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Duplicate Confirmation */}
      {showDuplicateConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowDuplicateConfirm(false)}>
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Copy className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-white">Duplicate Portfolio</h2>
                <p className="text-xs text-slate-400">Create an independent copy</p>
              </div>
            </div>
            <p className="text-sm text-slate-300 mb-5">
              This will create a copy of <span className="text-white font-medium">{summary.name}</span> with all positions and data. Collaborators will not be copied.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDuplicateConfirm(false)}
                className="flex-1 px-4 py-2.5 border border-slate-700 text-slate-300 rounded-lg text-sm hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDuplicate}
                className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Duplicate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
