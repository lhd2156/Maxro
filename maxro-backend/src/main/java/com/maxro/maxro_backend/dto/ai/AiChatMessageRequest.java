package com.maxro.maxro_backend.dto.ai;

public record AiChatMessageRequest(
        String role,
        String text
) {
}