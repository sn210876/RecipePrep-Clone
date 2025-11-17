import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/button';
import { ArrowLeft, Send as SendIcon } from 'lucide-react';
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const init = async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        setCurrentUserId(userData.user.id);
        await markMessageNotificationsAsRead(userData.user.id);
        if (recipientUserId && recipientUsername) {
          await startConversation(recipientUserId, recipientUsername, userData.user.id);
        } else {
          await loadConversations(userData.user.id);
        }
      }
      setLoading(false);
    };
    init();
  }, [recipientUserId]);

  const markMessageNotificationsAsRead = async (userId: string) => {
    try {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', userId)
        .eq('type', 'message')
        .eq('read', false);
    } catch (error) {
      console.error('Error marking notifications as read:', error);
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
      loadMessages(selectedConversation.id);
      markAsRead(selectedConversation.id);
    }
  }, [selectedConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadConversations = async (userId: string) => {
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
    if (!currentUserId) return;
    await supabase
      .from('direct_messages')
      .update({ read: true })
      .eq('conversation_id', conversationId)
      .neq('sender_id', currentUserId)
      .eq('read', false);
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
        {/* FIXED CHAT HEADER */}
        <div className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setSelectedConversation(null);
                setMessages([]);
                if (onBack && recipientUserId) {
                  onBack();
                } else if (currentUserId) {
                  loadConversations(currentUserId);
                }
              }}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 flex-1">
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

       {/* Messages Area - starts below fixed header */}
<div className="pt-16 flex-1 overflow-y-auto px-4 pb-[88px]">
  <div className="space-y-1 py-4">
    {messages.map((message) => (
      <div
  key={message.id}
  className="flex justify-end"
>
        <div
  className={`w-48 rounded-2xl px-4 py-2 ${
    message.sender_id === currentUserId
      ? 'bg-orange-500 text-white'
      : 'bg-gray-200 text-gray-900'
  }`}
>
  <p className="whitespace-pre-wrap break-words text-sm leading-tight">{message.content}</p>
  <span className="text-xs opacity-70 mt-1 block">
    {new Date(message.created_at).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })}
  </span>
</div>
      </div>
    ))}
    <div ref={messagesEndRef} />
  </div>
</div>

     {/* CENTERED FULL-WIDTH INPUT BAR */}
<div className="fixed bottom-20 left-5 right-auto w-80 bg-white border-t border-gray-200 px-4 py-3 z-50">




  <div className="flex gap-2">
    <input
      type="text"
      value={newMessage}
      onChange={(e) => setNewMessage(e.target.value)}
      onKeyPress={handleKeyPress}
      placeholder="Type a message..."
      className="w-[80%] px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-orange-500"

    />
    <Button
      onClick={sendMessage}
      disabled={!newMessage.trim()}
      className="rounded-full bg-orange-500 hover:bg-orange-600 text-white px-6"
    >
      <SendIcon className="w-5 h-5" />
    </Button>
  </div>
</div>

      </div>
    );
  }

  // CONVERSATION LIST — FIXED HEADER WITH "Social Feed"
  return (
    <div className="min-h-screen bg-gray-50">
      {/* FIXED TOP BAR */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <h1 className="text-xl font-bold">
            {onBack ? 'Social Feed' : 'Messages'}
          </h1>
        </div>
      </div>

      {/* Scrollable Conversations List */}
      <div className="pt-16 pb-20 px-4">
        {conversations.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">No conversations yet</p>
            <p className="text-sm text-gray-400">Start a conversation from a user's profile</p>
          </div>
        ) : (
          <div className="space-y-2">
            {conversations.map((convo) => (
              <button
                key={convo.id}
                onClick={() => setSelectedConversation(convo)}
                className="w-full flex items-center gap-3 p-3 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-red-400 flex items-center justify-center text-white font-semibold flex-shrink-0 overflow-hidden">
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