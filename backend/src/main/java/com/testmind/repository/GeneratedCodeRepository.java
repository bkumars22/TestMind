package com.testmind.repository;

import com.testmind.model.CodeFramework;
import com.testmind.model.GeneratedCode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface GeneratedCodeRepository extends JpaRepository<GeneratedCode, Long> {

    List<GeneratedCode> findByPipelineRunId(Long pipelineRunId);

    List<GeneratedCode> findByPipelineRunIdAndFramework(Long pipelineRunId, CodeFramework framework);
}
