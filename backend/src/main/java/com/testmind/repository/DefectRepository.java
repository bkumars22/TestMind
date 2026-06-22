package com.testmind.repository;

import com.testmind.model.Defect;
import com.testmind.model.DefectSeverity;
import com.testmind.model.DefectStatus;
import com.testmind.model.TestRun;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DefectRepository extends JpaRepository<Defect, Long> {

    List<Defect> findByTestRun(TestRun testRun);

    List<Defect> findByTestRunProjectIdAndStatus(Long projectId, DefectStatus status);

    long countBySeverityAndStatus(DefectSeverity severity, DefectStatus status);
}
