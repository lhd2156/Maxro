package com.maxro.maxro_backend.dto.ai;

public record AiChatContextRequest(
        String route,
        String pageTitle,
        String appSnapshot
) {
}