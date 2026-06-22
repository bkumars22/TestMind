package com.testmind.repository;

import com.testmind.model.Project;
import com.testmind.model.RiskScore;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RiskScoreRepository extends JpaRepository<RiskScore, Long> {

    List<RiskScore> findByProjectOrderByRiskScoreDesc(Project project);

    List<RiskScore> findByProjectId(Long projectId);
}
