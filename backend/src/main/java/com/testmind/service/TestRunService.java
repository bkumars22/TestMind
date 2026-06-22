package com.testmind.service;

import com.testmind.dto.DefectResponse;
import com.testmind.dto.RunCompletePayload;
import com.testmind.dto.TestRunResponse;
import com.testmind.exception.ResourceNotFoundException;
import com.testmind.model.*;
import com.testmind.repository.DefectRepository;
import com.testmind.repository.ProjectRepository;
import com.testmind.repository.TestRunRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TestRunService {

    private final TestRunRepository testRunRepository;
    private final ProjectRepository projectRepository;
    private final DefectRepository defectRepository;

    @Transactional(readOnly = true)
    public List<TestRunResponse> getByProject(Long projectId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project", projectId));
        return testRunRepository.findByProjectOrderByStartedAtDesc(project).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public TestRunResponse getById(Long id) {
        TestRun run = testRunRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("TestRun", id));
        return toResponse(run);
    }

    @Transactional(readOnly = true)
    public List<DefectResponse> getDefects(Long runId) {
        TestRun run = testRunRepository.findById(runId)
                .orElseThrow(() -> new ResourceNotFoundException("TestRun", runId));
        return defectRepository.findByTestRun(run).stream()
                .map(this::toDefectResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public void markComplete(Long runId, RunCompletePayload payload) {
        TestRun run = testRunRepository.findById(runId)
                .orElseThrow(() -> new ResourceNotFoundException("TestRun", runId));

        run.setStatus(payload.getStatus());
        run.setRiskScore(payload.getRiskScore());
        run.setCompletedAt(LocalDateTime.now());

        if (payload.getDefects() != null) {
            for (DefectResponse dr : payload.getDefects()) {
                Defect defect = Defect.builder()
                        .testRun(run)
                        .severity(dr.getSeverity())
                        .title(dr.getTitle())
                        .description(dr.getDescription())
                        .aiExplanation(dr.getAiExplanation())
                        .consistencyScore(dr.getConsistencyScore())
                        .jiraTicketId(dr.getJiraTicketId())
                        .status(dr.getStatus() != null ? dr.getStatus() : DefectStatus.OPEN)
                        .build();
                defectRepository.save(defect);
            }
            run.setDefectCount(payload.getDefects().size());
        }

        testRunRepository.save(run);
    }

    private TestRunResponse toResponse(TestRun run) {
        return TestRunResponse.builder()
                .id(run.getId())
                .status(run.getStatus())
                .triggeredBy(run.getTriggeredBy())
                .startedAt(run.getStartedAt())
                .completedAt(run.getCompletedAt())
                .defectCount(run.getDefectCount())
                .riskScore(run.getRiskScore())
                .build();
    }

    private DefectResponse toDefectResponse(Defect d) {
        return DefectResponse.builder()
                .id(d.getId())
                .testRunId(d.getTestRun().getId())
                .severity(d.getSeverity())
                .title(d.getTitle())
                .description(d.getDescription())
                .aiExplanation(d.getAiExplanation())
                .consistencyScore(d.getConsistencyScore())
                .jiraTicketId(d.getJiraTicketId())
                .status(d.getStatus())
                .createdAt(d.getCreatedAt())
                .build();
    }
}
