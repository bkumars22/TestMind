package com.testmind.controller;

import com.testmind.model.RiskScore;
import com.testmind.service.DashboardService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/projects")
@RequiredArgsConstructor
@Tag(name = "Risk Scores", description = "Risk score heatmap data")
public class RiskController {

    private final DashboardService dashboardService;

    @GetMapping("/{id}/risk-scores")
    @Operation(summary = "Get risk scores for a project, sorted by score descending")
    public ResponseEntity<List<RiskScore>> getRiskScores(@PathVariable Long id) {
        return ResponseEntity.ok(dashboardService.getRiskHeatmap(id));
    }
}
