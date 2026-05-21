package com.maxro.maxro_backend.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class ApexDomainRedirectFilter extends OncePerRequestFilter {

    private static final String APEX_HOST = "gomaxro.com";
    private static final String WWW_ORIGIN = "https://www.gomaxro.com";

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String host = normalizedHost(request);
        if (APEX_HOST.equalsIgnoreCase(host)) {
            response.setStatus(HttpServletResponse.SC_MOVED_PERMANENTLY);
            response.setHeader("Location", WWW_ORIGIN + request.getRequestURI() + queryString(request));
            return;
        }

        filterChain.doFilter(request, response);
    }

    private static String normalizedHost(HttpServletRequest request) {
        String host = request.getHeader("X-Forwarded-Host");
        if (host == null || host.isBlank()) {
            host = request.getHeader("Host");
        }
        if (host == null || host.isBlank()) {
            host = request.getServerName();
        }

        String firstHost = host.split(",", 2)[0].trim();
        int portIndex = firstHost.indexOf(':');
        return portIndex >= 0 ? firstHost.substring(0, portIndex) : firstHost;
    }

    private static String queryString(HttpServletRequest request) {
        String query = request.getQueryString();
        return query == null || query.isBlank() ? "" : "?" + query;
    }
}
