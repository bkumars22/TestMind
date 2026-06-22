package com.testmind.controller;

import com.testmind.dto.DefectResponse;
import com.testmind.dto.TestRunResponse;
import com.testmind.service.TestRunService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/test-runs")
@RequiredArgsConstructor
@Tag(name = "Test Runs", description = "Test run queries")
public class TestRunController {

    private final TestRunService testRunService;

    @GetMapping("/{id}")
    @Operation(summary = "Get a test run by ID")
    public ResponseEntity<TestRunResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(testRunService.getById(id));
    }

    @GetMapping("/{id}/defects")
    @Operation(summary = "Get all defects for a test run")
    public ResponseEntity<List<DefectResponse>> getDefects(@PathVariable Long id) {
        return ResponseEntity.ok(testRunService.getDefects(id));
    }
}
