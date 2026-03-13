package com.maxro.maxro_backend.dto.ai;

public record AiChatAttachmentRequest(
        String fileName,
        String mimeType,
        String base64Data
) {
}