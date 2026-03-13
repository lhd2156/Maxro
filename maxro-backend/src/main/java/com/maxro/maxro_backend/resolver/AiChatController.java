package com.maxro.maxro_backend.resolver;

import com.maxro.maxro_backend.dto.ai.AiChatRequest;
import com.maxro.maxro_backend.dto.ai.AiChatResponse;
import com.maxro.maxro_backend.model.User;
import com.maxro.maxro_backend.security.SecurityContextHelper;
import com.maxro.maxro_backend.service.AiChatService;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/ai")
public class AiChatController {

    private final AiChatService aiChatService;
    private final SecurityContextHelper securityContextHelper;

    public AiChatController(AiChatService aiChatService,
                            SecurityContextHelper securityContextHelper) {
        this.aiChatService = aiChatService;
        this.securityContextHelper = securityContextHelper;
    }

    @PostMapping("/chat")
    public AiChatResponse chat(@RequestBody AiChatRequest request) {
        User user = securityContextHelper.getCurrentUser();
        return aiChatService.reply(user, request);
    }
}