package com.maxro.maxro_backend.exception;

public class ExternalApiException extends RuntimeException {

    private final String serviceName;

    public ExternalApiException(String serviceName, String message) {
        super(String.format("External API error from %s: %s", serviceName, message));
        this.serviceName = serviceName;
    }

    public ExternalApiException(String serviceName, String message, Throwable cause) {
        super(String.format("External API error from %s: %s", serviceName, message), cause);
        this.serviceName = serviceName;
    }

    public String getServiceName() { return serviceName; }
}
