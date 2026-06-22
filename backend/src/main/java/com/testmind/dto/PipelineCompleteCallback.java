package com.testmind.dto;

import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
public class PipelineCompleteCallback {

    private String runId;
    private String status;
    private Map<String, Object> storyAnalysis;
    private List<Map<String, Object>> gapReport;
    private List<Map<String, Object>> testCases;
    private List<Map<String, Object>> executionResults;
    private List<Map<String, Object>> generatedCode;
    private String reportUrl;
    private String errorMessage;
}
