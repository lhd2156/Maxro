export interface AiChatHistoryMessage {
  role: 'user' | 'assistant';
  text: string;
}

export interface AiChatAttachmentPayload {
  fileName: string;
  mimeType: string;
  base64Data: string;
}

export interface AiChatContext {
  route: string;
  pageTitle: string;
  appSnapshot: string;
}

export interface AiChatRequest {
  message: string;
  history: AiChatHistoryMessage[];
  attachments: AiChatAttachmentPayload[];
  context: AiChatContext;
}

export interface AiChatResponse {
  message: string;
}
