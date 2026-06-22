package com.testmind.repository;

import com.testmind.model.GeneratedTestCase;
import com.testmind.model.TestCaseStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface GeneratedTestCaseRepository extends JpaRepository<GeneratedTestCase, Long> {

    List<GeneratedTestCase> findByPipelineRunIdOrderByCreatedAtAsc(Long pipelineRunId);

    List<GeneratedTestCase> findByPipelineRunIdAndStatus(Long pipelineRunId, TestCaseStatus status);

    long countByPipelineRunIdAndStatus(Long pipelineRunId, TestCaseStatus status);
}
