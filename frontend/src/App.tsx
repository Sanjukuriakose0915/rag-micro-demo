import { useState, useRef, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Loader2 } from 'lucide-react';
import type { Message, ChatSession } from './types';
import { Sidebar } from './components/Sidebar';
import { ChatHeader } from './components/ChatHeader';
import { ChatMessageItem, ChatLoadingIndicator } from './components/ChatMessageItem';
import { NewConversationHero } from './components/NewConversationHero';
import { ChatInput } from './components/ChatInput';

function App() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [currentDocuments, setCurrentDocuments] = useState<string[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingHistory, setIsFetchingHistory] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const refreshSessions = useCallback(async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/v1/chat/sessions');
      if (response.data?.sessions) {
        setSessions(response.data.sessions);
      }
    } catch (error) {
      console.error('Failed to load chat sessions:', error);
    }
  }, []);

  // On page mount / reload: load sessions, leave main screen on fresh New Conversation
  useEffect(() => {
    let isMounted = true;
    axios
      .get('http://localhost:8000/api/v1/chat/sessions')
      .then((response) => {
        if (isMounted && response.data?.sessions) {
          setSessions(response.data.sessions);
        }
      })
      .catch((error) => {
        console.error('Failed to load chat sessions:', error);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Switch to an existing conversation
  const handleSelectSession = async (sessionId: string) => {
    if (sessionId === currentSessionId || isLoading) return;
    setIsFetchingHistory(true);
    try {
      const response = await axios.get(`http://localhost:8000/api/v1/chat/history?session_id=${sessionId}`);
      if (response.data) {
        setMessages(
          (response.data.messages || []).map((m: { role: 'user' | 'bot'; content: string }) => ({
            role: m.role,
            content: m.content,
          }))
        );
        setCurrentDocuments(response.data.documents || []);
        setCurrentSessionId(sessionId);
      }
    } catch (error) {
      console.error('Failed to load conversation history:', error);
    } finally {
      setIsFetchingHistory(false);
    }
  };

  // Start fresh conversation with 0 documents
  const handleStartNewChat = () => {
    if (isLoading) return;
    setCurrentSessionId(null);
    setCurrentDocuments([]);
    setMessages([]);
    setInput('');
  };

  // Delete a specific conversation session
  const handleDeleteSession = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    if (!window.confirm('Delete this conversation and its indexed documents?')) return;

    setDeletingId(sessionId);
    try {
      await axios.delete(`http://localhost:8000/api/v1/chat/history?session_id=${sessionId}`);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (currentSessionId === sessionId) {
        handleStartNewChat();
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
    } finally {
      setDeletingId(null);
    }
  };

  // Trigger file picker
  const handleTriggerUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  // Upload a PDF file to the current session (or start a new session)
  const uploadFile = async (file: File) => {
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      alert('Please upload a valid PDF document.');
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    if (currentSessionId) {
      formData.append('session_id', currentSessionId);
    }

    try {
      const response = await axios.post('http://localhost:8000/api/v1/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const { session_id, filename } = response.data;

      if (!currentSessionId && session_id) {
        setCurrentSessionId(session_id);
      }

      setCurrentDocuments((prev) => (prev.includes(filename) ? prev : [...prev, filename]));

      if (messages.length > 0) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'bot',
            content: `Document "${filename}" has been indexed into this conversation! You can now query it.`,
          },
        ]);
      }

      refreshSessions();
    } catch (error) {
      console.error(error);
      alert('Error vectorizing document. Ensure ChromaDB container and backend are running.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadFile(file);
    }
  };

  // Submit natural language query
  const handleChat = async (e?: React.FormEvent, promptOverride?: string) => {
    if (e) e.preventDefault();
    const queryToSend = (promptOverride || input).trim();
    if (!queryToSend || isLoading) return;

    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: queryToSend }]);
    setIsLoading(true);

    try {
      const payload: { query: string; session_id?: string } = {
        query: queryToSend,
      };
      if (currentSessionId) {
        payload.session_id = currentSessionId;
      }

      const response = await axios.post('http://localhost:8000/api/v1/chat', payload);
      const { answer, session_id: newSessionId } = response.data;

      setMessages((prev) => [...prev, { role: 'bot', content: answer }]);

      if (!currentSessionId && newSessionId) {
        setCurrentSessionId(newSessionId);
        refreshSessions();
      }
    } catch (error) {
      console.error(error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'bot',
          content: 'An error occurred while communicating with the AI service. Please verify your connection.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const activeSessionTitle = sessions.find((s) => s.id === currentSessionId)?.title || 'Current Conversation';
  const hasDocuments = currentDocuments.length > 0;

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-800 antialiased overflow-hidden">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".pdf"
        onChange={handleFileInputChange}
        disabled={isUploading}
      />

      {/* ================= LEFT SIDEBAR ================= */}
      <Sidebar
        sessions={sessions}
        currentSessionId={currentSessionId}
        isLoading={isLoading}
        deletingId={deletingId}
        onSelectSession={handleSelectSession}
        onStartNewChat={handleStartNewChat}
        onDeleteSession={handleDeleteSession}
        isOpen={sidebarOpen}
        onCloseMobile={() => setSidebarOpen(false)}
      />

      {/* Backdrop for mobile sidebar */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-20 bg-slate-900/40 backdrop-blur-xs lg:hidden transition-opacity"
        />
      )}

      {/* ================= MAIN CHAT WORKSPACE ================= */}
      <main className="flex-1 flex flex-col bg-slate-50 h-screen overflow-hidden min-w-0">
        {/* Header Bar */}
        <ChatHeader
          currentSessionId={currentSessionId}
          activeSessionTitle={activeSessionTitle}
          currentDocuments={currentDocuments}
          isUploading={isUploading}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
          onTriggerUpload={handleTriggerUpload}
          onDeleteCurrentSession={() => {
            if (currentSessionId) {
              handleDeleteSession({ stopPropagation: () => {} } as React.MouseEvent, currentSessionId);
            }
          }}
        />

        {/* Message Stream or Zero-State Hero */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          {isFetchingHistory ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-3" />
              <p className="text-sm font-medium text-slate-600">Loading conversation history...</p>
            </div>
          ) : messages.length === 0 ? (
            <NewConversationHero
              currentDocuments={currentDocuments}
              isUploading={isUploading}
              isLoading={isLoading}
              onTriggerUpload={handleTriggerUpload}
              onSelectPrompt={(p) => handleChat(undefined, p)}
              onFileDrop={uploadFile}
            />
          ) : (
            <div className="max-w-3xl mx-auto space-y-6">
              {messages.map((msg, idx) => (
                <ChatMessageItem key={idx} message={msg} />
              ))}
              {isLoading && <ChatLoadingIndicator />}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Chat Input */}
        <ChatInput
          input={input}
          setInput={setInput}
          onSubmit={(e) => handleChat(e)}
          isLoading={isLoading}
          isUploading={isUploading}
          hasDocuments={hasDocuments}
          currentDocuments={currentDocuments}
          onTriggerUpload={handleTriggerUpload}
        />
      </main>
    </div>
  );
}

export default App;
