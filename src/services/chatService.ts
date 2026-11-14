import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  writeBatch,
  increment,
  serverTimestamp,
  Timestamp,
  Unsubscribe,
} from 'firebase/firestore';
import { User } from 'firebase/auth';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { ChatMember, ChatMessage, ChatRoom, MessageType, UserPreferences, UserProfile, UserStatus } from '../types/chat';
import { createMonogramAvatar, createRoomIconAvatar } from '../utils/avatar';
import { extractRoomCodeFromInput } from '../utils/clipboard';
import { sanitizePreferencesPayload } from '../utils/wallpapers';

function toIsoString(val: unknown): string {
  if (val instanceof Timestamp) {
    return val.toDate().toISOString();
  }
  if (val && typeof val === 'object' && 'toDate' in val && typeof (val as any).toDate === 'function') {
    return (val as any).toDate().toISOString();
  }
  if (typeof val === 'string') return val;
  return new Date().toISOString();
}

function sanitizeUsername(raw: string, uid: string): string {
  const cleaned = raw
    .toLowerCase()
    .replace(/[^a-z0-9_.\-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 32);
  if (cleaned.length >= 2) return cleaned;
  return `user_${uid.slice(0, 6).replace(/[^a-zA-Z0-9_\-]/g, 'x')}`;
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'dark',
  language: 'ar',
  soundEffects: true,
  notifications: false,
  readReceipts: true,
  lastSeen: true,
  enterIsSend: true,
  fontSize: 'medium',
  chatWallpaper: 'default',
  compactMode: false,
  bubbleStyle: 'modern',
  accentColor: 'indigo',
  sendTypingIndicator: true,
  showTimestamps: true,
  showEncryptionBadge: true,
  autoScrollOnMessage: true,
  linkPreviews: true,
  blurMedia: false,
  voiceAutoPlay: false,
  highContrastText: false,
};

function mapDocToUser(data: any, uid: string): UserProfile {
  return {
    id: data.id || uid,
    name: data.name || 'مستخدم',
    username: data.username || sanitizeUsername('user', uid),
    avatar: data.avatar || createMonogramAvatar(data.name || 'U'),
    bio: data.bio || '',
    status: data.status || 'online',
    statusMessage: data.statusMessage || '',
    email: data.email || '',
    phone: data.phone || '',
    createdAt: toIsoString(data.createdAt),
    updatedAt: toIsoString(data.updatedAt),
    preferences: sanitizePreferencesPayload({
      ...DEFAULT_PREFERENCES,
      ...(data.preferences || {}),
    }),
  };
}

function mapDocToChatMember(data: any, chatId: string, memberId: string): ChatMember {
  const safeName = data.name || 'عضو';
  const uid = data.userId || memberId;
  return {
    userId: uid,
    chatId: data.chatId || chatId,
    name: safeName,
    username: data.username || sanitizeUsername('user', uid),
    avatar: data.avatar || createMonogramAvatar(safeName),
    bio: data.bio || '',
    status: (data.status as UserStatus) || 'offline',
    statusMessage: data.statusMessage || '',
    role: data.role === 'owner' ? 'owner' : 'member',
    joinedAt: toIsoString(data.joinedAt),
    lastActiveAt: toIsoString(data.lastActiveAt || data.joinedAt),
  };
}

function mapDocToChat(data: any): ChatRoom {
  return {
    id: data.id,
    code: data.code,
    title: data.title,
    description: data.description || '',
    isGroup: Boolean(data.isGroup),
    avatar: data.avatar || createRoomIconAvatar(data.code || data.id, data.title),
    createdBy: data.createdBy,
    createdByName: data.createdByName || '',
    createdAt: toIsoString(data.createdAt),
    updatedAt: toIsoString(data.updatedAt),
    membersCount: typeof data.membersCount === 'number' ? data.membersCount : 1,
    isEncrypted: data.isEncrypted !== false,
    encryptionSalt: data.encryptionSalt || 'chat-plus-salt',
    lastMessage: data.lastMessage || null,
    pinnedMessageId: data.pinnedMessageId || null,
  };
}

function mapDocToMessage(data: any): ChatMessage {
  return {
    id: data.id,
    chatId: data.chatId,
    senderId: data.senderId,
    senderName: data.senderName,
    senderAvatar: data.senderAvatar || createMonogramAvatar(data.senderName || 'U'),
    type: data.type,
    content: data.content,
    isEncrypted: Boolean(data.isEncrypted),
    iv: data.iv ?? null,
    mediaUrl: data.mediaUrl ?? null,
    fileName: data.fileName ?? null,
    fileSize: data.fileSize ?? null,
    fileType: data.fileType ?? null,
    audioDuration: data.audioDuration ?? null,
    replyTo: data.replyTo ?? null,
    reactions: data.reactions || {},
    isPinned: Boolean(data.isPinned),
    status: data.status || 'sent',
    createdAt: toIsoString(data.createdAt),
    updatedAt: data.updatedAt ? toIsoString(data.updatedAt) : undefined,
  };
}

export async function ensureUserProfile(firebaseUser: User): Promise<UserProfile> {
  const path = `users/${firebaseUser.uid}`;
  const userRef = doc(db, 'users', firebaseUser.uid);

  try {
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      return mapDocToUser(snap.data(), firebaseUser.uid);
    }

    const displayName = (firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'مستخدم').slice(0, 80);
    const emailLocal = firebaseUser.email?.split('@')[0] || 'user';
    const username = sanitizeUsername(emailLocal, firebaseUser.uid);
    const avatar = firebaseUser.photoURL || createMonogramAvatar(displayName);

    const newUserPayload = {
      id: firebaseUser.uid,
      name: displayName,
      username,
      avatar: avatar.slice(0, 500000),
      bio: '',
      status: 'online' as const,
      statusMessage: '',
      email: (firebaseUser.email || '').slice(0, 160),
      phone: '',
      preferences: DEFAULT_PREFERENCES,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(userRef, newUserPayload);
    const createdSnap = await getDoc(userRef);
    return mapDocToUser(createdSnap.data() || newUserPayload, firebaseUser.uid);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export function subscribeToUserProfile(
  uid: string,
  onData: (profile: UserProfile) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = `users/${uid}`;
  return onSnapshot(
    doc(db, 'users', uid),
    (snap) => {
      if (snap.exists()) {
        onData(mapDocToUser(snap.data(), uid));
      }
    },
    (error) => {
      if (onError) {
        onError(error);
      } else {
        handleFirestoreError(error, OperationType.GET, path);
      }
    }
  );
}

export async function updateUserProfile(
  current: UserProfile,
  updates: Partial<UserProfile>
): Promise<UserProfile> {
  const path = `users/${current.id}`;
  const userRef = doc(db, 'users', current.id);

  const sanitizedName = (updates.name ?? current.name).trim().slice(0, 80) || current.name;
  const sanitizedUsername = sanitizeUsername(updates.username ?? current.username, current.id);
  const sanitizedAvatar = (updates.avatar ?? current.avatar).slice(0, 500000);
  const sanitizedBio = (updates.bio ?? current.bio ?? '').slice(0, 300);
  const sanitizedStatus = updates.status ?? current.status;
  const sanitizedStatusMessage = (updates.statusMessage ?? current.statusMessage ?? '').slice(0, 120);
  const sanitizedEmail = (updates.email ?? current.email ?? '').slice(0, 160);
  const sanitizedPhone = (updates.phone ?? current.phone ?? '').slice(0, 40);
  const mergedPrefs = sanitizePreferencesPayload({
    ...DEFAULT_PREFERENCES,
    ...current.preferences,
    ...(updates.preferences || {}),
  });

  try {
    await updateDoc(userRef, {
      name: sanitizedName,
      username: sanitizedUsername,
      avatar: sanitizedAvatar,
      bio: sanitizedBio,
      status: sanitizedStatus,
      statusMessage: sanitizedStatusMessage,
      email: sanitizedEmail,
      phone: sanitizedPhone,
      preferences: mergedPrefs,
      updatedAt: serverTimestamp(),
    });

    const updatedSnap = await getDoc(userRef);
    return mapDocToUser(updatedSnap.data() || { ...current, ...updates, preferences: mergedPrefs }, current.id);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export function subscribeToUserChats(
  uid: string,
  onChatsUpdate: (chats: ChatRoom[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const joinedPath = `users/${uid}/joinedChats`;
  const joinedQuery = query(
    collection(db, 'users', uid, 'joinedChats'),
    where('userId', '==', uid)
  );
  const chatListeners = new Map<string, Unsubscribe>();
  const chatMap = new Map<string, ChatRoom>();

  const emitSorted = () => {
    const list = Array.from(chatMap.values()).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
    onChatsUpdate(list);
  };

  const unsubJoined = onSnapshot(
    joinedQuery,
    (snapshot) => {
      const currentIds = new Set<string>();
      snapshot.docs.forEach((d) => currentIds.add(d.id));

      // Remove stale chat listeners
      for (const [chatId, unsub] of chatListeners.entries()) {
        if (!currentIds.has(chatId)) {
          unsub();
          chatListeners.delete(chatId);
          chatMap.delete(chatId);
        }
      }

      if (currentIds.size === 0) {
        emitSorted();
        return;
      }

      // Attach listeners for new joined chats
      currentIds.forEach((chatId) => {
        if (chatListeners.has(chatId)) return;
        const chatRef = doc(db, 'chats', chatId);
        const unsubChat = onSnapshot(
          chatRef,
          (chatSnap) => {
            if (!chatSnap.exists()) {
              // Clean up user's joinedChats ref only when confirmed deleted on server
              if (!chatSnap.metadata.fromCache && !chatSnap.metadata.hasPendingWrites) {
                chatMap.delete(chatId);
                deleteDoc(doc(db, 'users', uid, 'joinedChats', chatId)).catch(() => {});
                emitSorted();
              }
              return;
            }
            chatMap.set(chatId, mapDocToChat(chatSnap.data()));
            emitSorted();
          },
          () => {
            // If membership was revoked or room deleted
            chatMap.delete(chatId);
            emitSorted();
          }
        );
        chatListeners.set(chatId, unsubChat);
      });
    },
    (error) => {
      if (onError) {
        onError(error);
      } else {
        handleFirestoreError(error, OperationType.LIST, joinedPath);
      }
    }
  );

  return () => {
    unsubJoined();
    chatListeners.forEach((unsub) => unsub());
    chatListeners.clear();
  };
}

export async function createChatRoom(params: {
  title: string;
  description: string;
  isGroup: boolean;
  code: string;
  avatar: string;
  user: UserProfile;
}): Promise<ChatRoom> {
  const { title, description, isGroup, code, avatar, user } = params;
  const cleanTitle = title.trim().slice(0, 100);
  if (!cleanTitle) {
    throw new Error('يرجى إدخال اسم المحادثة أو الغرفة');
  }

  const cleanCode = extractRoomCodeFromInput(code);
  if (cleanCode.length < 4 || cleanCode.length > 32) {
    throw new Error('رمز الغرفة يجب أن يتكون من 4 إلى 32 حرفاً أو رقماً باللغة الإنجليزية');
  }

  // Check if room code already exists
  try {
    const existingCodeSnap = await getDoc(doc(db, 'roomCodes', cleanCode));
    if (existingCodeSnap.exists()) {
      throw new Error('هذا الرمز مستخدم بالفعل، يرجى توليد رمز آخر');
    }
  } catch (err: any) {
    if (err?.message?.includes('مستخدم بالفعل')) throw err;
    handleFirestoreError(err, OperationType.GET, `roomCodes/${cleanCode}`);
  }

  const chatId = `chat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const salt = `salt_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  const welcomeMsgId = `msg_${Date.now()}_sys`;
  const cleanDesc = description.trim().slice(0, 300);
  const cleanAvatar = (avatar || createRoomIconAvatar(cleanCode, cleanTitle)).slice(0, 500000);
  const safeUserName = (user.name || 'مستخدم').trim().slice(0, 80) || 'مستخدم';
  const safeUserAvatar = (user.avatar || createMonogramAvatar(safeUserName)).slice(0, 500000);

  const batch = writeBatch(db);

  const chatRef = doc(db, 'chats', chatId);
  const memberRef = doc(db, 'chats', chatId, 'members', user.id);
  const roomCodeRef = doc(db, 'roomCodes', cleanCode);
  const joinedChatRef = doc(db, 'users', user.id, 'joinedChats', chatId);

  const baseChatPayload = {
    id: chatId,
    code: cleanCode,
    title: cleanTitle,
    description: cleanDesc,
    isGroup: Boolean(isGroup),
    avatar: cleanAvatar,
    createdBy: user.id,
    createdByName: safeUserName,
    membersCount: 1,
    isEncrypted: true,
    encryptionSalt: salt,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const safeUsername = sanitizeUsername(user.username || 'user', user.id);
  const safeBio = (user.bio || '').slice(0, 300);
  const safeStatus: UserStatus = user.preferences?.lastSeen === false ? 'offline' : user.status || 'online';
  const safeStatusMessage = (user.statusMessage || '').slice(0, 120);

  batch.set(chatRef, baseChatPayload);

  batch.set(memberRef, {
    userId: user.id,
    chatId,
    name: safeUserName,
    username: safeUsername,
    avatar: safeUserAvatar,
    bio: safeBio,
    status: safeStatus,
    statusMessage: safeStatusMessage,
    role: 'owner',
    joinedAt: serverTimestamp(),
    lastActiveAt: serverTimestamp(),
  });

  batch.set(roomCodeRef, {
    code: cleanCode,
    chatId,
    createdBy: user.id,
    createdAt: serverTimestamp(),
  });

  batch.set(joinedChatRef, {
    chatId,
    userId: user.id,
    role: 'owner',
    joinedAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `chats/${chatId}`);
  }

  // Post initial system welcome message once membership is committed
  setDoc(doc(db, 'chats', chatId, 'messages', welcomeMsgId), {
    id: welcomeMsgId,
    chatId,
    senderId: user.id,
    senderName: safeUserName,
    senderAvatar: safeUserAvatar,
    type: 'system',
    content: `تم إنشاء الغرفة بنجاح — رمز المشاركة: ${cleanCode}`,
    isEncrypted: false,
    reactions: {},
    status: 'read',
    createdAt: serverTimestamp(),
  }).catch(() => {});

  const nowIso = new Date().toISOString();
  try {
    const createdSnap = await getDoc(chatRef);
    if (createdSnap.exists()) {
      return mapDocToChat(createdSnap.data());
    }
  } catch {
    // Fallback to local object if immediate read lags
  }

  return mapDocToChat({
    ...baseChatPayload,
    createdAt: nowIso,
    updatedAt: nowIso,
  });
}

export async function joinChatRoomByCode(code: string, user: UserProfile): Promise<ChatRoom> {
  const cleanCode = extractRoomCodeFromInput(code);
  if (cleanCode.length < 4 || cleanCode.length > 32) {
    throw new Error('يرجى إدخال رمز غرفة صحيح (من 4 إلى 32 حرفاً أو رقماً)');
  }

  let lookupSnap;
  try {
    lookupSnap = await getDoc(doc(db, 'roomCodes', cleanCode));
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `roomCodes/${cleanCode}`);
  }

  if (!lookupSnap.exists()) {
    throw new Error('لم يتم العثور على غرفة بهذا الرمز، يرجى التأكد من صحة الرمز المدخل');
  }

  const { chatId } = lookupSnap.data() as { chatId: string };
  const memberRef = doc(db, 'chats', chatId, 'members', user.id);
  const joinedChatRef = doc(db, 'users', user.id, 'joinedChats', chatId);
  const chatRef = doc(db, 'chats', chatId);
  const safeUserName = (user.name || 'عضو').trim().slice(0, 80) || 'عضو';
  const safeUserAvatar = (user.avatar || createMonogramAvatar(safeUserName)).slice(0, 500000);

  const safeUsername = sanitizeUsername(user.username || 'user', user.id);
  const safeBio = (user.bio || '').slice(0, 300);
  const safeStatus: UserStatus = user.preferences?.lastSeen === false ? 'offline' : user.status || 'online';
  const safeStatusMessage = (user.statusMessage || '').slice(0, 120);

  try {
    const existingMember = await getDoc(memberRef);
    if (existingMember.exists()) {
      const joinedSnap = await getDoc(joinedChatRef);
      if (!joinedSnap.exists()) {
        await setDoc(joinedChatRef, {
          chatId,
          userId: user.id,
          role: existingMember.data().role || 'member',
          joinedAt: serverTimestamp(),
        });
      }
      await updateDoc(memberRef, {
        name: safeUserName,
        username: safeUsername,
        avatar: safeUserAvatar,
        bio: safeBio,
        status: safeStatus,
        statusMessage: safeStatusMessage,
        lastActiveAt: serverTimestamp(),
      }).catch(() => {});

      const chatSnap = await getDoc(chatRef);
      if (!chatSnap.exists()) {
        throw new Error('لم تعد هذه الغرفة متاحة');
      }
      return mapDocToChat(chatSnap.data());
    }

    const batch = writeBatch(db);
    batch.set(memberRef, {
      userId: user.id,
      chatId,
      name: safeUserName,
      username: safeUsername,
      avatar: safeUserAvatar,
      bio: safeBio,
      status: safeStatus,
      statusMessage: safeStatusMessage,
      role: 'member',
      joinedAt: serverTimestamp(),
      lastActiveAt: serverTimestamp(),
    });
    batch.set(joinedChatRef, {
      chatId,
      userId: user.id,
      role: 'member',
      joinedAt: serverTimestamp(),
    });
    batch.update(chatRef, {
      membersCount: increment(1),
      updatedAt: serverTimestamp(),
    });

    await batch.commit();

    // Post join notice non-fatally after membership is committed
    const joinMsgId = `msg_${Date.now()}_join`;
    setDoc(doc(db, 'chats', chatId, 'messages', joinMsgId), {
      id: joinMsgId,
      chatId,
      senderId: user.id,
      senderName: safeUserName,
      senderAvatar: safeUserAvatar,
      type: 'system',
      content: `انضم ${safeUserName} إلى المحادثة عبر رمز المشاركة`,
      isEncrypted: false,
      reactions: {},
      status: 'read',
      createdAt: serverTimestamp(),
    }).catch(() => {});

    const chatSnap = await getDoc(chatRef);
    if (!chatSnap.exists()) {
      throw new Error('لم تعد هذه الغرفة متاحة');
    }
    return mapDocToChat(chatSnap.data());
  } catch (error) {
    if (error instanceof Error && error.message.includes('متاحة')) throw error;
    handleFirestoreError(error, OperationType.WRITE, `chats/${chatId}`);
  }
}

export async function deleteOrLeaveChatRoom(chat: ChatRoom, uid: string): Promise<void> {
  const chatPath = `chats/${chat.id}`;
  try {
    if (chat.createdBy === uid) {
      // Owner permanently deletes the room, its messages, typing indicators, roomCode, and owner membership
      const [messagesSnap, typingSnap] = await Promise.all([
        getDocs(collection(db, 'chats', chat.id, 'messages')),
        getDocs(collection(db, 'chats', chat.id, 'typing')).catch(() => null),
      ]);
      const msgDocs = messagesSnap.docs;
      for (let i = 0; i < msgDocs.length; i += 400) {
        const chunk = msgDocs.slice(i, i + 400);
        const delBatch = writeBatch(db);
        chunk.forEach((d) => delBatch.delete(d.ref));
        await delBatch.commit();
      }

      const finalBatch = writeBatch(db);
      if (typingSnap) {
        typingSnap.docs.forEach((d) => {
          if (d.id === uid) finalBatch.delete(d.ref);
        });
      }
      finalBatch.delete(doc(db, 'roomCodes', chat.code));
      finalBatch.delete(doc(db, 'users', uid, 'joinedChats', chat.id));
      finalBatch.delete(doc(db, 'chats', chat.id, 'members', uid));
      finalBatch.delete(doc(db, 'chats', chat.id));
      await finalBatch.commit();
    } else {
      // Member leaves the room
      const batch = writeBatch(db);
      batch.delete(doc(db, 'chats', chat.id, 'members', uid));
      batch.delete(doc(db, 'users', uid, 'joinedChats', chat.id));
      batch.delete(doc(db, 'chats', chat.id, 'typing', uid));
      batch.update(doc(db, 'chats', chat.id), {
        membersCount: increment(-1),
        updatedAt: serverTimestamp(),
      });
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, chatPath);
  }
}

export async function updateChatRoomDetails(
  chatId: string,
  updates: { title: string; description: string; avatar?: string }
): Promise<void> {
  const path = `chats/${chatId}`;
  const payload: Record<string, any> = {
    title: updates.title.trim().slice(0, 100),
    description: updates.description.trim().slice(0, 300),
    updatedAt: serverTimestamp(),
  };
  if (updates.avatar) {
    payload.avatar = updates.avatar.slice(0, 500000);
  }
  try {
    await updateDoc(doc(db, 'chats', chatId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export function subscribeToMessages(
  chatId: string,
  onMessages: (messages: ChatMessage[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = `chats/${chatId}/messages`;
  const q = query(collection(db, 'chats', chatId, 'messages'), orderBy('createdAt', 'asc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const msgs = snapshot.docs.map((d) => mapDocToMessage(d.data()));
      onMessages(msgs);
    },
    (error) => {
      if (onError) {
        onError(error);
      } else {
        handleFirestoreError(error, OperationType.LIST, path);
      }
    }
  );
}

export async function sendChatMessage(
  chatId: string,
  msg: {
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
  },
  sender: UserProfile
): Promise<void> {
  const messageId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const path = `chats/${chatId}/messages/${messageId}`;
  const msgRef = doc(db, 'chats', chatId, 'messages', messageId);
  const chatRef = doc(db, 'chats', chatId);

  const payload: Record<string, any> = {
    id: messageId,
    chatId,
    senderId: sender.id,
    senderName: sender.name.slice(0, 80),
    senderAvatar: sender.avatar.slice(0, 500000),
    type: msg.type,
    content: msg.content.slice(0, 20000),
    isEncrypted: Boolean(msg.isEncrypted),
    reactions: {},
    isPinned: false,
    status: 'sent',
    createdAt: serverTimestamp(),
  };

  if (msg.iv) payload.iv = msg.iv.slice(0, 128);
  if (msg.mediaUrl) payload.mediaUrl = msg.mediaUrl.slice(0, 850000);
  if (msg.fileName) payload.fileName = msg.fileName.slice(0, 255);
  if (typeof msg.fileSize === 'number') payload.fileSize = msg.fileSize;
  if (msg.fileType) payload.fileType = msg.fileType.slice(0, 120);
  if (typeof msg.audioDuration === 'number') payload.audioDuration = msg.audioDuration;
  if (msg.replyTo) {
    payload.replyTo = {
      id: msg.replyTo.id.slice(0, 128),
      senderName: msg.replyTo.senderName.slice(0, 80),
      content: msg.replyTo.content.slice(0, 2000),
      type: msg.replyTo.type,
    };
  }

  const lastMessagePayload: Record<string, any> = {
    id: messageId,
    senderName: sender.name.slice(0, 80),
    content: msg.isEncrypted ? msg.content.slice(0, 2000) : msg.content.slice(0, 140),
    type: msg.type,
    isEncrypted: Boolean(msg.isEncrypted),
    createdAt: new Date().toISOString(),
  };
  if (msg.iv) {
    lastMessagePayload.iv = msg.iv.slice(0, 128);
  }

  const batch = writeBatch(db);
  batch.set(msgRef, payload);
  batch.update(chatRef, {
    lastMessage: lastMessagePayload,
    updatedAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function editChatMessage(
  chatId: string,
  messageId: string,
  updates: { content: string; iv?: string | null }
): Promise<void> {
  const path = `chats/${chatId}/messages/${messageId}`;
  const msgRef = doc(db, 'chats', chatId, 'messages', messageId);
  const chatRef = doc(db, 'chats', chatId);
  try {
    const cleanContent = updates.content.slice(0, 20000);
    const payload: Record<string, any> = {
      content: cleanContent,
      updatedAt: serverTimestamp(),
    };
    if (updates.iv !== undefined) {
      payload.iv = updates.iv ? updates.iv.slice(0, 128) : null;
    }

    const chatSnap = await getDoc(chatRef);
    const batch = writeBatch(db);
    batch.update(msgRef, payload);

    if (chatSnap.exists() && chatSnap.data()?.lastMessage?.id === messageId) {
      const prevLm = chatSnap.data().lastMessage;
      batch.update(chatRef, {
        lastMessage: {
          ...prevLm,
          content: prevLm.isEncrypted ? cleanContent.slice(0, 2000) : cleanContent.slice(0, 140),
          iv: updates.iv !== undefined ? (updates.iv ? updates.iv.slice(0, 128) : null) : prevLm.iv ?? null,
        },
        updatedAt: serverTimestamp(),
      });
    }

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteChatMessage(chatId: string, messageId: string): Promise<void> {
  const path = `chats/${chatId}/messages/${messageId}`;
  const msgRef = doc(db, 'chats', chatId, 'messages', messageId);
  const chatRef = doc(db, 'chats', chatId);
  try {
    const [chatSnap, latestMsgsSnap] = await Promise.all([
      getDoc(chatRef),
      getDocs(query(collection(db, 'chats', chatId, 'messages'), orderBy('createdAt', 'desc'), limit(2))),
    ]);

    const batch = writeBatch(db);
    batch.delete(msgRef);

    if (chatSnap.exists()) {
      const chatData = chatSnap.data();
      const chatUpdates: Record<string, any> = {};
      let needsChatUpdate = false;

      if (chatData.pinnedMessageId === messageId) {
        chatUpdates.pinnedMessageId = null;
        needsChatUpdate = true;
      }

      if (chatData.lastMessage?.id === messageId) {
        const replacementDoc = latestMsgsSnap.docs.find((d) => d.id !== messageId);
        if (replacementDoc) {
          const d = replacementDoc.data();
          chatUpdates.lastMessage = {
            id: d.id,
            senderName: (d.senderName || 'عضو').slice(0, 80),
            content: d.isEncrypted ? String(d.content || '').slice(0, 2000) : String(d.content || '').slice(0, 140),
            type: d.type,
            isEncrypted: Boolean(d.isEncrypted),
            iv: d.iv ?? null,
            createdAt: toIsoString(d.createdAt),
          };
        } else {
          chatUpdates.lastMessage = null;
        }
        needsChatUpdate = true;
      }

      if (needsChatUpdate) {
        chatUpdates.updatedAt = serverTimestamp();
        batch.update(chatRef, chatUpdates);
      }
    }

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function toggleMessageReaction(
  chatId: string,
  message: ChatMessage,
  emoji: string,
  uid: string
): Promise<void> {
  const path = `chats/${chatId}/messages/${message.id}`;
  const currentReactions: Record<string, string[]> = { ...(message.reactions || {}) };
  const users = [...(currentReactions[emoji] || [])];
  const idx = users.indexOf(uid);

  if (idx === -1) {
    users.push(uid);
  } else {
    users.splice(idx, 1);
  }

  if (users.length === 0) {
    delete currentReactions[emoji];
  } else {
    currentReactions[emoji] = users;
  }

  try {
    await updateDoc(doc(db, 'chats', chatId, 'messages', message.id), {
      reactions: currentReactions,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function togglePinChatMessage(
  chatId: string,
  message: ChatMessage,
  previousPinnedId?: string | null
): Promise<void> {
  const path = `chats/${chatId}/messages/${message.id}`;
  const nextPinned = !message.isPinned;
  const batch = writeBatch(db);

  try {
    if (nextPinned && previousPinnedId && previousPinnedId !== message.id) {
      const prevRef = doc(db, 'chats', chatId, 'messages', previousPinnedId);
      const prevSnap = await getDoc(prevRef);
      if (prevSnap.exists()) {
        batch.update(prevRef, {
          isPinned: false,
          updatedAt: serverTimestamp(),
        });
      }
    }

    batch.update(doc(db, 'chats', chatId, 'messages', message.id), {
      isPinned: nextPinned,
      updatedAt: serverTimestamp(),
    });
    batch.update(doc(db, 'chats', chatId), {
      pinnedMessageId: nextPinned ? message.id : null,
      updatedAt: serverTimestamp(),
    });

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function setTypingStatus(
  chatId: string,
  user: UserProfile,
  isTyping: boolean
): Promise<void> {
  const typingRef = doc(db, 'chats', chatId, 'typing', user.id);
  try {
    if (!isTyping) {
      await deleteDoc(typingRef).catch(() => {});
      return;
    }
    await setDoc(typingRef, {
      userId: user.id,
      userName: user.name.slice(0, 80),
      isTyping: true,
      updatedAt: serverTimestamp(),
    });
  } catch {
    // non-blocking typing status
  }
}

export function subscribeToTyping(
  chatId: string,
  currentUid: string,
  onTypingUsers: (names: string[]) => void
): Unsubscribe {
  return onSnapshot(
    collection(db, 'chats', chatId, 'typing'),
    (snapshot) => {
      const now = Date.now();
      const names: string[] = [];
      snapshot.docs.forEach((d) => {
        const data = d.data();
        if (data.userId !== currentUid && data.isTyping) {
          const ts = data.updatedAt instanceof Timestamp ? data.updatedAt.toMillis() : now;
          if (now - ts < 10000) {
            names.push(data.userName);
          }
        }
      });
      onTypingUsers(names);
    },
    () => {
      onTypingUsers([]);
    }
  );
}

export function subscribeToRoomMembers(
  chatId: string,
  onMembers: (members: ChatMember[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = `chats/${chatId}/members`;
  const q = query(collection(db, 'chats', chatId, 'members'), where('chatId', '==', chatId));
  return onSnapshot(
    q,
    (snapshot) => {
      const members = snapshot.docs.map((d) => mapDocToChatMember(d.data(), chatId, d.id));
      members.sort((a, b) => {
        if (a.role === 'owner' && b.role !== 'owner') return -1;
        if (a.role !== 'owner' && b.role === 'owner') return 1;
        return a.name.localeCompare(b.name, 'ar');
      });
      onMembers(members);
    },
    (error) => {
      if (onError) {
        onError(error);
      } else {
        handleFirestoreError(error, OperationType.LIST, path);
      }
    }
  );
}

export function subscribeToAllRoomsPresence(
  chatIds: string[],
  onMembersMap: (map: Record<string, ChatMember[]>) => void
): Unsubscribe {
  if (chatIds.length === 0) {
    onMembersMap({});
    return () => {};
  }

  const membersByChat: Record<string, ChatMember[]> = {};
  const unsubs = chatIds.map((chatId) =>
    subscribeToRoomMembers(
      chatId,
      (members) => {
        membersByChat[chatId] = members;
        onMembersMap({ ...membersByChat });
      },
      () => {
        // Non-blocking: ignore transient presence read failure on single room
      }
    )
  );

  return () => {
    unsubs.forEach((u) => u());
  };
}

export async function syncUserPresenceAcrossRooms(
  user: UserProfile,
  chatIds: string[],
  forceOffline: boolean = false
): Promise<void> {
  if (!user?.id || chatIds.length === 0) return;

  const safeName = (user.name || 'مستخدم').trim().slice(0, 80) || 'مستخدم';
  const safeUsername = sanitizeUsername(user.username || 'user', user.id);
  const safeAvatar = (user.avatar || createMonogramAvatar(safeName)).slice(0, 500000);
  const safeBio = (user.bio || '').slice(0, 300);
  const safeStatus: UserStatus =
    forceOffline || user.preferences?.lastSeen === false ? 'offline' : user.status || 'online';
  const safeStatusMessage = (user.statusMessage || '').slice(0, 120);

  await Promise.allSettled(
    chatIds.map((chatId) =>
      updateDoc(doc(db, 'chats', chatId, 'members', user.id), {
        name: safeName,
        username: safeUsername,
        avatar: safeAvatar,
        bio: safeBio,
        status: safeStatus,
        statusMessage: safeStatusMessage,
        lastActiveAt: serverTimestamp(),
      })
    )
  );
}

