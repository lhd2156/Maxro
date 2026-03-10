package com.maxro.maxro_backend.service;

import com.maxro.maxro_backend.dto.auth.AuthPayload;
import com.maxro.maxro_backend.dto.auth.LoginInput;
import com.maxro.maxro_backend.dto.auth.RegisterInput;

public interface AuthService {

    AuthPayload register(RegisterInput input);

    AuthPayload login(LoginInput input);

    AuthPayload refreshToken(String token);

    void logout(String userId);
}
