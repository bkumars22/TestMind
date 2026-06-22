package com.testmind.repository;

import com.testmind.model.ExecutionStatus;
import com.testmind.model.TestExecution;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TestExecutionRepository extends JpaRepository<TestExecution, Long> {

    List<TestExecution> findByPipelineRunIdOrderByExecutedAtAsc(Long pipelineRunId);

    List<TestExecution> findByPipelineRunIdAndStatus(Long pipelineRunId, ExecutionStatus status);
}
