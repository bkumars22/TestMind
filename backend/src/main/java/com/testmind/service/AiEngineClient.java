package com.testmind.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.Map;
import java.util.concurrent.CompletableFuture;

@Service
@RequiredArgsConstructor
@Slf4j
public class AiEngineClient {

    @Value("${ai.engine.url}")
    private String aiEngineUrl;

    private WebClient webClient() {
        return WebClient.builder()
                .baseUrl(aiEngineUrl)
                .defaultHeader("Content-Type", MediaType.APPLICATION_JSON_VALUE)
                .build();
    }

    @Async
    public CompletableFuture<Void> triggerAnalysis(Long projectId, String repoUrl, String token, Long runId) {
        Map<String, Object> payload = Map.of(
                "project_id", projectId,
                "repo_url", repoUrl,
                "github_token", token,
                "run_id", runId
        );

        try {
            webClient()
                    .post()
                    .uri("/analyze")
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(payload)
                    .retrieve()
                    .toBodilessEntity()
                    .block();
            log.info("Analysis triggered for project {} run {}", projectId, runId);
        } catch (Exception e) {
            log.error("Failed to trigger analysis for project {} run {}: {}", projectId, runId, e.getMessage());
        }

        return CompletableFuture.completedFuture(null);
    }

    @Async
    public CompletableFuture<String> explainDefect(Long defectId, String description) {
        Map<String, Object> payload = Map.of(
                "defect_id", defectId,
                "description", description
        );

        try {
            String response = webClient()
                    .post()
                    .uri("/explain")
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(payload)
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();
            return CompletableFuture.completedFuture(response);
        } catch (Exception e) {
            log.error("Failed to explain defect {}: {}", defectId, e.getMessage());
            return CompletableFuture.completedFuture(null);
        }
    }

    @Async
    public CompletableFuture<String> generateTests(Long projectId, String filePath) {
        Map<String, Object> payload = Map.of(
                "project_id", projectId,
                "file_path", filePath
        );

        try {
            String response = webClient()
                    .post()
                    .uri("/generate-tests")
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(payload)
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();
            return CompletableFuture.completedFuture(response);
        } catch (Exception e) {
            log.error("Failed to generate tests for project {} file {}: {}", projectId, filePath, e.getMessage());
            return CompletableFuture.completedFuture(null);
        }
    }
}
