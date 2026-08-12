package com.maxro.maxro_backend.config;

import jakarta.servlet.ServletException;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.io.IOException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class ApexDomainRedirectFilterTest {

    private final ApexDomainRedirectFilter filter = new ApexDomainRedirectFilter();

    @Test
    void redirectsApexHostToWwwAndPreservesPathAndQuery() throws ServletException, IOException {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/login");
        request.addHeader("Host", "gomaxro.com:443");
        request.setQueryString("next=dashboard");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, new MockFilterChain());

        assertEquals(301, response.getStatus());
        assertEquals("https://www.gomaxro.com/login?next=dashboard", response.getHeader("Location"));
    }

    @Test
    void redirectsForwardedApexHost() throws ServletException, IOException {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/");
        request.addHeader("Host", "maxro-backend.yellowmoss-96683f19.centralus.azurecontainerapps.io");
        request.addHeader("X-Forwarded-Host", "gomaxro.com");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, new MockFilterChain());

        assertEquals(301, response.getStatus());
        assertEquals("https://www.gomaxro.com/", response.getHeader("Location"));
    }

    @Test
    void leavesNonApexHostsAlone() throws ServletException, IOException {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/actuator/health");
        request.addHeader("Host", "api.gomaxro.com");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, new MockFilterChain());

        assertEquals(200, response.getStatus());
        assertNull(response.getHeader("Location"));
    }
}
