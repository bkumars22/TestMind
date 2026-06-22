package com.testmind.service;

import com.testmind.dto.DashboardStats;
import com.testmind.model.*;
import com.testmind.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final ProjectRepository projectRepository;
    private final TestRunRepository testRunRepository;
    private final DefectRepository defectRepository;
    private final RiskScoreRepository riskScoreRepository;

    @Transactional(readOnly = true)
    public DashboardStats getStats(User user) {
        List<Project> userProjects = projectRepository.findByUser(user);
        long totalProjects = userProjects.size();

        long activeTestRuns = userProjects.stream()
                .mapToLong(p ->
                    testRunRepository.findByProjectIdAndStatus(p.getId(), TestRunStatus.RUNNING).size()
                    + testRunRepository.findByProjectIdAndStatus(p.getId(), TestRunStatus.PENDING).size()
                )
                .sum();

        long openDefects = userProjects.stream()
                .mapToLong(p -> defectRepository.findByTestRunProjectIdAndStatus(p.getId(), DefectStatus.OPEN).size())
                .sum();

        double avgRiskScore = userProjects.stream()
                .flatMap(p -> riskScoreRepository.findByProjectId(p.getId()).stream())
                .mapToDouble(rs -> rs.getRiskScore() != null ? rs.getRiskScore() : 0.0)
                .average()
                .orElse(0.0);

        return DashboardStats.builder()
                .totalProjects(totalProjects)
                .activeTestRuns(activeTestRuns)
                .openDefects(openDefects)
                .avgRiskScore(avgRiskScore)
                .build();
    }

    @Transactional(readOnly = true)
    public List<RiskScore> getRiskHeatmap(Long projectId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new com.testmind.exception.ResourceNotFoundException("Project", projectId));
        return riskScoreRepository.findByProjectOrderByRiskScoreDesc(project);
    }
}
