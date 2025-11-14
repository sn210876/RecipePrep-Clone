import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/button';
import { ArrowLeft, Send as SendIcon, UserPlus, Search, X, Check, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';

interface Conversation {
  id: string;
  user1_id: string;
  user2_id: string;
  updated_at: string;
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
  const [showStartChat, setShowStartChat] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [groupName, setGroupName] = useState('');
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);

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

  const searchUsers = async (query: string) => {
    if (!query.trim() || !currentUserId) {
      setSearchResults([]);
      return;
    }

    setSearchingUsers(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .ilike('username', `%${query}%`)
        .neq('id', currentUserId)
        .limit(10);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error('Error searching users:', error);
      setSearchResults([]);
    } finally {
      setSearchingUsers(false);
    }
  };

  const handleStartChatWithUser = async (userId: string, username: string) => {
    if (!currentUserId) return;

    setShowStartChat(false);
    setSearchQuery('');
    setSearchResults([]);
    setSelectedUsers(new Set());
    setGroupName('');

    await startConversation(userId, username, currentUserId);
  };

  const handleToggleUserSelection = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      if (newSelected.size >= 100) {
        toast.error('Maximum 100 participants allowed');
        return;
      }
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const handleCreateGroupChat = async () => {
    if (!currentUserId || selectedUsers.size === 0) return;

    if (selectedUsers.size === 1 && !groupName) {
      const userId = Array.from(selectedUsers)[0];
      const user = searchResults.find(u => u.id === userId);
      if (user) {
        await handleStartChatWithUser(userId, user.username);
      }
      return;
    }

    setIsCreatingGroup(true);
    try {
      const { data: newConvo, error: convoError } = await supabase
        .from('conversations')
        .insert({
          is_group: true,
          group_name: groupName.trim() || `Group (${selectedUsers.size + 1})`,
          created_by: currentUserId,
        })
        .select()
        .single();

      if (convoError) throw convoError;

      const participants = [
        { conversation_id: newConvo.id, user_id: currentUserId },
        ...Array.from(selectedUsers).map(userId => ({
          conversation_id: newConvo.id,
          user_id: userId,
        })),
      ];

      const { error: participantsError } = await supabase
        .from('conversation_participants')
        .insert(participants);

      if (participantsError) throw participantsError;

      toast.success('Group chat created!');
      setShowStartChat(false);
      setSearchQuery('');
      setSearchResults([]);
      setSelectedUsers(new Set());
      setGroupName('');

      await loadConversations(currentUserId);
    } catch (error) {
      console.error('Error creating group chat:', error);
      toast.error('Failed to create group chat');
    } finally {
      setIsCreatingGroup(false);
    }
  };

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
      .order('updated_at', { ascending: false });

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
          .from('messages')
          .select('content, created_at')
          .eq('conversation_id', convo.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        const { count: unreadCount } = await supabase
          .from('messages')
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

    const [smaller, larger] = [activeUserId, otherUserId].sort();

    let { data: existingConvo } = await supabase
      .from('conversations')
      .select('*')
      .eq('user1_id', smaller)
      .eq('user2_id', larger)
      .maybeSingle();

    if (!existingConvo) {
      const { data: newConvo, error } = await supabase
        .from('conversations')
        .insert({
          user1_id: smaller,
          user2_id: larger,
        })
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
      .from('messages')
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
      .from('messages')
      .update({ read: true })
      .eq('conversation_id', conversationId)
      .neq('sender_id', currentUserId)
      .eq('read', false);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !currentUserId) return;

    const { error: msgError } = await supabase
      .from('messages')
      .insert({
        conversation_id: selectedConversation.id,
        sender_id: currentUserId,
        content: newMessage.trim(),
        read: false,
      })
      .select();

    if (msgError) {
      console.error('Error sending message:', msgError);
      console.error('Message details:', {
        conversation_id: selectedConversation.id,
        sender_id: currentUserId,
        content: newMessage.trim(),
      });
      toast.error(`Failed to send message: ${msgError.message}`);
      return;
    }

    await supabase
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', selectedConversation.id);

    setNewMessage('');
    loadMessages(selectedConversation.id);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (selectedConversation) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col pb-20">
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3">
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
              className="p-2 hover:bg-gray-100 rounded-full"
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
                  selectedConversation.other_user.username[0]?.toUpperCase()
                )}
              </div>
              <div className="font-semibold">{selectedConversation.other_user.username}</div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex group ${msg.sender_id === currentUserId ? 'justify-end' : 'justify-start'}`}
            >
              <div className="relative max-w-[70%]">
                <div
                  className={`rounded-2xl px-4 py-2 inline-block ${
                    msg.sender_id === currentUserId
                      ? 'bg-orange-500 text-white'
                      : 'bg-white border border-gray-200'
                  }`}
                >
                  <p className="text-sm break-words">{msg.content}</p>
                  <p className={`text-xs mt-1 ${msg.sender_id === currentUserId ? 'text-orange-100' : 'text-gray-400'}`}>
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                {msg.sender_id === currentUserId && (
                  <button
                    onClick={async () => {
                      await supabase.from('messages').delete().eq('id', msg.id);
                      loadMessages(selectedConversation.id);
                    }}
                    className="ml-2 opacity-0 group-hover:opacity-100 text-xs text-red-500 hover:text-red-700 transition-opacity"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className="sticky bottom-20 bg-white border-t border-gray-200 p-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Type a message..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <Button
              onClick={sendMessage}
              disabled={!newMessage.trim()}
              className="bg-orange-500 hover:bg-orange-600 rounded-full px-6"
            >
              <SendIcon className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold">Messages</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setShowStartChat(true)}
              size="sm"
              className="bg-orange-500 hover:bg-orange-600"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Start Chat
            </Button>
            <button
              onClick={onBack}
              className="text-sm text-cyan-600 hover:text-cyan-700 font-medium"
            >
              Back to Feed
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto">
        {conversations.length === 0 ? (
          <div className="text-center py-12 px-4">
            <p className="text-gray-500 mb-2">No messages yet</p>
            <p className="text-sm text-gray-400">Start a conversation by visiting a user's profile</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {conversations.map((convo) => (
              <button
                key={convo.id}
                onClick={() => setSelectedConversation(convo)}
                className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-red-400 flex items-center justify-center text-white font-semibold overflow-hidden">
                    {convo.other_user.avatar_url ? (
                      <img
                        src={convo.other_user.avatar_url}
                        alt={convo.other_user.username}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      convo.other_user.username[0]?.toUpperCase()
                    )}
                  </div>
                  {convo.unread_count > 0 && (
                    <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-semibold">
                      {convo.unread_count}
                    </div>
                  )}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <div className="font-semibold">{convo.other_user.username}</div>
                  {convo.last_message && (
                    <p className="text-sm text-gray-500 truncate">{convo.last_message.content}</p>
                  )}
                </div>
                <div className="text-xs text-gray-400">
                  {new Date(convo.updated_at).toLocaleDateString()}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <Dialog open={showStartChat} onOpenChange={setShowStartChat}>
        <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Start a New Chat</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedUsers.size > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Users className="w-4 h-4" />
                  <span>{selectedUsers.size} user{selectedUsers.size !== 1 ? 's' : ''} selected (max 100)</span>
                </div>
                {selectedUsers.size > 1 && (
                  <input
                    type="text"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="Group name (optional)"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                )}
              </div>
            )}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  searchUsers(e.target.value);
                }}
                placeholder="Search users..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSearchResults([]);
                  }}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2"
                >
                  <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                </button>
              )}
            </div>

            {searchingUsers && (
              <div className="text-center py-4 text-gray-500">Searching...</div>
            )}

            {!searchingUsers && searchResults.length > 0 && (
              <>
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {searchResults.map((user) => {
                    const isSelected = selectedUsers.has(user.id);
                    return (
                      <button
                        key={user.id}
                        onClick={() => handleToggleUserSelection(user.id)}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                          isSelected ? 'bg-orange-50 border-2 border-orange-500' : 'hover:bg-gray-50 border-2 border-transparent'
                        }`}
                      >
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-red-400 flex items-center justify-center text-white font-semibold overflow-hidden">
                          {user.avatar_url ? (
                            <img
                              src={user.avatar_url}
                              alt={user.username}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            user.username[0]?.toUpperCase()
                          )}
                        </div>
                        <div className="flex-1 text-left">
                          <div className="font-semibold">{user.username}</div>
                        </div>
                        {isSelected && (
                          <Check className="w-5 h-5 text-orange-600" />
                        )}
                      </button>
                    );
                  })}
                </div>
                {selectedUsers.size > 0 && (
                  <Button
                    onClick={handleCreateGroupChat}
                    disabled={isCreatingGroup}
                    className="w-full bg-orange-500 hover:bg-orange-600"
                  >
                    {isCreatingGroup ? 'Creating...' : `Start Chat (${selectedUsers.size})`}
                  </Button>
                )}
              </>
            )}

            {!searchingUsers && searchQuery && searchResults.length === 0 && (
              <div className="text-center py-4 text-gray-500">No users found</div>
            )}

            {!searchQuery && (
              <div className="text-center py-4 text-gray-400 text-sm">
                Type to search for users. Select multiple to create a group chat.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
