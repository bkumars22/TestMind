package com.testmind.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.testmind.dto.*;
import com.testmind.exception.ResourceNotFoundException;
import com.testmind.exception.ValidationException;
import com.testmind.model.*;
import com.testmind.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PipelineService {

    private final PipelineRunRepository pipelineRunRepository;
    private final ProjectRepository projectRepository;
    private final StoryAnalysisRepository storyAnalysisRepository;
    private final GapReportRepository gapReportRepository;
    private final GeneratedTestCaseRepository generatedTestCaseRepository;
    private final TestExecutionRepository testExecutionRepository;
    private final GeneratedCodeRepository generatedCodeRepository;
    private final PipelineAiClient pipelineAiClient;
    private final ObjectMapper objectMapper;

    @Transactional
    public PipelineResponse startPipeline(PipelineStartRequest request, Long userId) {
        Project project = projectRepository.findById(request.getProjectId())
                .orElseThrow(() -> new ResourceNotFoundException("Project", request.getProjectId()));

        PipelineRun run = PipelineRun.builder()
                .project(project)
                .jiraStoryId(request.getJiraStoryId())
                .status(PipelineStatus.STAGE_1_INGESTING)
                .currentStage(1)
                .build();

        run = pipelineRunRepository.save(run);

        final Long runId = run.getId();
        final String repoUrl = project.getRepoUrl();
        final String githubToken = project.getGithubToken();

        pipelineAiClient.startPipeline(
                runId.toString(),
                project.getId(),
                request.getJiraStoryId(),
                repoUrl,
                githubToken,
                null
        ).subscribe(
                unused -> {},
                error -> log.error("AI engine call failed for pipeline {}: {}", runId, error.getMessage())
        );

        return toResponse(run);
    }

    @Transactional(readOnly = true)
    public List<PipelineResponse> getByProject(Long projectId) {
        return pipelineRunRepository.findByProjectIdOrderByStartedAtDesc(projectId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public PipelineResponse getById(Long id) {
        PipelineRun run = pipelineRunRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("PipelineRun", id));
        return toResponse(run);
    }

    @Transactional
    public void updateStatus(Long pipelineRunId, PipelineStatus status, Integer stage) {
        PipelineRun run = pipelineRunRepository.findById(pipelineRunId)
                .orElseThrow(() -> new ResourceNotFoundException("PipelineRun", pipelineRunId));
        run.setStatus(status);
        if (stage != null) {
            run.setCurrentStage(stage);
        }
        pipelineRunRepository.save(run);
    }

    @Transactional
    public void handleCallback(PipelineCompleteCallback callback) {
        Long runId = Long.parseLong(callback.getRunId());
        PipelineRun run = pipelineRunRepository.findById(runId)
                .orElseThrow(() -> new ResourceNotFoundException("PipelineRun", runId));

        if ("FAILED".equalsIgnoreCase(callback.getStatus())) {
            run.setStatus(PipelineStatus.FAILED);
            run.setErrorMessage(callback.getErrorMessage());
            run.setCompletedAt(OffsetDateTime.now());
            pipelineRunRepository.save(run);
            return;
        }

        // Save story analysis if present
        if (callback.getStoryAnalysis() != null && !callback.getStoryAnalysis().isEmpty()) {
            saveStoryAnalysis(run, callback.getStoryAnalysis());
        }

        // Save gap reports if present
        if (callback.getGapReport() != null && !callback.getGapReport().isEmpty()) {
            saveGapReports(run, callback.getGapReport());
        }

        // Save test cases if present
        if (callback.getTestCases() != null && !callback.getTestCases().isEmpty()) {
            saveTestCases(run, callback.getTestCases());
        }

        // Save execution results if present
        if (callback.getExecutionResults() != null && !callback.getExecutionResults().isEmpty()) {
            saveExecutionResults(run, callback.getExecutionResults());
        }

        // Save generated code if present
        if (callback.getGeneratedCode() != null && !callback.getGeneratedCode().isEmpty()) {
            saveGeneratedCode(run, callback.getGeneratedCode());
        }

        // Determine next status
        if ("AWAITING_APPROVAL".equalsIgnoreCase(callback.getStatus())) {
            run.setStatus(PipelineStatus.AWAITING_APPROVAL);
            run.setCurrentStage(3);
        } else if ("COMPLETED".equalsIgnoreCase(callback.getStatus())) {
            run.setStatus(PipelineStatus.COMPLETED);
            run.setCurrentStage(7);
            run.setCompletedAt(OffsetDateTime.now());
            if (callback.getReportUrl() != null) {
                run.setReportUrl(callback.getReportUrl());
            }
        }

        pipelineRunRepository.save(run);
    }

    @Transactional
    public PipelineResponse resumeAfterApproval(Long pipelineRunId, Long userId) {
        PipelineRun run = pipelineRunRepository.findById(pipelineRunId)
                .orElseThrow(() -> new ResourceNotFoundException("PipelineRun", pipelineRunId));

        if (run.getStatus() != PipelineStatus.AWAITING_APPROVAL) {
            throw new ValidationException("Pipeline run is not awaiting approval. Current status: " + run.getStatus());
        }

        long approvedCount = generatedTestCaseRepository.countByPipelineRunIdAndStatus(
                pipelineRunId, TestCaseStatus.APPROVED);
        if (approvedCount == 0) {
            throw new ValidationException("At least one test case must be approved before resuming the pipeline");
        }

        run.setStatus(PipelineStatus.STAGE_4_EXECUTING);
        run.setCurrentStage(4);
        run = pipelineRunRepository.save(run);

        List<GeneratedTestCase> approvedCases = generatedTestCaseRepository
                .findByPipelineRunIdAndStatus(pipelineRunId, TestCaseStatus.APPROVED);

        List<Map<String, Object>> approvedPayload = approvedCases.stream()
                .map(tc -> {
                    Map<String, Object> m = new HashMap<>();
                    m.put("id", tc.getId());
                    m.put("title", tc.getTitle());
                    m.put("test_type", tc.getTestType() != null ? tc.getTestType().name() : null);
                    m.put("preconditions", tc.getPreconditions());
                    m.put("test_steps", tc.getTestSteps());
                    m.put("expected_result", tc.getExpectedResult());
                    m.put("priority", tc.getPriority());
                    return m;
                })
                .collect(Collectors.toList());

        pipelineAiClient.resumePipeline(pipelineRunId.toString(), approvedPayload)
                .subscribe(
                        unused -> {},
                        error -> log.error("Failed to resume pipeline {} in AI engine: {}", pipelineRunId, error.getMessage())
                );

        return toResponse(run);
    }

    // ---- Private helpers ----

    private void saveStoryAnalysis(PipelineRun run, Map<String, Object> data) {
        StoryAnalysis analysis = StoryAnalysis.builder()
                .pipelineRun(run)
                .project(run.getProject())
                .jiraStoryId(getString(data, "jira_story_id", run.getJiraStoryId()))
                .jiraSummary(getString(data, "jira_summary", run.getJiraSummary()))
                .businessRules(toJsonString(data.get("business_rules")))
                .acceptanceCriteria(toJsonString(data.get("acceptance_criteria")))
                .edgeCases(toJsonString(data.get("edge_cases")))
                .dataRules(toJsonString(data.get("data_rules")))
                .rawStory(toJsonString(data.get("raw_story")))
                .analyzedAt(OffsetDateTime.now())
                .build();
        storyAnalysisRepository.save(analysis);

        // Update pipeline jira summary if returned
        if (data.get("jira_summary") != null) {
            run.setJiraSummary(getString(data, "jira_summary", null));
        }
    }

    private void saveGapReports(PipelineRun run, List<Map<String, Object>> gaps) {
        for (Map<String, Object> gap : gaps) {
            GapCategory category = parseEnum(GapCategory.class, getString(gap, "gap_category", "FUNCTIONAL"));
            BigDecimal score = parseBigDecimal(gap.get("priority_score"), new BigDecimal("0.50"));

            GapReport report = GapReport.builder()
                    .pipelineRun(run)
                    .gapCategory(category)
                    .description(getString(gap, "description", ""))
                    .priorityScore(score)
                    .affectedRequirement(getString(gap, "affected_requirement", null))
                    .existingCoverage(getString(gap, "existing_coverage", null))
                    .createdAt(OffsetDateTime.now())
                    .build();
            gapReportRepository.save(report);
        }
    }

    private void saveTestCases(PipelineRun run, List<Map<String, Object>> testCases) {
        for (Map<String, Object> tc : testCases) {
            TestType testType = parseEnum(TestType.class, getString(tc, "test_type", "HAPPY_PATH"));
            GapCategory gapCat = parseEnumNullable(GapCategory.class, getString(tc, "gap_category", null));

            GeneratedTestCase testCase = GeneratedTestCase.builder()
                    .pipelineRun(run)
                    .title(getString(tc, "title", "Untitled Test"))
                    .testType(testType)
                    .gapCategory(gapCat)
                    .preconditions(getString(tc, "preconditions", null))
                    .testSteps(toJsonString(tc.get("test_steps")))
                    .expectedResult(getString(tc, "expected_result", ""))
                    .priority(getString(tc, "priority", "MEDIUM"))
                    .status(TestCaseStatus.PENDING)
                    .createdAt(OffsetDateTime.now())
                    .build();
            generatedTestCaseRepository.save(testCase);
        }
    }

    private void saveExecutionResults(PipelineRun run, List<Map<String, Object>> results) {
        for (Map<String, Object> result : results) {
            Long testCaseId = parseLong(result.get("test_case_id"));
            if (testCaseId == null) {
                continue;
            }
            generatedTestCaseRepository.findById(testCaseId).ifPresent(tc -> {
                ExecutionStatus execStatus = parseEnum(ExecutionStatus.class, getString(result, "status", "PENDING"));
                BigDecimal deepevalScore = parseBigDecimal(result.get("deepeval_score"), null);

                TestExecution execution = TestExecution.builder()
                        .pipelineRun(run)
                        .testCase(tc)
                        .status(execStatus)
                        .durationMs(parseInteger(result.get("duration_ms")))
                        .screenshotUrl(getString(result, "screenshot_url", null))
                        .errorMessage(getString(result, "error_message", null))
                        .responseData(toJsonString(result.get("response_data")))
                        .aiExplanation(getString(result, "ai_explanation", null))
                        .deepevalScore(deepevalScore)
                        .executedAt(OffsetDateTime.now())
                        .build();
                testExecutionRepository.save(execution);
            });
        }
    }

    private void saveGeneratedCode(PipelineRun run, List<Map<String, Object>> codeList) {
        for (Map<String, Object> code : codeList) {
            CodeFramework framework = parseEnum(CodeFramework.class, getString(code, "framework", "PLAYWRIGHT"));
            Long testCaseId = parseLong(code.get("test_case_id"));

            GeneratedCode.GeneratedCodeBuilder builder = GeneratedCode.builder()
                    .pipelineRun(run)
                    .framework(framework)
                    .language(getString(code, "language", "typescript"))
                    .fileName(getString(code, "file_name", "test.ts"))
                    .filePath(getString(code, "file_path", ""))
                    .codeContent(getString(code, "code_content", ""))
                    .createdAt(OffsetDateTime.now());

            if (testCaseId != null) {
                generatedTestCaseRepository.findById(testCaseId).ifPresent(builder::testCase);
            }

            generatedCodeRepository.save(builder.build());
        }
    }

    private PipelineResponse toResponse(PipelineRun run) {
        return PipelineResponse.builder()
                .id(run.getId())
                .projectId(run.getProject() != null ? run.getProject().getId() : null)
                .jiraStoryId(run.getJiraStoryId())
                .jiraSummary(run.getJiraSummary())
                .status(run.getStatus() != null ? run.getStatus().name() : null)
                .currentStage(run.getCurrentStage())
                .startedAt(run.getStartedAt())
                .completedAt(run.getCompletedAt())
                .reportUrl(run.getReportUrl())
                .errorMessage(run.getErrorMessage())
                .build();
    }

    private String getString(Map<String, Object> map, String key, String defaultValue) {
        Object val = map.get(key);
        return val != null ? val.toString() : defaultValue;
    }

    private String toJsonString(Object value) {
        if (value == null) return null;
        if (value instanceof String) return (String) value;
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException e) {
            log.warn("Failed to serialize value to JSON: {}", e.getMessage());
            return value.toString();
        }
    }

    private <E extends Enum<E>> E parseEnum(Class<E> enumClass, String value) {
        if (value == null) {
            return enumClass.getEnumConstants()[0];
        }
        try {
            return Enum.valueOf(enumClass, value.toUpperCase());
        } catch (IllegalArgumentException e) {
            log.warn("Unknown enum value '{}' for {}, using first constant", value, enumClass.getSimpleName());
            return enumClass.getEnumConstants()[0];
        }
    }

    private <E extends Enum<E>> E parseEnumNullable(Class<E> enumClass, String value) {
        if (value == null) return null;
        try {
            return Enum.valueOf(enumClass, value.toUpperCase());
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    private BigDecimal parseBigDecimal(Object value, BigDecimal defaultValue) {
        if (value == null) return defaultValue;
        try {
            return new BigDecimal(value.toString());
        } catch (NumberFormatException e) {
            return defaultValue;
        }
    }

    private Long parseLong(Object value) {
        if (value == null) return null;
        try {
            return Long.parseLong(value.toString());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private Integer parseInteger(Object value) {
        if (value == null) return null;
        try {
            return Integer.parseInt(value.toString());
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
