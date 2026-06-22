package com.testmind.dto;

import com.testmind.model.DefectSeverity;
import com.testmind.model.DefectStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DefectResponse {

    private Long id;
    private Long testRunId;
    private DefectSeverity severity;
    private String title;
    private String description;
    private String aiExplanation;
    private Double consistencyScore;
    private String jiraTicketId;
    private DefectStatus status;
    private LocalDateTime createdAt;
}
