package com.testmind.repository;

import com.testmind.model.McpConnection;
import com.testmind.model.McpServerType;
import com.testmind.model.Project;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface McpConnectionRepository extends JpaRepository<McpConnection, Long> {

    Optional<McpConnection> findByProjectAndServerType(Project project, McpServerType serverType);

    List<McpConnection> findByProject(Project project);
}
