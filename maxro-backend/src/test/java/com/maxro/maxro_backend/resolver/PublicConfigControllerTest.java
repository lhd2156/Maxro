package com.maxro.maxro_backend.resolver;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.TestPropertySource;

import com.maxro.maxro_backend.security.JwtAuthenticationFilter;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(PublicConfigController.class)
@AutoConfigureMockMvc(addFilters = false)
@TestPropertySource(properties = {
        "maxro.google.client-id=test-google-client-id.apps.googleusercontent.com",
        "maxro.spotify.client-id=test-spotify-client-id"
})
class PublicConfigControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @Test
    void getPublicConfig_returnsConfiguredClientIds() throws Exception {
        mockMvc.perform(get("/api/public-config"))
                .andExpect(status().isOk())
                .andExpect(content().json("""
                        {
                          "googleClientId": "test-google-client-id.apps.googleusercontent.com",
                          "spotifyClientId": "test-spotify-client-id"
                        }
                        """));
    }
}