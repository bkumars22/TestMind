package com.testmind.repository;

import com.testmind.model.PipelineRun;
import com.testmind.model.PipelineStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PipelineRunRepository extends JpaRepository<PipelineRun, Long> {

    List<PipelineRun> findByProjectIdOrderByStartedAtDesc(Long projectId);

    List<PipelineRun> findByStatusIn(List<PipelineStatus> statuses);
}
