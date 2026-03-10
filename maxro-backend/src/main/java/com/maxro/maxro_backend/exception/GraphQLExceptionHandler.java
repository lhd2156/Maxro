package com.maxro.maxro_backend.exception;

import graphql.GraphQLError;
import graphql.GraphqlErrorBuilder;
import graphql.schema.DataFetchingEnvironment;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.graphql.data.method.annotation.GraphQlExceptionHandler;
import org.springframework.web.bind.annotation.ControllerAdvice;

import jakarta.validation.ConstraintViolationException;

@ControllerAdvice
public class GraphQLExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GraphQLExceptionHandler.class);

    @GraphQlExceptionHandler(ResourceNotFoundException.class)
    public GraphQLError handleNotFound(ResourceNotFoundException ex, DataFetchingEnvironment env) {
        log.warn("Resource not found: {}", ex.getMessage());
        return GraphqlErrorBuilder.newError(env)
                .message(ex.getMessage())
                .errorType(graphql.ErrorType.DataFetchingException)
                .build();
    }

    @GraphQlExceptionHandler(DuplicateResourceException.class)
    public GraphQLError handleDuplicate(DuplicateResourceException ex, DataFetchingEnvironment env) {
        log.warn("Duplicate resource: {}", ex.getMessage());
        return GraphqlErrorBuilder.newError(env)
                .message(ex.getMessage())
                .errorType(graphql.ErrorType.ValidationError)
                .build();
    }

    @GraphQlExceptionHandler(AuthenticationException.class)
    public GraphQLError handleAuth(AuthenticationException ex, DataFetchingEnvironment env) {
        log.warn("Authentication error: {}", ex.getMessage());
        return GraphqlErrorBuilder.newError(env)
                .message(ex.getMessage())
                .errorType(graphql.ErrorType.ExecutionAborted)
                .build();
    }

    @GraphQlExceptionHandler(ExternalApiException.class)
    public GraphQLError handleExternalApi(ExternalApiException ex, DataFetchingEnvironment env) {
        log.error("External API error: {}", ex.getMessage());
        // Intentionally vague user-facing message — don't leak third-party error details.
        return GraphqlErrorBuilder.newError(env)
                .message("External service temporarily unavailable. Please try again.")
                .errorType(graphql.ErrorType.DataFetchingException)
                .build();
    }

    @GraphQlExceptionHandler(ConstraintViolationException.class)
    public GraphQLError handleValidation(ConstraintViolationException ex, DataFetchingEnvironment env) {
        log.warn("Validation error: {}", ex.getMessage());
        String message = ex.getConstraintViolations().stream()
                .map(v -> v.getPropertyPath() + ": " + v.getMessage())
                .reduce((a, b) -> a + "; " + b)
                .orElse("Validation failed");
        return GraphqlErrorBuilder.newError(env)
                .message(message)
                .errorType(graphql.ErrorType.ValidationError)
                .build();
    }

    @GraphQlExceptionHandler(IllegalArgumentException.class)
    public GraphQLError handleIllegalArgument(IllegalArgumentException ex, DataFetchingEnvironment env) {
        log.warn("Invalid argument: {}", ex.getMessage());
        return GraphqlErrorBuilder.newError(env)
                .message(ex.getMessage())
                .errorType(graphql.ErrorType.ValidationError)
                .build();
    }

    @GraphQlExceptionHandler(Exception.class)
    public GraphQLError handleGeneral(Exception ex, DataFetchingEnvironment env) {
        log.error("Unexpected error", ex);
        return GraphqlErrorBuilder.newError(env)
                .message("An unexpected error occurred. Please try again later.")
                .errorType(graphql.ErrorType.ExecutionAborted)
                .build();
    }
}
