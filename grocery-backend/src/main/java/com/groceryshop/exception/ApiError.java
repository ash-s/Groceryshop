package com.groceryshop.exception;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.Map;

@Data
public class ApiError {

    private LocalDateTime timestamp;
    private int status;
    private String error;
    private String message;
    private String path;
    private Map<String, String> fieldErrors;

    public ApiError(int status, String error, String message, String path) {
        this.timestamp = LocalDateTime.now();
        this.status = status;
        this.error = error;
        this.message = message;
        this.path = path;
    }

    public ApiError(int status, String error, String message, String path, Map<String, String> fieldErrors) {
        this(status, error, message, path);
        this.fieldErrors = fieldErrors;
    }
}