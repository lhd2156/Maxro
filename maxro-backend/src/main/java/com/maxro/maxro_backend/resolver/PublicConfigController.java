package com.maxro.maxro_backend.resolver;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/public-config")
public class PublicConfigController {

    private final String googleClientId;
    private final String spotifyClientId;

    public PublicConfigController(
            @Value("${maxro.google.client-id:}") String googleClientId,
            @Value("${maxro.spotify.client-id:}") String spotifyClientId
    ) {
        this.googleClientId = normalize(googleClientId);
        this.spotifyClientId = normalize(spotifyClientId);
    }

    @GetMapping
    public PublicClientConfigResponse getPublicConfig() {
        return new PublicClientConfigResponse(googleClientId, spotifyClientId);
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim();
    }

    public record PublicClientConfigResponse(String googleClientId, String spotifyClientId) {
    }
}