package com.testmind.service;

import com.testmind.dto.ProjectRequest;
import com.testmind.dto.ProjectResponse;
import com.testmind.exception.ResourceNotFoundException;
import com.testmind.exception.ValidationException;
import com.testmind.model.*;
import com.testmind.repository.ProjectRepository;
import com.testmind.repository.TestRunRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ProjectService {

    private final ProjectRepository projectRepository;
    private final TestRunRepository testRunRepository;
    private final AiEngineClient aiEngineClient;

    @Transactional(readOnly = true)
    public List<ProjectResponse> getAll(User user) {
        List<Project> projects = user.getRole() == UserRole.ADMIN
                ? projectRepository.findAll()
                : projectRepository.findByUser(user);
        return projects.stream()
                .map(project -> toResponse(project, hasActiveRun(project)))
                .collect(Collectors.toList());
    }

    @Transactional
    public ProjectResponse create(ProjectRequest request, User user) {
        Project project = Project.builder()
                .name(request.getName())
                .repoUrl(request.getRepoUrl())
                .githubToken(request.getGithubToken())
                .user(user)
                .build();

        projectRepository.save(project);
        return toResponse(project, false);
    }

    @Transactional(readOnly = true)
    public ProjectResponse getById(Long id, User user) {
        Project project = findOwnedProject(id, user);
        return toResponse(project, hasActiveRun(project));
    }

    @Transactional
    public void delete(Long id, User user) {
        Project project = findOwnedProject(id, user);
        projectRepository.delete(project);
    }

    @Transactional
    public ProjectResponse connectRepo(Long id, String githubToken) {
        Project project = projectRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Project", id));

        validateGithubToken(githubToken);

        project.setGithubToken(githubToken);
        projectRepository.save(project);
        return toResponse(project, hasActiveRun(project));
    }

    @Transactional
    public Long triggerAnalysis(Long id, User user) {
        Project project = findOwnedProject(id, user);

        List<TestRun> activeRuns = testRunRepository.findByProjectIdAndStatus(id, TestRunStatus.RUNNING);
        if (!activeRuns.isEmpty()) {
            throw new ValidationException("A test run is already in progress for this project");
        }

        TestRun testRun = TestRun.builder()
                .project(project)
                .status(TestRunStatus.PENDING)
                .triggeredBy(user.getEmail())
                .startedAt(LocalDateTime.now())
                .defectCount(0)
                .build();

        testRunRepository.save(testRun);

        aiEngineClient.triggerAnalysis(
                project.getId(),
                project.getRepoUrl(),
                project.getGithubToken(),
                testRun.getId()
        );

        return testRun.getId();
    }

    private void validateGithubToken(String token) {
        try {
            RestTemplate restTemplate = new RestTemplate();
            restTemplate.getForEntity(
                "https://api.github.com/user",
                String.class,
                (Object[]) null
            );
        } catch (Exception e) {
            log.warn("GitHub token validation call failed: {}", e.getMessage());
        }
    }

    private Project findOwnedProject(Long id, User user) {
        Project project = projectRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Project", id));

        if (user.getRole() != UserRole.ADMIN && !project.getUser().getId().equals(user.getId())) {
            throw new org.springframework.security.access.AccessDeniedException(
                    "You do not own this project");
        }

        return project;
    }

    private boolean hasActiveRun(Project project) {
        return !testRunRepository.findByProjectIdAndStatus(project.getId(), TestRunStatus.RUNNING).isEmpty()
            || !testRunRepository.findByProjectIdAndStatus(project.getId(), TestRunStatus.PENDING).isEmpty();
    }

    private ProjectResponse toResponse(Project project, boolean activeTestRun) {
        return ProjectResponse.builder()
                .id(project.getId())
                .name(project.getName())
                .repoUrl(project.getRepoUrl())
                .techStack(project.getTechStack())
                .status(project.getStatus())
                .createdAt(project.getCreatedAt())
                .activeTestRun(activeTestRun)
                .build();
    }
}
