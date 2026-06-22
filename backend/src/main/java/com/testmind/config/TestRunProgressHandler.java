package com.testmind.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class TestRunProgressHandler {

    private final SimpMessagingTemplate messagingTemplate;

    public void sendProgress(Long runId, String status, Integer percentComplete) {
        Map<String, Object> payload = Map.of(
                "runId", runId,
                "status", status,
                "percentComplete", percentComplete != null ? percentComplete : 0
        );

        String destination = "/topic/test-runs/" + runId;
        messagingTemplate.convertAndSend(destination, payload);
        log.debug("Sent progress update for run {} to {}: {}", runId, destination, status);
    }

    public void sendDefectFound(Long runId, Map<String, Object> defectSummary) {
        Map<String, Object> payload = Map.of(
                "runId", runId,
                "event", "DEFECT_FOUND",
                "defect", defectSummary
        );

        messagingTemplate.convertAndSend("/topic/test-runs/" + runId, payload);
    }

    public void sendRunComplete(Long runId, String finalStatus, Integer defectCount, Double riskScore) {
        Map<String, Object> payload = Map.of(
                "runId", runId,
                "event", "COMPLETED",
                "status", finalStatus,
                "defectCount", defectCount != null ? defectCount : 0,
                "riskScore", riskScore != null ? riskScore : 0.0
        );

        messagingTemplate.convertAndSend("/topic/test-runs/" + runId, payload);
    }
}
