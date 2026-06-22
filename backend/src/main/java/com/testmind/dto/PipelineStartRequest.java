package com.testmind.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class PipelineStartRequest {

    @NotNull(message = "projectId is required")
    private Long projectId;

    @NotBlank(message = "jiraStoryId is required")
    private String jiraStoryId;
}
