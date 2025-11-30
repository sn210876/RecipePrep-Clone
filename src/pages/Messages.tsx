import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { ArrowLeft, Send as SendIcon, Search } from 'lucide-react';
import { toast } from 'sonner';

interface Conversation {
  id: string;
  user1_id: string;
  user2_id: string;
  last_message_at: string;
  other_user: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
  last_message?: {
    content: string;
    created_at: string;
  };
  unread_count: number;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  read: boolean;
  created_at: string;
}

interface MessagesProps {
  recipientUserId?: string;
  recipientUsername?: string;
  onBack?: () => void;
}

export function Messages({ recipientUserId, recipientUsername, onBack }: MessagesProps) {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const init = async () => {
      console.log('[Messages] Component initializing');
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        console.log('[Messages] User authenticated:', userData.user.id);
        setCurrentUserId(userData.user.id);
        await markMessageNotificationsAsRead(userData.user.id);
        if (recipientUserId && recipientUsername) {
          console.log('[Messages] Starting conversation with:', recipientUsername);
          await startConversation(recipientUserId, recipientUsername, userData.user.id);
        } else {
          console.log('[Messages] Initial load of conversations');
          await loadConversations(userData.user.id);
        }
      }
      setLoading(false);
    };
    init();
  }, [recipientUserId]);

  const markMessageNotificationsAsRead = async (userId: string) => {
    // Mark message notifications as read (if any exist)
    // This is optional - unread counts are primarily tracked in direct_messages
    try {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', userId)
        .eq('type', 'message')
        .eq('read', false);
      // Silently ignore errors - this is not critical for DM functionality
    } catch (error) {
      // Silently ignore - notifications are supplementary
    }
  };

  useEffect(() => {
    if (!selectedConversation || !currentUserId) return;

    const channel = supabase
      .channel(`messages:${selectedConversation.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
          filter: `conversation_id=eq.${selectedConversation.id}`,
        },
        async (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => {
            const exists = prev.find(m => m.id === newMsg.id);
            if (exists) return prev;
            return [...prev, newMsg];
          });
          if (newMsg.sender_id !== currentUserId) {
            await supabase
              .from('direct_messages')
              .update({ read: true })
              .eq('id', newMsg.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedConversation, currentUserId]);

 useEffect(() => {
  if (selectedConversation) {
    console.log('[Messages] Conversation selected:', selectedConversation.id);

    // Immediately update selected conversation state to remove badge
    setSelectedConversation(prev =>
      prev ? { ...prev, unread_count: 0 } : prev
    );

    // Update conversations list state immediately - badge disappears
    setConversations(prev =>
      prev.map(c =>
        c.id === selectedConversation.id
          ? { ...c, unread_count: 0 }
          : c
      )
    );

    // Load messages
    loadMessages(selectedConversation.id);

    // Mark as read in database (async, fire-and-forget)
    markAsRead(selectedConversation.id);
  }
}, [selectedConversation?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadConversations = async (userId: string) => {
    console.log('[Messages] loadConversations called for userId:', userId);
    const { data: convos, error } = await supabase
      .from('conversations')
      .select('*')
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
      .order('last_message_at', { ascending: false });

    if (error) {
      console.error('Error loading conversations:', error);
      return;
    }

    const conversationsWithUsers = await Promise.all(
      (convos || []).map(async (convo) => {
        const otherUserId = convo.user1_id === userId ? convo.user2_id : convo.user1_id;
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .eq('id', otherUserId)
          .maybeSingle();

        const { data: lastMsg } = await supabase
          .from('direct_messages')
          .select('content, created_at')
          .eq('conversation_id', convo.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        const { count: unreadCount } = await supabase
          .from('direct_messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', convo.id)
          .eq('read', false)
          .neq('sender_id', userId);

        return {
          ...convo,
          other_user: profile || { id: otherUserId, username: 'Unknown', avatar_url: null },
          last_message: lastMsg,
          unread_count: unreadCount || 0,
        };
      })
    );

    setConversations(conversationsWithUsers);
  };

  // Search users
  useEffect(() => {
    const searchUsers = async () => {
      if (!searchQuery.trim() || !currentUserId) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      const { data } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .ilike('username', `%${searchQuery}%`)
        .neq('id', currentUserId)
        .limit(20);

      setSearchResults(data || []);
      setIsSearching(false);
    };

    const timeoutId = setTimeout(searchUsers, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, currentUserId]);

  const startConversation = async (otherUserId: string, username: string, userId?: string) => {
    const activeUserId = userId || currentUserId;
    if (!activeUserId) return;

    const [smaller, larger] = activeUserId < otherUserId ? [activeUserId, otherUserId] : [otherUserId, activeUserId];

    let { data: existingConvo } = await supabase
      .from('conversations')
      .select('*')
      .eq('user1_id', smaller)
      .eq('user2_id', larger)
      .maybeSingle();

    if (!existingConvo) {
      const { data: newConvo, error } = await supabase
        .from('conversations')
        .insert({ user1_id: smaller, user2_id: larger })
        .select()
        .single();

      if (error) {
        console.error('Error creating conversation:', error);
        toast.error('Failed to start conversation');
        return;
      }
      existingConvo = newConvo;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, username, avatar_url')
      .eq('id', otherUserId)
      .maybeSingle();

    setSelectedConversation({
      ...existingConvo,
      other_user: profile || { id: otherUserId, username, avatar_url: null },
      unread_count: 0,
    });
  };

  const loadMessages = async (conversationId: string) => {
    const { data, error } = await supabase
      .from('direct_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading messages:', error);
      return;
    }
    setMessages(data || []);
  };

  const markAsRead = async (conversationId: string) => {
    if (!currentUserId) {
      console.log('[Messages] markAsRead: No currentUserId');
      return;
    }

    console.log('[Messages] Marking messages as read for conversation:', conversationId);
    const { data, error } = await supabase
      .from('direct_messages')
      .update({ read: true })
      .eq('conversation_id', conversationId)
      .neq('sender_id', currentUserId)
      .eq('read', false);

    if (error) {
      console.error('[Messages] Error marking as read:', error);
    } else {
      console.log('[Messages] Successfully marked messages as read:', data);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !currentUserId) return;

    const messageContent = newMessage.trim();
    setNewMessage('');

    const { error, data } = await supabase
      .from('direct_messages')
      .insert({
        conversation_id: selectedConversation.id,
        sender_id: currentUserId,
        content: messageContent,
      })
      .select();

    if (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
      setNewMessage(messageContent);
      return;
    }

    if (data && data[0]) {
      setMessages((prev) => [...prev, data[0]]);
    }

    await supabase
      .from('conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', selectedConversation.id);

    const recipientId = selectedConversation.user1_id === currentUserId
      ? selectedConversation.user2_id
      : selectedConversation.user1_id;

    if (recipientId !== currentUserId) {
      await supabase.from('notifications').insert({
        user_id: recipientId,
        actor_id: currentUserId,
        type: 'message',
        conversation_id: selectedConversation.id,
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const renderMessageContent = (content: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = content.split(urlRegex);

    return parts.map((part, index) => {
      if (part.match(urlRegex)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:opacity-80"
            onClick={(e) => e.stopPropagation()}
          >
            {part}
          </a>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  // *** DELETE MESSAGE ***
 const handleDeleteMessage = async (messageId: string) => {
  if (!currentUserId) return;

  // Optimistic delete
  setMessages(prev => prev.filter(m => m.id !== messageId));

  const { error } = await supabase
    .from('direct_messages')
    .delete()
    .eq('id', messageId)
    .eq('sender_id', currentUserId); // Security: only delete your own

  if (error) {
    console.error('Failed to delete message:', error);
    toast.error('Could not delete message');
    // Optionally re-fetch messages if delete fails
    if (selectedConversation) {
      loadMessages(selectedConversation.id);
    }
  } else {
    toast.success('Message deleted');
  }
};

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center pb-20">
        <div className="text-gray-600">Loading messages...</div>
      </div>
    );
  }

  if (selectedConversation) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* CHAT HEADER */}
        <div className="fixed top-16 left-0 right-0 z-[60] bg-white border-b-2 border-gray-300 shadow-md">
          <div className="max-w-sm lg:max-w-md mx-auto px-3 py-2.5">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                console.log('[Messages] Back button clicked');
                setSelectedConversation(null);
                setMessages([]);
                setSearchQuery('');
                if (onBack && recipientUserId) {
                  onBack();
                }
                // Don't reload conversations - use existing state
                // This prevents race condition where database hasn't updated yet
              }}
              className="p-2.5 hover:bg-gray-100 rounded-lg bg-blue-50 border-2 border-blue-500 shadow-sm active:scale-95 transition-transform"
              aria-label="Back to messages"
            >
              <ArrowLeft className="w-6 h-6 text-blue-600 font-bold" strokeWidth={3} />
            </button>

            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-red-400 flex items-center justify-center text-white font-semibold overflow-hidden">
                {selectedConversation.other_user.avatar_url ? (
                  <img
                    src={selectedConversation.other_user.avatar_url}
                    alt={selectedConversation.other_user.username}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  selectedConversation.other_user.username.charAt(0).toUpperCase()
                )}
              </div>
              <span className="font-semibold">{selectedConversation.other_user.username}</span>
            </div>
          </div>
          </div>
        </div>

        {/* MESSAGES */}
<div className="pt-36 flex-1 overflow-y-auto pb-32 lg:pb-24">
  <div className="max-w-sm lg:max-w-md mx-auto px-4">
  <div className="space-y-4 py-4">
    {messages.map((message) => (
      <div
  key={message.id}
  className={`flex justify-end`}
>
        {/* Message container with hover/long-press support */}
        <div
          className="relative group max-w-[75%]"
          // Mobile: long-press (300ms) shows delete button
          onTouchStart={(e) => {
            if (message.sender_id !== currentUserId) return;
            const timer = setTimeout(() => {
              const target = e.target as HTMLElement;
              target.closest('.group')?.classList.add('show-delete');
            }, 400);
            const end = () => {
              clearTimeout(timer);
              document.removeEventListener('touchend', end);
            };
            document.addEventListener('touchend', end);
          }}
        >
          {/* Message Bubble */}
          <div
            className={`rounded-2xl px-4 py-2.5 text-sm leading-tight break-words shadow-sm ${
              message.sender_id === currentUserId
                ? 'bg-gray-200 text-gray-900'
                : 'bg-orange-500 text-white'
            }`}
          >
            <p className="whitespace-pre-wrap">{renderMessageContent(message.content)}</p>
            <span className="text-xs opacity-70 mt-1 block text-right">
              {new Date(message.created_at).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>

          {/* DELETE BUTTON – Only for YOUR messages */}
          {message.sender_id === currentUserId && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteMessage(message.id);
              }}
              className={`
                absolute -top-3 -right-3 
                w-9 h-9 rounded-full 
                bg-red-500 text-white 
                flex items-center justify-center 
                shadow-lg text-lg
                opacity-0 
                group-hover:opacity-100 
                group-[.show-delete]:opacity-100 
                transition-all duration-200 
                hover:bg-red-600 active:scale-95
                z-10
              `}
            >
              🗑️ 
            </button>
          )}
        </div>
      </div>
    ))}
    <div ref={messagesEndRef} />
  </div>
  </div>
</div>

        {/* INPUT BAR - Fixed footer above bottom nav */}
        <div className="fixed left-0 right-0 py-3 z-[51]" style={{ bottom: '64px' }}>
          <div className="max-w-sm lg:max-w-md mx-auto px-4 flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="flex-1 px-4 py-2.5 bg-white border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm md:text-base opacity-80"
              style={{ backgroundColor: 'rgba(255, 255, 255, 0.8)' }}
            />
            <Button
              onClick={sendMessage}
              disabled={!newMessage.trim()}
              className="rounded-full bg-orange-500 hover:bg-orange-600 text-white px-6 disabled:opacity-50 disabled:cursor-not-allowed opacity-80"
              style={{ opacity: 0.8 }}
            >
              <SendIcon className="w-5 h-5" />
            </Button>
          </div>
        </div>

      </div>
    );
  }

  // CONVERSATION LIST
  return (
    <div className="min-h-screen bg-gray-50">
      {/* TOP BAR */}
      <div className="fixed top-14 sm:top-16 left-0 right-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-sm lg:max-w-md mx-auto">
        <div className="flex items-center gap-3 px-4 py-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <h1 className="text-xl font-bold">
            {onBack ? 'Social Feed' : 'Messages'}
          </h1>
        </div>

        {/* Search Bar */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search users to message..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10 text-sm border-gray-300"
            />
          </div>
        </div>
        </div>
      </div>

      {/* SEARCH RESULTS OR CONVERSATION LIST */}
      <div className="pt-40 sm:pt-44 pb-20 px-4 max-w-sm lg:max-w-md mx-auto">
        {searchQuery.trim() ? (
          // Show search results
          <div className="space-y-2">
            {isSearching ? (
              <div className="text-center py-12">
                <p className="text-gray-500">Searching users...</p>
              </div>
            ) : searchResults.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">No users found</p>
                <p className="text-sm text-gray-400 mt-2">Try a different search term</p>
              </div>
            ) : (
              searchResults.map((user) => (
                <button
                  key={user.id}
                  onClick={() => {
                    setSearchQuery('');
                    startConversation(user.id, user.username);
                  }}
                  className="w-full flex items-center gap-3 p-3 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-red-400 flex items-center justify-center text-white font-semibold overflow-hidden">
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt={user.username} className="w-full h-full object-cover" />
                    ) : (
                      user.username.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <span className="font-semibold">{user.username}</span>
                    <p className="text-sm text-gray-500">Start a conversation</p>
                  </div>
                </button>
              ))
            )}
          </div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">No conversations yet</p>
            <p className="text-sm text-gray-400">Search for users above to start messaging</p>
          </div>
        ) : (
          <div className="space-y-2">
            {conversations.map((convo) => (
              <button
                key={convo.id}
                onClick={() => setSelectedConversation(convo)}
                className="w-full flex items-center gap-3 p-3 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-red-400 flex items-center justify-center text-white font-semibold overflow-hidden">
                  {convo.other_user.avatar_url ? (
                    <img
                      src={convo.other_user.avatar_url}
                      alt={convo.other_user.username}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    convo.other_user.username.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold truncate">{convo.other_user.username}</span>
                    {convo.last_message && (
                      <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                        {new Date(convo.last_message.created_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  {convo.last_message && (
                    <p className="text-sm text-gray-600 truncate">{convo.last_message.content}</p>
                  )}
                  {convo.unread_count > 0 && (
                    <span className="inline-block mt-1 bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full">
                      {convo.unread_count}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
