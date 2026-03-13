package com.maxro.maxro_backend.service;

import com.maxro.maxro_backend.dto.ai.AiChatRequest;
import com.maxro.maxro_backend.dto.ai.AiChatResponse;
import com.maxro.maxro_backend.model.User;

public interface AiChatService {

    AiChatResponse reply(User user, AiChatRequest request);
}