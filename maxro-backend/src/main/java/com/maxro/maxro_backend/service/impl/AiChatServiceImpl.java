package com.maxro.maxro_backend.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.maxro.maxro_backend.dto.ai.AiChatAttachmentRequest;
import com.maxro.maxro_backend.dto.ai.AiChatContextRequest;
import com.maxro.maxro_backend.dto.ai.AiChatMessageRequest;
import com.maxro.maxro_backend.dto.ai.AiChatRequest;
import com.maxro.maxro_backend.dto.ai.AiChatResponse;
import com.maxro.maxro_backend.model.User;
import com.maxro.maxro_backend.service.AiChatService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;
import java.util.Locale;

import static org.springframework.http.HttpStatus.BAD_GATEWAY;
import static org.springframework.http.HttpStatus.BAD_REQUEST;
import static org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE;

@Service
public class AiChatServiceImpl implements AiChatService {

    private static final int MAX_HISTORY_MESSAGES = 12;
    private static final int MAX_ATTACHMENTS = 3;
    private static final int MAX_ATTACHMENT_BASE64_LENGTH = 7_000_000;
    private static final String DEFAULT_IMAGE_PROMPT = "Help with this image in a fitness or Maxro app-support context.";

    private final String apiKey;
    private final String model;
    private final WebClient webClient;
    private final ObjectMapper objectMapper;

    public AiChatServiceImpl(
            @Value("${maxro.google-ai.api-key:}") String apiKey,
            @Value("${maxro.google-ai.base-url:https://generativelanguage.googleapis.com/v1beta}") String baseUrl,
            @Value("${maxro.google-ai.model:gemini-2.5-flash}") String model,
            ObjectMapper objectMapper
    ) {
        this.apiKey = apiKey;
        this.model = model;
        this.webClient = WebClient.builder()
                .baseUrl(baseUrl)
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .build();
        this.objectMapper = objectMapper;
    }

    @Override
    public AiChatResponse reply(User user, AiChatRequest request) {
        validateConfiguration();
        validateRequest(request);

        ObjectNode payload = objectMapper.createObjectNode();
        payload.set("system_instruction", buildSystemInstruction(user));
        payload.set("contents", buildContents(request));

        ObjectNode generationConfig = payload.putObject("generationConfig");
        generationConfig.put("temperature", 0.35);
        generationConfig.put("topP", 0.9);
        generationConfig.put("maxOutputTokens", 700);

        JsonNode response;
        try {
            response = webClient.post()
                    .uri(uriBuilder -> uriBuilder.path("/models/{model}:generateContent").build(model))
                    .header("x-goog-api-key", apiKey)
                    .bodyValue(payload)
                    .retrieve()
                    .bodyToMono(JsonNode.class)
                    .block();
        } catch (WebClientResponseException ex) {
            String reason = ex.getResponseBodyAsString();
            if (reason == null || reason.isBlank()) {
                reason = ex.getStatusText();
            }
            throw new ResponseStatusException(BAD_GATEWAY, "Google AI request failed: " + reason, ex);
        } catch (Exception ex) {
            throw new ResponseStatusException(BAD_GATEWAY, "Google AI request failed", ex);
        }

        String message = extractResponseText(response);
        if (message == null || message.isBlank()) {
            throw new ResponseStatusException(BAD_GATEWAY, "Google AI did not return a message");
        }

        return new AiChatResponse(message.trim());
    }

    private void validateConfiguration() {
        if (apiKey == null || apiKey.isBlank()) {
            throw new ResponseStatusException(SERVICE_UNAVAILABLE, "Google AI chat is not configured");
        }
    }

    private void validateRequest(AiChatRequest request) {
        if (request == null) {
            throw new ResponseStatusException(BAD_REQUEST, "Chat request is required");
        }

        String trimmedMessage = trimToNull(request.message());
        boolean hasAttachments = request.attachments() != null && !request.attachments().isEmpty();
        if (trimmedMessage == null && !hasAttachments) {
            throw new ResponseStatusException(BAD_REQUEST, "Message or image is required");
        }

        if (request.attachments() != null && request.attachments().size() > MAX_ATTACHMENTS) {
            throw new ResponseStatusException(BAD_REQUEST, "You can send up to 3 images at a time");
        }

        if (request.attachments() != null) {
            for (AiChatAttachmentRequest attachment : request.attachments()) {
                validateAttachment(attachment);
            }
        }
    }

    private void validateAttachment(AiChatAttachmentRequest attachment) {
        if (attachment == null) {
            throw new ResponseStatusException(BAD_REQUEST, "Image attachment is invalid");
        }

        String mimeType = trimToNull(attachment.mimeType());
        String data = trimToNull(attachment.base64Data());
        if (mimeType == null || !mimeType.toLowerCase(Locale.ROOT).startsWith("image/")) {
            throw new ResponseStatusException(BAD_REQUEST, "Only image attachments are supported");
        }
        if (data == null) {
            throw new ResponseStatusException(BAD_REQUEST, "Image data is required");
        }
        if (data.length() > MAX_ATTACHMENT_BASE64_LENGTH) {
            throw new ResponseStatusException(BAD_REQUEST, "One of the images is too large");
        }
    }

    private ObjectNode buildSystemInstruction(User user) {
        String displayName = trimToNull(user.getFirstName()) != null
                ? user.getFirstName().trim()
                : trimToNull(user.getDisplayName());
        String goal = trimToNull(user.getFitnessGoal());

        StringBuilder prompt = new StringBuilder("""
                You are Maxro's in-app fitness assistant chatbot.
                Your job is to help users with:
                - workouts, training, PRs, strength progress, programming, recovery, mobility, cardio, and wellness
                - nutrition, calories, macros, hydration, food logging, and healthy habits
                - how to use Maxro, where features live, and what to do inside the app

                Tone rules:
                - neutral, direct, and clear
                - supportive, but not overhyped
                - concise unless the user asks for more detail

                Guardrails:
                - only help with fitness, health, wellness, PR progress, or using Maxro
                - if the user asks for something unrelated, politely say you can only help with fitness, wellness, PR progress, or Maxro app questions
                - never invent medical diagnoses
                - for injuries, symptoms, or medical conditions, recommend talking to a doctor or qualified clinician
                - if the user asks where something is in Maxro, answer with clear navigation guidance using these sections: Dashboard, Workouts, PRs, Nutrition, Water, Analytics, Settings
                - remember the conversation history and refer back to it when helpful
                - if the user shares an image, use it only for fitness, nutrition, recovery, or Maxro support help
                - do not identify people or make medical judgments from images
                - use plain text and avoid raw markdown markers like **bold** in your replies
                """);

        prompt.append("\nToday is ").append(LocalDate.now()).append('.');
        if (displayName != null) {
            prompt.append("\nThe user's first name is ").append(displayName).append('.');
        }
        if (goal != null) {
            prompt.append("\nTheir stored fitness goal is: ").append(goal).append('.');
        }

        ObjectNode systemInstruction = objectMapper.createObjectNode();
        ArrayNode parts = systemInstruction.putArray("parts");
        parts.addObject().put("text", prompt.toString());
        return systemInstruction;
    }

    private ArrayNode buildContents(AiChatRequest request) {
        ArrayNode contents = objectMapper.createArrayNode();

        List<AiChatMessageRequest> history = request.history() == null ? List.of() : request.history();
        int historyStart = Math.max(history.size() - MAX_HISTORY_MESSAGES, 0);
        for (AiChatMessageRequest message : history.subList(historyStart, history.size())) {
            if (message == null) {
                continue;
            }

            String role = normalizeRole(message.role());
            String text = trimToNull(message.text());
            if (role == null || text == null) {
                continue;
            }

            ObjectNode contentNode = contents.addObject();
            contentNode.put("role", role);
            contentNode.putArray("parts").addObject().put("text", text);
        }

        ObjectNode latestUserMessage = contents.addObject();
        latestUserMessage.put("role", "user");
        ArrayNode parts = latestUserMessage.putArray("parts");
        parts.addObject().put("text", buildCurrentPrompt(request));

        if (request.attachments() != null) {
            for (AiChatAttachmentRequest attachment : request.attachments()) {
                parts.addObject()
                        .putObject("inlineData")
                        .put("mimeType", attachment.mimeType().trim())
                        .put("data", attachment.base64Data().trim());
            }
        }

        return contents;
    }

    private String buildCurrentPrompt(AiChatRequest request) {
        String message = trimToNull(request.message());
        StringBuilder prompt = new StringBuilder();

        AiChatContextRequest context = request.context();
        if (context != null) {
            String route = trimToNull(context.route());
            String pageTitle = trimToNull(context.pageTitle());
            String snapshot = trimToNull(context.appSnapshot());

            if (pageTitle != null || route != null || snapshot != null) {
                prompt.append("Maxro app context:\n");
                if (pageTitle != null) {
                    prompt.append("- Page: ").append(pageTitle).append('\n');
                }
                if (route != null) {
                    prompt.append("- Route: ").append(route).append('\n');
                }
                if (snapshot != null) {
                    prompt.append("- Live app snapshot:\n").append(snapshot).append('\n');
                }
                prompt.append('\n');
            }
        }

        prompt.append("User message:\n");
        prompt.append(message != null ? message : DEFAULT_IMAGE_PROMPT);
        return prompt.toString().trim();
    }

    private String extractResponseText(JsonNode response) {
        if (response == null) {
            return null;
        }

        StringBuilder builder = new StringBuilder();
        JsonNode candidates = response.path("candidates");
        if (candidates.isArray()) {
            for (JsonNode candidate : candidates) {
                JsonNode parts = candidate.path("content").path("parts");
                if (!parts.isArray()) {
                    continue;
                }
                for (JsonNode part : parts) {
                    String text = trimToNull(part.path("text").asText(null));
                    if (text != null) {
                        if (!builder.isEmpty()) {
                            builder.append("\n\n");
                        }
                        builder.append(text);
                    }
                }
                if (!builder.isEmpty()) {
                    break;
                }
            }
        }

        return builder.toString();
    }

    private String normalizeRole(String role) {
        String normalized = trimToNull(role);
        if (normalized == null) {
            return null;
        }
        return switch (normalized.toLowerCase(Locale.ROOT)) {
            case "user" -> "user";
            case "assistant", "model" -> "model";
            default -> null;
        };
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
