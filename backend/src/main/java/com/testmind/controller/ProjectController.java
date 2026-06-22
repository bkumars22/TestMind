package com.testmind.controller;

import com.testmind.dto.*;
import com.testmind.model.McpConnection;
import com.testmind.model.McpServerType;
import com.testmind.model.User;
import com.testmind.repository.McpConnectionRepository;
import com.testmind.repository.ProjectRepository;
import com.testmind.repository.UserRepository;
import com.testmind.service.ProjectService;
import com.testmind.service.TestRunService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/projects")
@RequiredArgsConstructor
@Tag(name = "Projects", description = "Project management")
public class ProjectController {

    private final ProjectService projectService;
    private final TestRunService testRunService;
    private final UserRepository userRepository;
    private final McpConnectionRepository mcpConnectionRepository;
    private final ProjectRepository projectRepository;

    @GetMapping
    @Operation(summary = "List all projects for the authenticated user")
    public ResponseEntity<List<ProjectResponse>> getAll(@AuthenticationPrincipal UserDetails principal) {
        User user = resolveUser(principal);
        return ResponseEntity.ok(projectService.getAll(user));
    }

    @PostMapping
    @Operation(summary = "Create a new project")
    public ResponseEntity<ProjectResponse> create(
            @Valid @RequestBody ProjectRequest request,
            @AuthenticationPrincipal UserDetails principal) {
        User user = resolveUser(principal);
        ProjectResponse response = projectService.create(request, user);
        return ResponseEntity.status(201).body(response);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get a project by ID")
    public ResponseEntity<ProjectResponse> getById(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails principal) {
        User user = resolveUser(principal);
        return ResponseEntity.ok(projectService.getById(id, user));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete a project by ID")
    public ResponseEntity<Void> delete(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails principal) {
        User user = resolveUser(principal);
        projectService.delete(id, user);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/connect-repo")
    @Operation(summary = "Update the GitHub token for a project")
    public ResponseEntity<ProjectResponse> connectRepo(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        String token = body.get("githubToken");
        return ResponseEntity.ok(projectService.connectRepo(id, token));
    }

    @PostMapping("/{id}/run-analysis")
    @Operation(summary = "Trigger an AI analysis run for a project")
    public ResponseEntity<Map<String, Long>> runAnalysis(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails principal) {
        User user = resolveUser(principal);
        Long runId = projectService.triggerAnalysis(id, user);
        return ResponseEntity.status(202).body(Map.of("runId", runId));
    }

    @GetMapping("/{id}/test-runs")
    @Operation(summary = "List all test runs for a project")
    public ResponseEntity<List<TestRunResponse>> getTestRuns(@PathVariable Long id) {
        return ResponseEntity.ok(testRunService.getByProject(id));
    }

    @PostMapping("/{id}/mcp/configure")
    @Operation(summary = "Configure an MCP server connection for a project")
    public ResponseEntity<Map<String, Object>> configureMcp(
            @PathVariable Long id,
            @Valid @RequestBody McpConfigRequest request) {
        var project = projectRepository.findById(id)
                .orElseThrow(() -> new com.testmind.exception.ResourceNotFoundException("Project", id));

        McpConnection connection = mcpConnectionRepository
                .findByProjectAndServerType(project, request.getServerType())
                .orElseGet(() -> McpConnection.builder()
                        .project(project)
                        .serverType(request.getServerType())
                        .build());

        connection.setConfigJson(request.getConfigJson());
        connection.setIsActive(true);
        mcpConnectionRepository.save(connection);

        return ResponseEntity.status(201).body(Map.of(
                "id", connection.getId(),
                "serverType", connection.getServerType(),
                "isActive", connection.getIsActive()
        ));
    }

    @GetMapping("/{id}/mcp/status")
    @Operation(summary = "Get all MCP connections for a project")
    public ResponseEntity<List<Map<String, Object>>> getMcpStatus(@PathVariable Long id) {
        var project = projectRepository.findById(id)
                .orElseThrow(() -> new com.testmind.exception.ResourceNotFoundException("Project", id));

        List<Map<String, Object>> status = mcpConnectionRepository.findByProject(project).stream()
                .map(conn -> Map.<String, Object>of(
                        "id", conn.getId(),
                        "serverType", conn.getServerType(),
                        "isActive", conn.getIsActive()
                ))
                .collect(Collectors.toList());

        return ResponseEntity.ok(status);
    }

    private User resolveUser(UserDetails principal) {
        return userRepository.findByEmail(principal.getUsername())
                .orElseThrow(() -> new com.testmind.exception.ResourceNotFoundException(
                        "User not found: " + principal.getUsername()));
    }
}
