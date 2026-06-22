package com.testmind.controller;

import com.testmind.dto.TestCaseResponse;
import com.testmind.dto.TestCaseReviewRequest;
import com.testmind.service.TestCaseService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/test-cases")
@RequiredArgsConstructor
public class TestCaseController {

    private final TestCaseService testCaseService;

    @GetMapping
    public ResponseEntity<List<TestCaseResponse>> listByPipeline(@RequestParam Long pipelineRunId) {
        return ResponseEntity.ok(testCaseService.getByPipelineRun(pipelineRunId));
    }

    @PatchMapping("/{id}/review")
    public ResponseEntity<TestCaseResponse> review(
            @PathVariable Long id,
            @Valid @RequestBody TestCaseReviewRequest request) {
        return ResponseEntity.ok(testCaseService.reviewTestCase(id, request));
    }

    @PostMapping("/approve-all")
    public ResponseEntity<Void> approveAll(@RequestParam Long pipelineRunId) {
        testCaseService.approveAll(pipelineRunId);
        return ResponseEntity.ok().build();
    }
}
