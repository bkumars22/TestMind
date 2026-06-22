package com.testmind.repository;

import com.testmind.model.GapReport;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface GapReportRepository extends JpaRepository<GapReport, Long> {

    List<GapReport> findByPipelineRunIdOrderByPriorityScoreDesc(Long pipelineRunId);
}
