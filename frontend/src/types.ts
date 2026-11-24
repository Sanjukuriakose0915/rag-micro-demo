export interface Message {
  role: 'user' | 'bot';
  content: string;
}

export interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
  documents: string[];
}
