package com.testmind.dto;

import lombok.Builder;
import lombok.Data;

import java.time.OffsetDateTime;

@Data
@Builder
public class PipelineResponse {

    private Long id;
    private Long projectId;
    private String jiraStoryId;
    private String jiraSummary;
    private String status;
    private int currentStage;
    private OffsetDateTime startedAt;
    private OffsetDateTime completedAt;
    private String reportUrl;
    private String errorMessage;
}
