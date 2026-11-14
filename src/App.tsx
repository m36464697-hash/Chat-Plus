import React, { useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import { auth, googleProvider } from './firebase';
import {
  createChatRoom,
  deleteChatMessage,
  deleteOrLeaveChatRoom,
  editChatMessage,
  ensureUserProfile,
  joinChatRoomByCode,
  sendChatMessage,
  setTypingStatus,
  subscribeToAllRoomsPresence,
  subscribeToMessages,
  subscribeToTyping,
  subscribeToUserChats,
  subscribeToUserProfile,
  syncUserPresenceAcrossRooms,
  toggleMessageReaction,
  togglePinChatMessage,
  updateChatRoomDetails,
  updateUserProfile,
} from './services/chatService';
import { ChatMember, ChatRoom, ChatMessage, UserProfile, MessageType } from './types/chat';
import { AuthLandingScreen } from './components/AuthLandingScreen';
import { ChatSidebar } from './components/ChatSidebar';
import { ChatArea } from './components/ChatArea';
import { ProfileView } from './components/ProfileView';
import { CreateChatModal } from './components/CreateChatModal';
import { JoinChatModal } from './components/JoinChatModal';
import { playSound } from './hooks/useSound';
import { MessageSquare, Loader2, AlertCircle, RotateCcw, LogOut } from 'lucide-react';
import { extractRoomCodeFromInput } from './utils/clipboard';
import { formatReadableError } from './utils/errors';

export default function App() {
  const [authReady, setAuthReady] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [profileLoadError, setProfileLoadError] = useState<string | null>(null);
  const [landingDark, setLandingDark] = useState<boolean>(() => {
    try {
      return localStorage.getItem('chatplus_landing_theme') !== 'light';
    } catch {
      return true;
    }
  });

  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [chats, setChats] = useState<ChatRoom[]>([]);
  const [roomMembersMap, setRoomMembersMap] = useState<Record<string, ChatMember[]>>({});
  const [chatsError, setChatsError] = useState<string | null>(null);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [currentView, setCurrentView] = useState<'chat' | 'profile'>('chat');

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [pendingInviteCode, setPendingInviteCode] = useState<string>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return extractRoomCodeFromInput(params.get('room') || '');
    } catch {
      return '';
    }
  });
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(true);

  const prevMsgCountRef = useRef<number>(0);
  const currentUserRef = useRef<UserProfile | null>(null);
  currentUserRef.current = currentUser;
  const chatsRef = useRef<ChatRoom[]>([]);
  chatsRef.current = chats;

  // Sync Tailwind .dark class on <html>
  const effectiveTheme = currentUser
    ? currentUser.preferences.theme
    : landingDark
    ? 'dark'
    : 'light';

  useEffect(() => {
    const root = document.documentElement;
    if (effectiveTheme === 'light') {
      root.classList.remove('dark');
    } else {
      root.classList.add('dark');
    }
  }, [effectiveTheme]);

  const loadProfileForUser = async (user: User) => {
    try {
      setProfileLoadError(null);
      const profile = await ensureUserProfile(user);
      setCurrentUser(profile);
      setAuthError(null);
    } catch (err) {
      console.error('Error loading user profile:', err);
      setProfileLoadError('تعذر تحميل بيانات الحساب من قاعدة البيانات. يرجى المحاولة مرة أخرى.');
    }
  };

  // 1. Firebase Auth Listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        await loadProfileForUser(user);
      } else {
        setCurrentUser(null);
        setProfileLoadError(null);
        setChats([]);
        setRoomMembersMap({});
        setSelectedChatId(null);
        setMessages([]);
        setCurrentView('chat');
      }
      setAuthReady(true);
    });

    return () => unsub();
  }, []);

  // Open Join modal automatically if signed-in user arrived via ?room=CODE invite link
  useEffect(() => {
    if (currentUser && pendingInviteCode) {
      setIsJoinModalOpen(true);
    }
  }, [currentUser?.id, pendingInviteCode]);

  // 2. Real-time User Profile & Joined Chats Subscriptions
  useEffect(() => {
    if (!firebaseUser || !currentUser?.id) return;

    const unsubProfile = subscribeToUserProfile(
      firebaseUser.uid,
      (profile) => {
        setCurrentUser(profile);
      },
      (err) => {
        console.error('Profile subscription error:', err);
      }
    );

    const unsubChats = subscribeToUserChats(
      firebaseUser.uid,
      (updatedChats) => {
        setChatsError(null);
        setChats(updatedChats);
        setSelectedChatId((prevId) => {
          if (prevId && updatedChats.some((c) => c.id === prevId)) return prevId;
          return updatedChats.length > 0 ? updatedChats[0].id : null;
        });
      },
      (err) => {
        console.error('Chats subscription error:', err);
        setChatsError(formatReadableError(err, 'تعذر مزامنة قائمة المحادثات مع قاعدة البيانات.'));
      }
    );

    return () => {
      unsubProfile();
      unsubChats();
    };
  }, [firebaseUser?.uid, currentUser?.id]);

  // 2b. Real-time Member Lists & Online/Offline Presence across all joined rooms
  const joinedChatIdsKey = chats.map((c) => c.id).sort().join(',');
  useEffect(() => {
    if (!firebaseUser || !currentUser?.id || chats.length === 0) {
      setRoomMembersMap({});
      return;
    }

    const chatIds = chats.map((c) => c.id);
    const unsubPresence = subscribeToAllRoomsPresence(chatIds, (nextMap) => {
      setRoomMembersMap(nextMap);
    });

    return () => unsubPresence();
  }, [firebaseUser?.uid, currentUser?.id, joinedChatIdsKey]);

  // 2c. Active Presence Heartbeat + Visibility / Close offline sync
  useEffect(() => {
    if (!firebaseUser || !currentUser?.id || chats.length === 0) return;

    const chatIds = chats.map((c) => c.id);
    const syncActive = () => {
      const userNow = currentUserRef.current;
      if (userNow) {
        syncUserPresenceAcrossRooms(userNow, chatIds, false);
      }
    };

    syncActive();
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        syncActive();
      }
    }, 45000);

    const onVisibility = () => {
      const userNow = currentUserRef.current;
      if (!userNow) return;
      if (document.visibilityState === 'hidden') {
        syncUserPresenceAcrossRooms(userNow, chatIds, true);
      } else {
        syncUserPresenceAcrossRooms(userNow, chatIds, false);
      }
    };

    const onPageHide = () => {
      const userNow = currentUserRef.current;
      if (userNow) {
        syncUserPresenceAcrossRooms(userNow, chatIds, true);
      }
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onPageHide);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onPageHide);
    };
  }, [
    firebaseUser?.uid,
    currentUser?.id,
    currentUser?.name,
    currentUser?.username,
    currentUser?.avatar,
    currentUser?.bio,
    currentUser?.status,
    currentUser?.statusMessage,
    currentUser?.preferences.lastSeen,
    joinedChatIdsKey,
  ]);

  // 3. Real-time Messages & Typing Subscriptions for Selected Chat
  useEffect(() => {
    if (!firebaseUser || !selectedChatId) {
      setMessages([]);
      setTypingUsers([]);
      prevMsgCountRef.current = 0;
      return;
    }

    prevMsgCountRef.current = 0;
    const unsubMessages = subscribeToMessages(
      selectedChatId,
      (newMessages) => {
        const activeUser = currentUserRef.current;
        if (
          prevMsgCountRef.current > 0 &&
          newMessages.length > prevMsgCountRef.current &&
          activeUser
        ) {
          const latest = newMessages[newMessages.length - 1];
          if (latest && latest.senderId !== activeUser.id) {
            if (activeUser.preferences.soundEffects) {
              playSound('receive');
            }
            try {
              if (
                activeUser.preferences.notifications &&
                typeof Notification !== 'undefined' &&
                Notification.permission === 'granted' &&
                document.hidden
              ) {
                new Notification(`رسالة جديدة من ${latest.senderName}`, {
                  body: latest.isEncrypted ? 'رسالة مشفرة في Chat Plus' : latest.content,
                });
              }
            } catch {
              // ignore restricted notification contexts
            }
          }
        }
        prevMsgCountRef.current = newMessages.length;
        setMessages(newMessages);
      },
      (err) => {
        console.error('Messages subscription error:', err);
      }
    );

    const unsubTyping = subscribeToTyping(selectedChatId, firebaseUser.uid, (names) => {
      setTypingUsers(names);
    });

    return () => {
      unsubMessages();
      unsubTyping();
    };
  }, [firebaseUser?.uid, selectedChatId]);

  // Auth Handlers
  const handleGoogleSignIn = async () => {
    try {
      setAuthError(null);
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') {
        setAuthError('تم إغلاق نافذة تسجيل الدخول قبل إتمام العملية.');
      } else if (err?.code === 'auth/popup-blocked') {
        setAuthError('قام المتصفح بحظر النافذة المنبثقة. يرجى السماح بالنوافذ المنبثقة لهذا الموقع والمحاولة مجدداً.');
      } else if (err?.code === 'auth/network-request-failed') {
        setAuthError('تحقق من اتصالك بالإنترنت وحاول مجدداً.');
      } else if (err?.code === 'auth/unauthorized-domain') {
        setAuthError('هذا النطاق غير مصرح به في إعدادات مصادقة Firebase.');
      } else {
        setAuthError('تعذر تسجيل الدخول عبر جوجل. يرجى المحاولة مرة أخرى.');
      }
    }
  };

  const handleSignOut = async () => {
    const userNow = currentUserRef.current;
    const chatIds = chatsRef.current.map((c) => c.id);
    if (userNow && chatIds.length > 0) {
      await syncUserPresenceAcrossRooms(userNow, chatIds, true).catch(() => {});
    }
    await signOut(auth);
  };

  const handleToggleLandingTheme = () => {
    setLandingDark((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('chatplus_landing_theme', next ? 'dark' : 'light');
      } catch {
        // ignore storage errors
      }
      return next;
    });
  };

  // Chat & Profile Actions
  const handleCreateChat = async (chatData: {
    title: string;
    description: string;
    isGroup: boolean;
    code: string;
    avatar: string;
  }) => {
    if (!currentUser) return;
    const created = await createChatRoom({ ...chatData, user: currentUser });
    setChatsError(null);
    setChats((prev) => [created, ...prev.filter((c) => c.id !== created.id)]);
    setSelectedChatId(created.id);
    setCurrentView('chat');
    setMobileSidebarOpen(false);
  };

  const handleJoinChat = async (code: string) => {
    if (!currentUser) return;
    const joined = await joinChatRoomByCode(code, currentUser);
    setChatsError(null);
    setChats((prev) => [joined, ...prev.filter((c) => c.id !== joined.id)]);
    setSelectedChatId(joined.id);
    setCurrentView('chat');
    setMobileSidebarOpen(false);
    setPendingInviteCode('');
    if (window.location.search.includes('room=')) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  };

  const handleDeleteChat = async (chat: ChatRoom) => {
    if (!currentUser) return;
    await deleteOrLeaveChatRoom(chat, currentUser.id);
    const remaining = chats.filter((c) => c.id !== chat.id);
    setChats(remaining);
    if (selectedChatId === chat.id) {
      setSelectedChatId(remaining.length > 0 ? remaining[0].id : null);
      if (remaining.length === 0) {
        setMobileSidebarOpen(true);
      }
    }
  };

  const handleUpdateRoom = async (updates: { title: string; description: string; avatar?: string }) => {
    if (!selectedChatId) return;
    await updateChatRoomDetails(selectedChatId, updates);
  };

  const handleSendMessage = async (msg: {
    type: MessageType;
    content: string;
    isEncrypted: boolean;
    iv?: string;
    mediaUrl?: string;
    fileName?: string;
    fileSize?: number;
    fileType?: string;
    audioDuration?: number;
    replyTo?: {
      id: string;
      senderName: string;
      content: string;
      type: MessageType;
    };
  }) => {
    if (!selectedChatId || !currentUser) return;
    await sendChatMessage(selectedChatId, msg, currentUser);
  };

  const handleEditMessage = async (
    messageId: string,
    updates: { content: string; iv?: string | null }
  ) => {
    if (!selectedChatId) return;
    await editChatMessage(selectedChatId, messageId, updates);
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!selectedChatId) return;
    await deleteChatMessage(selectedChatId, messageId);
  };

  const handleToggleReaction = async (message: ChatMessage, emoji: string) => {
    if (!selectedChatId || !currentUser) return;
    await toggleMessageReaction(selectedChatId, message, emoji, currentUser.id);
  };

  const handleTogglePinMessage = async (message: ChatMessage) => {
    if (!selectedChatId) return;
    const activeChat = chats.find((c) => c.id === selectedChatId);
    await togglePinChatMessage(selectedChatId, message, activeChat?.pinnedMessageId);
  };

  const handleTyping = (isTyping: boolean) => {
    if (!selectedChatId || !currentUser) return;
    if (isTyping && currentUser.preferences.sendTypingIndicator === false) return;
    setTypingStatus(selectedChatId, currentUser, isTyping);
  };

  const handleUpdateUser = async (updated: Partial<UserProfile>) => {
    if (!currentUser) return;
    const saved = await updateUserProfile(currentUser, updated);
    setCurrentUser(saved);
    const chatIds = chatsRef.current.map((c) => c.id);
    if (chatIds.length > 0) {
      await syncUserPresenceAcrossRooms(saved, chatIds, false).catch(() => {});
    }
  };

  // Recovery screen if profile loading fails after Firebase Auth succeeded (prevents infinite spinner)
  if (authReady && firebaseUser && !currentUser && profileLoadError) {
    return (
      <div
        className="h-[100dvh] w-screen flex items-center justify-center bg-[#F5F6FA] dark:bg-[#07090E] text-slate-900 dark:text-slate-100 p-4"
        dir="rtl"
      >
        <div className="max-w-sm w-full p-6 rounded-[26px] bg-white dark:bg-[#0E121B] border border-slate-200/80 dark:border-white/[0.08] shadow-2xl text-center flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-950/50 border border-red-200/80 dark:border-red-500/20 flex items-center justify-center text-red-500">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">تعذر تحميل الحساب</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{profileLoadError}</p>
          </div>
          <div className="flex items-center gap-2.5 w-full">
            <button
              type="button"
              onClick={() => loadProfileForUser(firebaseUser)}
              className="flex-1 min-h-[44px] px-4 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>إعادة المحاولة</span>
            </button>
            <button
              type="button"
              onClick={handleSignOut}
              className="min-h-[44px] px-4 py-2 rounded-2xl bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.1] text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>خروج</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!authReady || (firebaseUser && !currentUser)) {
    return (
      <div className="h-[100dvh] w-screen flex items-center justify-center bg-[#F5F6FA] dark:bg-[#07090E] text-slate-900 dark:text-slate-200" dir="rtl">
        <div className="flex flex-col items-center gap-3.5">
          <div className="w-12 h-12 rounded-[18px] bg-white dark:bg-[#0E121B] border border-slate-200/80 dark:border-white/[0.08] shadow-sm flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-indigo-600 dark:text-indigo-400 animate-spin" />
          </div>
          <span className="text-sm font-semibold tracking-tight">جاري تهيئة Chat Plus...</span>
        </div>
      </div>
    );
  }

  if (!firebaseUser || !currentUser) {
    return (
      <AuthLandingScreen
        onGoogleSignIn={handleGoogleSignIn}
        isDark={landingDark}
        onToggleTheme={handleToggleLandingTheme}
        authError={authError}
      />
    );
  }

  const currentChat = chats.find((c) => c.id === selectedChatId);
  const currentRoomMembers = currentChat ? roomMembersMap[currentChat.id] || [] : [];
  const isMidnight = currentUser.preferences.theme === 'midnight';
  const showMobileSidebar = currentView !== 'profile' && (mobileSidebarOpen || !currentChat);

  return (
    <div
      className={`h-[100dvh] w-screen overflow-hidden flex flex-col ${
        isMidnight
          ? 'bg-black text-slate-100'
          : 'bg-[#F5F6FA] dark:bg-[#07090E] text-slate-900 dark:text-slate-100'
      }`}
    >
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Sidebar */}
        <div className={`${showMobileSidebar ? 'flex w-full' : 'hidden'} md:flex md:w-auto h-full`}>
          <ChatSidebar
            chats={chats}
            chatsError={chatsError}
            selectedChatId={selectedChatId}
            roomMembersMap={roomMembersMap}
            onSelectChat={(id) => {
              setSelectedChatId(id);
              setCurrentView('chat');
              setMobileSidebarOpen(false);
            }}
            onOpenCreateModal={() => setIsCreateModalOpen(true)}
            onOpenJoinModal={() => setIsJoinModalOpen(true)}
            onOpenProfile={() => {
              setCurrentView('profile');
              setMobileSidebarOpen(false);
            }}
            onDeleteChat={handleDeleteChat}
            currentUser={currentUser}
          />
        </div>

        {/* Main Content Area */}
        <div
          className={`${
            currentView === 'profile' || (currentChat && !mobileSidebarOpen)
              ? 'flex'
              : 'hidden md:flex'
          } flex-1 h-full min-w-0`}
        >
          {currentView === 'profile' ? (
            <ProfileView
              user={currentUser}
              chats={chats}
              googlePhotoUrl={firebaseUser.photoURL}
              lastSignInTime={firebaseUser.metadata?.lastSignInTime}
              onUpdateUser={handleUpdateUser}
              onSignOut={handleSignOut}
              onBack={() => {
                setCurrentView('chat');
                setMobileSidebarOpen(true);
              }}
            />
          ) : currentChat ? (
            <ChatArea
              chat={currentChat}
              messages={messages}
              roomMembers={currentRoomMembers}
              currentUser={currentUser}
              onSendMessage={handleSendMessage}
              onEditMessage={handleEditMessage}
              onDeleteMessage={handleDeleteMessage}
              onToggleReaction={handleToggleReaction}
              onTogglePinMessage={handleTogglePinMessage}
              onUpdateRoom={handleUpdateRoom}
              onDeleteChat={handleDeleteChat}
              typingUsers={typingUsers}
              onTyping={handleTyping}
              onBackToSidebar={() => setMobileSidebarOpen(true)}
              onOpenProfile={() => {
                setCurrentView('profile');
                setMobileSidebarOpen(false);
              }}
            />
          ) : (
            <div
              className={`hidden md:flex flex-1 items-center justify-center p-8 text-center ${
                isMidnight
                  ? 'bg-black text-slate-500'
                  : 'bg-[#F5F6FA] dark:bg-[#07090E] text-slate-500 dark:text-slate-400'
              }`}
              dir="rtl"
            >
              <div className="flex flex-col items-center gap-4 max-w-sm p-8 rounded-[28px] bg-white/80 dark:bg-[#0E121B]/80 border border-slate-200/80 dark:border-white/[0.07] backdrop-blur-xl">
                <div className="w-14 h-14 rounded-[18px] bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200/70 dark:border-indigo-400/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
                    ابدأ محادثتك المشفرة
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    اختر غرفة من القائمة الجانبية، أو أنشئ غرفة جديدة واحصل على رمز مشاركة خاص بها.
                  </p>
                </div>
                <div className="flex items-center gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(true)}
                    className="min-h-[42px] px-5 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all active:scale-[0.98] cursor-pointer"
                  >
                    إنشاء غرفة جديدة
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsJoinModalOpen(true)}
                    className="min-h-[42px] px-4 py-2 rounded-2xl bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.1] text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    دخول برمز
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {isCreateModalOpen && (
        <CreateChatModal
          onClose={() => setIsCreateModalOpen(false)}
          onCreate={handleCreateChat}
        />
      )}

      {isJoinModalOpen && (
        <JoinChatModal
          initialCode={pendingInviteCode}
          onClose={() => {
            setIsJoinModalOpen(false);
            setPendingInviteCode('');
          }}
          onJoin={handleJoinChat}
        />
      )}
    </div>
  );
}
