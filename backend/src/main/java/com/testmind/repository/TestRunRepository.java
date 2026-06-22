package com.testmind.repository;

import com.testmind.model.Project;
import com.testmind.model.TestRun;
import com.testmind.model.TestRunStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TestRunRepository extends JpaRepository<TestRun, Long> {

    List<TestRun> findByProjectOrderByStartedAtDesc(Project project);

    List<TestRun> findByProjectIdAndStatus(Long projectId, TestRunStatus status);
}
