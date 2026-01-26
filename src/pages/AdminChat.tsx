import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageSquare, Send, Search, User } from 'lucide-react';
import { apiCall } from '@/lib/api';

const AdminChat = () => {
    const { user } = useAuth();
    const [users, setUsers] = useState<any[]>([]);
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchUsers();
        // Poll for new users/messages every 10s
        const interval = setInterval(fetchUsers, 10000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (selectedUser) {
            fetchMessages(selectedUser.id);
            // Poll active conversation every 3s
            const interval = setInterval(() => fetchMessages(selectedUser.id), 3000);
            return () => clearInterval(interval);
        }
    }, [selectedUser]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const fetchUsers = async () => {
        try {
            const data = await apiCall('/chat/users');
            if (Array.isArray(data)) {
                setUsers(data);
            }
        } catch (error) {
            console.error('Error fetching chat users:', error);
        }
    };

    const fetchMessages = async (userId: number) => {
        try {
            const data = await apiCall(`/chat/history/${userId}`);
            if (Array.isArray(data)) {
                setMessages(data);
            }
        } catch (error) {
            console.error('Error fetching messages:', error);
        }
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedUser) return;

        try {
            await apiCall('/chat/send', {
                method: 'POST',
                body: JSON.stringify({
                    senderId: user?.id, // Admin ID
                    receiverId: selectedUser.id,
                    message: newMessage,
                    isAdminMessage: true
                })
            });
            setNewMessage('');
            fetchMessages(selectedUser.id);
        } catch (error) {
            console.error('Error sending message:', error);
        }
    };

    return (
        <div className="flex h-[calc(100vh-100px)] gap-4">
            {/* Users Sidebar */}
            <Card className="w-1/3 glass-card overflow-hidden flex flex-col">
                <CardHeader className="bg-primary/5 pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <MessageSquare className="w-5 h-5" /> Conversations
                    </CardTitle>
                    <div className="relative mt-2">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Search users..." className="pl-8 bg-background/50" />
                    </div>
                </CardHeader>
                <CardContent className="p-0 flex-1 overflow-hidden">
                    <ScrollArea className="h-full">
                        {users.length === 0 ? (
                            <div className="p-4 text-center text-muted-foreground">No active chats</div>
                        ) : (
                            users.map((u) => (
                                <div
                                    key={u.id}
                                    onClick={() => setSelectedUser(u)}
                                    className={`p-4 flex items-center gap-3 cursor-pointer hover:bg-primary/5 transition-colors border-b border-border/50 ${selectedUser?.id === u.id ? 'bg-primary/10 border-l-4 border-l-primary' : ''}`}
                                >
                                    <Avatar>
                                        <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${u.full_name}`} />
                                        <AvatarFallback><User /></AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 overflow-hidden">
                                        <h4 className="font-medium text-sm truncate">{u.full_name}</h4>
                                        <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </ScrollArea>
                </CardContent>
            </Card>

            {/* Chat Area */}
            <Card className="flex-1 glass-card flex flex-col overflow-hidden">
                {selectedUser ? (
                    <>
                        <CardHeader className="bg-primary/5 py-3 border-b border-border/50">
                            <div className="flex items-center gap-3">
                                <Avatar>
                                    <AvatarFallback>{selectedUser.full_name[0]}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <CardTitle className="text-base">{selectedUser.full_name}</CardTitle>
                                    <p className="text-xs text-muted-foreground">User ID: {selectedUser.id}</p>
                                </div>
                            </div>
                        </CardHeader>
                        <div className="flex-1 overflow-y-auto p-4 bg-background/50 space-y-4">
                            {messages.map((msg, idx) => (
                                <div
                                    key={idx}
                                    className={`flex ${msg.is_admin_message ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div
                                        className={`max-w-[70%] rounded-2xl px-4 py-2 shadow-sm ${msg.is_admin_message
                                                ? 'bg-primary text-primary-foreground rounded-br-none'
                                                : 'bg-white dark:bg-zinc-800 border border-border rounded-bl-none'
                                            }`}
                                    >
                                        <p className="text-sm">{msg.message}</p>
                                        <span className="text-[10px] opacity-70 block mt-1 text-right">
                                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>
                        <div className="p-4 bg-background/80 backdrop-blur border-t border-border">
                            <form onSubmit={handleSend} className="flex gap-2">
                                <Input
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder="Type your reply..."
                                    className="flex-1"
                                />
                                <Button type="submit">
                                    <Send className="w-4 h-4 mr-2" /> Send
                                </Button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground bg-muted/20">
                        <MessageSquare className="w-16 h-16 mb-4 opacity-20" />
                        <p>Select a user to start chatting</p>
                    </div>
                )}
            </Card>
        </div>
    );
};

export default AdminChat;
