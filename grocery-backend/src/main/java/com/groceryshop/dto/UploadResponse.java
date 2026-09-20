package com.groceryshop.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class UploadResponse {

    /** Relative URL of the uploaded file, e.g. /api/uploads/abc-123.png */
    private String url;
}