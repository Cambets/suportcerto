export interface Thread {
  id: string;
  title: string;
  updated_at: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
}

export interface ThreadDetail extends Thread {
  messages: Message[];
}
