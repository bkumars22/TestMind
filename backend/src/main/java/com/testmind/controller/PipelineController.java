package com.testmind.controller;

import com.testmind.dto.*;
import com.testmind.model.GapReport;
import com.testmind.model.GeneratedCode;
import com.testmind.model.StoryAnalysis;
import com.testmind.model.TestExecution;
import com.testmind.repository.*;
import com.testmind.service.PipelineService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/pipeline")
@RequiredArgsConstructor
public class PipelineController {

    private final PipelineService pipelineService;
    private final StoryAnalysisRepository storyAnalysisRepository;
    private final GapReportRepository gapReportRepository;
    private final TestExecutionRepository testExecutionRepository;
    private final GeneratedCodeRepository generatedCodeRepository;

    @PostMapping("/start")
    public ResponseEntity<PipelineResponse> start(
            @Valid @RequestBody PipelineStartRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        Long userId = resolveUserId(userDetails);
        return ResponseEntity.status(HttpStatus.CREATED).body(pipelineService.startPipeline(request, userId));
    }

    @GetMapping
    public ResponseEntity<List<PipelineResponse>> listByProject(@RequestParam Long projectId) {
        return ResponseEntity.ok(pipelineService.getByProject(projectId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<PipelineResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(pipelineService.getById(id));
    }

    @PostMapping("/{id}/resume")
    public ResponseEntity<PipelineResponse> resume(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        Long userId = resolveUserId(userDetails);
        return ResponseEntity.ok(pipelineService.resumeAfterApproval(id, userId));
    }

    @PostMapping("/callback")
    public ResponseEntity<Void> callback(@RequestBody PipelineCompleteCallback payload) {
        pipelineService.handleCallback(payload);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/{id}/story")
    public ResponseEntity<StoryAnalysisResponse> getStory(@PathVariable Long id) {
        return storyAnalysisRepository.findByPipelineRunId(id)
                .map(this::toStoryResponse)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{id}/gaps")
    public ResponseEntity<List<GapReportResponse>> getGaps(@PathVariable Long id) {
        List<GapReportResponse> gaps = gapReportRepository
                .findByPipelineRunIdOrderByPriorityScoreDesc(id)
                .stream().map(this::toGapResponse).collect(Collectors.toList());
        return ResponseEntity.ok(gaps);
    }

    @GetMapping("/{id}/executions")
    public ResponseEntity<List<ExecutionResultResponse>> getExecutions(@PathVariable Long id) {
        List<ExecutionResultResponse> results = testExecutionRepository
                .findByPipelineRunIdOrderByExecutedAtAsc(id)
                .stream().map(this::toExecutionResponse).collect(Collectors.toList());
        return ResponseEntity.ok(results);
    }

    @GetMapping("/{id}/code")
    public ResponseEntity<List<GeneratedCodeResponse>> getCode(@PathVariable Long id) {
        List<GeneratedCodeResponse> code = generatedCodeRepository
                .findByPipelineRunId(id)
                .stream().map(this::toCodeResponse).collect(Collectors.toList());
        return ResponseEntity.ok(code);
    }

    // ── Mappers ────────────────────────────────────────────────────────────────

    private StoryAnalysisResponse toStoryResponse(StoryAnalysis s) {
        StoryAnalysisResponse r = new StoryAnalysisResponse();
        r.setId(s.getId());
        r.setJiraStoryId(s.getJiraStoryId());
        r.setJiraSummary(s.getJiraSummary());
        r.setBusinessRules(s.getBusinessRules());
        r.setAcceptanceCriteria(s.getAcceptanceCriteria());
        r.setEdgeCases(s.getEdgeCases());
        r.setDataRules(s.getDataRules());
        r.setAnalyzedAt(s.getAnalyzedAt());
        return r;
    }

    private GapReportResponse toGapResponse(GapReport g) {
        GapReportResponse r = new GapReportResponse();
        r.setId(g.getId());
        r.setGapCategory(g.getGapCategory() != null ? g.getGapCategory().name() : null);
        r.setDescription(g.getDescription());
        r.setPriorityScore(g.getPriorityScore() != null ? g.getPriorityScore().doubleValue() : 0.5);
        r.setAffectedRequirement(g.getAffectedRequirement());
        return r;
    }

    private ExecutionResultResponse toExecutionResponse(TestExecution e) {
        ExecutionResultResponse r = new ExecutionResultResponse();
        r.setId(e.getId());
        r.setTestCaseId(e.getTestCase() != null ? e.getTestCase().getId() : null);
        r.setTestCaseTitle(e.getTestCase() != null ? e.getTestCase().getTitle() : "");
        r.setStatus(e.getStatus() != null ? e.getStatus().name() : "UNKNOWN");
        r.setDurationMs(e.getDurationMs());
        r.setScreenshotUrl(e.getScreenshotUrl());
        r.setErrorMessage(e.getErrorMessage());
        r.setAiExplanation(e.getAiExplanation());
        r.setDeepevalScore(e.getDeepevalScore() != null ? e.getDeepevalScore().doubleValue() : null);
        return r;
    }

    private GeneratedCodeResponse toCodeResponse(GeneratedCode c) {
        GeneratedCodeResponse r = new GeneratedCodeResponse();
        r.setId(c.getId());
        r.setTestCaseId(c.getTestCase() != null ? c.getTestCase().getId() : null);
        r.setFramework(c.getFramework() != null ? c.getFramework().name() : "");
        r.setLanguage(c.getLanguage());
        r.setFileName(c.getFileName());
        r.setFilePath(c.getFilePath());
        r.setCodeContent(c.getCodeContent());
        return r;
    }

    private Long resolveUserId(UserDetails userDetails) {
        return null; // userId is optional for pipeline; resolved from principal email in service
    }
}
