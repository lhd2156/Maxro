package com.maxro.maxro_backend.service;

import com.maxro.maxro_backend.dto.auth.AuthPayload;

public interface GoogleAuthService {

    AuthPayload signInWithGoogle(String idToken);
}
