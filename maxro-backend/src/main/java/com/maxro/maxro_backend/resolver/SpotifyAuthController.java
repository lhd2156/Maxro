package com.maxro.maxro_backend.resolver;

import com.maxro.maxro_backend.dto.auth.SpotifyCodeExchangeRequest;
import com.maxro.maxro_backend.dto.auth.SpotifyRefreshRequest;
import com.maxro.maxro_backend.dto.auth.SpotifyTokenResponse;
import com.maxro.maxro_backend.security.SecurityContextHelper;
import com.maxro.maxro_backend.service.SpotifyAuthService;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/spotify")
public class SpotifyAuthController {

    private final SpotifyAuthService spotifyAuthService;
    private final SecurityContextHelper securityContextHelper;

    public SpotifyAuthController(SpotifyAuthService spotifyAuthService,
                                 SecurityContextHelper securityContextHelper) {
        this.spotifyAuthService = spotifyAuthService;
        this.securityContextHelper = securityContextHelper;
    }

    @PostMapping("/token")
    public SpotifyTokenResponse exchangeCode(@RequestBody SpotifyCodeExchangeRequest request) {
        securityContextHelper.getCurrentUserId();
        return spotifyAuthService.exchangeCode(request.code(), request.redirectUri());
    }

    @PostMapping("/refresh")
    public SpotifyTokenResponse refreshToken(@RequestBody SpotifyRefreshRequest request) {
        securityContextHelper.getCurrentUserId();
        return spotifyAuthService.refreshAccessToken(request.refreshToken());
    }
}
