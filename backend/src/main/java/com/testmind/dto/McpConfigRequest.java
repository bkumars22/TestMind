package com.testmind.dto;

import com.testmind.model.McpServerType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class McpConfigRequest {

    @NotNull(message = "Server type is required")
    private McpServerType serverType;

    @NotBlank(message = "Config JSON is required")
    private String configJson;
}
