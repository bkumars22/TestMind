package com.testmind.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ExecutionResultResponse {

    private Long id;
    private Long testCaseId;
    private String testCaseTitle;
    private String status;
    private Integer durationMs;
    private String screenshotUrl;
    private String errorMessage;
    private String aiExplanation;
    private Double deepevalScore;
}
