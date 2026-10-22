export interface KnowledgeEntry {
  id: string;
  title: string;
  content: string;
  tags: string[];
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface UpsertKnowledgeInput {
  id?: string;
  title: string;
  content: string;
  tags: string[];
}
