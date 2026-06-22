package com.testmind.repository;

import com.testmind.model.StoryAnalysis;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface StoryAnalysisRepository extends JpaRepository<StoryAnalysis, Long> {

    Optional<StoryAnalysis> findByPipelineRunId(Long pipelineRunId);
}
