package com.testmind.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@Slf4j
public class PipelineAiClient {

    private final WebClient webClient;

    public PipelineAiClient(
            WebClient.Builder webClientBuilder,
            @Value("${ai.engine.url}") String aiEngineUrl) {
        this.webClient = webClientBuilder
                .baseUrl(aiEngineUrl)
                .defaultHeader("Content-Type", MediaType.APPLICATION_JSON_VALUE)
                .build();
    }

    public Mono<Void> startPipeline(String pipelineRunId, Long projectId, String jiraStoryId,
                                     String repoUrl, String githubToken, String targetUrl) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("pipeline_run_id", pipelineRunId);
        payload.put("project_id", projectId);
        payload.put("jira_story_id", jiraStoryId);
        payload.put("repo_url", repoUrl);
        payload.put("github_token", githubToken);
        payload.put("target_url", targetUrl);

        return webClient.post()
                .uri("/pipeline/start")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(payload)
                .retrieve()
                .toBodilessEntity()
                .doOnSuccess(r -> log.info("Pipeline {} started successfully in AI engine", pipelineRunId))
                .doOnError(e -> log.error("Failed to start pipeline {} in AI engine: {}", pipelineRunId, e.getMessage()))
                .then();
    }

    public Mono<Void> resumePipeline(String pipelineRunId, List<Map<String, Object>> approvedTestCases) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("pipeline_run_id", pipelineRunId);
        payload.put("approved_test_cases", approvedTestCases);

        return webClient.post()
                .uri("/pipeline/resume")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(payload)
                .retrieve()
                .toBodilessEntity()
                .doOnSuccess(r -> log.info("Pipeline {} resumed successfully in AI engine", pipelineRunId))
                .doOnError(e -> log.error("Failed to resume pipeline {} in AI engine: {}", pipelineRunId, e.getMessage()))
                .then();
    }
}
