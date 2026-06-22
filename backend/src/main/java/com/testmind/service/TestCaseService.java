package com.testmind.service;

import com.testmind.dto.TestCaseResponse;
import com.testmind.dto.TestCaseReviewRequest;
import com.testmind.exception.ResourceNotFoundException;
import com.testmind.exception.ValidationException;
import com.testmind.model.GeneratedTestCase;
import com.testmind.model.TestCaseStatus;
import com.testmind.repository.GeneratedTestCaseRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class TestCaseService {

    private final GeneratedTestCaseRepository testCaseRepository;

    @Transactional(readOnly = true)
    public List<TestCaseResponse> getByPipelineRun(Long pipelineRunId) {
        return testCaseRepository.findByPipelineRunIdOrderByCreatedAtAsc(pipelineRunId)
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Transactional
    public TestCaseResponse reviewTestCase(Long testCaseId, TestCaseReviewRequest request) {
        GeneratedTestCase tc = testCaseRepository.findById(testCaseId)
                .orElseThrow(() -> new ResourceNotFoundException("TestCase", testCaseId));

        TestCaseStatus newStatus;
        try {
            newStatus = TestCaseStatus.valueOf(request.getStatus().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new ValidationException("Invalid status: " + request.getStatus() + ". Must be APPROVED, REJECTED, or EDITED");
        }

        tc.setStatus(newStatus);
        tc.setReviewedAt(OffsetDateTime.now());

        if (request.getReviewerNotes() != null) {
            tc.setReviewerNotes(request.getReviewerNotes());
        }
        if (newStatus == TestCaseStatus.EDITED) {
            if (request.getUpdatedTitle() != null && !request.getUpdatedTitle().isBlank()) {
                tc.setTitle(request.getUpdatedTitle());
            }
            if (request.getUpdatedExpectedResult() != null && !request.getUpdatedExpectedResult().isBlank()) {
                tc.setExpectedResult(request.getUpdatedExpectedResult());
            }
            tc.setStatus(TestCaseStatus.APPROVED); // edited → treated as approved
        }

        tc = testCaseRepository.save(tc);
        log.info("Test case {} set to {}", testCaseId, tc.getStatus());
        return toResponse(tc);
    }

    @Transactional
    public void approveAll(Long pipelineRunId) {
        List<GeneratedTestCase> pending = testCaseRepository
                .findByPipelineRunIdAndStatus(pipelineRunId, TestCaseStatus.PENDING);
        pending.forEach(tc -> {
            tc.setStatus(TestCaseStatus.APPROVED);
            tc.setReviewedAt(OffsetDateTime.now());
        });
        testCaseRepository.saveAll(pending);
        log.info("Approved {} pending test cases for pipeline {}", pending.size(), pipelineRunId);
    }

    private TestCaseResponse toResponse(GeneratedTestCase tc) {
        TestCaseResponse r = new TestCaseResponse();
        r.setId(tc.getId());
        r.setPipelineRunId(tc.getPipelineRun() != null ? tc.getPipelineRun().getId() : null);
        r.setTitle(tc.getTitle());
        r.setTestType(tc.getTestType() != null ? tc.getTestType().name() : null);
        r.setGapCategory(tc.getGapCategory() != null ? tc.getGapCategory().name() : null);
        r.setPreconditions(tc.getPreconditions());
        r.setTestSteps(tc.getTestSteps());
        r.setExpectedResult(tc.getExpectedResult());
        r.setPriority(tc.getPriority());
        r.setStatus(tc.getStatus() != null ? tc.getStatus().name() : "PENDING");
        r.setReviewerNotes(tc.getReviewerNotes());
        r.setReviewedAt(tc.getReviewedAt());
        return r;
    }
}
