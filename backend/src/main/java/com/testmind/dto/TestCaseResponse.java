package com.testmind.dto;

import lombok.Builder;
import lombok.Data;

import java.time.OffsetDateTime;

@Data
@Builder
public class TestCaseResponse {

    private Long id;
    private Long pipelineRunId;
    private String title;
    private String testType;
    private String gapCategory;
    private String preconditions;
    private String testSteps;
    private String expectedResult;
    private String priority;
    private String status;
    private String reviewerNotes;
    private OffsetDateTime reviewedAt;
}
