package com.testmind.controller;

import com.testmind.dto.DashboardStats;
import com.testmind.exception.ResourceNotFoundException;
import com.testmind.model.RiskScore;
import com.testmind.model.User;
import com.testmind.repository.UserRepository;
import com.testmind.service.DashboardService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
@Tag(name = "Dashboard", description = "Aggregated stats and risk heatmap")
public class DashboardController {

    private final DashboardService dashboardService;
    private final UserRepository userRepository;

    @GetMapping("/stats")
    @Operation(summary = "Get dashboard stats for the authenticated user")
    public ResponseEntity<DashboardStats> getStats(@AuthenticationPrincipal UserDetails principal) {
        User user = userRepository.findByEmail(principal.getUsername())
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + principal.getUsername()));
        return ResponseEntity.ok(dashboardService.getStats(user));
    }

    @GetMapping("/risk-heatmap")
    @Operation(summary = "Get risk heatmap for a project (projectId required as query param)")
    public ResponseEntity<List<RiskScore>> getRiskHeatmap(@RequestParam Long projectId) {
        return ResponseEntity.ok(dashboardService.getRiskHeatmap(projectId));
    }
}
