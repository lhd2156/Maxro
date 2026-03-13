package com.maxro.maxro_backend.dto.ai;

import java.util.List;

public record AiChatRequest(
        String message,
        List<AiChatMessageRequest> history,
        List<AiChatAttachmentRequest> attachments,
        AiChatContextRequest context
) {
}